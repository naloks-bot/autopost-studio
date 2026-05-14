function createRoundedFutureDate(baseDate, minimumOffsetMinutes = 0, roundToMinutes = 5) {
  const next = new Date(baseDate.getTime() + minimumOffsetMinutes * 60 * 1000);
  next.setSeconds(0, 0);

  if (roundToMinutes > 1) {
    const minutes = next.getMinutes();
    const remainder = minutes % roundToMinutes;
    if (remainder !== 0) {
      next.setMinutes(minutes + (roundToMinutes - remainder));
    }
  }

  return next;
}

function atLocalTime(baseDate, hours, minutes = 0) {
  const next = new Date(baseDate);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function ensureFuture(date, fallbackDays = 1) {
  const now = new Date();
  if (date.getTime() > now.getTime()) return date;
  const next = new Date(date);
  next.setDate(next.getDate() + fallbackDays);
  return next;
}

export function toLocalDateTimeValue(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export function getNextAvailableScheduleDate(scheduledPosts = [], options = {}) {
  const stepMinutes = options.stepMinutes || 30;
  const initialDate = createRoundedFutureDate(new Date(), options.minimumOffsetMinutes || 60, 5);
  const futureDates = (scheduledPosts || [])
    .map((post) => new Date(post?.scheduled_at || ""))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() >= initialDate.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  if (futureDates.length === 0) {
    return initialDate;
  }

  const latest = futureDates[futureDates.length - 1];
  return createRoundedFutureDate(latest, stepMinutes, stepMinutes);
}

export function getQuickSchedulePresets(scheduledPosts = []) {
  const now = new Date();
  const tonight = ensureFuture(atLocalTime(now, 20, 0));
  const tomorrowMorning = atLocalTime(new Date(now.getTime() + 24 * 60 * 60 * 1000), 9, 0);
  const plusOneHour = createRoundedFutureDate(now, 60, 5);
  const plusOneDay = createRoundedFutureDate(now, 24 * 60, 5);
  const primeTime = ensureFuture(atLocalTime(now, 19, 30));
  const nextAvailableSlot = getNextAvailableScheduleDate(scheduledPosts, {
    minimumOffsetMinutes: 60,
    stepMinutes: 30,
  });

  return [
    { id: "tonight", label: "Tonight", value: toLocalDateTimeValue(tonight) },
    { id: "tomorrow-morning", label: "Tomorrow Morning", value: toLocalDateTimeValue(tomorrowMorning) },
    { id: "plus-1-hour", label: "+1 Hour", value: toLocalDateTimeValue(plusOneHour) },
    { id: "plus-1-day", label: "+1 Day", value: toLocalDateTimeValue(plusOneDay) },
    { id: "prime-time", label: "Prime Time", value: toLocalDateTimeValue(primeTime) },
    { id: "next-slot", label: "Next Available Slot", value: toLocalDateTimeValue(nextAvailableSlot) },
  ];
}

export function getFastReschedulePresets(scheduledPosts = []) {
  const now = new Date();
  const plusOneHour = createRoundedFutureDate(now, 60, 5);
  const plusOneDay = createRoundedFutureDate(now, 24 * 60, 5);
  const primeTime = ensureFuture(atLocalTime(now, 19, 30));
  const nextAvailable = getNextAvailableScheduleDate(scheduledPosts, { minimumOffsetMinutes: 0, stepMinutes: 30 });
  const nextPrimeTime = nextAvailable.getTime() > primeTime.getTime() ? nextAvailable : primeTime;

  return [
    { id: "plus-1-hour", label: "+1 Hour", value: toLocalDateTimeValue(plusOneHour) },
    { id: "plus-1-day", label: "+1 Day", value: toLocalDateTimeValue(plusOneDay) },
    {
      id: "prime-time",
      label: "Next Prime Time",
      value: toLocalDateTimeValue(nextPrimeTime),
    },
  ];
}
