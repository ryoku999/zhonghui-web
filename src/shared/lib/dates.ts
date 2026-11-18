const locale = "es-PE";
const timeZone = "America/Lima";

const civilDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
const eventDate = new Intl.DateTimeFormat(locale, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone,
  hourCycle: "h23",
});

export function formatDatePE(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? civilDate.format(date)
    : "—";
}

export function formatDateTimePE(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? eventDate.format(date) : "—";
}
