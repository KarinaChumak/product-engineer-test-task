// Formats a yearly salary range for a job card, like "50.000–70.000 €".
export function formatSalaryRange(min: number, max: number): string {
  const format = (n: number) => new Intl.NumberFormat('de-DE').format(n);
  if (min > max) return `${format(min)} €`;
  return `${format(min)}–${format(max)} €`;
}
