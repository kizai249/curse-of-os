import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { PROJECT_ID } from "./helpers.js";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve(__dirname, "../../../firestore.rules"), "utf8") },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "content/teams"), { list: ["KSA"] });
    await setDoc(doc(db, "content/schedule"), { matches: [] });
    await setDoc(doc(db, "matchResults/m1"), { matchNo: 1, status: "scheduled" });
    await setDoc(doc(db, "users/alice"), { fanPoints: 10, packs: 1 });
    await setDoc(doc(db, "users/alice/teamCards/KSA_common"), { count: 1 });
    await setDoc(doc(db, "users/bob"), { fanPoints: 5 });
    await setDoc(doc(db, "coupons/c1"), { uid: "alice", status: "issued" });
  });
});

describe("public content", () => {
  it("signed-in players can read content and match results", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "content/teams")));
    await assertSucceeds(getDoc(doc(db, "matchResults/m1")));
    await assertSucceeds(getDoc(doc(db, "content/schedule")));
  });

  it("unauthenticated clients cannot read content", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "content/teams")));
  });

  it("no client can write content or match results", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "content/teams"), { list: [] }));
    await assertFails(updateDoc(doc(db, "matchResults/m1"), { status: "finished" }));
    await assertFails(setDoc(doc(db, "content/schedule"), { matches: [{ home: "KSA" }] }));
  });
});

describe("users", () => {
  it("a player reads only their own profile and cards", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "users/alice")));
    await assertSucceeds(getDoc(doc(db, "users/alice/teamCards/KSA_common")));
    await assertFails(getDoc(doc(db, "users/bob")));
  });

  it("a player cannot write balances on their own profile", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(db, "users/alice"), { fanPoints: 999999 }));
    await assertFails(setDoc(doc(db, "users/alice/teamCards/JPN_legendary"), { count: 1 }));
  });
});

describe("default deny", () => {
  it("financial collections are closed to clients until their slice opens them", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "coupons/c1")));
    await assertFails(setDoc(doc(db, "coupons/c2"), { uid: "alice", status: "issued" }));
    await assertFails(setDoc(doc(db, "campaigns/x/stock/b1"), { remaining: 100 }));
    await assertFails(getDoc(doc(db, "anything/else")));
  });
});
