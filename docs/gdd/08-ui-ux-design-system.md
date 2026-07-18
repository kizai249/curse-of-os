# 08 — UI/UX Flows, Wireframes & Design System

## Part A — Screen Inventory & Flow

```
Splash → Loading → (Login | Continue-as-Guest) → Home
Home ──┬─→ Profile ─┬─→ Inventory
       │            ├─→ Characters ──→ Abilities (per-character Mastery/Marks-seen log)
       │            ├─→ Statistics
       │            └─→ Titles/Badges/Frames
       ├─→ Cards (collection browser)
       ├─→ Shop ──→ Battle Pass
       ├─→ Leaderboard
       ├─→ Friends ─→ Invite → Room
       └─→ Lobby ─┬─→ Room (Private) ─┐
                  └─→ Matchmaking ─────┴─→ Squad Select → Match
Match ──(pause icon)──→ Pause ──→ (Resume | Settings | Forfeit)
Match → (Match End) → Victory | Defeat → Statistics (this match) → Home | Rematch
Home → Settings (always reachable, gear icon top-right regardless of screen)
```

### Screen-by-Screen Purpose

| Screen | Primary Job | Key Elements |
|---|---|---|
| **Splash** | Brand moment, <2s | Curse of Os eye sigil animating into the Vendetta crest |
| **Loading** | Mask asset/network load | Progress bar styled as a filling Resolve Meter; rotating flavor tips ("Declining to attack is still information.") |
| **Login** | Auth | Email/social login, Guest mode, AR/EN language toggle up top |
| **Home** | Hub/dashboard | Play button (primary CTA, dominant), player level/rank badge, currency counters, News/Event banner, bottom nav |
| **Profile** | Identity | Avatar/frame, title, level, rank, Mastery highlights, stat summary |
| **Inventory** | Cosmetic management | Filterable grid: skins, card backs, frames, emotes; equip/preview |
| **Characters** | Roster browser | 14 Agent cards, Mastery bar per Agent, tap-through to full sheet (Passive/Ultimate/lore, from `02-characters.md`) |
| **Abilities** | Mark reference/learning | Post-match "Marks seen this match" log; full Mark encyclopedia unlocks progressively as each is witnessed in play (never spoiled up front — this doubles as a soft anti-solve mechanism) |
| **Cards** | Collection browser | 10-category tabs, owned/unowned state, card detail flip animation |
| **Shop** | Monetization | Rotating cosmetic bundles, Gem packs, Sealed Chests (odds shown inline, not just on tap-through) |
| **Battle Pass** | Season progression | 60-tile horizontal track, Free/Premium row split, current tier highlighted |
| **Leaderboard** | Competitive status | Global/Friends toggle, Rank tier tabs, search |
| **Friends** | Social | List with presence, invite/challenge actions |
| **Lobby** | Mode select | Quick Match / Casual / Ranked / Private Room / Custom cards |
| **Room** | Pre-match assembly | Seated players, ready-check, host controls, chat |
| **Match** | Core gameplay | See wireframe below |
| **Pause** | Safety valve | Resume, Settings, Report, Forfeit (with confirmation) |
| **Victory / Defeat** | Payoff | Full score breakdown animating in stream, Oath Reveal moment (the emotional peak — "here's who was hunting whom") |
| **Statistics** | Reflection | Per-match and lifetime stat breakdowns, shareable summary card |
| **Settings** | Control | Audio/graphics/language/accessibility/account, always one tap away |

### Match Screen Wireframe (core gameplay surface)

```
┌──────────────────────────────────────────────────────────┐
│ [Rank/Avatar]      ROUND 7 / Fracture in 3     [⚙ Pause] │
├──────────────────────────────────────────────────────────┤
│                                                            │
│                     ┌── Obsidian Court ──┐                │
│                     │   (board render)    │                │
│                     │   PixiJS canvas      │                │
│                     └──────────────────────┘                │
│                                                            │
├──────────────────────────────────────────────────────────┤
│ Opponents strip:  [Cobalt •••] [Emerald •••] [Gold •••]  │
├──────────────────────────────────────────────────────────┤
│ 🎲 [Dice: tap to roll]     Resolve: ▓▓▓▓▓▓░░░░  My Oath 🗲 │
│ Hand: [Card][Card][Card][Card][Card]     [End Turn ▶]     │
└──────────────────────────────────────────────────────────┘
```

Design intent for this screen specifically: the board is always the largest single element (≥55% of vertical space on mobile portrait), the dice and hand sit in a fixed bottom action bar that never moves (so muscle memory transfers turn to turn), and the Oath icon is a private, small, always-visible reminder that never needs a menu dive — reinforcing the "you know something they don't" feeling on every single turn rather than just at reveal time.

### Confrontation Reveal (the key hidden-information UI moment)
When an attack resolves and a defensive Mark fires, the game cuts to a 1.2s full-width reveal card (Agent portrait, Mark name, resolved effect) before returning to the board — this is the single most important "wow" beat in the whole UI and is treated with dedicated motion design (see Animations below), because it's the moment hidden information becomes public and must land with weight.

## Part B — Design System

### 1. Color Palette

| Token | Hex | Usage |
|---|---|---|
| `bg.obsidian` | `#0B0B10` | App background, matching parent hub's dark theme |
| `bg.surface` | `#16151C` | Cards, panels |
| `accent.rune` | `#C9A227` | Primary UI chrome accent, borders, the "Curse of Os" gold rune motif |
| `house.crimson` | `#E23744` | House Crimson, Attack-leaning UI accents |
| `house.cobalt` | `#2E6FF2` | House Cobalt |
| `house.emerald` | `#17B978` | House Emerald |
| `house.gold` | `#F2B705` | House Gold |
| `state.success` | `#3ADB76` | Positive feedback (Boost, reward) |
| `state.danger` | `#FF4D4D` | Negative feedback (Curse, attack) |
| `text.primary` | `#F5F2E9` | Primary text on dark surfaces |
| `text.muted` | `#9A96A5` | Secondary text |

Rule: House colors are reserved exclusively for House identity (pawns, player borders) and never reused as generic UI semantic colors, so a player's eye is never confused between "this is Cobalt's pawn" and "this is a warning."

### 2. Typography
- **Display/Headlines:** a condensed, high-contrast display face (e.g., a "Cinzel"/"Marcellus"-class serif for the English wordmark, paired with an Arabic display face of matching weight, e.g., "Almarai Bold") — used only for screen titles and the Vendetta wordmark.
- **UI/Body:** a clean geometric sans (e.g., "Inter" for Latin, "IBM Plex Sans Arabic" for Arabic) across all functional UI text, ensuring readability at small mobile sizes and correct RTL shaping.
- **Type scale:** 12 / 14 / 16 (body) / 20 / 24 / 32 / 40 (display) px, 1.25 modular ratio, all set in `rem` in the actual implementation for accessibility zoom support.

### 3. Spacing & Grid
- Base unit: **4px**. Spacing scale: 4/8/12/16/24/32/48/64.
- Layout grid: 4-column on mobile portrait (≥360px), 8-column on tablet, 12-column on desktop, 16px gutters, max content width 1440px on desktop with centered letterboxing.

### 4. Components
- **Buttons:** 3 tiers — Primary (filled, `accent.rune`, used once per screen max for the dominant CTA), Secondary (outlined), Tertiary (text-only). Minimum tap target 44×44px.
- **Cards (UI component, not Strategy Cards):** consistent 12px corner radius, 1px `accent.rune`-at-20%-opacity border, subtle inner shadow to read as "physical" objects on the felt-like background.
- **Panels:** modal panels always dim the background to 70% black and trap focus for accessibility (see below).
- **Icons:** single-weight line icon set at 24px base grid, House-colored only when representing a specific House's Agent/ability.

### 5. Animation & Transitions
- Standard transition: 200ms, ease-out, for all navigational screen changes.
- Reveal-weighted transitions (Confrontation Reveal, Oath Reveal, card flip): 400–600ms with a slight anticipation curve — these are the few places the game is deliberately allowed to slow down, because the payoff of hidden information becoming public is the emotional core of the product.
- Reduced Motion setting (see Accessibility) collapses all of the above to instant crossfades ≤100ms.

### 6. Accessibility Rules
- Full colorblind-safe mode: House identity gets an additional shape/icon differentiator (Crimson=diamond, Cobalt=circle, Emerald=triangle, Gold=square) on every pawn and UI chip, never relying on color alone.
- Minimum text contrast ratio 4.5:1 against its background at all type scale sizes.
- Full RTL mirroring for Arabic (not just text direction — layout, icon direction, and animation direction all mirror correctly), consistent with the existing Curse of Os hub's `dir="rtl"` foundation.
- Reduced Motion, adjustable text scale (up to 150%), and a dedicated high-contrast theme are all first-class Settings toggles, not afterthoughts.
- All core game information (tile type, Mark reveal, card text) is conveyed in text + icon, never icon-only, so screen-reader and low-vision players are never blocked from full comprehension.

### 7. Responsive Layout Rules
- Mobile portrait (default target): bottom action bar layout as shown in the Match wireframe.
- Tablet/landscape and Desktop: board expands to a centered square, hand and dice relocate to a persistent right-hand rail, opponents strip moves to the top — same component set, re-flowed, never a different feature set per platform (one client, one codebase, responsive breakpoints only).
