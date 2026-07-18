# 01 — Core Concept, Gameplay Loop, Rules, Player Journey

## 1. Core Concept

Four Houses — **Crimson**, **Cobalt**, **Emerald**, **Gold** — send four Agents each onto the Obsidian Court, a closed circular path with a shared center (the **Throne Vault**). Movement is dice-driven exactly like Ludo (instant familiarity). Everything else is new:

- Each Agent secretly carries one of 60 **Marks** (hidden abilities), assigned at match start and unknown to everyone, including — for its *exact* effect — the owner, who only knows its category hint.
- Each player secretly receives one **Blood Oath** (Assassin Challenge): eliminate a specific enemy Agent before the match ends.
- Players build a hand of **Strategy Cards** drawn from a 100+ card pool spanning Attack, Defense, Movement, Stealth, Chaos, Economy, Trap, Support, Epic, and Legendary tiers.
- The board itself is alive: 11 tile types and 50 possible **World Events** trigger every few turns, reshuffling the state of play for everyone simultaneously.
- Victory is decided by **score**, not merely who finishes first — finishing your Agents is one of several ways to earn points, alongside kills, treasure, objectives, and hidden missions.

## 2. The Five Pillars, Expanded

### Pillar 1 — Two-Minute Rule
A new player only needs to know: roll, move a pawn that many spaces, and whatever happens on the tile you land on will be shown to you with a single clear prompt. Marks, Oaths, and Cards are all *optional layers* — a player can ignore every strategic system on turn one and still make a 100% legal move. Complexity is opt-in, revealed progressively (see Player Journey below).

### Pillar 2 — Hidden Layers, Public Randomness
Every die roll is animated and visible to the whole table. Nothing about probability is hidden. What's hidden is *intent*: which of your four Agents you move, whether you trigger a Mark, which card you hold back, who your Oath target is. This is the load-bearing wall of the whole design — it converts a solved, low-agency dice game into a Bayesian information game.

### Pillar 3 — Skill Compounds
Three concrete skill axes that keep rewarding practice:
- **Mark-reading**: inferring an opponent's hidden ability from partial evidence (which tiles they favored, what they didn't do when threatened) before it's revealed.
- **Hand-reading**: tracking which of the 100+ cards have been played/discarded to deduce what an opponent is likely holding.
- **Tempo control**: deciding *when* to spend a resource (card, Mark trigger, Oath attempt) versus banking it, under the pressure of a ticking World Event clock.

### Pillar 4 — Comeback Engineering
Score accrues from many independent streams (Section 06). A player who is losing the race can still be winning the game via kills, treasure, and their Oath. The **Fracture Round** (final 3 rounds of a timed match, see Section 07) doubles Oath and Kill points specifically to keep trailing players lethal until the very end.

### Pillar 5 — Social Friction by Design
Table talk is explicitly rules-supported: players may lie freely about their Oath target, their held cards, or their Marks — the only thing that can never be misrepresented is the dice result and any publicly revealed information. Trap and Stealth cards exist specifically to reward misdirection.

### Pillar 6 — Fair Play Forever
See `06-scoring-progression-economy.md` §5 (Economy) for the enforced separation between the cosmetic-only store and match-affecting content, which is never sold, gated behind timers artificially, or otherwise monetized.

## 3. The Turn Loop (Canonical)

Every turn, in strict order:

1. **Roll Dice** — one d6, public. Rolling a 6 grants an extra roll after the turn resolves (max one bonus roll per turn, matching the "escape base" pressure Ludo players already know, but capped to prevent runaway turns).
2. **Choose One Agent** — pick exactly one of your on-board or in-base Agents to act. A 6 (or a card that grants it) is required to leave base, exactly like Ludo, preserving the muscle-memory anyone with Ludo experience already has.
3. **Move** — advance the chosen Agent the rolled number of spaces along the Court path (or along a Portal branch, see tile rules).
4. **Trigger Board Event** — resolve whatever tile the Agent lands on (Section 05). This is mandatory and public.
5. **Use Optional Ability** — the active player may trigger that Agent's Mark, if its trigger condition is currently met (Section 03). This is the only fully optional step in the loop.
6. **Attack, If Possible** — if the Agent shares a tile with an enemy Agent not on a Safe tile, the active player *chooses* whether to attack (sending the enemy home) or not. Choosing not to attack is a legitimate, common bluff-preserving play (attacking reveals board information; declining preserves ambiguity).
7. **End Turn** — play passes clockwise (or per seating) to the next player. Any "start of next turn" World Event ticks are resolved here.

Card play is a **free action** layered across the whole loop: a player may play one Strategy Card at any point during their own turn (some Reactive/Trap cards can be played on an opponent's turn — see `04-cards.md`), independent of the seven numbered steps. This is what makes the loop feel "simple to describe, deep to run" — the seven steps are learnable in one read-through, and the card layer is where mastery lives.

## 4. Full Rules Reference

### 4.1 Setup
1. 2–4 players each choose (or are matched into) a House and receive 4 Agents from their drafted or assigned roster of the Fourteen Bloodlines (draft mode in Casual/Custom lobbies; fixed "starter squads" in Ranked for a level playing field until a player has enough Mastery to draft).
2. Each Agent is dealt one random Mark from the 60-Mark pool, filtered to the current game mode's Mark pool size (Quick Match uses a curated 20-Mark "common" subset for new players; full Ranked uses all 60).
3. Each player is dealt a secret Blood Oath naming one specific enemy Agent.
4. Each player draws a starting hand of 3 Strategy Cards from their House's card pool.
5. All Agents start in their House Base. Turn order is randomized once per match.

### 4.2 Movement
- A 6 is required to move an Agent out of Base onto its House's Launch Tile.
- Movement is always forward along the Court ring, except where a Portal, Reverse Event, or card explicitly redirects it.
- An Agent that reaches its House's Home Stretch must roll the exact remaining number to enter the Throne Vault; overshooting is a wasted move on that Agent (the player may choose to move a different Agent instead when this is known in advance — see 4.4).
- Landing exactly on the Throne Vault "banks" that Agent: it is removed from the board, scores its Home Points immediately, and can no longer be attacked, but can also no longer act, gather treasure, or fulfill/attempt an Oath.

### 4.3 Combat (Attacking)
- Attacking is only possible when your Agent's move ends on a tile occupied by exactly one enemy Agent that is not on a Safe, Base, or Home Stretch tile.
- The attacker may choose to attack or hold. Attacking sends the enemy Agent back to its Base (it must roll a 6 again to re-enter) and awards Kill Points to the attacker.
- If the defending Agent's Mark includes a defensive trigger (Shield, Counter Attack, Reflect Attack, etc.), it resolves before the kill is finalized — the attacker does not know this will happen until it does. This is the single most important "hidden information" moment in the game and is framed visually as a dramatic reveal (see UI §"Confrontation Reveal").
- Multiple friendly Agents may share a tile safely; multiple *enemy* Agents sharing a tile form a "Standoff" — no attack can be declared into a Standoff tile until it's down to a single occupant.

### 4.4 Choosing Not to Move
A player is never forced to move an Agent that would result in a wasted or clearly disadvantageous outcome if another legal Agent move exists — you always choose which of your eligible Agents uses the roll. If no Agent has a legal move (e.g., all in Base and no 6 rolled, or exact-count blocked), the turn passes with no move.

### 4.5 Match End & Win Condition
A match ends when either:
- **All Home:** one player banks all 4 Agents (classic Ludo-style finish), triggering the final scoring round immediately, or
- **Fracture Timer:** 40 total rounds elapse (tunable per mode — Quick Match uses 25) without an All-Home finish, ending the match at the end of the current round.

**The winner is whoever has the highest final Score**, not necessarily whoever finished first — see `06-scoring-progression-economy.md` for the full formula. Finishing all 4 Agents is heavily rewarded but is not an automatic win; a player who finished early but sacrificed all their Oaths, kills, and treasure to do so can still lose to a slower player who played the board.

## 5. Player Journey (Onboarding → Mastery)

| Stage | What's unlocked | What's still hidden |
|---|---|---|
| **First match (Tutorial)** | Roll/Move/Attack loop only. Fixed starter squad, no draft. Marks are shown to the tutorial player face-up ("training wheels") so they see cause and effect once. | Cards, Oaths, full Mark pool |
| **Matches 2–10 (Quick Match)** | Full hidden Marks (20-Mark curated pool), Blood Oaths introduced with an in-fiction 15-second explainer, 3-card starting hand | Full 60-Mark pool, full 100+ card pool, Epic/Legendary cards |
| **Matches 10–30** | Full Mark pool unlocked, full card pool unlocked, Casual ranked-adjacent matchmaking | Draft mode, character Mastery bonuses |
| **Match 30+ (Ranked eligible)** | Squad drafting from all 14 Bloodlines, Ranked ladder, Battle Pass systems | — everything is available; remaining growth is entirely skill-based (reads, tempo, deduction) |
| **Hundreds of matches (Mastery)** | Character Mastery cosmetic tiers, Legendary card unlocks via play (not purchase), Title/Badge cosmetic progression | Nothing mechanical — by design, there is no mechanical ceiling above "you've unlocked everything," only skill ceiling |

This staged reveal is what lets the game satisfy "learn in 2 minutes, master in hundreds of matches" without lying about either half of that promise: the *rules* are fully learnable in 2 minutes at every stage; the *systems* are introduced gradually so early matches are never overwhelming, while the skill ceiling on the fully-unlocked systems is effectively unbounded (imperfect-information game trees with 14 characters × 60 marks × 100+ cards do not solve out in casual play).
