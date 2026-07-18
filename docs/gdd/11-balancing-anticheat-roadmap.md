# 11 — Balancing Strategy, Anti-Cheat, Future Roadmap

## Part A — Balancing Strategy

### 1. The Swing-Value Model
Every Mark and Strategy Card is rated pre-launch by simulation against a single common yardstick: **expected point swing** — the average absolute change in FinalScore delta between the affected players when the effect fires, measured across thousands of simulated matches with randomized but legal play. Design target: every Common Mark/Card sits within ±10% of the pool's median swing value; Rare within ±20%; Epic/Legendary are allowed a higher ceiling *in exchange for* a real cost (discard 2 cards; drain the Resolve Meter) so their higher swing is paid for, not free. This is what lets 60 Marks and 102 Cards coexist without a small subset becoming a "solved" auto-include — see `03-abilities-and-assassin-challenge.md` §2 and `04-cards.md` §1 for where those costs are defined.

### 2. Class-Diversity Draft Rule
Requiring 4 distinct Classes per squad (`02-characters.md` §1) out of 14 total Classes yields `C(14,4) = 1001` legal squad combinations before even considering which specific Agent fills which Class slot pressure — this is the structural reason no single "best squad" can dominate Ranked the way a duplicate-stacking squad could.

### 3. Live Balance Loop (Post-Launch)
- **Telemetry:** every match log (`match_log` table) feeds a nightly rollup of per-Mark and per-Card trigger rate, win-correlation, and average swing-value-realized (vs. the pre-launch simulated target).
- **Target band:** any Mark/Card whose realized average swing drifts more than 25% from its design target for 2 consecutive weeks at a sufficient sample size gets a numeric tuning pass (not a redesign) — small, frequent adjustments over rare large rebalances, to avoid invalidating players' learned reads mid-season.
- **Character win-rate band:** each of the 14 Agents is tracked for Ranked win-rate contribution; target band is 47–53% at Diamond+ (where draft skill is highest and most representative of true balance). Agents outside the band for a full Ranked season are candidates for a Passive/Ultimate numeric adjustment, announced with patch notes, never silently.

### 4. Oath Risk/Reward Tuning
The -75 / +150 Oath split is only healthy if completion probability across all skill levels stays meaningfully above break-even (~33%, since 75/150 ≈ 1:2 payout ratio implies a naive indifference point near 33% success rate). Playtesting target: **38–45% completion rate** in Ranked, giving skilled, engaged Oath-hunters a real positive expectation while keeping it a genuine risk for players who take it on carelessly. This is monitored via the same telemetry loop as §3.

### 5. Fracture Round Tuning
The final-3-round doubling of Oath/Kill/Home points is calibrated so that a player trailing by up to 40% of the leader's score still has a mathematically live path to first place if they complete an Oath and land 2 kills in the Fracture window — verified by Monte Carlo simulation during development, re-verified any time a Fracture-affecting card (e.g., "The Final Debt" event, "The Long Game" Legendary) is added.

## Part B — Anti-Cheat

### 1. Server-Authoritative Everything
As established in `09-technical-architecture.md` §2: dice rolls, Mark/Oath assignment, and every state mutation happen only inside `SECURITY DEFINER` Postgres RPC functions. A modified or fully-reverse-engineered client can request actions but can never fabricate an outcome — the server independently re-derives the legal result every time and rejects anything that doesn't match an action the current match state actually permits.

### 2. Hidden-Information Leak Prevention
RLS policies scope `agent_instances.mark_id`, `oaths.target_agent_instance_id`, and `hands.card_ids` at the database row/column level, and Realtime channels are subscribed per-connection against those same policies — meaning the "inspect network traffic to see opponents' hidden data" exploit that plagues naive realtime-broadcast architectures is closed structurally, not by obfuscation.

### 3. Bot & Scripting Detection
- **Input timing analysis:** legitimate human play has irregular decision latency; scripted play tends toward suspiciously uniform response times. Statistical outlier accounts are queued for manual/automated review, not auto-banned (to avoid false-positiving fast, confident players).
- **Distinguishing from the legitimate AFK-takeover bot:** the sanctioned reconnect-bot (`07-multiplayer-match-flow.md` §3) is a clearly logged, server-initiated takeover with a distinct action signature, never confusable with a player-side scripting bot in the audit log.

### 4. Multi-Accounting & Boosting Detection
Device/IP/session-fingerprint clustering flags accounts that queue into the same Ranked matches unusually often; combined with Performance Index anomalies (e.g., one account consistently tanking score to feed rating to another), this feeds a moderation queue rather than an automatic penalty, consistent with the Report System's human-in-the-loop design (`07` §3).

### 5. Report & Appeals Pipeline
Reports (`reports` table) plus automated flags land in the same moderation queue. Any account-level action (rating rollback, matchmaking cooldown, suspension) carries a visible in-app appeal path with the specific match(es)/evidence cited — never a silent, unexplained ban, which is both good ethics and reduces support-ticket churn.

## Part C — Future Roadmap

| Phase | Focus |
|---|---|
| **Launch** | 14 Agents, 60 Marks, 102 Cards, 50 World Events, Ranked + Casual + Private Room, full Battle Pass Season 1 |
| **Season 2 (post-launch +10 weeks)** | 2 new Agents (filling any Class gaps telemetry reveals), 10 new Cards, new board cosmetic theme, first competitive online tournament (cosmetic-prize only) |
| **Season 3** | Team mode: 2v2 (Houses paired, shared score, new social-deduction wrinkle — teammates also don't see each other's Oaths), spectator-mode improvements (caster overlay for tournaments) |
| **Season 4** | Draft-Pick Ranked variant (live snake-draft of the 14 Agents pre-match, for players who've reached max Mastery breadth), expanded Mystery/Hidden Mission pool |
| **Ongoing** | Localization expansion beyond AR/EN, Curse of Os ARG narrative crossover events tying Vendetta's Court lore deeper into the parent hub's mystery-box story, continuous live-balance patches per Part A §3 |
| **Long-term exploration** | Controller support for desktop/TV play, potential 6-player "Grand Court" variant board (explicitly out of scope for launch — the 2–4 player core must be proven and healthy first) |

No roadmap item introduces a purchasable gameplay advantage at any point — every future phase is additive content, cosmetic monetization, or competitive/social feature work, holding the line on "No Pay-to-Win" permanently rather than as a launch-only promise.
