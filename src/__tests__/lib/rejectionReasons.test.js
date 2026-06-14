import {
  REJECTION_REASONS,
  getRejectionReasonLabel,
  DEPARTMENT_DEFAULT_REASONS,
} from '@/lib/rejectionReasons';

describe('REJECTION_REASONS', () => {
  it('contains all expected rejection reasons', () => {
    const codes = REJECTION_REASONS.map(r => r.code);
    expect(codes).toContain('DUES_PENDING');
    expect(codes).toContain('BOOK_NOT_RETURNED');
    expect(codes).toContain('ID_NOT_RETURNED');
    expect(codes).toContain('KEY_NOT_RETURNED');
    expect(codes).toContain('EQUIPMENT_NOT_RETURNED');
    expect(codes).toContain('DOCUMENT_MISSING');
    expect(codes).toContain('VERIFICATION_FAILED');
    expect(codes).toContain('DATA_INCORRECT');
    expect(codes).toContain('CUSTOM');
  });

  it('each reason has a label and description', () => {
    REJECTION_REASONS.forEach(reason => {
      expect(reason.label).toBeTruthy();
      expect(reason.description).toBeTruthy();
    });
  });
});

describe('getRejectionReasonLabel', () => {
  it('returns correct label for known code', () => {
    expect(getRejectionReasonLabel('DUES_PENDING')).toBe('Outstanding dues/fines');
    expect(getRejectionReasonLabel('CUSTOM')).toBe('Other (specify below)');
  });

  it('returns the code itself if not found', () => {
    expect(getRejectionReasonLabel('UNKNOWN_CODE')).toBe('UNKNOWN_CODE');
  });
});

describe('DEPARTMENT_DEFAULT_REASONS', () => {
  it('has reasons for library department', () => {
    expect(DEPARTMENT_DEFAULT_REASONS.library).toContain('BOOK_NOT_RETURNED');
    expect(DEPARTMENT_DEFAULT_REASONS.library).toContain('DUES_PENDING');
  });

  it('has reasons for accounts department', () => {
    expect(DEPARTMENT_DEFAULT_REASONS.accounts_department).toContain('DUES_PENDING');
  });
});
