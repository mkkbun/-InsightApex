/** Study streak + activity heatmap helpers (shared by dashboard APIs). */

export function computeStudyStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const uniqueDays = new Set(dates.map((d) => d.toISOString().slice(0, 10)));

  const checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  const todayStr = checkDate.toISOString().slice(0, 10);
  if (!uniqueDays.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (uniqueDays.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function buildStudyActivityHeatmap(
  dates: Date[],
  weeks = 13
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  start.setDate(start.getDate() - start.getDay());

  const cells: { date: string; count: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    cells.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}
