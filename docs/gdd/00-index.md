# VENDETTA — الثأر
### A Curse of Os Chronicle — Game Design Document v1.0

**Status:** Draft for approval. No production code has been written against this document yet, per the "never skip planning" mandate. Implementation begins only after this GDD is reviewed and signed off.

---

## 1. Executive Summary

**VENDETTA** (Arabic: **الثأر**, "The Blood Debt") is a 2–4 player social strategy board game that keeps Ludo's promise — *anyone can learn it in two minutes* — while replacing Ludo's empty randomness with a dense layer of hidden information, secret goals, and tactical decision-making. It is built as the flagship strategy title inside the existing **Curse of Os** universe: the board is the Obsidian Court, the four playable Houses vie for a cursed throne, and every match opens with each player being handed a secret blood oath they must fulfill or suffer for.

Where Ludo is "roll dice, move token, hope," Vendetta is "roll dice, then decide — because you know something the table doesn't, and someone at this table has been sent to kill your pawns." Luck loads the gun. Strategy pulls the trigger.

- **Players:** 2–4 (asymmetric-safe: rules and balance hold at 2, 3, and 4)
- **Match length:** 10–20 minutes
- **Platforms:** Mobile, tablet, desktop (single responsive client)
- **Business model:** Free-to-play, cosmetic monetization only, zero pay-to-win
- **Genre:** Social deduction + race + tactics ("push-your-luck court intrigue")
- **One-line pitch:** *Ludo grew up, learned to lie, and got a knife.*

## 2. Design Fantasy

You control four Agents drawn from the Fourteen Bloodlines. Each match, every Agent is secretly infused with one of sixty Marks (hidden abilities) — nobody, not even you fully know what an opponent's pawn can do until they trigger it in front of you. At the same time, the Court hands you a private Blood Oath: a specific enemy pawn you are sworn to destroy before the match ends. Complete it and you're paid double. Fail, and the debt is taken from your own score.

Every roll of the dice is public. Everything you do with it is not.

## 3. Document Map

| # | Section | File |
|---|---|---|
| 1 | Executive Summary & Design Fantasy | this file |
| 2 | Core Concept, Design Pillars, Gameplay Loop, Rules, Player Journey | `01-core-design.md` |
| 3 | Character System — the Fourteen Bloodlines | `02-characters.md` |
| 4 | Ability System (60 Marks) & Assassin Challenge System | `03-abilities-and-assassin-challenge.md` |
| 5 | Strategy Cards (100+) | `04-cards.md` |
| 6 | Board Tiles & Random World Events (50) | `05-board-and-events.md` |
| 7 | Scoring, Ranking Algorithm, Progression, Economy | `06-scoring-progression-economy.md` |
| 8 | Multiplayer & Match Flow | `07-multiplayer-match-flow.md` |
| 9 | UI/UX Flows, Wireframes, Design System | `08-ui-ux-design-system.md` |
| 10 | Technical Architecture, Folder Structure, DB Schema, API, State Management | `09-technical-architecture.md` |
| 11 | Class/Sequence/Flow Diagrams (UML, Mermaid) | `10-diagrams.md` |
| 12 | Balancing Strategy, Anti-Cheat, Roadmap | `11-balancing-anticheat-roadmap.md` |

## 4. Non-Negotiable Design Pillars

1. **Two-Minute Rule** — a first-time player must be able to take a legal, sensible turn within two minutes of seeing the board, with zero reading.
2. **Hidden Layers, Public Randomness** — the dice are always fair and visible to all; every *decision* layered on top of them is private until revealed.
3. **Skill Compounds** — mastery (reading tells, hand-reading opponents' remaining cards, Mark deduction, tempo control) must keep paying off for hundreds of matches; there is no "solved" line of play.
4. **Comeback Engineering** — score, not just finishing position, decides the winner; a player who is behind always has a live, legible path back in.
5. **Social Friction by Design** — bluffing, table talk, and betrayal are core loops, not emergent accidents.
6. **Fair Play Forever** — every purchasable item is cosmetic. No card, ability, character, or board advantage is ever sold.

## 5. Brand Fit With Curse of Os

Curse of Os is an Arabic-first psychological ARG hub (`لعنة أوس`) built around a cursed eye/box mythos. Vendetta is written as the flagship *systemic* game inside that hub — same dark-court aesthetic (obsidian, gold rune accents, the Watching Eye motif on the throne tile), same bilingual AR (RTL) / EN presentation, but tuned for bright, legible, "premium mobile" colors on the four Houses so it reads instantly at a glance on small screens. Full visual language is defined in `08-ui-ux-design-system.md`.
