import { createClient } from '@supabase/supabase-js';
import { NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Create Supabase admin client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    }
  }
);

// GET - Admin view all tickets (filtered by requester_type)
export async function GET(request) {
  // ✅ FIX: Extract token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 });
  }

  // ✅ FIX: Validate token using service role client
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
  }

  // Get user's profile to verify admin role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const requesterType = searchParams.get('requester_type'); // 'student' or 'department'
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 50;
  const offset = (page - 1) * limit;

  try {
    // Build query using admin client
    let query = supabaseAdmin
      .from('support_tickets')
      .select('*', { count: 'exact' });

    // Filter by requester type (required for admin view)
    if (requesterType) {
      query = query.eq('requester_type', requesterType);
    }

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Apply priority filter if provided
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Apply search (ticket_number, email, subject, roll_number, registration_no)
    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `ticket_number.ilike.${term},email.ilike.${term},subject.ilike.${term},roll_number.ilike.${term},registration_no.ilike.${term}`
      );
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: tickets, error: ticketsError, count } = await query;

    if (ticketsError) {
      throw ticketsError;
    }

    // Get statistics for both types
    const { data: allTickets } = await supabaseAdmin
      .from('support_tickets')
      .select('status, requester_type');

    const stats = {
      student_total: allTickets?.filter(t => t.requester_type === 'student').length || 0,
      student_open: allTickets?.filter(t => t.requester_type === 'student' && t.status === 'open').length || 0,
      department_total: allTickets?.filter(t => t.requester_type === 'department').length || 0,
      department_open: allTickets?.filter(t => t.requester_type === 'department' && t.status === 'open').length || 0,
      open_tickets: allTickets?.filter(t => t.status === 'open').length || 0,
      in_progress_tickets: allTickets?.filter(t => t.status === 'in_progress').length || 0,
      resolved_tickets: allTickets?.filter(t => t.status === 'resolved').length || 0,
      closed_tickets: allTickets?.filter(t => t.status === 'closed').length || 0,
      total_tickets: allTickets?.length || 0
    };

    return NextResponse.json({
      success: true,
      tickets: tickets || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

// PATCH - Admin update ticket status with optional response
export async function PATCH(request) {
  // ✅ FIX: Extract token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 });
  }

  // ✅ FIX: Validate token using service role client
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
  }

  // Get user's profile to verify admin role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, email, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ticketId, status, adminResponse, priority, adminNotes } = body;

    if (!ticketId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing ticketId or status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add response data if provided
    if (adminResponse) {
      updateData.admin_response = adminResponse;
      updateData.responded_at = new Date().toISOString();
      updateData.responded_by = user.id;
    }

    // Update priority if provided
    if (priority) {
      updateData.priority = priority;
    }

    // Update admin notes if provided
    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    // Add resolved info if resolving or closing
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = profile.full_name || profile.email;
      updateData.is_read = true;
      updateData.read_at = new Date().toISOString();
      updateData.read_by = user.id;
    }

    // Update ticket status using admin client
    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 🆕 Send email notification if status changed to resolved/closed or response provided
    if ((status === 'resolved' || status === 'closed' || adminResponse) && updatedTicket.user_email) {
      try {
        const { sendSupportTicketResponse } = await import('@/lib/emailService');
        await sendSupportTicketResponse({
          userEmail: updatedTicket.user_email,
          ticketNumber: updatedTicket.ticket_number,
          subject: updatedTicket.subject,
          adminResponse: adminResponse || null,
          status: status,
          resolvedBy: profile.full_name || profile.email
        });
        console.log(`📧 Support ticket response email sent to ${updatedTicket.user_email}`);
      } catch (emailError) {
        console.error('Failed to send support email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket updated successfully',
      emailSent: (status === 'resolved' || status === 'closed' || adminResponse) && updatedTicket.user_email
    });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update ticket status" },
      { status: 500 }
    );
  }
}
