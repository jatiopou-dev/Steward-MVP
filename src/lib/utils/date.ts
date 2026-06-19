/** Returns the last day of the given month as YYYY-MM-DD */
export function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return d.toISOString().split('T')[0];
}
