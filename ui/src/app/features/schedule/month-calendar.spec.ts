import { buildMonthCalendar } from './month-calendar';

describe('buildMonthCalendar', () => {
  it('starts October 2026 on Thursday with four leading empty cells', () => {
    const calendar = buildMonthCalendar(2026, 9);

    expect(calendar).toHaveLength(35);
    expect(calendar.slice(0, 4)).toEqual([
      { date: null, day: null },
      { date: null, day: null },
      { date: null, day: null },
      { date: null, day: null },
    ]);
    expect(calendar[4]).toEqual({ date: '2026-10-01', day: 1 });
    expect(calendar[34]).toEqual({ date: '2026-10-31', day: 31 });
  });

  it('handles leap years and month boundaries', () => {
    expect(buildMonthCalendar(2024, 1).map((cell) => cell.day).filter(Boolean))
      .toHaveLength(29);
    expect(buildMonthCalendar(2026, 1).map((cell) => cell.day).filter(Boolean))
      .toHaveLength(28);
    expect(buildMonthCalendar(2026, 0)[4]).toEqual({ date: '2026-01-01', day: 1 });
  });
});
