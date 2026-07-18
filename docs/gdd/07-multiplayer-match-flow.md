# 07 — Multiplayer & Match Flow

## 1. Match Flow State Machine

```
LOBBY → SQUAD_SELECT → OATH_DEAL → MARK_DEAL → MATCH_ACTIVE
   MATCH_ACTIVE:  [ ROUND_START(Event check) → PLAYER_TURN(x N players) → ROUND_END ]  (loop)
   MATCH_ACTIVE → FRACTURE_ROUND (final 3 rounds before Fracture Timer, or triggered by All-Home) → MATCH_END
MATCH_END → SCORING → OATH_REVEAL → REWARDS → POST_MATCH_SUMMARY → (LOBBY | REMATCH)
```

- **Round timer:** 20 seconds per turn (Ranked/Casual), soft-extendable once per turn by 10s if the player is actively interacting with a card/ability UI (prevents punishing thoughtful play while still keeping pace).
- **Fracture Round:** the final 3 rounds before the Fracture Timer (40 rounds Ranked / 25 Quick Match) expires. During Fracture Rounds, Oath rewards/penalties and Kill Points are doubled, and Home Points get a flat +25 bonus per bank — this is the mechanical backbone of the Comeback Engineering pillar, guaranteeing the endgame stays lethal and swingy even if the board state looks decided.
- **Early finish:** if a player banks all 4 Agents before the Fracture Timer, the match immediately enters a single final scoring pass (not a Fracture Round — that only applies to the timer-based ending) so a fast finish doesn't accidentally get the doubled-score treatment it didn't earn by surviving to the wire.

## 2. Modes

| Mode | Players | Squad Source | Mark Pool | Ranked-rated |
|---|---|---|---|---|
| **Tutorial** | 1 (vs. bots) | Fixed starter squad | Marks shown face-up | No |
| **Quick Match** | 2–4 | Fixed starter squad | Curated 20-Mark pool | No |
| **Casual** | 2–4 | Full draft (14 Agents) | Full 60-Mark pool | No |
| **Ranked** | 2–4 | Full draft, no-duplicate-Class rule enforced | Full 60-Mark pool | Yes |
| **Private Room** | 2–4, invite-only | Host-configurable (any legal combination) | Host-configurable | No (unless "Ranked-style" toggle is set for practice, still unrated) |
| **Custom/Event** | 2–4 | Rotates per live event ruleset | Rotates | No |

## 3. Social & Lobby Systems

- **Friends:** standard friends list, presence status (Online/In Match/Away), one-click "Invite to Room."
- **Private Room:** host creates a room code (6-character, shareable), sets mode + ruleset, can lock/kick, fills empty seats with bots on request.
- **Public Matchmaking:** Casual matches on a simple queue; Ranked matches on rating-band matchmaking (±150 rating, widening every 15s of queue time to a hard cap) using the Glicko-2 rating from `06-scoring-progression-economy.md` Part B.
- **Reconnect:** a disconnected player's seat is held for 90 seconds (bot plays conservatively — no attacks, no card plays, safe moves only — in their place) before being replaced by a full AI takeover for the rest of the match; a returning human always regains control immediately on reconnect within that window.
- **AFK Detection:** two consecutive skipped/timed-out turns with no input flags the seat for auto-forfeit-to-bot; three AFK matches in a rolling 24 hours triggers a matchmaking cooldown penalty (Ranked only).
- **Report System:** post-match "Report Player" flow with categories (unsportsmanlike chat, suspected cheating, AFK/griefing); reports feed the moderation queue and the Anti-Cheat pipeline (`11-balancing-anticheat-roadmap.md` §3) — never an instant auto-ban from a single report.
- **Spectator Mode:** join any Private Room or Friends' active match as a read-only viewer; spectators never see any player's private Oath, Mark, or hand contents (only what a player at the table would see: public board state, revealed effects, chat).
- **Replay:** every ranked and casual match is stored as a compact deterministic action log (see `09-technical-architecture.md` §4 for the schema) and can be re-simulated client-side for a full match replay, including a post-match "reveal everything" mode once the match is officially over (Oaths, Marks, hands all become visible in replay only, never live).

## 4. Turn Resolution Order (Server-Authoritative)

1. Client submits an intended action (move/ability/card/attack decision) with a client-generated timestamp.
2. Server validates the action against authoritative match state (legal roll, legal Agent, legal target, resource costs available).
3. Server resolves any reactive triggers (Trap cards, Shield/Counter-type Marks) in a fixed priority order: **Trap card → Defensive Mark → Card effect → Attack resolution**, so simultaneous "gotcha" layers resolve deterministically rather than by network race conditions.
4. Server broadcasts the resolved state delta to all clients (and, redacted, to spectators).
5. Server persists the action to the match's replay log.

This server-authoritative resolution is what makes hidden information actually secure — no client ever holds another player's private data (Oath, exact Mark, hand contents) until the server explicitly reveals it, which closes the obvious "read it out of network traffic" cheat vector by construction (expanded in `11-balancing-anticheat-roadmap.md` §3).
