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
export { getMyScope, upsertBrand, upsertBranch } from "./admin/catalog.js";
export { setStock, upsertCampaign } from "./admin/campaigns.js";
export { upsertMatchResult } from "./admin/matches.js";
export { createStaffAccount } from "./admin/staffAccounts.js";
export { logEvents } from "./analytics/logEvents.js";
export { aggregateDaily } from "./analytics/aggregate.js";
export { getReport } from "./analytics/report.js";
export {
  closeRound,
  createRoom,
  joinRoom,
  leaveRoom,
  placePiece,
  roomHeartbeat,
  startRound,
  submitLineup,
  sweepRoomsEveryMinute,
} from "./coop/callables.js";
