// Shared birth-date validation for onboarding + BirthDataForm.
// Canonical wire format is YYYY-MM-DD (matches natal-api / profiles.birth_date).

/** Returns an error message, or null when the value is a valid birth date. */
export function validateBirthDate(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter your birth date as YYYY-MM-DD.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return 'Use YYYY-MM-DD (e.g. 1990-06-15).';
  }

  const [ys, ms, ds] = v.split('-');
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);
  // Construct in UTC so local TZ doesn't shift the calendar day.
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return 'That date isn’t valid — check the month and day.';
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (dt.getTime() > todayUtc) {
    return 'Birth date can’t be in the future.';
  }

  return null;
}

export function isValidBirthDate(value: string): boolean {
  return validateBirthDate(value) === null;
}
