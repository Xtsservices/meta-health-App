// src/utils/wardUtils.ts

export type Ward = {
  id: number;
  hospitalID: number;
  name: string;
  description?: string;
  addedOn?: string;
  lastModified?: string;
  totalBeds?: number;
  availableBeds?: number;
  room?: string;
  floor?: string | null;
  price?: string;
  Attendees?: string;
  amenities?: string[];
  location?: string;
  floorID?: number | null;
};

const PAGE_SIZE_DEFAULT = 10;

/* ------------------------ Amenity icon helper ------------------------ */

export function getAmenityIcon(amenity: string): string {
  const key = (amenity || "").toLowerCase();
  if (
    key.includes("coffee") ||
    key.includes("tea") ||
    key.includes("kettle") ||
    key.includes("espresso") ||
    key.includes("beverage")
  )
    return "☕";
  if (key.includes("bed")) return "🛏️";
  if (
    key.includes("bath") ||
    key.includes("shower") ||
    key.includes("toilet") ||
    key.includes("wash")
  )
    return "🚿";
  if (key.includes("tv")) return "📺";
  if (key.includes("meal") || key.includes("food") || key.includes("restaurant"))
    return "🍽️";
  if (key.includes("wifi") || key.includes("internet")) return "📶";
  if (key.includes("ac") || key.includes("air") || key.includes("cool"))
    return "❄️";
  if (key.includes("oxygen")) return "🩺";
  return "✅";
}

/* --------------------- Floor parsing / display utils --------------------- */

function parseFloorNumber(floor?: string | null): number | null {
  if (!floor) return null;
  const s = floor.toLowerCase();

  // numeric like "1st floor", "2nd", "3"
  const numMatch = s.match(/\b(\d+)(?:st|nd|rd|th)?\b/);
  if (numMatch) return parseInt(numMatch[1], 10);

  // word mapping
  const wordMap: Record<string, number> = {
    ground: 0,
    basement: -1,
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
    eleventh: 11,
    twelfth: 12,
    thirteenth: 13,
    fourteenth: 14,
    fifteenth: 15,
    sixteenth: 16,
    seventeenth: 17,
    eighteenth: 18,
    nineteenth: 19,
    twentieth: 20,
  };

  for (const [w, n] of Object.entries(wordMap)) {
    if (s.includes(w)) return n;
  }

  return null;
}

function numberToOrdinalWord(n: number): string {
  const map: Record<number, string> = {
    0: "Ground",
    1: "First",
    2: "Second",
    3: "Third",
    4: "Fourth",
    5: "Fifth",
    6: "Sixth",
    7: "Seventh",
    8: "Eighth",
    9: "Ninth",
    10: "Tenth",
    11: "Eleventh",
    12: "Twelfth",
    13: "Thirteenth",
    14: "Fourteenth",
    15: "Fifteenth",
    16: "Sixteenth",
    17: "Seventeenth",
    18: "Eighteenth",
    19: "Nineteenth",
    20: "Twentieth",
  };
  if (map[n]) return map[n];
  const suffix =
    n % 10 === 1 && n % 100 !== 11
      ? "st"
      : n % 10 === 2 && n % 100 !== 12
      ? "nd"
      : n % 10 === 3 && n % 100 !== 13
      ? "rd"
      : "th";
  return `${n}${suffix}`;
}

export function floorDisplayLabel(floorKey: string): string {
  const n = parseFloorNumber(floorKey);
  if (n !== null) return `${numberToOrdinalWord(n)} Floor`;
  return floorKey
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function compareFloorKeys(a: string, b: string): number {
  const an = parseFloorNumber(a);
  const bn = parseFloorNumber(b);
  if (an !== null && bn !== null) return an - bn;
  if (an !== null) return -1;
  if (bn !== null) return 1;
  return a.localeCompare(b);
}

function normalizeFloorKeyForGrouping(floor?: string | null): string {
  if (!floor) return "unassigned";
  const n = parseFloorNumber(floor);
  if (n !== null) return `__floor_${n}`;
  return floor.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ------------------------ Grouping + pagination ------------------------ */

export type FloorGroups = {
  groups: Record<string, Ward[]>;
  rep: Record<string, string>;
  pages: string[][];
};

export function buildFloorGroups(
  wards: Ward[],
  pageSize: number = PAGE_SIZE_DEFAULT
): FloorGroups {
  const groups: Record<string, Ward[]> = {};
  const rep: Record<string, string> = {};

  wards.forEach((w) => {
    const key = normalizeFloorKeyForGrouping(w.floor);
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
    if (!rep[key]) rep[key] = w.floor ?? "Unassigned";
  });

  // sort floor keys: numeric floors ordered (Ground, 1st, 2nd...), then others
  const allKeys = Object.keys(groups).sort((a, b) => {
    const floorPrefix = /^__floor_(\d+)$/;
    const ma = a.match(floorPrefix);
    const mb = b.match(floorPrefix);
    if (ma && mb) return Number(ma[1]) - Number(mb[1]);
    if (ma) return -1;
    if (mb) return 1;
    const ra = rep[a];
    const rb = rep[b];
    return compareFloorKeys(ra, rb);
  });

  // paginate by floor, keeping all wards of same floor on the same page
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentCount = 0;

  allKeys.forEach((key) => {
    const count = groups[key]?.length ?? 0;

    if (currentPage.length === 0) {
      currentPage.push(key);
      currentCount = count;
      return;
    }

    if (currentCount + count <= pageSize) {
      currentPage.push(key);
      currentCount += count;
    } else {
      pages.push(currentPage);
      currentPage = [key];
      currentCount = count;
    }
  });

  if (currentPage.length) {
    pages.push(currentPage);
  }

  return { groups, rep, pages };
}

/* ------------------------- Beds visualization data ------------------------- */

export function getBedsArray(
  available: number,
  total: number,
  maxCap: number = 12
): boolean[] {
  const t = Math.max(total || 0, available || 0, 1);
  const cap = Math.min(t, maxCap);
  const filled = Math.max(0, Math.min(available || 0, cap));
  return Array.from({ length: cap }, (_, i) => i < filled);
}
