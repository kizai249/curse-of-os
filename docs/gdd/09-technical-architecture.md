# 09 — Technical Architecture

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| UI framework | React 18 + TypeScript (strict mode) | Component model fits a screen-heavy app; strong typing enforced end-to-end per SOLID/clean-architecture mandate |
| Styling | TailwindCSS + a small design-token layer (`tailwind.config` extended with the palette/spacing/type scale from `08-ui-ux-design-system.md`) | Fast iteration without fighting a separate CSS architecture; tokens keep it from becoming inconsistent |
| Motion | Framer Motion | Declarative, interruption-safe transitions for the Confrontation Reveal / Oath Reveal beats |
| Board rendering | PixiJS | WebGL-backed 2D renderer for the animated board (pawns, tile effects, particle beats) at 60fps on mid-tier mobile; chosen over Phaser because Vendetta has no need for a full scene/physics engine — PixiJS's lighter render-only footprint fits a board game better |
| Backend | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) | One managed platform covers auth, the relational schema, realtime sync, asset storage, and serverless compute, matching the brief's required stack without inventing a bespoke server |
| Client state | Zustand (local/session state) + TanStack Query (server-state caching) | Zustand slices per feature avoid a monolithic global store; TanStack Query owns anything that round-trips Supabase |
| Analytics | Supabase Postgres tables + scheduled Edge Function rollups (extends the existing `supabase/migrations/001_game_events.sql` pattern already in this repo's hub) | Reuses the parent Curse of Os hub's existing analytics approach rather than introducing a second system |

## 2. Why Supabase Can Still Be Authoritative

Hidden information (Marks, Oaths, hand contents) is the whole game — a naive "broadcast full match state to every subscriber" Realtime setup would leak it. Instead:
- **Postgres Row-Level Security (RLS)** scopes every hidden column (`oaths.target_agent_id`, `agent_instances.mark_id`, `hands.card_ids`) so a `SELECT` from any client only ever returns rows/columns that client is authorized to see — enforced at the database, not trusted to client code.
- **All state-mutating logic runs as `SECURITY DEFINER` Postgres RPC functions** (`resolve_turn()`, `attempt_attack()`, `play_card()`, etc.), never as direct client `UPDATE`s — this is what makes Supabase "authoritative" here: the client can only ever call intent-shaped functions, and the function is the only thing allowed to touch match state, exactly mirroring the server-authoritative resolution order defined in `07-multiplayer-match-flow.md` §4.
- **Realtime subscriptions** listen on narrow, already-RLS-filtered views (`public_match_state`, `my_hand`, `my_oath`) so the wire format itself never contains another player's private data, closing the "read it out of network traffic" vector called out in `11-balancing-anticheat-roadmap.md`.

## 3. Folder Structure (Feature-First)

```
src/
  app/                      # app shell, routing, providers
    App.tsx
    routes.tsx
    providers/              # QueryClientProvider, ThemeProvider, AuthProvider
  features/
    auth/
      components/  hooks/  api/  types.ts
    home/
    profile/
    characters/             # roster browser, Mastery UI
    abilities/              # Mark encyclopedia (progressive reveal)
    cards/                   # Strategy Card collection browser
    shop/
    battle-pass/
    leaderboard/
    friends/
    lobby/
    room/                    # pre-match room/ready-check
    match/                   # the core gameplay feature
      board/                 # PixiJS board renderer + React bridge
      hand/                  # card hand UI
      dice/
      reveal/                # Confrontation Reveal, Oath Reveal
      state/                 # match Zustand slice + optimistic-action queue
      api/                   # RPC callers, realtime channel hooks
    settings/
    statistics/
  shared/
    ui/                      # design-system primitives (Button, Panel, Card shell)
    lib/                     # supabase client, formatting, RNG display helpers
    types/                   # generated Supabase types + domain types
    hooks/
  styles/
    tokens.css               # design tokens consumed by tailwind.config
supabase/
  migrations/                # schema (see §4)
  functions/                 # Edge Functions (matchmaking, season rollover, AFK sweep)
  policies/                  # RLS policy SQL, reviewed independently of migrations
```

Each `features/*` module exposes a single `index.ts` public surface; cross-feature imports must go through that surface, never into another feature's internals — the concrete mechanism enforcing "feature-first, scalable, clean, reusable" from the brief.

## 4. Database Schema (Core Tables)

```sql
-- Identity
profiles(id uuid pk references auth.users, username text, avatar_url text, level int, xp int,
         rank_rating numeric, rank_deviation numeric, rank_volatility numeric, created_at timestamptz)

-- Static content (seeded, read-only to clients)
characters(id text pk, name text, class text, difficulty text, passive_json jsonb, ultimate_json jsonb, lore text)
marks(id text pk, name text, category text, rarity text, effect_json jsonb)
cards(id text pk, name text, category text, rarity text, effect_json jsonb)
tiles(id text pk, kind text)                       -- static tile-type definitions
events(id text pk, name text, effect_json jsonb)    -- the 50 World Events

-- Player-owned content
owned_characters(profile_id uuid, character_id text, mastery_xp int, primary key (profile_id, character_id))
owned_cosmetics(id uuid pk, profile_id uuid, cosmetic_id text, source text, acquired_at timestamptz)
wallets(profile_id uuid pk, coins bigint, gems bigint, runes bigint)

-- Matchmaking & rooms
rooms(id uuid pk, host_id uuid, mode text, ruleset_json jsonb, status text, created_at timestamptz)
room_seats(room_id uuid, seat_no int, profile_id uuid null, is_bot bool, ready bool,
           primary key (room_id, seat_no))

-- Match runtime (RLS-protected — see §2)
matches(id uuid pk, room_id uuid, mode text, started_at timestamptz, ended_at timestamptz,
        fracture_started_at_round int, status text)
match_players(match_id uuid, profile_id uuid, house text, final_score int, placement int,
              primary key (match_id, profile_id))
agent_instances(id uuid pk, match_id uuid, match_player_id uuid, character_id text,
                mark_id text,              -- RLS: visible only to owner until revealed
                position int, status text) -- status: base|board|home
oaths(id uuid pk, match_id uuid, match_player_id uuid,
      target_agent_instance_id uuid,       -- RLS: visible only to owner until match end
      status text, resolved_round int)
hands(match_player_id uuid pk, card_ids text[])   -- RLS: visible only to owner
match_log(id bigserial pk, match_id uuid, round int, actor_profile_id uuid,
          action_type text, payload_json jsonb, resolved_at timestamptz)
          -- append-only; this is the deterministic replay source of truth

-- Progression
missions(id text pk, scope text, requirement_json jsonb, reward_json jsonb)
profile_missions(profile_id uuid, mission_id text, progress int, completed_at timestamptz,
                 primary key (profile_id, mission_id))
achievements(id text pk, tiers_json jsonb)
profile_achievements(profile_id uuid, achievement_id text, tier int, unlocked_at timestamptz)
battle_pass_seasons(id text pk, starts_at date, ends_at date, tiers_json jsonb)
profile_battle_pass(profile_id uuid, season_id text, tier int, premium bool,
                    primary key (profile_id, season_id))

-- Social & moderation
friendships(profile_a uuid, profile_b uuid, status text, primary key (profile_a, profile_b))
reports(id uuid pk, reporter_id uuid, reported_id uuid, match_id uuid, category text, notes text, created_at timestamptz)

-- Analytics (extends the hub's existing 001_game_events.sql pattern)
game_events(id bigserial pk, profile_id uuid, event_name text, payload jsonb, created_at timestamptz)
```

`match_log` is the canonical deterministic event stream that both drives Realtime sync during the match and powers the Replay feature after it ends (`07-multiplayer-match-flow.md` §3) — one log, two consumers, no duplicated state representation.

## 5. API Design

All match-affecting operations are Postgres RPC functions (`supabase.rpc(...)` from the client), never raw table writes from the client:

| RPC | Purpose |
|---|---|
| `create_room(mode, ruleset)` | Creates a room, seats the host |
| `join_room(room_id)` / `leave_room(room_id)` | Seat management |
| `start_match(room_id)` | Locks squads, deals Marks + Oaths + starting hands, creates `matches` row |
| `roll_dice(match_id)` | Server-side RNG roll, logged, returned to caller only (public value, broadcast via Realtime after) |
| `move_agent(match_id, agent_id, roll_value)` | Validates legality, resolves tile effect, appends to `match_log` |
| `trigger_mark(match_id, agent_id)` | Validates trigger condition server-side, resolves effect, reveals in log only if fired |
| `play_card(match_id, card_id, target_json)` | Validates hand ownership/cost, resolves effect |
| `attempt_attack(match_id, attacker_agent_id, defender_agent_id)` | Resolves the fixed priority order from `07` §4 |
| `end_turn(match_id)` | Advances turn order, checks Fracture/round-end/Event triggers |
| `resign_match(match_id)` | Forfeit flow feeding `match_players.placement` |

Read-only data (characters, cards, marks catalogue, leaderboard, profile, shop) is served via normal `select` against RLS-scoped views/tables — no RPC needed where there's nothing to protect or validate beyond row visibility.

Realtime channels (Postgres Changes, scoped by RLS): `match:{id}:public_state`, `match:{id}:my_private_state` (per-connection, filtered), `room:{id}:presence`, `leaderboard:global`.

Edge Functions (scheduled/triggered, not client-invokable): matchmaking pool sweep (every 5s), AFK/reconnect timeout sweep (every 15s), season rollover (cron, weekly check), analytics rollups (nightly).

## 6. Client State Management

- **Server state** (profile, inventory, leaderboard, room list) → TanStack Query, cached and invalidated on the relevant Realtime event rather than polled.
- **Match state** → a dedicated `features/match/state` Zustand store that holds (a) the last-confirmed server state, (b) a small **optimistic action queue** for the local player's own in-flight action (e.g., dice roll animation plays immediately client-side, then reconciles against the server's authoritative log entry — never the other way around). Any mismatch between optimistic and authoritative resolution discards the optimistic branch and replays from server truth, so the client can never drift into a state the server disagrees with.
- **UI-local state** (modal open/closed, active tab) → plain `useState`/`useReducer`, deliberately kept out of the global stores per the "no premature abstraction" rule — not everything needs to be global.

## 7. Cross-Cutting Principles
- Strong typing end-to-end: Supabase-generated TypeScript types from the schema, domain types layered on top in `shared/types`, no `any` in `strict` mode.
- SOLID applied concretely: each Mark/Card effect is a small typed handler registered in an effect registry (`Record<MarkId, MarkHandler>`), so adding Mark #61 later never requires touching the turn-resolution engine itself (Open/Closed in practice, not just in principle).
