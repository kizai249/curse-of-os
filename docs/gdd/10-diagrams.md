# 10 — Class Diagrams, Sequence Diagrams, Flowcharts, UML

## 1. Domain Class Diagram

```mermaid
classDiagram
    class Profile {
        +uuid id
        +string username
        +int level
        +int xp
        +float rankRating
    }
    class Wallet {
        +bigint coins
        +bigint gems
        +bigint runes
    }
    class Character {
        +string id
        +string name
        +string class
        +Passive passive
        +Ultimate ultimate
        +string difficulty
    }
    class Mark {
        +string id
        +string name
        +string category
        +string rarity
        +applyEffect()
    }
    class StrategyCard {
        +string id
        +string category
        +string rarity
        +int discardCost
        +resolveEffect()
    }
    class AgentInstance {
        +uuid id
        +int position
        +string status
        +int resolveMeter
        +trigger(Mark)
    }
    class Match {
        +uuid id
        +string status
        +int currentRound
        +bool fractureActive
    }
    class MatchPlayer {
        +string house
        +int finalScore
        +int placement
    }
    class Oath {
        +uuid targetAgentId
        +string status
        +resolve()
    }
    class Hand {
        +string[] cardIds
        +playCard(StrategyCard)
    }
    class Tile {
        +string kind
        +onLand(AgentInstance)
    }
    class WorldEvent {
        +string name
        +applyToRound(Match)
    }

    Profile "1" --> "1" Wallet
    Profile "1" --> "*" AgentInstance : owns via MatchPlayer
    Match "1" --> "2..4" MatchPlayer
    MatchPlayer "1" --> "4" AgentInstance
    MatchPlayer "1" --> "1" Oath
    MatchPlayer "1" --> "1" Hand
    AgentInstance "1" --> "1" Character
    AgentInstance "1" --> "0..1" Mark
    Hand "1" --> "*" StrategyCard
    Match "1" --> "*" WorldEvent
    AgentInstance "*" --> "1" Tile : currently on
```

## 2. Sequence Diagram — Standard Turn Resolution

```mermaid
sequenceDiagram
    actor P as Active Player (client)
    participant RPC as Supabase RPC layer
    participant DB as Postgres (authoritative state)
    participant RT as Realtime
    participant O as Other Clients

    P->>RPC: roll_dice(matchId)
    RPC->>DB: log roll, validate turn owner
    DB-->>RPC: rollValue (public)
    RPC-->>P: rollValue
    RPC-->>RT: broadcast public_state delta (roll shown)
    RT-->>O: roll animation

    P->>RPC: move_agent(matchId, agentId, rollValue)
    RPC->>DB: validate legality, resolve tile effect
    DB-->>RPC: newPosition, tileResult
    RPC-->>RT: broadcast public_state delta
    RT-->>O: pawn move + tile animation
    RPC-->>P: my_private_state delta (if tile granted a private card/Coin)

    opt Optional ability available
        P->>RPC: trigger_mark(matchId, agentId)
        RPC->>DB: validate trigger condition, resolve
        DB-->>RPC: effect result (only revealed if fired)
        RPC-->>RT: broadcast reveal (Confrontation-style if combat-relevant)
    end

    opt Enemy present on landed tile
        P->>RPC: attempt_attack(matchId, agentId, targetAgentId)
        RPC->>DB: resolve fixed priority order (Trap→Defensive Mark→Card→Attack)
        DB-->>RPC: outcome
        RPC-->>RT: broadcast Confrontation Reveal payload
        RT-->>O: reveal animation plays for all
    end

    P->>RPC: end_turn(matchId)
    RPC->>DB: advance turn order, check Fracture/Event triggers
    RPC-->>RT: broadcast round/turn advance
```

## 3. Sequence Diagram — Blood Oath Lifecycle

```mermaid
sequenceDiagram
    participant DB as Postgres
    participant A as Player A (Oath holder)
    participant B as Player B (target's controller)

    Note over DB: start_match() deals Oaths server-side
    DB->>A: my_oath (target = B's Kaelen Vos) [RLS: A only]
    Note over B: B never learns A's Oath during the match

    loop Match rounds
        A->>DB: attempt_attack(A's agent, B's Kaelen Vos)
        alt Attack succeeds
            DB->>DB: mark Oath status = SUCCEEDED
            DB->>A: +150 pts, doubled Kill pts, +50 coins, guaranteed Rare+ card
        else Kaelen Vos reaches Throne Vault first
            DB->>DB: mark Oath status = FAILED_ESCAPED
            DB->>A: -75 pts locked in, no further attempt possible
        end
    end

    Note over DB: MATCH_END → Oath Reveal broadcast to all players (post-match only)
    DB->>A: reveal all Oaths (everyone's target + outcome)
    DB->>B: reveal all Oaths (everyone's target + outcome)
```

## 4. Match Flow Chart

```mermaid
flowchart TD
    Lobby[Lobby] --> SquadSelect[Squad Select]
    SquadSelect --> Deal[Deal Oaths + Marks + Starting Hands]
    Deal --> RoundStart[Round Start: check World Event]
    RoundStart --> Turn[Player Turn: Roll→Move→Tile→Ability→Attack→End]
    Turn -->|more players this round| Turn
    Turn -->|round complete| RoundEnd[Round End]
    RoundEnd -->|All-Home triggered| FinalScoring[Final Scoring Pass]
    RoundEnd -->|Fracture window reached| Fracture[Fracture Round: 2x Oath/Kill/Home bonus]
    RoundEnd -->|neither| RoundStart
    Fracture --> FinalScoring
    FinalScoring --> OathReveal[Oath Reveal]
    OathReveal --> Rewards[Rewards + XP + Rank Update]
    Rewards --> Summary[Post-Match Summary]
    Summary --> Rematch{Rematch?}
    Rematch -->|yes| SquadSelect
    Rematch -->|no| Lobby
```

## 5. Assassin Challenge Decision Flow (Player-Facing Logic)

```mermaid
flowchart TD
    Start[Oath received privately] --> Decide{Engage the Oath?}
    Decide -->|Yes| Track[Track target position each round]
    Decide -->|No, play board/economy game| Accept[Accept -75 pt ceiling risk]
    Track --> Opportunity{Target reachable this turn?}
    Opportunity -->|No| Track
    Opportunity -->|Yes| Attempt[attempt_attack on target]
    Attempt --> Resolve{Attack resolves}
    Resolve -->|Success| Success[Oath SUCCEEDED: +150, 2x kill, +50 coins, card]
    Resolve -->|Blocked by defensive Mark/card| Track
    Accept --> MatchEnd
    Track --> MatchEnd{Match ending soon / target near Home?}
    MatchEnd -->|Target banks first| Failed[Oath FAILED_ESCAPED: -75 locked]
    MatchEnd -->|Match timer ends unresolved| FailedTimeout[Oath FAILED: -75]
    Success --> End[End]
    Failed --> End
    FailedTimeout --> End
```

## 6. Component/UML Deployment View

```mermaid
flowchart LR
    subgraph Client["React + TS Client (Web/Mobile/Desktop shell)"]
        UI[Feature Modules]
        Board[PixiJS Board Renderer]
        StateMgmt[Zustand + TanStack Query]
    end
    subgraph Supabase["Supabase Platform"]
        Auth[Auth]
        PG[(Postgres + RLS)]
        RPC[SECURITY DEFINER RPC Functions]
        RT[Realtime]
        Storage[Storage: cosmetic assets]
        Edge[Edge Functions: matchmaking, AFK sweep, season rollover, analytics rollups]
    end

    UI --> StateMgmt
    Board --> StateMgmt
    StateMgmt -->|RPC calls| RPC
    StateMgmt -->|subscribe| RT
    RPC --> PG
    RT --> PG
    Auth --> PG
    Edge --> PG
    UI -->|asset fetch| Storage
```
