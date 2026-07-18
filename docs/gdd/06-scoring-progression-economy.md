# 06 — Scoring, Ranking, Progression & Economy

## Part A — Scoring System

### 1. Design Intent
Reaching the Throne Vault first is one strong path to victory, not the only one. Score is the single source of truth for who won, so that "I got fourth on the board but first on the scoreboard" is a real, frequent, satisfying outcome — this is the mechanism behind the Comeback Engineering pillar.

### 2. Score Formula

```
FinalScore =
    (HomePoints)
  + (KillPoints)
  - (DeathPenalty)
  + (TreasurePoints)
  + (ChallengePoints)
  + (HiddenMissionPoints)
  + (SurvivalPoints)
  + (EventPoints)
  + (OathAdjustment)
```

| Component | Value |
|---|---|
| **Home Points** | +100 per Agent banked in the Throne Vault. +50 additional "Full House" bonus if all 4 of a player's Agents bank before match end. |
| **Kill Points** | +30 per successful attack that sends an enemy Agent to Base (see Mark/card modifiers that double or add to this in `03` and `04`). |
| **Death Penalty** | -15 each time one of your own Agents is sent to Base. Deliberately small — punishing aggression too hard would kill the game's pace. |
| **Treasure Points** | +1 point per 10 in-match Coins earned from Treasure/Gold/Mystery tiles (Coins themselves are tracked separately for the Economy — see Part C §2). |
| **Challenge Points** | +50 to +150 per completed mid-match Hidden Mission (see §3 below), scaled by difficulty. |
| **Hidden Mission Points** | Same pool as Challenge Points — Hidden Missions are the delivery mechanism for Challenge scoring. |
| **Survival Points** | +2 per round an Agent has spent on the board without being sent to Base, capped at +40 per Agent, rewarding patient, controlled play modestly without making turtling the dominant strategy. |
| **Event Points** | Variable, from favorable World Event outcomes (e.g., "The Empty Throne" doubling Home Points that round). |
| **Oath Adjustment** | +150 (plus doubled Kill Points on that specific kill) on Blood Oath success; -75 on failure. See `03-abilities-and-assassin-challenge.md` Part B. |

### 3. Hidden Missions
Separate from the one Blood Oath per match, every player has a **30% chance per Mystery tile landed on** to be secretly offered a Hidden Mission — a small, optional, privately-shown bonus objective ("Bank 2 Agents before round 15," "Collect 3 Treasure tiles," "Survive a full round with all 4 Agents on the board"). These are strictly upside: declining or failing one has zero penalty, unlike the mandatory-feeling Oath. They exist to give quieter, econ/board-control-focused players their own hidden-information moments ("I know I'm quietly two Agents away from a bonus you can't see") without forcing everyone into direct confrontation.

### 4. Tiebreaks
Exact score ties (rare but possible) are broken in order by: (1) more Agents currently banked, (2) completed Oath over failed/none, (3) higher total Kill Points, (4) sudden-death: one additional shared round with all scoring frozen except Kill/Home points.

## Part B — Ranking Algorithm

### 1. Why Not Plain Elo
Straight win/loss Elo in a 2–4 player, score-driven game punishes a skilled player who finishes 2nd by score in a lucky opponent's runaway match exactly as hard as it punishes a genuine blowout loss. Vendetta instead uses a **Glicko-2 core** (well-understood, handles rating volatility/uncertainty better than Elo, industry standard for this scale) modified by a **Performance Index** so partial credit for good play under a loss is real.

### 2. Performance Index
At match end, each player's raw FinalScore is converted to a **percentile rank among that match's participants** (e.g., in a 4-player match: 1st/2nd/3rd/4th by score). This percentile — not raw placement — feeds the Glicko-2 update as if it were a fractional win:

```
PerformanceValue(player) = (players_below_you_in_score) / (total_players - 1)
```

A player who places 2nd of 4 by score gets `PerformanceValue = 2/3 ≈ 0.667` — meaningfully better than a hard loss (0.0) and worse than a clean win (1.0). This value replaces the binary win/loss term in the standard Glicko-2 update equations, everything else (rating deviation, volatility, K-scaling) follows the published Glicko-2 spec unmodified.

### 3. Rank Tiers
Bronze → Silver → Gold → Platinum → Diamond → Obsidian (top ~1%), each with 4 sub-divisions, cosmetically skinned to the Curse of Os theme (obsidian shards, court sigils). Ranked seasons run 10 weeks; end-of-season rank grants a **cosmetic-only** frame/title and a Battle Pass currency bonus — never a gameplay unlock.

### 4. Anti-Boosting Safeguards
Performance Index is computed server-side from the authoritative match log (see `09-technical-architecture.md`), never client-reported. Matches between accounts sharing a device/IP above a frequency threshold are flagged for the Anti-Cheat pipeline (`11-balancing-anticheat-roadmap.md` §3) rather than auto-penalized, to avoid punishing legitimate same-household play.

## Part C — Progression

### 1. Account XP & Level
XP is earned from: match completion (flat +50), Performance Index (up to +100 scaled), daily/weekly missions, and achievements. Level curve is a standard soft-exponential (`XP_to_next = 200 + 40 * level`), capped display at Level 100 with prestige cosmetic borders beyond that. Leveling grants Coins and cosmetic unlock progress only.

### 2. Battle Pass
A seasonal (10-week) dual-track pass — **Free** and **Premium** — with 60 tiers. Every tier on both tracks is cosmetic or soft-currency only (Coins, crafting materials, card back skins, profile frames, House-color alternate palettes, victory animations, Agent voice line packs). The Premium track is purchasable with Gems and unlocks faster cosmetic access to the *same* content the Free track eventually grants — never exclusive power.

### 3. Missions & Achievements
- **Daily Missions** (3/day, rotate): e.g., "Win a Battle tile confrontation," "Complete a Blood Oath," "Play 3 Economy cards."
- **Weekly Missions** (5/week): larger asks, e.g., "Bank all 4 Agents in a single match," "Reach the Fracture Round in 5 matches."
- **Achievements** (permanent, account-wide): tracked ladders like *Debt Collector* (cumulative completed Oaths), *Iron Wall* (cumulative Shields/Counters triggered), *Kingmaker* (cumulative Legendary cards played) — each with bronze/silver/gold/platinum thresholds and a cosmetic reward at each.

### 4. Character Mastery
Each of the 14 Agents has an independent Mastery track (XP earned only from matches where that Agent was played), unlocking, in order: alternate portrait art → voice line pack → cosmetic skin tier 1 → skin tier 2 → an exclusive emote → and, at max Mastery, **the right to draft that Agent's associated Legendary card into your pool** (mechanical, but earned purely through play volume with that specific Agent, identical for every player, and never purchasable — this is the one place "progression" touches the Legendary card layer, and it's explicitly a time/play investment, not a payment one).

### 5. Titles, Badges, Profile Frames
Purely cosmetic identity layer awarded from Ranked tiers, Achievements, Season completion, and limited-time Curse of Os ARG crossover events (tying back into the parent hub's mystery-box mythos) — no gameplay linkage whatsoever.

## Part D — Economy

### 1. Currencies
| Currency | Type | Earned via | Spent on |
|---|---|---|---|
| **Coins** | Soft | Matches, missions, Treasure/Gold tiles' meta-conversion (20% of in-match Coins convert to permanent Coins at match end) | Cosmetic store items, Sealed Chests, crafting |
| **Gems** | Premium | Real-money purchase, or slowly via Battle Pass/Achievements | Premium Battle Pass track, direct cosmetic purchase, Sealed Chests, crafting acceleration |
| **Runes** | Crafting material | Duplicate cosmetic shards from Sealed Chests, Character Mastery milestones | Crafting specific chosen cosmetics (targeted, not random) |

### 2. In-Match Coins vs. Meta Coins
In-match Coins (earned from Gold/Treasure/Mystery tiles and Economy cards) are primarily a **strategic resource inside the match** (fuel for Economy-category cards and Treasure Points scoring) — they are explicitly not a 1:1 income faucet for the meta-economy, which is why only a fixed 20% converts to permanent Coins at match end. This keeps in-match economic play meaningful for score without turning "farm Coins every match" into a dominant meta-strategy that would crowd out the game's actual strategic pillars.

### 3. Sealed Chests (Loot Boxes) — Compliance-First Design
- **Cosmetic contents only** — card backs, portrait skins, victory animations, board themes, profile frames. Never a card, Mark, character, or any match-affecting item.
- **Disclosed odds** on every chest, shown before purchase, per Apple/Google storefront policy and applicable regional loot box disclosure law.
- **Pity counter**: guaranteed Epic-or-better cosmetic every 20 chests opened without one.
- **No purchasable chests marketed to or targetable at minors' accounts** beyond the platform's standard age-gating; chest purchase requires the platform's real-money purchase confirmation flow (no separate bypass).

### 4. Unlock System
Every Character, Mark, and Strategy Card is available to **every player from a fixed, small amount of normal play** (see Player Journey, `01-core-design.md` §5) — nothing in the competitively-relevant pool is ever purchase-gated. The Store only ever sells skins, boards, emotes, and Battle Pass access.

### 5. Store & Events
A rotating storefront (weekly cosmetic rotation) plus limited-time **Curse of Os Crossover Events** (2–3 per season) offering themed cosmetics tied to the parent ARG's ongoing mystery-box narrative — these are timed for marketing/engagement purposes but never remove any previously-earned player progress or power, satisfying "No Pay-to-Win" without exception.
