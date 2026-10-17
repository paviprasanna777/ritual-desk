export interface CalendarCell {
  date: string | null;
  day: number | null;
}

export function buildMonthCalendar(year: number, monthIndex: number): CalendarCell[] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarCell[] = Array.from(
    { length: firstWeekday },
    () => ({ date: null, day: null }),
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    const month = String(monthIndex + 1).padStart(2, '0');
    const date = String(day).padStart(2, '0');
    cells.push({ date: `${year}-${month}-${date}`, day });
  }

  return cells;
}
