import { initializeApp } from "firebase-admin/app";

initializeApp();

export { health } from "./health.js";
export { bootstrap } from "./users/bootstrap.js";
export { setAgeAndCity } from "./users/setAgeAndCity.js";
export { exchangeFanPoints, openPack, stadiumVisit } from "./economy/callables.js";
export { scanBranchCode } from "./branch/scan.js";
export { getBranchScreen, rotateBranchCodesDaily } from "./branch/staff.js";
export { redeemCoupon } from "./coupons/redeem.js";
export { issueInvoiceCode, submitInvoiceCode } from "./coupons/invoice.js";
export { expireCouponsHourly, reissueRedeemCode } from "./coupons/lifecycle.js";
export { verifyPresence } from "./location/verifyPresence.js";
export { onMatchResultWritten } from "./content/schedule.js";
export { deleteAccount, purgeDeletedAccountsDaily } from "./users/deleteAccount.js";
