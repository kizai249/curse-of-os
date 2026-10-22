import { onSchedule } from "firebase-functions/v2/scheduler";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { authedCallable } from "../shared/callable.js";
import { REGION } from "../shared/config.js";
import * as rooms from "./rooms.js";

type In<F extends (uid: string, input: never, ...rest: never[]) => unknown> = Parameters<F>[1];

/** «منتخبنا يجمعنا» — بأسماء ARCHITECTURE §5، والحركات (`placePiece` و`submitLineup`) والنبض (`roomHeartbeat`). */
export const createRoom = authedCallable((r) => rooms.createRoom(r.auth.uid, r.data as In<typeof rooms.createRoom>));
export const joinRoom = authedCallable((r) => rooms.joinRoom(r.auth.uid, r.data as In<typeof rooms.joinRoom>));
export const leaveRoom = authedCallable((r) => rooms.leaveRoom(r.auth.uid, r.data as In<typeof rooms.leaveRoom>));
export const startRound = authedCallable((r) => rooms.startRound(r.auth.uid, r.data as In<typeof rooms.startRound>));
export const placePiece = authedCallable((r) => rooms.placePiece(r.auth.uid, r.data as In<typeof rooms.placePiece>));
export const submitLineup = authedCallable((r) => rooms.submitLineup(r.auth.uid, r.data as In<typeof rooms.submitLineup>));
export const roomHeartbeat = authedCallable((r) => rooms.heartbeat(r.auth.uid, r.data as In<typeof rooms.heartbeat>));

/** Cloud Task عند `endsAt` (تُجدول من startRound وبعد كل عقوبة). */
export const closeRound = onTaskDispatched<{ roomId?: string }>(
  { region: REGION, retryConfig: { maxAttempts: 5, minBackoffSeconds: 5 }, rateLimits: { maxConcurrentDispatches: 50 } },
  async (req) => {
    if (typeof req.data?.roomId === "string") await rooms.closeRound(req.data.roomId);
  },
);

/** احتياط كل دقيقة لو Cloud Tasks ما توفرت أو تأخرت (Q5) — يحرر الحجوزات خلال ≤ 60 ث من endsAt (AT-07). */
export const sweepRoomsEveryMinute = onSchedule({ schedule: "* * * * *", timeZone: "Asia/Riyadh", region: REGION }, async () => {
  await rooms.sweepRooms();
});
