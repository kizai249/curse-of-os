/** المفردات المشتركة — DATA_CONTRACTS.md §0 و§1. نسخة C# في Scripts/Core/Contracts.cs. */
export const CITY_CODES = ["RUH", "JED", "KHB"] as const;
export type CityCode = (typeof CITY_CODES)[number];

export const isCityCode = (value: unknown): value is CityCode =>
  typeof value === "string" && (CITY_CODES as readonly string[]).includes(value);

export type AgeBand = "15_17" | "18_plus";
export type AuthProvider = "anonymous" | "apple" | "google";

/** تغيير المدينة مرة كل 30 يومًا — DATA_CONTRACTS.md §1. */
export const CITY_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/** نافذة الحذف النهائي بعد الطلب — ARCHITECTURE.md §5 (`deleteAccount`). */
export const DELETION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
