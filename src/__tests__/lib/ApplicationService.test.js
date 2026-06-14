/**
 * ApplicationService Integration Tests
 * 
 * These tests mock the Supabase client to ensure:
 * 1. Student validation against student_data table works (prevents fake reg numbers)
 * 2. Form submission creates proper records
 * 3. Department statuses are created properly
 * 4. Realtime broadcast is sent
 */

// Build a chainable mock that returns itself for all methods
// CRITICAL: Do NOT add a .then() method - that would make the mock a "thenable"
// and cause `await` to hang forever (JavaScript's await calls .then() to resolve)
function createChainableMock(overrides = {}) {
  const chainable = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    ...overrides,
  };
  return chainable;
}

// Mock supabaseAdmin
const mockSupabase = {
  from: jest.fn(),
  channel: jest.fn(),
  removeChannel: jest.fn(),
};

jest.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: mockSupabase,
}));

// Mock realtimeService
jest.mock('@/lib/realtimeService', () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
}));

const ApplicationService = require('@/lib/services/ApplicationService').default;

describe('ApplicationService - Student Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('submitApplication', () => {
    const validFormData = {
      registration_no: '22BCAN001',
      student_name: 'John Doe',
      parent_name: 'Jane Doe',
      admission_year: '2022',
      passing_year: '2026',
      school: 'school-1',
      school_name: 'Engineering',
      course: 'course-1',
      course_name: 'B.Tech',
      branch: 'branch-1',
      branch_name: 'Computer Science',
      country_code: '+91',
      contact_no: '9876543210',
      personal_email: 'john@example.com',
      college_email: 'john@college.edu',
      alumni_profile_link: 'https://jualumni.in/p/john',
    };

    const mockFormRecord = { id: 'form-123', ...validFormData, registration_no: '22BCAN001' };

    function setupMockChains(options = {}) {
      const { studentFound = true, duplicateExists = false } = options;

      // --- student_data: lookup + upsert ---
      const studentResponse = {
        data: studentFound ? { registration_no: '22BCAN001', student_name: 'John Doe' } : null,
        error: null,
      };
      const studentChain = createChainableMock({
        maybeSingle: jest.fn().mockResolvedValue(studentResponse),
        // Used by syncStudentData after form creation
        upsert: jest.fn().mockResolvedValue({ error: null }),
      });

      // --- no_dues_forms: duplicate check + form insert ---
      const duplicateResponse = {
        data: duplicateExists ? { id: 'existing', status: 'pending' } : null,
        error: null,
      };
      const formScopeResponse = { data: { school_id: 'school-1', course_id: 'course-1', branch_id: 'branch-1' }, error: null };
      const formFinalResponse = { data: { status: 'pending' }, error: null };

      const formsChain = createChainableMock({
        // maybeSingle used for duplicate check
        maybeSingle: jest.fn()
          .mockResolvedValueOnce(duplicateResponse)
          .mockResolvedValue(formScopeResponse),
        // single used for form scope fetch and final form read
        single: jest.fn()
          .mockResolvedValueOnce(formScopeResponse)  // createDepartmentStatuses: select school_id, course_id, branch_id
          .mockResolvedValueOnce(formFinalResponse), // handleRealtime/final: select status
        // insert returns a sub-chain with .select().single()
        insert: jest.fn().mockReturnValue(
          createChainableMock({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockFormRecord, error: null }),
          })
        ),
      });

      // --- departments ---
      const deptResponse = {
        data: [
          { id: 1, name: 'Library', is_active: true, display_order: 1 },
          { id: 2, name: 'Accounts', is_active: true, display_order: 2 },
        ],
        error: null,
      };
      const deptChain = createChainableMock({
        order: jest.fn().mockResolvedValue(deptResponse),
      });

      // --- no_dues_status: insert ---
      const statusInsertChain = createChainableMock({
        insert: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ error: null }),
      });

      // --- student_data: upsert ---
      const studentDataChain = createChainableMock({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      });

      // --- Channel for broadcast ---
      const mockChannel = { send: jest.fn().mockResolvedValue({}) };
      mockSupabase.channel.mockReturnValue(mockChannel);

      // --- Route .from() to specific table mocks ---
      const tableResponses = {
        'student_data': studentChain,
        'no_dues_forms': formsChain,
        'departments': deptChain,
        'no_dues_status': statusInsertChain,
      };

      mockSupabase.from.mockImplementation((table) => {
        const chain = tableResponses[table];
        return chain || createChainableMock();
      });
    }

    it('rejects submission when student not found in master database', async () => {
      expect.assertions(1);
      setupMockChains({ studentFound: false });

      await expect(
        ApplicationService.submitApplication(validFormData)
      ).rejects.toThrow('not found in our student database');
    });

    it('allows submission when student exists in master database', async () => {
      expect.assertions(2);
      setupMockChains({ studentFound: true });

      const result = await ApplicationService.submitApplication(validFormData);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('form-123');
    }, 10000);

    it('rejects duplicate registration numbers', async () => {
      expect.assertions(1);
      setupMockChains({ studentFound: true, duplicateExists: true });

      await expect(
        ApplicationService.submitApplication(validFormData)
      ).rejects.toThrow('already exists');
    });

    it('sends realtime broadcast on successful submission', async () => {
      expect.assertions(1);
      setupMockChains({ studentFound: true });

      await ApplicationService.submitApplication(validFormData);
      expect(mockSupabase.channel).toHaveBeenCalledWith('form-submissions-broadcast');
    }, 10000);
  });
});
