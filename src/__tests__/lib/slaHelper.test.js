import { getHoursSince, getSLAStatus, getSLABadgeClasses } from '@/lib/slaHelper';

describe('getHoursSince', () => {
  it('returns 0 for null/undefined input', () => {
    expect(getHoursSince(null)).toBe(0);
    expect(getHoursSince(undefined)).toBe(0);
  });

  it('returns ~0 for current time', () => {
    const now = new Date().toISOString();
    expect(getHoursSince(now)).toBeCloseTo(0, 0);
  });

  it('returns positive for past dates', () => {
    const date = new Date(Date.now() - 3600000); // 1 hour ago
    expect(getHoursSince(date.toISOString())).toBeGreaterThan(0.9);
  });
});

describe('getSLAStatus', () => {
  it('returns normal for < 24h', () => {
    const recent = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    const status = getSLAStatus(recent);
    expect(status.level).toBe('normal');
    expect(status.color).toBe('gray');
    expect(status.label).toBe('Normal');
  });

  it('returns warning for 24-48h', () => {
    const past = new Date(Date.now() - 36 * 3600000).toISOString(); // 36 hours ago
    const status = getSLAStatus(past);
    expect(status.level).toBe('warning');
    expect(status.color).toBe('yellow');
    expect(status.label).toBe('Warning');
  });

  it('returns slow for 48h-5d', () => {
    const past = new Date(Date.now() - 72 * 3600000).toISOString(); // 72 hours ago
    const status = getSLAStatus(past);
    expect(status.level).toBe('slow');
    expect(status.color).toBe('orange');
    expect(status.label).toBe('Slow');
  });

  it('returns critical for > 5d', () => {
    const past = new Date(Date.now() - 10 * 24 * 3600000).toISOString(); // 10 days ago
    const status = getSLAStatus(past);
    expect(status.level).toBe('critical');
    expect(status.color).toBe('red');
    expect(status.label).toBe('Critical');
  });
});

describe('getSLABadgeClasses', () => {
  it('returns normal badge classes in light mode', () => {
    const status = { level: 'normal', color: 'gray', label: 'Normal' };
    const classes = getSLABadgeClasses(status, false);
    expect(classes).toContain('gray');
  });

  it('returns warning badge classes in dark mode', () => {
    const status = { level: 'warning', color: 'yellow', label: 'Warning' };
    const classes = getSLABadgeClasses(status, true);
    expect(classes).toContain('yellow');
  });

  it('returns critical badge with pulse animation', () => {
    const status = { level: 'critical', color: 'red', label: 'Critical' };
    const classes = getSLABadgeClasses(status, false);
    expect(classes).toContain('animate-pulse');
  });
});
