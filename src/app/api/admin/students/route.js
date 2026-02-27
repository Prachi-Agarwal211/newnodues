export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/admin/students - Get all students with filtering
 * POST /api/admin/students - Create new student
 * PUT /api/admin/students - Update student
 * DELETE /api/admin/students - Delete student
 */

// GET: Fetch all students with optional filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const search = searchParams.get('search') || '';
    const schoolId = searchParams.get('schoolId') || '';
    const courseId = searchParams.get('courseId') || '';
    const branchId = searchParams.get('branchId') || '';
    const status = searchParams.get('status') || '';
    const noPagination = searchParams.get('noPagination') === 'true'; // Flag for full data search
    
    const offset = (page - 1) * limit;
    
    // Build query
    let query = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          department_name,
          status,
          action_at,
          action_by
        ),
        student_data (
          admission_year,
          passing_year,
          updated_at
        )
      `);
    
    // Apply range only if not using noPagination
    if (!noPagination) {
      query = query.range(offset, offset + limit - 1);
    }
    
    // Apply filters
    if (search) {
      query = query.or(`student_name.ilike.%${search}%,registration_no.ilike.%${search}%,personal_email.ilike.%${search}%,college_email.ilike.%${search}%`);
    }
    
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data: students, error, count } = await query;
    
    if (error) {
      console.error('Error fetching students:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get total count for pagination (only if paginated)
    let totalCount = 0;
    if (!noPagination) {
      const { count } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .range(0, 0);
      totalCount = count || 0;
    } else {
      totalCount = students?.length || 0;
    }
    
    const response = {
      success: true,
      data: students || [],
      count: totalCount
    };
    
    // Add pagination info only if paginated
    if (!noPagination) {
      response.pagination = {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil((totalCount || 0) / limit)
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Students API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create new student
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['registration_no', 'student_name', 'personal_email', 'college_email'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }
    
    // Check if student already exists
    const { data: existingStudent } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id')
      .eq('registration_no', body.registration_no.toUpperCase())
      .single();
    
    if (existingStudent) {
      return NextResponse.json({
        error: 'Student with this registration number already exists'
      }, { status: 409 });
    }
    
    // Create student record
    const studentData = {
      registration_no: body.registration_no.toUpperCase(),
      student_name: body.student_name.trim(),
      parent_name: body.parent_name?.trim() || null,
      school_id: body.school_id || null,
      school: body.school || null,
      course_id: body.course_id || null,
      course: body.course || null,
      branch_id: body.branch_id || null,
      branch: body.branch || null,
      country_code: body.country_code || '+91',
      contact_no: body.contact_no || null,
      personal_email: body.personal_email.toLowerCase().trim(),
      college_email: body.college_email.toLowerCase().trim(),
      email: body.email?.toLowerCase().trim() || body.college_email.toLowerCase().trim(),
      alumni_profile_link: body.alumni_profile_link?.trim() || null,
      admission_year: body.admission_year?.toString() || null,
      passing_year: body.passing_year?.toString() || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newStudent, error } = await supabaseAdmin
      .from('no_dues_forms')
      .insert([studentData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating student:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Create student data record
    if (newStudent) {
      await supabaseAdmin
        .from('student_data')
        .insert([{
          form_id: newStudent.id,
          registration_no: newStudent.registration_no,
          student_name: newStudent.student_name,
          parent_name: newStudent.parent_name,
          school: newStudent.school,
          course: newStudent.course,
          branch: newStudent.branch,
          contact_no: newStudent.contact_no,
          personal_email: newStudent.personal_email,
          college_email: newStudent.college_email,
          admission_year: newStudent.admission_year,
          passing_year: newStudent.passing_year,
          updated_at: new Date().toISOString(),
          updated_by: 'admin'
        }]);
    }
    
    // Initialize department statuses
    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('name')
      .eq('is_active', true);
    
    if (departments && departments.length > 0) {
      const statusRecords = departments.map(dept => ({
        form_id: newStudent.id,
        department_name: dept.name,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      await supabaseAdmin
        .from('no_dues_status')
        .insert(statusRecords);
    }
    
    return NextResponse.json({
      success: true,
      data: newStudent,
      message: 'Student created successfully'
    });
    
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update student
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }
    
    // Check if student exists
    const { data: existingStudent } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    // Prepare update data
    const studentUpdateData = {
      ...updateData,
      registration_no: updateData.registration_no?.toUpperCase(),
      student_name: updateData.student_name?.trim(),
      personal_email: updateData.personal_email?.toLowerCase().trim(),
      college_email: updateData.college_email?.toLowerCase().trim(),
      email: updateData.email?.toLowerCase().trim() || updateData.college_email?.toLowerCase().trim(),
      updated_at: new Date().toISOString()
    };
    
    // Remove null/undefined values
    Object.keys(studentUpdateData).forEach(key => {
      if (studentUpdateData[key] === undefined || studentUpdateData[key] === null) {
        delete studentUpdateData[key];
      }
    });
    
    const { data: updatedStudent, error } = await supabaseAdmin
      .from('no_dues_forms')
      .update(studentUpdateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating student:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Update student data if relevant fields changed
    const studentDataUpdate = {};
    if (updateData.student_name) studentDataUpdate.student_name = updateData.student_name;
    if (updateData.parent_name) studentDataUpdate.parent_name = updateData.parent_name;
    if (updateData.school) studentDataUpdate.school = updateData.school;
    if (updateData.course) studentDataUpdate.course = updateData.course;
    if (updateData.branch) studentDataUpdate.branch = updateData.branch;
    if (updateData.contact_no) studentDataUpdate.contact_no = updateData.contact_no;
    if (updateData.personal_email) studentDataUpdate.personal_email = updateData.personal_email;
    if (updateData.college_email) studentDataUpdate.college_email = updateData.college_email;
    if (updateData.admission_year) studentDataUpdate.admission_year = updateData.admission_year;
    if (updateData.passing_year) studentDataUpdate.passing_year = updateData.passing_year;
    
    if (Object.keys(studentDataUpdate).length > 0) {
      studentDataUpdate.updated_at = new Date().toISOString();
      studentDataUpdate.updated_by = 'admin';
      
      await supabaseAdmin
        .from('student_data')
        .update(studentDataUpdate)
        .eq('form_id', id);
    }
    
    return NextResponse.json({
      success: true,
      data: updatedStudent,
      message: 'Student updated successfully'
    });
    
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete student
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }
    
    // Check if student exists
    const { data: existingStudent } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, status')
      .eq('id', id)
      .single();
    
    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    // Don't allow deletion of students with completed applications
    if (existingStudent.status === 'completed') {
      return NextResponse.json({
        error: 'Cannot delete student with completed application'
      }, { status: 400 });
    }
    
    // Delete related records (cascade should handle this, but let's be explicit)
    await supabaseAdmin.from('no_dues_status').delete().eq('form_id', id);
    await supabaseAdmin.from('student_data').delete().eq('form_id', id);
    await supabaseAdmin.from('no_dues_messages').delete().eq('form_id', id);
    
    // Delete student record
    const { error } = await supabaseAdmin
      .from('no_dues_forms')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting student:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
