import { createScheduleService } from './schedule.service';
import type { createScheduleRepository } from '../repositories/schedule.repository';
import type { createDashboardRepository } from '../repositories/dashboard.repository';

type ScheduleRepository = ReturnType<typeof createScheduleRepository>;
type DashboardRepository = ReturnType<typeof createDashboardRepository>;

export function createDashboardService(
  dashboard: DashboardRepository,
  schedule: ScheduleRepository,
) {
  return {
    summary(now = new Date()) {
      const today = now.toISOString().slice(0, 10);
      const tomorrowDate = new Date(`${today}T00:00:00.000Z`);
      tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
      const tomorrow = tomorrowDate.toISOString().slice(0, 10);
      const nextSevenDays = new Date(`${today}T00:00:00.000Z`);
      nextSevenDays.setUTCDate(nextSevenDays.getUTCDate() + 7);
      const sevenDaysLater = nextSevenDays.toISOString().slice(0, 10);
      const todayStart = `${today}T00:00:00`;
      const tomorrowStart = `${tomorrow}T00:00:00`;
      const todaysItems = createScheduleService(schedule).list(today, today);
      const totals = dashboard.todayTotals(todayStart, tomorrowStart);

      return {
        todayCount: todaysItems.length,
        doneToday: totals.doneBookings + todaysItems.filter(
          (item) => item.type === 'ritual' && item.done,
        ).length,
        balanceToCollect: dashboard.balanceToCollect(),
        next7DaysCount: dashboard.next7DaysCount(
          todayStart,
          `${sevenDaysLater}T00:00:00`,
        ),
        todaysItems,
        upcoming: dashboard.upcoming(now.toISOString().slice(0, 19), 3),
        balanceDue: dashboard.balanceDue(3),
        todaysReminders: dashboard.todaysReminders(todayStart, tomorrowStart),
      };
    },
  };
}
