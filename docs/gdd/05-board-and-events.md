# 05 — The Obsidian Court (Board) & World Events

## 1. Board Layout

The Court is a 52-tile closed ring (identical total path length to a standard Ludo board, so the physical sense of "how long is a lap" stays familiar), with four **House Gates** at the cardinal points (Crimson, Cobalt, Emerald, Gold), each leading into a 6-tile **Home Stretch** that terminates at the shared central **Throne Vault**. Each House also has a 4-slot **Base** off the main ring where its Agents wait before rolling a 6.

Tile type distribution around the 52-tile ring (fixed layout, not randomized per match, so players can learn the board like a real map):

| Tile Type | Count on Ring | Notes |
|---|---|---|
| Normal | 16 | No effect; pure movement. |
| Safe | 8 | 2 per House, positioned right outside each Gate. |
| Battle | 6 | Clustered near board quadrant midpoints — the game's contested chokepoints. |
| Treasure | 6 | |
| Mystery | 4 | |
| Card | 4 | |
| Curse | 3 | |
| Boost | 3 | |
| Portal | 4 (2 linked pairs) | |
| Gold | 4 | |
| **Total** | **52** | Random Event is not a placed tile — see §3. |

## 2. Tile Effects

| Tile | Effect |
|---|---|
| **Normal** | No effect. Exists to make positioning and timing matter — most of the board is quiet on purpose, so the loud tiles read as genuinely significant. |
| **Safe** | No Agent on this tile can be attacked, by any means, including Marks and cards. Two clustered near every Gate to make "getting out of Base" low-risk, matching Ludo's classic safe-zone feel. |
| **Battle** | Landing here with an enemy Agent already present forces an immediate attack resolution (skips the "choose to attack" option — Battle tiles are where fights are guaranteed, not optional). |
| **Treasure** | Draw a Coin reward (10/20/30 scaled by a hidden weighted roll) and 50% chance to draw a Strategy Card. |
| **Mystery** | Draw one random effect from a dedicated Mystery table (small boosts, small penalties, or a free peek at one adjacent tile's contents) — deliberately the highest-variance tile on the board, placed sparingly (only 4) so it's a spice, not the base flavor. |
| **Card** | Draw 1 Strategy Card immediately. |
| **Curse** | Apply a random negative status (from the Chaos Mark/card penalty pool — e.g., -2 next roll, skip next optional ability) unless the Agent has a Curse-immunity effect active. |
| **Boost** | Apply a random positive status (+1 next roll, +5 Resolve, or a free extra move of 1) — the direct counterweight to Curse, placed at a matching low count (3) for symmetry. |
| **Portal** | Instantly move the Agent to its linked Portal tile elsewhere on the ring. Two linked pairs exist, placed roughly opposite each other to create genuine shortcuts and genuine risk (you may portal directly into a hostile cluster). |
| **Gold** | Straightforward Coin tile, smaller flat reward than Treasure but no variance — the "safe economy" tile for players who don't want to gamble on Mystery/Treasure. |
| **Random Event** | Not a fixed tile — see §3. Triggers on a shared timer, affecting the whole board and every player simultaneously rather than one Agent on one tile. |

## 3. World Events

Every **4 rounds** (tunable per mode), the shared **Event Deck** (50 cards, shuffled once per match, drawn without replacement) triggers automatically at the start of the round, before any player rolls. The event is announced to all players simultaneously and its effect lasts for that round only unless stated otherwise. This is the mechanism that keeps a match from ever going fully "solved" or stale — every 4 rounds, the whole state of play gets a shared jolt that all players must react to with the same information at the same time (no hidden-information asymmetry in the event itself, only in how players choose to respond to it).

### The 50 World Events

| # | Name | Effect |
|---|---|---|
| 1 | Fog of Os | Tile effects are hidden ("???") until landed on, for everyone, this round. |
| 2 | Earthquake | All Agents currently on Battle tiles are sent to Base. |
| 3 | Double Coins | All Coin rewards this round are doubled. |
| 4 | Reverse Direction | Movement direction reverses for everyone this round. |
| 5 | Teleport Storm | Every player must move their furthest-along Agent to a random tile within 6 spaces. |
| 6 | Treasure Rain | Every Treasure tile on the board re-triggers its reward instantly for whoever is nearest. |
| 7 | Power Outage | No Marks may be triggered this round (dice and movement still function). |
| 8 | Chaos Round | Every player draws 1 random Chaos card immediately. |
| 9 | Blood Moon | All Kill Points this round are doubled. |
| 10 | Silent Court | No card may be played this round except Trap cards. |
| 11 | Gilded Hour | All Gold tiles pay triple this round. |
| 12 | The Watching Eye | Every player's Oath target is briefly highlighted to that player only (a free reminder, not new info). |
| 13 | Landslide | All Portal tiles are disabled this round. |
| 14 | Second Wind | Every player draws 1 Strategy Card. |
| 15 | Curse Tide | Every Curse tile on the board re-triggers on the nearest Agent. |
| 16 | Boon Tide | Every Boost tile on the board re-triggers on the nearest Agent. |
| 17 | Frozen Court | Rolls of 1 or 2 this round grant no movement (reroll once, then stand). |
| 18 | Overclock | Rolls of 6 this round grant two bonus rolls instead of one. |
| 19 | Market Crash | All Coins on the board (all players) are reduced by 10%. |
| 20 | Market Boom | All players gain 15 Coins immediately. |
| 21 | Whispers Rise | Every player sees the Class (not Mark) of one random enemy Agent. |
| 22 | The Long Shadow | All Safe tiles are disabled this round. |
| 23 | Sanctuary | All tiles count as Safe this round (a full cooldown round). |
| 24 | Bloodlines Stir | Every Agent's Resolve Meter gains +2 immediately. |
| 25 | Ambush Weather | The next attack each player makes this round cannot be prevented by Shield-type Marks. |
| 26 | Shifting Sands | All Home Stretch entries require -1 from the exact roll this round (easier to bank). |
| 27 | Iron Gate | Base exit requires rolling a 5 or 6 this round instead of just a 6. |
| 28 | Twin Suns | Every player may move two Agents this round instead of one. |
| 29 | The Hollow Hour | All Mystery tiles pay out their best-case result automatically if landed on. |
| 30 | Debt Collection | Every player with a still-active Oath gains 10 bonus points immediately. |
| 31 | Court Intrigue | Every player must publicly reveal the Class of one of their own Agents (their choice which). |
| 32 | Wildfire | Every Battle tile activates immediately regardless of occupancy. |
| 33 | The Still Hour | No Agent may attack this round; movement and tiles still function normally. |
| 34 | Tempest | All dice rolls this round are rolled twice, higher result used. |
| 35 | Undertow | All dice rolls this round are rolled twice, lower result used. |
| 36 | Golden Age | Every Gold and Treasure tile is refreshed (reusable again this match) if already claimed. |
| 37 | The Reckoning | Every player's current Kill count is revealed publicly (not who killed whom, just totals). |
| 38 | Fracture Preview | A one-round preview of Fracture Round scoring multipliers (see `07-multiplayer-match-flow.md`), without permanently starting it. |
| 39 | Fickle Fate | All active Curse effects on the board are removed. |
| 40 | Binding Oath | Oaths cannot be completed this round (a pure tension/delay round). |
| 41 | Fair Winds | +1 movement to every Agent on the board this round. |
| 42 | Undertow of Coins | Every player must pay 5 Coins per Agent currently on the board, split evenly among opponents. |
| 43 | The Masked Ball | Every player's Mark categories are temporarily shuffled visually in the UI (cosmetic scramble only — no real Mark changes; pure misdirection theater). |
| 44 | Second Sight | Every player may look at their own next 2 dice rolls in advance (still random, just previewed). |
| 45 | The Empty Throne | Home Point rewards are doubled for any Agent that banks this round. |
| 46 | Cracked Foundations | All Trap cards currently placed on the board trigger immediately, regardless of who lands there. |
| 47 | The Long Silence | Chat/voice and Whispered Deal cards are disabled this round. |
| 48 | Sudden Storm | Every Agent within 3 tiles of a Portal is pulled into it. |
| 49 | The Final Debt | If this is the last possible Event before the Fracture Timer ends, all Oath rewards/penalties are tripled instead of doubled for the remainder of the match. |
| 50 | Curse of Os Awakens | A single random Agent on the board (chosen by the system) is marked; the next player to attack it gets double Kill Points — a rare, high-drama spotlight event. |

### 3.1 Event Cadence Design Notes
- 50 events shuffled once per match and drawn without replacement means a single match sees roughly 6–10 events (matches run 25–40 rounds at 1 event per 4 rounds), so no two matches feel the same, and the full pool only fully cycles across many matches — reinforcing long-term replayability rather than short-term memorization.
- Every event is designed to be resolved with a single clear banner + icon, consistent with the Two-Minute Rule — a brand-new player never needs to read rules text mid-match; the UI states the effect in one plain sentence (see `08-ui-ux-design-system.md` for the Event Banner component).
