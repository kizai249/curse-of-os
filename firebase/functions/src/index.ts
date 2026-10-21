import { initializeApp } from "firebase-admin/app";

initializeApp();

export { health } from "./health.js";
export { bootstrap } from "./users/bootstrap.js";
export { setAgeAndCity } from "./users/setAgeAndCity.js";
export { onMatchResultWritten } from "./content/schedule.js";
export { deleteAccount, purgeDeletedAccountsDaily } from "./users/deleteAccount.js";
