// src/utils/age.ts
export type AgeUnit = "days" | "months" | "years";

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYMD(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(dt.getTime()) ? null : dt;
}

/** Age from DOB on a given "today" (defaults to now) */
export function ageFromDOB(dobISO: string, today = new Date()): { n: number; unit: AgeUnit } {
  const dob = parseYMD(dobISO);
  if (!dob) return { n: 0, unit: "years" };

  // total days
  const ms = today.setHours(0, 0, 0, 0) - dob.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));

  // < 1y => "days", otherwise "years"
  if (days < 365) return { n: days, unit: "days" };

  // years (floor, birthday passed?)
  let years = today.getFullYear() - dob.getFullYear();
  const hadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hadBirthday) years -= 1;

  return { n: Math.max(0, years), unit: "years" };
}

/** DOB from an age (value+unit) on a given "today" (defaults to now) */
export function dobFromAge(nRaw: number, unit: AgeUnit, today = new Date()): string {
  const n = Number.isFinite(nRaw) ? Math.max(0, Math.floor(nRaw)) : 0;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (unit === "days") {
    base.setDate(base.getDate() - n);
    return ymd(base);
  }
  if (unit === "months") {
    const y = base.getFullYear();
    const m = base.getMonth() - n;
    const d = base.getDate();
    const dt = new Date(y, m, d);
    return ymd(dt);
  }
  // years
  const dt = new Date(base.getFullYear() - n, base.getMonth(), base.getDate());
  return ymd(dt);
}

/**
 * Validate age + unit against a patient category.
 * Returns { ok: true } when the age is acceptable, otherwise { ok: false, msg: string }.
 */
export function validateAgeAndUnit(
  category: "neonate" | "child" | "adult",
  n: number,
  unit: AgeUnit
): { ok: boolean; msg?: string } {
  // ---- NEONATE -------------------------------------------------
  if (category === "neonate") {
    if (unit !== "days") return { ok: false, msg: "Neonate age must be in days" };
    if (n < 0 || n > 28) return { ok: false, msg: "Neonate age should be 0–28 days" };
    return { ok: true };
  }

  // ---- CHILD ---------------------------------------------------
  if (category === "child") {
    // Convert everything to days for the ">28 days" rule
    const days = unit === "days" ? n : unit === "months" ? n * 30 : n * 365;
    if (days <= 28) return { ok: false, msg: "Child age must be > 28 days" };

    // Upper bound: < 18 years
    const years = unit === "years" ? n : unit === "months" ? n / 12 : n / 365;
    if (years >= 18) return { ok: false, msg: "Child age must be < 18 years" };

    return { ok: true };
  }

  // ---- ADULT ---------------------------------------------------
  if (unit !== "years") return { ok: false, msg: "Adult age must be in years" };
  if (n < 18) return { ok: false, msg: "Adult age must be ≥ 18 years" };
  return { ok: true };
}

/** Legacy wrapper – kept for backward compatibility */
export function checkAgeRuleWithCategory(
  category: "neonate" | "child" | "adult",
  n: number,
  unit: AgeUnit
): { ok: boolean; msg?: string } {
  return validateAgeAndUnit(category, n, unit);
}