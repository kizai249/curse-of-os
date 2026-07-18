# 02 — Character System: The Fourteen Bloodlines

## 1. System Overview

There are **14 Agents** in the launch roster. Every Agent has:
- A **Class** (archetype — determines general board behavior)
- A **Passive** — always-on, permanent to the character, known to everyone at squad-select (this is *public* information, unlike Marks)
- An **Ultimate** — a powerful activated ability, charged over the course of a match via the shared **Resolve Meter** (fills 1 point per space moved by that Agent, +2 on landing on a Card tile, +3 on winning combat; usable once Resolve reaches 10, then resets to 0)
- A **Difficulty** rating (Easy / Medium / Hard) describing how much the character rewards precise play
- A defined **Play Style**, **Strengths**, **Weaknesses**
- Two lines of **Lore** tying them into the Curse of Os / Obsidian Court mythos

Passives and Ultimates are **character identity** (public, consistent every match). The 60 **Marks** (`03-abilities-and-assassin-challenge.md`) are a *separate*, per-match secret layer randomly assigned on top of whichever Agent a player brings — this is what keeps even a fully-known character unpredictable game to game.

Squad composition rule: in Draft mode, a player selects 4 of the 14 Agents; no two Agents on the same squad may share a Class, which forces build diversity and prevents any single-archetype squad from dominating (see `11-balancing-anticheat-roadmap.md` §1 for the math behind this rule).

## 2. The Roster

### 1. Kaelen Vos — *The Iron Oath* (Warrior)
- **Passive — Unshaken:** Kaelen cannot be forced to retreat or be moved backward by opponents' cards or Marks (World Events still apply normally).
- **Ultimate — Last Stand:** For this turn, all attacks against Kaelen fail and are converted into a Kill for Kaelen instead.
- **Difficulty:** Easy · **Play Style:** Frontline anchor, forward pressure
- **Strengths:** Nearly impossible to displace once positioned; punishes reckless attackers.
- **Weaknesses:** Slow Resolve gain relative to squishier Agents; poor at contesting Portal/Stealth tiles.
- **Lore:** Kaelen swore the first Blood Oath the Court ever recorded, and has never once broken a promise — including the ones that ruined him.

### 2. Serai Thorn — *The Quiet Debt* (Assassin)
- **Passive — Marked for Later:** The first time each match Serai attacks an Agent, that attack cannot be Shielded, Countered, or Reflected.
- **Ultimate — Collection Due:** Instantly attack any one enemy Agent on the board regardless of distance or shared tile (ignores Safe tiles once per match).
- **Difficulty:** Hard · **Play Style:** Surgical Oath-completion specialist
- **Strengths:** The single best Agent in the game at closing out a Blood Oath cleanly.
- **Weaknesses:** Extremely fragile once her Passive is spent; a poor Resolve engine without kills.
- **Lore:** Serai keeps a ledger of names. Everyone on it eventually gets a visit.

### 3. Renna Blackthorn — *The Ember Widow* (Mage)
- **Passive — Scorched Path:** Any enemy Agent that lands on the same tile Renna most recently left takes -1 to their next roll.
- **Ultimate — Wildfire:** Deal a Kill-equivalent effect to every enemy Agent within 3 tiles of Renna simultaneously (no card can prevent this, but Shields still apply individually).
- **Difficulty:** Medium · **Play Style:** Area denial, board control
- **Strengths:** Punishes clustering; strong vs. multi-Agent pushes.
- **Weaknesses:** Weak 1-on-1; telegraphed area control invites Portal/Reverse counterplay.

### 4. Nyx Larque — *The Sleight* (Trickster)
- **Passive — Palm the Card:** Once per round, Nyx may swap the position of two of her own Agents that are each within 2 tiles of a Mystery tile.
- **Ultimate — Misdirection:** Publicly declare a false Blood Oath target for the remainder of the match; the real Oath UI is only ever shown to you, so opponents cannot verify either way.
- **Difficulty:** Hard · **Play Style:** Information warfare, repositioning
- **Strengths:** Best Agent in the game at protecting a real Oath by manufacturing doubt.
- **Weaknesses:** Contributes little raw combat power; needs a coordinated plan to pay off.
- **Lore:** Nobody has ever caught Nyx lying. Several have caught her telling the truth and refused to believe it — which is the same thing to her.

### 5. Brannoch Ironhide — *The Wall That Remembers* (Guardian)
- **Passive — Standing Oath:** Any friendly Agent sharing a tile with Brannoch cannot be attacked.
- **Ultimate — Bulwark:** For the next full round, Brannoch and all Agents within 2 tiles are immune to World Events.
- **Difficulty:** Easy · **Play Style:** Escort, board-state protection
- **Strengths:** Turns clustering from a liability into a fortress; excellent Oath-target bodyguard.
- **Weaknesses:** Passive is useless when playing alone/spread out; low kill pressure.

### 6. Voss Nightingale — *The Mercy Clause* (Support)
- **Passive — Second Chances:** When a friendly Agent is sent back to Base, Voss may immediately move that Agent's Resolve Meter progress to any other friendly Agent.
- **Ultimate — Reprieve:** Return any one friendly Agent from Base directly onto its Launch Tile without needing to roll a 6.
- **Difficulty:** Medium · **Play Style:** Tempo recovery, loss mitigation
- **Strengths:** Turns getting killed from a full tempo loss into a partial one; strong in longer matches.
- **Weaknesses:** No proactive offense; does nothing if nobody on the squad ever gets attacked.

### 7. Mira Sable — *The Long Silence* (Ranger)
- **Passive — Marked Sightline:** Mira can always see (as a UI overlay only to her controller) the tile type two spaces ahead of any of her own Agents before committing to a move.
- **Ultimate — Called Shot:** Attack any enemy Agent within 4 tiles in a straight line along the path without moving onto their tile (Mira does not need to land on them).
- **Difficulty:** Medium · **Play Style:** Ranged pressure, information edge
- **Strengths:** Threatens kills other characters physically cannot reach; strong scouting.
- **Weaknesses:** Called Shot can be Shielded/Countered exactly like a normal attack, and Mira has no defensive Passive of her own.

### 8. Torvald Cinder — *The Debt Collector* (Berserker)
- **Passive — Blood Price:** Every time one of Torvald's own Agents is sent to Base, Torvald's Resolve Meter gains +4 immediately.
- **Ultimate — Reckoning:** Torvald's next attack this match always succeeds and cannot be prevented by any Mark, card, or effect.
- **Difficulty:** Easy · **Play Style:** Comeback engine, aggressive risk-taking
- **Strengths:** Gets stronger the further behind he falls — a direct embodiment of the Comeback Engineering pillar.
- **Weaknesses:** A Torvald squad that's *ahead* has no extra tools; predictable Ultimate timing once opponents learn the Passive.

### 9. Isolde Grey — *The Mirror Widow* (Illusionist)
- **Passive — Borrowed Face:** Once per match, Isolde may reveal her Mark as if it were a different, freely-chosen category (Attack/Defense/Movement/etc.) for exactly one resolution, forcing opponents to react to false information.
- **Ultimate — Hall of Mirrors:** Create a decoy token on any tile within 3 spaces; enemies who attack the decoy waste their turn's attack with no effect.
- **Difficulty:** Hard · **Play Style:** Deception, tempo denial
- **Strengths:** Best Agent for baiting overextended attackers; devastating in the hands of a confident bluffer.
- **Weaknesses:** All value is one-shot per tool; whiffs hard against passive, patient opponents.

### 10. Rasp Corvin — *The Bottled Curse* (Alchemist)
- **Passive — Volatile Stock:** Whenever Rasp lands on a Treasure or Mystery tile, he draws one extra Strategy Card immediately.
- **Ultimate — Decant:** Convert this Agent's entire current Resolve Meter into that many Coins, banked instantly to the player's match total.
- **Difficulty:** Medium · **Play Style:** Card/resource engine
- **Strengths:** Fuels the Strategy Card game harder than any other Agent; strong economy score contributor.
- **Weaknesses:** Contributes almost nothing to combat or Oaths directly.

### 11. Grimm Hollow — *The Second Grave* (Necromancer)
- **Passive — Unfinished Business:** When any Agent (friendly or enemy) is sent to Base within 2 tiles of Grimm, Grimm's Resolve Meter gains +3.
- **Ultimate — Recall the Fallen:** Instantly move Grimm's most-recently-Based friendly Agent back onto the board at Grimm's current tile.
- **Difficulty:** Hard · **Play Style:** Battlefield scavenger, positional payoff
- **Strengths:** Rewards staying near the fighting without needing to win every fight personally.
- **Weaknesses:** Entirely dependent on combat happening near him; useless in a quiet, cautious match.

### 12. Doram Vale — *The Fair Cut* (Duelist)
- **Passive — Honor the Match:** When Doram attacks or is attacked, both players privately see each other's Mark category (not the exact effect) before the outcome resolves.
- **Ultimate — Clean Strike:** Force an immediate 1-on-1 resolution against any adjacent enemy Agent that ignores board tile effects entirely (Safe tiles included).
- **Difficulty:** Medium · **Play Style:** Precision dueling, information-for-information trades
- **Strengths:** The best Agent for reading an opponent's Mark category cheaply and safely.
- **Weaknesses:** Ultimate can bypass Safe tiles, which is powerful but telegraphs Doram as a priority kill target for the rest of the match.

### 13. Kat Duskwood — *The Still Hour* (Monk)
- **Passive — Even Breath:** Kat's dice roll for movement may be rerolled once per round, but the second result is always used even if worse.
- **Ultimate — Perfect Stillness:** Kat becomes immune to all attacks and World Events until her next turn begins.
- **Difficulty:** Medium · **Play Style:** Risk-smoothing, defensive tempo
- **Strengths:** Reduces variance for players who want consistency; excellent Oath-target (hard to kill on demand).
- **Weaknesses:** Passive reroll can backfire against a bold player chasing an exact Home-entry number.

### 14. Pax Sterling — *The Leash* (Beastmaster)
- **Passive — Pack Tactics:** When two or more of Pax's own Agents occupy tiles within 1 space of each other, both gain +1 to their movement roll.
- **Ultimate — Loose the Hounds:** Move all of Pax's on-board Agents simultaneously by the same freshly-rolled number.
- **Difficulty:** Hard · **Play Style:** Swarm coordination, tempo burst
- **Strengths:** The highest ceiling raw-tempo Agent in the game when the whole squad survives together.
- **Weaknesses:** Every strength inverts into a liability the moment the squad is split up or thinned by kills — a favorite assassination target for exactly this reason.

## 3. Class Coverage Table

| Class | Agent | Difficulty | Core Fantasy |
|---|---|---|---|
| Warrior | Kaelen Vos | Easy | Immovable frontline |
| Assassin | Serai Thorn | Hard | Oath-completion specialist |
| Mage | Renna Blackthorn | Medium | Area denial |
| Trickster | Nyx Larque | Hard | Disinformation |
| Guardian | Brannoch Ironhide | Easy | Escort / protection |
| Support | Voss Nightingale | Medium | Tempo recovery |
| Ranger | Mira Sable | Medium | Ranged threat + scouting |
| Berserker | Torvald Cinder | Easy | Comeback engine |
| Illusionist | Isolde Grey | Hard | Deception / decoys |
| Alchemist | Rasp Corvin | Medium | Card/resource economy |
| Necromancer | Grimm Hollow | Hard | Battlefield scavenging |
| Duelist | Doram Vale | Medium | Info-for-info dueling |
| Monk | Kat Duskwood | Medium | Variance control |
| Beastmaster | Pax Sterling | Hard | Swarm coordination |

By construction every Class fills a different macro-role (tank, burst, control, econ, info, tempo, swarm), so the "no duplicate Class per squad" draft rule guarantees every 4-Agent squad is forced to cover multiple macro-roles rather than stacking one dominant axis.
