# 03 — Ability System (The 60 Marks) & The Assassin Challenge

## Part A — Marks

### 1. How Marks Work

At the start of every match, each of a player's 4 Agents is secretly dealt exactly one **Mark** from the active pool (60 Marks in Ranked/Full mode, a curated 20-Mark subset in Quick Match — see `01-core-design.md` §5). A Mark is:

- **Hidden** until triggered — no player, including its owner, sees another Agent's exact Mark before it fires. The owner *does* see their own Mark's full text at all times (they are not surprised by their own ability; opponents are).
- **Triggered** during Step 5 of the turn loop ("Use Optional Ability") if the Agent's trigger condition is currently satisfied, or automatically at the stated trigger moment for reactive Marks (e.g., a Shield triggers the instant it would be attacked, even on an opponent's turn).
- **Single-use per match** unless the Mark's text says otherwise (a small number of Epic Marks are multi-charge, noted below).
- **Categorized** into six families for balance and deckbuilding-adjacent readability: Defense, Offense, Movement, Stealth, Utility, Chaos — 10 Marks each.

### 2. Rarity & Assignment Weights

Each Mark has a rarity that controls how often it's dealt, not its power ceiling — every Mark is designed to be roughly equal in match-swing potential (see `11-balancing-anticheat-roadmap.md` §2 for the swing-value model), rarity only governs *frequency* to keep the meta from calcifying around a handful of "best" Marks.

| Rarity | Weight | Count in pool |
|---|---|---|
| Common | 3x | 30 |
| Rare | 2x | 20 |
| Epic | 1x | 10 |

### 3. Defense Marks (10)

| Name | Trigger | Effect | Rarity |
|---|---|---|---|
| Shield | On being attacked | Negates the attack; Agent stays put, revealed to attacker only. | Common |
| Reflect Attack | On being attacked | The attack fails and the attacker's Agent is sent to Base instead. | Rare |
| Counter Attack | On being attacked | The attack fails; this Agent may immediately move up to 2 tiles onto the attacker. | Rare |
| Iron Skin | Passive, always on | This Agent can only be attacked by a roll of 4, 5, or 6 (attacker declares, then rolls a d6 to confirm — 1-3 fizzles). | Common |
| Last Breath | On being attacked, once | Instead of going to Base, this Agent is placed on the nearest Safe tile behind it. | Rare |
| Guardian Ward | Manual, once | Grants Shield (see above) to one other friendly Agent for the rest of the match. | Common |
| Vanish Ward | On being attacked | The attack fails and this Agent is treated as if it were 3 tiles further along the path for that resolution only (no permanent move). | Epic |
| Thorned Hide | On being attacked | The attack still succeeds, but the attacker's Agent also gets sent to Base (both go home). | Rare |
| Bloodwall | Manual, once | All enemy Agents within 2 tiles cannot attack this Agent's House for the rest of this round. | Common |
| Second Skin | On being sent to Base | Instead, this Agent stays on its current tile and this Mark is consumed. | Epic |

### 4. Offense Marks (10)

| Name | Trigger | Effect | Rarity |
|---|---|---|---|
| Double Strike | Manual, on landing with an enemy present | Attack twice this turn if two valid targets exist. | Rare |
| Piercing Blow | Manual, on attack | This attack cannot be prevented by Shield, Counter, or Reflect. | Epic |
| Ambush | Passive | This Agent may attack an enemy on an adjacent tile without moving onto it. | Common |
| Poisoned Blade | On successful attack | The sent-home enemy Agent must roll two 6s (not one) to re-enter from Base this match. | Common |
| Chain Kill | On successful attack | Immediately roll again and may attack a second time with the same Agent. | Epic |
| Execution | Manual, once | Instantly send any one enemy Agent within 3 tiles to Base, no roll or adjacency required. | Epic |
| Overwhelm | Passive | When this Agent attacks, it deals as if it were two Agents (still one Kill Point, but both Shield-type and Counter-type Marks on the defender are checked and only stop it if both trigger). | Rare |
| Bloodlust | On successful attack | This Agent's Resolve Meter instantly fills to maximum. | Common |
| Marksman's Eye | Passive | This Agent's attacks always succeed against Iron Skin regardless of the confirmation roll. | Common |
| Berserk Rage | Passive, while behind in score | This Agent's attacks cannot be prevented by any Mark (only cards can stop them). | Rare |

### 5. Movement Marks (10)

| Name | Trigger | Effect | Rarity |
|---|---|---|---|
| Double Move | Manual, once | Move this Agent twice using two consecutive dice rolls in the same turn. | Rare |
| Teleport | Manual, once | Move this Agent directly to any open tile within 6 spaces, ignoring tiles in between. | Rare |
| Leap | Passive | This Agent may ignore Trap and Curse tiles when landing on them (still triggers Treasure/Boost). | Common |
| Wind Step | Passive | +1 to every movement roll for this Agent for the rest of the match. | Common |
| Shortcut | Manual, once | Jump this Agent directly to the next Portal tile ahead, however far it is. | Common |
| Rewind | Manual, once | Move this Agent backward up to 4 tiles to escape danger or reset position. | Common |
| Phase Walk | Passive | This Agent cannot be blocked or redirected by enemy Trap or Portal tiles. | Rare |
| Momentum | On rolling a 6 | Also move this Agent 1 extra tile beyond the roll. | Common |
| Slipstream | Manual, once | Swap this Agent's position with any other friendly Agent on the board. | Epic |
| Homing Path | Passive, in Home Stretch | This Agent no longer needs an exact roll to enter the Throne Vault — any roll ≥ remaining distance banks it. | Epic |

### 6. Stealth Marks (10)

| Name | Trigger | Effect | Rarity |
|---|---|---|---|
| Invisible Turn | Manual, once | This Agent's move this turn is not shown publicly — only its new tile type is revealed, not its exact position relative to others until next contact. | Epic |
| Disguise | Passive | Opponents attempting to view this Agent's Class in any UI/card effect see a randomized false Class. | Common |
| Silent Step | Passive | This Agent does not trigger public tile-landing animations (still resolves the tile effect normally, just quietly). | Common |
| False Trail | Manual, once | Place a visual decoy marker on any tile within 4 spaces for one round; it has no game effect but is indistinguishable in the log from a real move. | Common |
| Shadow Merge | Passive | While sharing a tile with a friendly Agent, this Agent cannot be individually targeted by single-target attacks. | Rare |
| Mimic | Manual, once | Copy the last Mark effect that was publicly revealed this match (by anyone) and use it immediately. | Epic |
| Whisper Network | Passive | Reveals to its owner only which category (not exact Mark) each adjacent enemy Agent carries. | Rare |
| Cloak | Manual, once | This Agent cannot be attacked for one full round. | Common |
| Decoy Mark | Passive | The first time an opponent tries to Mimic or copy this Mark, they get a randomized different Mark instead. | Rare |
| Ghost Walk | Manual, once | Move through Base tiles and Safe tiles of other Houses without being stopped or affected by their tile rules. | Common |

### 7. Utility & Economy Marks (10)

| Name | Trigger | Effect | Rarity |
|---|---|---|---|
| Extra Dice | Passive | This Agent always gets to choose the better of two rolled dice each turn it moves. | Common |
| Treasure Sense | Passive | Treasure tile rewards for this Agent are always the maximum possible value. | Common |
| Lucky Coin | On landing on a Gold tile | Double the Coins earned. | Common |
| Card Surge | Manual, once | Draw 2 Strategy Cards immediately. | Rare |
| Resolve Boost | Passive | This Agent's Resolve Meter fills 50% faster. | Common |
| Scavenger | On an enemy Agent being sent to Base within 2 tiles | Gain 10 bonus Coins. | Common |
| Toll Collector | Passive | Any enemy Agent passing (not landing) this Agent's tile pays 5 Coins to this Agent's House. | Rare |
| Insight | Manual, once | Look at the top 3 cards of the shared Event deck and choose which one triggers next. | Epic |
| Second Wind | On this Agent being sent to Base | Immediately draw 1 Strategy Card as compensation. | Common |
| Blessing | Passive | This Agent is immune to negative effects from Curse tiles. | Rare |

### 8. Chaos Marks (10)

| Name | Trigger | Effect | Rarity |
|---|---|---|---|
| Freeze Enemy | Manual, once | One target enemy Agent cannot move on its controller's next turn. | Rare |
| Trap | Manual, once | Place a hidden Trap on any empty tile within 5 spaces; the next enemy Agent to land there is sent to Base. | Rare |
| Curse | Manual, once | Target enemy Agent has -2 to its next 2 rolls. | Common |
| Reverse Fate | Manual, once | Force the direction of movement to reverse for all Agents for one full round. | Epic |
| Earthquake Step | On landing on a Battle tile | All Agents (friendly and enemy) within 2 tiles are sent to their respective Bases. | Epic |
| Chain Reaction | On this Agent triggering any tile effect | Immediately trigger the same tile effect a second time. | Rare |
| Domino Effect | On this Agent attacking | If successful, the sent-home Agent's House loses 10 Coins as well. | Common |
| Corruption | Manual, once | Turn any one Safe tile into a Battle tile for the rest of the match. | Common |
| Wildcard | Manual, once | Copy any single Strategy Card effect currently in your hand without spending that card. | Epic |
| Overload | Passive, on rolling doubles across two agents in the same round | Both Agents each gain a free extra move of 1 tile. | Common |

### 9. Mark Reveal & Bluffing Rules
- Marks reveal **only their resolved effect**, in the game log, the instant they fire — never their name or category in advance.
- A Mark that never fires in a given match is never revealed at all, including at match-end summary (own-player review screens are the only exception, for learning purposes, shown post-match to that Agent's controller only).
- Declining to trigger an available Mark is always legal and is itself informative — reading *why* an opponent didn't use an obviously available Mark is one of the deepest skill expressions in Vendetta.

---

## Part B — The Assassin Challenge

### 1. Concept
The Assassin Challenge is the game's core "I know something you don't" engine. At match start, **every player privately receives one Blood Oath**: a specific enemy Agent (a named Character belonging to a named opponent House) they are sworn to eliminate before the match ends.

> Example Oath card shown only to you: *"Blood Oath: Eliminate Cobalt House's Kaelen Vos. Reward: 150 pts + 2x Kill bonus + 50 Coins + guaranteed Rare+ card. Failure: -75 pts."*

### 2. Assignment Algorithm
1. After squads are locked in, the server builds a directed assignment: each player `i` is assigned exactly one target Agent belonging to a different player `j`.
2. The assignment graph is randomized but constrained so that **no player is guaranteed to be someone's only possible target** and cycles are allowed and common (A hunts B's Agent, B hunts C's Agent, C hunts A's Agent) — mutual/direct pairs (A hunts B, B hunts A) are explicitly *not* excluded; they're a deliberate high-drama outcome the assignment algorithm allows to occur naturally rather than forces or forbids.
3. In 2-player matches, Oaths are still dealt (each targets one of the other's 4 Agents) — the "hidden" part is *which* of the 4 they were assigned, not who the opponent is.
4. Reassignment never happens mid-match. If your target Agent reaches the Throne Vault (banks) before you complete the Oath, it is locked in as **Failed — Escaped** immediately; there is no do-over. This finality is intentional tension, not a bug to patch around.

### 3. Completion Criteria
- The Oath is completed the moment your Agent successfully attacks (sends to Base) the exact named target Agent, at any point before match end.
- It only needs to happen once. A target that's already been sent home once by someone else and re-entered can still be legally "eliminated" again by the Oath-holder for credit if it hadn't already been credited.

### 4. Rewards & Penalties
| Outcome | Effect |
|---|---|
| **Success** | +150 base Oath Points · that specific Kill's points are doubled · +50 Coins · draw 1 guaranteed Rare-or-better Strategy Card immediately · progress toward the "Debt Collector" achievement track |
| **Failure (target escaped Home)** | -75 points at final scoring · (Ranked only) small Rank progress loss · no further attempt possible |
| **Failure (match ended, unresolved)** | -75 points at final scoring · target remains unaware their pursuer failed unless they check post-match reveal |

### 5. Information Rules
- Nobody ever sees another player's Oath during the match, full stop — not opponents, not teammates in future team modes, not spectators.
- Post-match, all Oaths (target, success/failure) are revealed on the Match Summary screen for everyone, which is where the social payoff lands ("I was hunting you the whole time and you never guarded him").
- Certain Marks and Cards interact directly with Oath secrecy without ever breaking it: Nyx Larque's *Misdirection* Ultimate lets a player publicly announce a fabricated Oath target; the "Smokescreen" Stealth card (see `04-cards.md`) hides your Agents' exact tile position from being called out in chat/voice for one round. No system ever lets a player *verify* another's real Oath mid-match — only bluff about it.

### 6. Design Intent
The Assassin Challenge is deliberately risk/reward rather than mandatory: a player can choose to ignore their Oath entirely and play a pure board-control/economy game, accepting the -75 point ceiling loss as the cost of not engaging. This keeps the mechanic from becoming a tax on players who dislike aggression, while still making it the single highest-leverage scoring lever in the game for those who lean into it — which is exactly the "risk vs. reward" framing the mechanic is built around.
