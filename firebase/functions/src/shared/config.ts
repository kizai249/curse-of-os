/** منطقة كل الدوال والبيانات — ARCHITECTURE.md §4 و PRODUCT_BRIEF.md ت6. */
export const REGION = "me-central2";

/** المحاكي ما يتحقق من رموز App Check، فنفرضها في السحابة فقط. */
export const isEmulator = (): boolean => process.env.FUNCTIONS_EMULATOR === "true";
