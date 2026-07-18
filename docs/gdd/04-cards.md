# 04 — Strategy Cards

## 1. System Rules

- **Hand size:** 5 cards max. Drawing above 5 forces an immediate discard of choice.
- **Draw rate:** 1 card at match start (3 total with the starting hand from `01-core-design.md`), +1 card per Card tile landed on, +1 card per Treasure tile (50% chance), plus Mark/character-specific draws.
- **Play limit:** 1 card per player per turn during your own turn, from the eight base categories below. **Trap**-tagged cards are the one exception and may be held and played reactively on an opponent's turn the instant their trigger condition occurs (this is what makes Trap cards function as the "gotcha" layer).
- **Epic cards** additionally cost discarding 2 other cards from hand to play (a deliberate tempo tax).
- **Legendary cards** cost fully draining that Agent's Resolve Meter to play, and are capped at 1 copy per player per match. Legendary cards are never purchasable — they are earned exclusively through Character Mastery (see `06-scoring-progression-economy.md` §4).
- All cards are **cosmetic-neutral**: none are sold individually; the entire pool is unlocked through normal play (see Economy). Card back skins are the only purchasable cosmetic tied to cards.

## 2. Attack (10)

| Card | Effect |
|---|---|
| Reckless Charge | Move any Agent up to 3 extra tiles this turn if it results in landing on an enemy. |
| Second Blade | Attack twice this turn with two different Agents. |
| Bounty Strike | Attacking an Agent that is someone's Oath target (revealed or not) grants +20 bonus points if it later turns out to be true. |
| Overrun | Your attack this turn also sends the nearest other enemy Agent within 1 tile to Base. |
| Sudden Edge | Cancel one Shield or Counter Attack Mark used against you this turn. |
| Feint Strike | Declare an attack, then cancel it — draw 1 card instead, no tile info revealed. |
| Killing Frost | The next enemy Agent you send to Base cannot re-enter Base for 2 full rounds. |
| Warpath | +1 to all your Agents' attack confirmation rolls this round. |
| Duelist's Call | Force one chosen enemy Agent to be the only legal attack target for your next attack this turn. |
| Final Word | If this attack would be your last legal action this match, it cannot be prevented by any Mark. |

## 3. Defense (10)

| Card | Effect |
|---|---|
| Iron Resolve | This Agent cannot be attacked for the rest of this round. |
| Safehouse | Instantly treat your current tile as a Safe tile until your next turn. |
| Bodyguard | Redirect an attack aimed at one Agent onto another friendly Agent of your choice instead. |
| Warding Circle | All friendly Agents within 2 tiles gain Shield for one round. |
| Fortify | This Agent gains +1 to Iron-Skin-style attack confirmation checks for the rest of the match. |
| Retreat Call | Move a threatened Agent back to the nearest Safe tile immediately, free action. |
| Stone Ward | Negate the next Chaos card or Mark played against you this match. |
| Guarded Ranks | Two or more of your Agents sharing a tile cannot be attacked this round. |
| Deflection | Redirect a successful attack against you back onto the attacker instead. |
| Unbreakable | This Agent survives being attacked once this match with no effect at all (silent, not revealed until it matters). |

## 4. Movement (10)

| Card | Effect |
|---|---|
| Burst of Speed | Move any Agent 4 extra tiles immediately. |
| Shortcut Rune | Jump directly to the next Portal tile. |
| Double Time | Take an entire extra turn with one Agent right now. |
| Wind at Your Back | +2 to your next 3 movement rolls. |
| Backtrack | Move an Agent backward to avoid an upcoming Trap or Curse tile. |
| Free Passage | This Agent ignores the next 2 tile effects it lands on entirely. |
| Long Stride | Move an Agent exactly 6 tiles regardless of dice. |
| Rally Point | Move all your Agents that are within 3 tiles of each other 1 tile forward simultaneously. |
| Vault | Skip your Agent directly past the next Battle tile ahead. |
| Homeward Bound | An Agent already in its Home Stretch needs no exact roll this turn to bank. |

## 5. Stealth (10)

| Card | Effect |
|---|---|
| Smokescreen | Your Agents' exact positions cannot be called out or confirmed verbally/in chat for 1 round (soft social rule enforced by UI blur on spectator/replay only; positions remain mechanically real). |
| False Ledger | Publicly reveal a fake card from your hand (shown face-up) without actually playing it. |
| Quiet Steps | This Agent's next move does not trigger a public landing animation. |
| Masked Intent | Prevent one opponent from seeing which category your next played card belongs to until it resolves. |
| Double Bluff | Play this face-down; opponents must guess its category before it's revealed — wrong guesses give you a free card draw. |
| Vanish | Remove this Agent from the board visually for opponents (not from the actual game state) for 1 round. |
| Whispered Deal | Privately message one opponent an offer (no mechanical binding — a pure social tool logged for fair play review only). |
| Shroud | Your Mark category cannot be inspected by any Whisper-Network-style effect this round. |
| Sleight of Hand | Swap two cards in your hand with two random cards from the deck. |
| Silent Partner | Copy the category (not effect) of the last card an opponent played, for informational display only. |

## 6. Chaos (10)

| Card | Effect |
|---|---|
| Earthquake | All Agents on Battle tiles are sent to Base immediately. |
| Reversal | Reverse the direction of board movement for everyone for 1 round. |
| Total Eclipse | All tile effects are hidden (shown as "???") for 1 round until landed on. |
| Gold Rush | Double all Coin rewards from tiles for 1 round, for everyone. |
| Fog Bank | All players' Marks are hidden from the "recently triggered" log for 1 round. |
| Storm Surge | Randomly relocate one Agent per player (chosen by the system, not the player) up to 3 tiles. |
| Wildfire Round | Every Battle tile on the board becomes active (triggers immediately) simultaneously. |
| Curse of Os | One randomly chosen Agent on the board gets a random Curse tile effect applied instantly. |
| Fracture | Skip straight to Fracture Round scoring rules (see `07-multiplayer-match-flow.md`) for this round only. |
| Chaos Deal | Every player draws 1 random card immediately, including the caster. |

## 7. Economy (10)

| Card | Effect |
|---|---|
| Toll Bridge | Gain 15 Coins for every enemy Agent that passes your current tile this round. |
| Treasure Map | Reveal the location of the nearest unclaimed Treasure tile to all your Agents. |
| Market Day | Convert any unused card in hand into 20 Coins. |
| Investment | Gain 10 Coins now, or wait: this becomes 30 Coins if unspent by match end. |
| Gold Vein | The next 2 Gold tiles you land on pay double. |
| Tax Collector | Take 10 Coins from each opponent who landed on a Gold tile this round. |
| Windfall | Gain Coins equal to 2x the number of tiles your furthest Agent has traveled this match. |
| Bounty Board | Gain 25 Coins immediately if you currently have an active, unfailed Oath. |
| Merchant's Favor | Draw 1 card and gain 10 Coins. |
| Fortune's Ledger | At match end, convert any unspent Coins over 100 into bonus score at a 1:1 ratio. |

## 8. Trap (10, reactive — playable on an opponent's turn)

| Card | Effect |
|---|---|
| Snare | The next enemy Agent to land on a tile you name is sent to Base instantly. |
| Ambush Point | Automatically attack any enemy Agent that lands adjacent to one of yours this round, no roll needed. |
| Backfire | The next Mark an opponent triggers this round affects them instead of its intended target. |
| Tripwire | The next card an opponent plays costs them an additional discard. |
| False Floor | The next Portal an opponent uses sends them to a random tile instead of their intended one. |
| Poisoned Well | The next Treasure tile an opponent lands on curses them instead of rewarding them. |
| Counter-Ledger | If an opponent plays an Economy card this round, you gain the same Coin amount they do. |
| Web of Lies | The next time an opponent bluffs (plays Stealth or declares a false Oath via Nyx's Ultimate), you are shown a hint icon (no confirmation, just a "something's off" nudge). |
| Dead Drop | Place a hidden penalty on a tile; the next Agent (yours or theirs) to land there triggers it — a genuine risk to yourself too. |
| Late Toll | If an opponent attacks this round, they immediately lose 20 Coins. |

## 9. Support (10)

| Card | Effect |
|---|---|
| Field Medic | Return one Base'd friendly Agent directly onto its Launch Tile, no 6 required. |
| Rally Cry | All your Agents gain +1 movement this round. |
| Shared Fortune | Split your current Coins evenly with one ally in 3+ player matches (no effect in 2p). |
| Guiding Light | Reveal the tile type of any single tile on the board to yourself. |
| Second Opinion | Reroll any one of your dice this round. |
| Morale Boost | Your next successful attack grants +10 bonus points. |
| Safe Passage | Grant one ally Agent Shield for 1 round. |
| Reinforcements | Draw 2 cards, then immediately discard 1. |
| Steady Hand | Cancel the effect of the next Curse or Trap card played against you. |
| United Front | If you and an ally both have Agents on the same tile, both gain +1 to their next attack confirmation roll. |

## 10. Epic (12 — cost: discard 2 cards to play)

| Card | Effect |
|---|---|
| Throne's Gaze | Reveal one opponent's Oath target for 3 seconds to you only. |
| Twin Fates | Duplicate the effect of the last card you played this match. |
| Ironclad Decree | All your Agents are immune to attacks for 1 full round. |
| Hollow Crown | Steal 50 Coins from the current point leader. |
| Reckoning Bell | Every Agent currently on a Battle tile is attacked simultaneously by its tile owner's House (or a neutral resolution in FFA). |
| Puppet Strings | Force one opponent to move a specific Agent of your choosing on their next turn. |
| Obsidian Pact | Convert this turn's Oath progress (yours) into double points if completed this round. |
| Time Fracture | Take your turn again immediately after this one ends. |
| Vow Break | Cancel an opponent's active Oath entirely (they neither succeed nor fail — it is voided). |
| Grand Bazaar | All players may immediately buy back one of their own discarded cards for 20 Coins. |
| Silent Verdict | Your next attack this match cannot be seen in the game log by anyone but you until match end. |
| Chainbreaker | Remove all Curse and Trap effects currently active on your Agents. |

## 11. Legendary (10 — cost: fully drain the acting Agent's Resolve Meter; earned via Mastery only, 1 per match)

| Card | Effect |
|---|---|
| The Obsidian Throne | Your next Agent to bank scores double Home Points. |
| Court of Whispers | See the category of every active Mark on the board for one round. |
| The Long Game | Convert this match's Fracture Round bonus multiplier from 2x to 3x for you only. |
| Kingmaker | Choose any one opponent; their next attack this match automatically fails. |
| The Debt Never Sleeps | If your Oath is still active, double its reward and halve its penalty for the rest of the match. |
| Eclipse of Os | All opponents' hands are shown to you for 3 seconds. |
| The Fourth Wall | Negate the next Epic or Legendary card played against you, permanently for this match. |
| Bloodline Ascendant | Your active Agent permanently gains its class's signature Passive a second time (doubled effect) for the rest of the match. |
| The Last Rite | Instantly complete your Oath if the target is currently within 2 tiles of your Agent (still requires proximity — not unconditional). |
| Curse of the First House | Reduce every opponent's final score by 5% — this card is intentionally weak defensively and strong only in a genuine last-place-comeback context; see balancing notes. |

**Total card count: 102** across 10 categories (80 base + 12 Epic + 10 Legendary), satisfying the "over 100 cards" requirement while leaving room to grow post-launch without diluting any single category below a healthy draw density.
