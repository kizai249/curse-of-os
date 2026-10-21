import { initializeApp } from "firebase-admin/app";

initializeApp();

export { health } from "./health.js";
export { bootstrap } from "./users/bootstrap.js";
export { setAgeAndCity } from "./users/setAgeAndCity.js";
export { exchangeFanPoints, openPack, stadiumVisit } from "./economy/callables.js";
export { verifyPresence } from "./location/verifyPresence.js";
export { onMatchResultWritten } from "./content/schedule.js";
export { deleteAccount, purgeDeletedAccountsDaily } from "./users/deleteAccount.js";
