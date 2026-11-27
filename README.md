# Guildbound

A medieval-fantasy adventure idle game: recruit heroes from card packs, send a party of five into the wild, watch them fight on a live map (or let them run while the game is closed), and spend what they bring home.

**Play online:** https://erakk.github.io/guildbound/ (saves stay in your browser). Every push to `main` rebuilds it (`.github/workflows/deploy.yml`).

Design doc and concept art live in Claude artifacts (see the design doc's "How to build it" and "Roadmap" sections).

## Run it

```powershell
npm install
npm run dev
```

Then open http://localhost:5180.

- `npm test` runs the core tests and prints a balance table per region.
- `npm run build` type-checks and builds to `dist/`.
- In the browser console, `guildbound.game` is the running game (handy for testing).

## What's in this first build

- 34 hero cards across all 8 tribes and 6 classes, with procedural sprite and card art.
- Recruit Packs (5 cards, rarity rates and the bad-luck guarantee from the design), duplicates as copies, Ascension with stars raising the level cap, signature ability at 3★.
- Party of five with front and back rows and a Captain.
- Regions with orders (focus, stance, retreat rule); see phase 3a for the world map.
- Live expeditions: AI party versus monsters, Healing Rain and Lightning Strike spells, clickable glints, chests, Recall Horn, a written chronicle.
- Offline progress: trips keep running while the game is closed and replay exactly from a seed plus recorded player inputs.
- Saves to the browser's local storage (older saves are upgraded automatically).

**Town and gear (phase 2):**

- Materials (wood, stone, iron, herbs, hides) from expeditions, by biome; a Gather focus doubles them.
- Seven buildings with levels and build timers, one project at a time, capped by the Town Hall: Town Hall, Guild Hall (+XP), Tavern (free pack on a timer), Weaponsmith, Armorer, Temple, Market.
- Gear: 66 items in three tiers across four slots (main hand, off hand, armor, jewelry), with the one-handed rule and class weapon training. Bought in shops or found in chests.
- Market: sell items and materials, buy materials and jewelry.
- Wounds: heroes knocked out on a trip must rest before going out again; the Temple shortens that and can heal for gold.
- Free formation: any mix of front and back rows, including all five in the back.
- Testing aids: "Finish now (test)" on construction, and the test-speed buttons on the live map.

**Personalities and crossroads:**

- Every hero has a personality (reckless, cowardly, shy, protective, glory hound, greedy, curious, steady), and some have a grudge against an enemy family or a favourite companion. All of it changes how they act on the live map and shows on their hero page.
- Reckless heroes and grudge-holders charge groups early; cowards hang back and flee when hurt; shy heroes hide behind allies; protectors draw fire and guard the wounded; glory hounds go for the biggest foe; greedy heroes grab chests mid-fight; curious heroes find more chests and glints; friends fly into a rage when a favourite falls.
- Trails have one or two crossroads with a side path: ruins (treasure and guards), a monster camp, a stranger (reward, or a trap), or a shrine (heal and blessing). The Captain decides from the orders, their personality and the party's mood; heroes who disagree grumble, and low morale costs damage.
- Speech bubbles on the map and the chronicle tell the story.

**The wider world (phase 3a):**

- A hex world map around Greyford with 36 areas in rings 1–3 and 14 biomes (sea, coast, mountains, snow, badlands, haunted woods, ruins, sky and more). You only see what you have explored plus the tiles next to it; sending a party into an "Unscouted" tile explores it.
- 29 enemy types in 13 families (ghouls, wraiths, trolls, ogres, wisps, imps, yetis, crabs, the Drowned, golems, wyrmlings, cultists, plus colour variants of goblins and wolves). Group sizes scale with how dangerous the monsters are, and the danger tier scales their strength.
- Tribe map abilities: 3+ Fenfolk can swim to sea areas, 3+ Dawnwings can fly to the Drifting Spires, 3+ Ironroot can tunnel into Deepdelve. The other tribes' abilities are listed as "coming soon".
- Five of one tribe in the party gives a tribe bonus (for example +20% gold for Freeholders, double herbs for Fenfolk, morale that never drops below 80 for Dawnwings).

**Spell cards and prestige classes (phase 3b):**

- 12 Guildmaster spells across all rarities: Healing Rain, Lightning Strike, Reveal, Haste, Entangling Roots, Frost Nova, Ward against Fear, Fireball, Stoneskin, Rallying Cry, Meteor and Second Wind.
- Spell cards come from packs (about 15% of cards). Duplicates level a spell up at once, and each level makes it about 20% stronger.
- The **Spells** screen is the spellbook: choose which spells go on the next trip and in which hotkey order. You get 2 slots, plus 1 per Mage Tower level (a new building, up to 5 slots). The trip keeps the spells and levels it left with, so replays stay exact.
- On the live map, an armed spell shows a targeting ring. Spell effects show on units: shields, roots, haste, rally and ward.
- The **Deeds** screen lists achievements. Some pay gold or packs; four unlock the prestige classes. Locked classes show as silhouettes, and the first unlock brings one free hero of the class.
  - **Beastmaster:** defeat 500 beasts. Throws spears and brings an animal (wolf, boar, toad, bone hound or moon wolf).
  - **Paladin:** finish 25 trips with nobody knocked out. A front-liner who also heals allies next to them.
  - **Necromancer:** clear every monster group in the Sunken Abbey in one trip. Raises fallen enemies to fight for the party until the fight ends.
  - **Dragonslayer:** slay a full-grown dragon (at Dragonmaw, or an Elder Dragon or Frost Wyrm lair in the Deep Marches). Heavy melee that hits big monsters 50% harder, and dragonkin twice as hard.
- 16 prestige heroes, with two prestige classes per tribe.

**Loose ends (phase 3s):**

- **Map figures:** each hero's sprite on the expedition map wears the head from their card portrait (hair, beard, hat, tells and expression), shrunk and with thicker outlines. Bodies, weapons and wings are as before; monsters are unchanged.
- **Tutorial:**
  - The "Open a pack" step is done once every card is turned over, not the moment the pack opens.
  - The last step's button follows the party: to the Watch screen while they're out, then "Read the report" in the Guild Hall.
- **Secrets are secret:** the Heroes screen shows secret heroes as silhouettes with "???" and nothing else. Unfound spells show a question mark instead of their sigil.
- **Pack reveal:** all five cards stay in one row. On narrow windows the pack and its cards shrink together, so they stay the same size.
- **An even difficulty curve:** generated areas used to jump to bigger monster groups at ring 6, so tier 6 caught two steps at once.

  | Tier | Half the trips come home (before) | Half the trips come home (after) |
  | --- | --- | --- |
  | 4 | 850 | 850 |
  | 5 | 1,100 | 1,050 |
  | 6 | 1,550 | 1,300 |
  | 7 | 1,720 | 1,700 |

  Group size now follows the danger tier (up to 6 through tier 6, up to 7 from tier 7), which gives about ×1.25 per tier. The map itself doesn't change. The recommendations were refitted: tier 6 is now 1,600 (was 1,650) and tier 7 is 2,000 (was 2,200).


**The town is the game (phase 3t):**

- **Greyford is the main screen:** a painted town where every guild building stands on its own plot. Click a building to open its panel: what it does, its rooms, its trade, and the builders' plans for it. Empty plots are staked out with a "(build)" sign.
- **Rooms in town:** the Guild Hall holds the Great Hall (reports, parties, contracts), the Roster (heroes), the War Table (party) and the Hall of Deeds. The Tavern holds the packs, the Mage Tower the spellbook, and the Town Gate leads out to the map. Every inner screen has a bar on top saying where you are, with the way back to town and to the other rooms in the same building.
- **The town grows with the Town Hall:** a hamlet behind a wattle fence (level 1), a village with a palisade (2), a town with cobbled streets, lamp posts, watchtowers and guards (3), a market town with stone walls and a fountain (4), and a city with round towers and a statue of the guild's founder (5). Houses fill in as buildings level up.
- **Buildings change as they level up:** the Town Hall goes from a thatched longhouse with a bell post to a palace with a spire; the Guild Hall gains a wing, a stone base, a tower and banners; the Tavern a second wing, flower boxes, lanterns and bunting; the Mage Tower a second tower, a floating crystal and a ring of runes. Building work shows scaffolding, a crane and a builder hammering.
- **A living town:** chimney smoke, waving flags, townsfolk walking the roads, and the heroes at home standing about the square (click one to see the roster). Night falls with the game clock: lit windows, lamp posts, stars and Dragonmaw glowing in the east. Seasons show too: spring blossom, autumn leaves, and snow on every roof in winter.
- **Signs and news:** each building has a sign with its level; a "!" on the Guild Hall when a party is back, the number of packs waiting on the Tavern, how many parties and scouts are out on the gate, and the wounded on the Temple. The tutorial guide points at the right building with a bouncing arrow.
- **A medieval dress:** the top bar is a carved beam with round medallions instead of tabs; panels have gold corner flourishes, buttons are wax-red with gilt edges, and news arrives on parchment.

**Painted monsters and a friendlier party screen (phase 3u):**

- **Monsters repainted** to match the hero cards: bold outlines, a shaded side, highlights and faces with character. Goblins grin under hooked noses and long ears (the archer wears a hood, the shaman a bone mask and feathers, the bomber goggles and a lit bomb, the Ironguard a helm and shield). Wolves snarl with a dark ruff, the boar has bristles and a tusk, the spider a red hourglass. Bandits hide under hoods and masks; the Bandit King has a crown, an eye patch and a beard. Skeletons have glowing eye sockets, a rusty sword and a shield, ghouls a lolling tongue, wraiths a void for a face. Trolls carry spiked clubs, the yeti roars, the imp juggles fire, the crab knight wears a tiny helm, the golem's rune glows, and the dragons breathe embers. The regional variants (frost goblins, ogres, the frost wyrm, the Grey Alpha…) still recolour the same art. Gates, tombs, cages and altars are unchanged.
- **Drag and drop on the party screen:** drag a hero between slots to swap them, from the bench onto a slot to put them in (whoever was there goes to the bench), or from a slot back to the bench to take them out. The bench now sits right under the slots.
- **Click a card for everything about the hero**, on the party screen too. The hero window gained an "In a fight" section with the numbers the battles use, gear included: health, attack, damage per second, armour, healing, critical chance, reach, speed and splash. On the party screen the window also has the party buttons: add to the party (or swap in), take out, make Captain.

**Heroes about town (phase 3v):**

- **Every hero has a hidden habit:** a few favourite spots in Greyford, what they do there, how long they linger and how fast they walk. Nothing lists them; you find out by watching. Brannoc dozes by the forge, Mudtail sits by the well for a very long time, Oakhewn stands under the old tree until birds nest on him, Rowan and Corvin drift around the market, Hollis guards the gate day and night, Ossian tends the old graves by the east wall, Gorm drums in the square, Seraphiel hardly ever leaves the Temple. All 58 heroes have one, written to fit them.
- **They walk the town:** heroes at home follow the roads between their haunts (up to 12 at a time, party members first), go into buildings and come back out (the Tavern, the Temple, the Mage Tower, the Guild Hall), and pass behind buildings and in front of the well as they should. A thought bubble shows what they are doing: a mug at the barrels, a sword at the training dummy, a fish at the well, "zZ" under the tree. Everyone keeps their own place at a spot and their own lane on the road.
- **Habits follow the town:** nobody drinks at a Tavern that isn't built yet; until it is, they make do with their other haunts. After dark most heroes head indoors, while the night owls (Elowen stargazing at the Mage Tower, Sable duelling the dummy by moonlight, Isolde walking her wolf along the wall) stay out. Wounded heroes rest in the Temple, or in the Guild Hall without one. Beastmasters bring their animal along.
- **Hover over a hero** to see what they are up to and what the town has noticed about them; click to open their hero window.
- New props for them: a training dummy by the Guild Hall and old graves by the east wall.

**Novice Packs, and a game that opens up slowly (phase 3w):**

- **Novice Packs** are a new guild's packs. They train the heroes you already have instead of flooding the roster: each card is a copy (towards the next star) or a drill worth most of a level, aimed mostly at the party. About one Novice Pack in eight brings a new Common recruit. The game starts with no packs at all. The Tavern is a new guild's source of packs: its welcome gift is a Novice Pack holding one new Rare (the tutorial's new recruit, and the only pack in the tutorial), and its free packs start one interval (4 hours at level 1) after it is built, as Novice Packs until the Town Hall reaches level 2. Adventures add a pack now and then: chests and glints in the tier-1 meadows give Novice pieces, about one pack's worth every five trips. Easy contracts pay in Novice Packs while the guild is new. Older saves start with none.
- **One thing at a time.** A new Guildmaster starts with five heroes, a Guild Hall, a Town Hall, one empty plot (the Tavern) and the map, and the top bar shows only gold. The rest opens as it starts to matter, each with a note:

  | Opens | When |
  | --- | --- |
  | Packs in the top bar | when there is a pack to open |
  | Materials in the top bar | after the first trip, each one once you have some |
  | Focus orders on the Map | after the first trip |
  | Hall of Deeds | with the first achievement, or after 3 trips |
  | Weaponsmith, Armorer and Market plots | after the tutorial's new recruit joins the party |
  | Scouting | at the tutorial's scouting step |
  | Stance and retreat orders | after 2 trips |
  | Quest board (contracts) | when the tutorial is done |
  | Temple plot | after 3 trips, or when someone comes home wounded |
  | Mage Tower plot | after 4 trips, or Town Hall 2 |
  | Day, night and seasons (top bar and Map) | after 4 trips |
  | Trouble in the Marches (and the events themselves) | after the tutorial and 4 trips |
  | Party II and the War Table's party tabs | Guild Hall level 2 |
  | Tribe bonuses and secret paths | three heroes of one tribe, or 9 heroes |
  | The Roster's secret heroes | after 6 trips |
  | Stables plot | Town Hall 3 |

  Equipment shows in the hero window once the guild owns an item, the Packs screen lists only pack types you have pieces of, and the builders' bar in town appears when the tutorial gets to building. Built buildings and anything a save already uses always stay visible.
- **News one at a time:** notes queue up and show three at once instead of piling on top of each other, and longer notes stay up long enough to read.

**The backpack (phase 3x):**

- **Gear is a backpack now.** The hero window has a paper doll (weapon, off hand, armor and jewelry around the hero's figure) and, beside it, every item the guild owns in one grid, sorted by slot and quality, with filters for each slot. Drag an item onto a slot to put it on, or off the doll back into the bag to take it off; double-click does the same. Pointing at an item opens its card right beside it, and a click keeps the card open with a Put on (or Take off) button. The card explains every number on the item in plain words ("+3 armor: taken off every hit the wearer takes"), names the classes trained with a weapon, notes two-handed weapons and shields, and shows what it would change for this hero (damage, armor, health, healing and speed, two-handed weapons included). The bag holds only what nobody is wearing: other heroes keep their gear.
- **Every item has an icon:** iron, steel and mithril look different, and named gear has gold fittings and a glow. The shops and the Market show the same icons.
- **The tutorial gives one Iron Sword** instead of a full set of four; the rest comes from the smiths and the Marches. The tutorial's Tavern goes up in 10 seconds (later levels as before).

**Ascension costs more than cards (phase 3y):**

- A new star still needs copies, and now also **training** (a minimum level), **gold** and the **materials of the hero's homeland** (Ironroot: iron and stone; Freeholders: wood and stone; Thornkin: herbs and wood; Ashborn: iron and hides; Fenfolk: herbs and hides; Moonveil: herbs and stone; Dawnwings: wood and herbs; Hollowed: stone and hides). From the fourth star on it also takes **Essence** (which spare copies turn into), and a Legendary's sixth star takes **Starshards**.
- Every star costs more than the last, and rarer heroes cost more (×1 for Commons up to ×2.8 for Legendaries):

  | Star | Level | Gold | Materials (first + half as much of the second) | Essence | Starshards |
  | --- | --- | --- | --- | --- | --- |
  | 1 → 2 | 8 | 150 | 8 + 4 | – | – |
  | 2 → 3 | 16 | 500 | 24 + 12 | – | – |
  | 3 → 4 | 26 | 1,500 | 55 + 28 | 3 | – |
  | 4 → 5 | 36 | 4,000 | 100 + 50 | 8 | – |
  | 5 → 6 | 46 | 9,000 | 170 + 85 | 15 | 2 |

  (Common prices; the other rarities multiply gold, materials and Essence.)
- The hero window lists each requirement, green when met and red with what you have when not. On the Roster, "Can ascend!" shows only when everything is ready, and "Copies ready" when the copies are there but something else is missing.

**Half-revealed packs (phase 3z):**

- What's in a pack is decided and saved the moment it's opened, and now the reveal is saved too. Leave the Packs screen (or close the game) before turning every card and nothing is lost: the Packs button and the Tavern sign show a "!", and the Packs screen picks the reveal up again with the cards you'd already turned still face up. This also means the tutorial's "Open a pack" step can't get stuck any more.

**The guild's hold (phase 4a):**

- Scouts can only map land next to town, or next to an area the guild has **secured**. Securing takes **hold**, earned by trips to the area: +1 for every trip that comes home, +1 more for clearing every monster group, +1 for dealing with a site, +1 for calming the area's trouble, and +3 for winning a siege there. A party that turns back adds nothing.
- Further rings need a firmer hold: 3 in ring 1, 4 in ring 2, 5 in rings 3 and 4, and 6 from ring 5 out.
- On the map, secured areas fly a green "Secured" banner and the rest show hold pips; land scouts can't reach yet is darker and labelled "Beyond reach", and its panel names the neighbouring areas that would open it and how much hold each still needs. The area panel has a Hold line, the expedition report says what the trip added, a note announces each area secured, and contracts only ask for land scouts can reach. When every reachable area is mapped, the Next Goals say which area is closest to secured.
- Older saves: every area already on the map counts as secured.

**Clearer side paths (phase 4b):**

- **Greenhollow is a plain trip:** no crossroads and no road events, just the trail, its monsters and its chests, so a new guild's first trips teach the basics.
- **Everywhere else, side paths explain themselves.** The place at the end of each side path carries a small plate saying what it is and what going there does: "Old shrine: heals the party and blesses their weapons", "Someone calling for help: help them for a reward (or walk into a trap)", "Ruined tower: treasure inside, and something guarding it", "Goblin camp: a hard fight, then the camp's loot chest", and the tribes' secret ways. The Captain calls out the choice at the crossroads ("To the shrine!" or "Keep to the road."), the outcome shows on screen (gold from a grateful stranger floats up, "A trap!", "Blessed!"), and plates fade once the party has passed by or been there. A travelling merchant's cart has a plate too, saying to click it and what it costs.

**Guarded chests and discoveries (phase 4c):**

- **Fewer chests, nearly all guarded.** A trip has 1 chest (plus one each for Treasure orders, two curious heroes, summer and a chest-loving Captain, up to 4), each at the end of its own short side path. Four kinds: a crate (unguarded, small), an iron-bound chest, a locked strongbox and a rare ornate chest that always holds an item; all but crates have guards between them and the trail. A plate over each says what it is and who guards it. Chests sit early enough on the trail that the party reaches them before turning home.
- **The Captain decides.** At each chest path the Captain's personality weighs it up (greedy Captains almost always go, cowardly ones rarely do), along with the orders (Treasure and Bold push for it, Cautious holds back), the guards, and how hurt the party is. Skipped chests leave greedy heroes grumbling.
- **Heroes react at the chest:** a Rogue picks a strongbox's lock, a protective hero spots its trap, and without either somebody gets a poisoned needle; greedy heroes shout "Mine!" and find a false bottom (+15% gold); curious ones turn over every board (better odds of an item).
- **Glints are gone; discoveries replace them.** Two to four themed things by the trail, chosen by biome: a beehive, a fairy ring, an ore vein, an abandoned campfire, a grave mound, a will-o'-wisp, a message in a bottle, a frozen adventurer, standing stones, fresh tracks, an overturned cart, glowing mushrooms, a spring, a bandit stash, an ember vent, a crab pot, an eagle's nest. Each is a choice between two things the party could do (or walking on), with real trade-offs: heal or harm the next monsters, gold now or hold for the guild, treasure that wakes the dead, a hunt for hides. Some options work better with certain classes (a Mage thaws the frozen pack at once, a Rogue covers the stash's tracks), and the card says whether this party has one.
- **You choose, or the Captain does.** As the party nears a discovery its card opens on the Watch screen, with a bar for the time left. Choose an option, or let the Captain decide when they get there in their own way (a greedy Captain digs up the stash, a steady one rests by the fire). The plate over the discovery then says what came of it. Choosing yourself counts toward the trip's Guidance as glints did; marking an ore vein or reporting a stash adds to the guild's hold on the area. The first trip's one discovery is always a campfire.
- Rewards stay about where they were: with the Captain deciding everything, trips to the first ring bring home much the same gold, materials and items as before.

**Landmarks and hazards (phase 4d):**

- **Every hand-made area has its own landmark** beside the trail, drawn as a set piece with a plate saying what it is: the sheep pasture in Greenhollow, the broken mill on Old Mill Road (the miller's daughter warns of bandits ahead), Brackenwood's lightning-struck oak, whale bones on Salt Shore, a beaver dam in Reedwater, the Elder Tree in Elderwood, the drowned bell tower of the Sunken Abbey, the Glacier Gate, a sleeping troll in Mirewood, a rude milestone on the Howling Steppe, an ogre's cooking pot on Thornback Ridge, and so on for all 36 areas. Longer trips, and the generated far rings, add a landmark of their biome as well (lighthouses, wrecks, dwarf doors, stone circles, lava falls…).
- **Passing a landmark does something small:** a rest, lifted spirits, a little gold or material, mana, experience, a few percent more damage, or a warning that weakens the next monster group. Many give more to the right tribe: Thornkin are healed by the Elder Tree, Fenfolk make friends with the beavers, Ashborn rekindle at the lava falls, Ironroot read the waystone's runes, Moonveil bathe in the moonpool. After passing, the plate says what came of it.
- **Every trail but Greenhollow's has a hazard**, a stretch drawn on the path with a plate: muddy ground, a bramble thicket that scratches, a sucking bog, a river ford, scree that drops stones, snowdrifts with no resting, a lava field that burns, a fog bank where monsters strike harder, rubble, or wind gusts. The season changes them: farm roads are dry in summer and snowed in in winter, and fords and bogs freeze into quick ice. A hero of the right tribe leads the party through at nearly full speed and doesn't get hurt (Freeholders on mud, Thornkin in brambles, Fenfolk in bogs and fords, Ironroot on scree, snow and rubble, Ashborn on lava, Moonveil in fog, Dawnwings in the wind).
- Rewards and difficulty stay where they were.

**Knockouts cost the haul; wounded heroes are easy to spot (phase 4e):**

- **Every hero knocked out costs a third of the haul** (`KNOCKOUT_LOSS` = 0.33): gold, materials and pack pieces are cut by 33% per knockout, and each item is left behind with the same chance. Two knockouts lose 66%, three or more lose everything. The report says so in red: how many heroes went down and what share of the haul was left behind. Fallen heroes (and pets, minions and freed allies) don't count.
- **Wounded heroes look it everywhere:** their card is greyed out with a red "✚ Wounded, back in N min" seal, on the War Table, the bench, the roster and in pickers. The hero window adds a line with the time left, what they can't do (trips, scouting) and, once there is a Temple, a "Heal now" button with its price. The screen redraws itself when a wound heals.
- **Sending out a party with a wounded hero** names who it is and how long they have left (e.g. "Still wounded: Ssiv (2:05 left)").
- Balance for the starter party, no clicks: safe trails don't change; trails where the party gets knocked about pay much less (Brackenwood about 209 → 144 gold, the Old Watchtower about 251 → 164).

**Scouts take an outing (phase 4f):**

- **Parties and scouts share the guild's outings** (`outingSlots`, `outingsOut`, `outingBlock` in `core/state.ts`). The Guild Hall sets how many the guild can run at once: one at first, two from level 3. A party on a trip takes one, two parties marching to a siege take two, and every scout takes one.
- So early on it's either the party or one scout: send a scout and the party waits at home until they're back, and the other way round.
- When there's no free outing, the Map says why once at the top of the scout panel and greys out every Send button, and the War Table names what is out ("Lyra is scouting Brackenwood"). The Town Gate shows "On the road · 1 of 1 outing". The tutorial's scouting step and the Guild Hall text mention it.

**Quieter trails (phase 4g):**

- **Plates on the trail only show while the mouse is over what they describe:** landmarks, hazards (anywhere along the stretch; the plate follows the pointer), crossroads (the signpost or what's at the end of the side path), chests, discoveries and the merchant's cart. One at a time, the nearest if spots overlap, drawn over the party.
- The pointer's place on the map is worked out every frame, so a still mouse keeps working while the camera pans. The discovery choice card still opens by itself, as before.

**Encounters (phase 4h):** set pieces on the trail (`src/core/sim/encounters.ts`). Every trip but the first meadows has one, longer ones two; each takes the place of one ordinary monster group, in the first 70% of the trail.

- **Ambush:** the group hides in rustling bushes on both sides of the trail and springs when the party is level with it, hitting first while the party falters. A Ranger (70%), Rogue or Beastmaster (50%) may spot it, and then the ambushers are the ones surprised.
- **Brawl:** two bands of different kinds fight each other off the trail. The Captain decides by personality, orders and the party's health: wait up to 20 seconds for a weakened winner, or charge in while they're busy and fight both. Monsters killed by monsters bring no gold and don't count as the party's kills. (None in lord areas, where the time is needed.)
- **Escort:** a merchant's wagon waits by the road and walks with the party for a stretch. Raiders spring from the side and go for the wagon. Get it through and the merchant pays gold and materials; lose it and the pay goes with it.
- **Troll bridge:** a river crosses the trail and a troll wants a toll (a fifth of the gold so far). The Captain pays, or fights for the troll's hoard. Bold Captains, a fresh party and bold orders fight; cautious ones pay. With too little gold, it's a fight.
- **Nest:** a spider nest, goblin burrow or open crypt keeps sending out monsters (up to 6, 2 at a time) until it's smashed. Ranged heroes, the Captain and glory-hounds go for the nest.
- **Thief:** a cutpurse snatches a fifth of the gold (capped by tier) and runs. Bring him down before he's 700 paces off and the gold comes back with his own purse. A Rogue (35%) or Ranger (20%) may catch his wrist first.
- Plates (on hover) explain the brawl, the wagon, the bridge and the nest; the ambush is a surprise. Ordinary groups no longer announce themselves with "Ambush!".

**Trail details (phase 4i):**

- **Orders shape discoveries:** Gather turns up ore, herbs and honey three times as often; Treasure, caches and stashes; Hunt, tracks and nests (`FOCUS_FINDS`).
- **Chests open with a moment:** the chest pops, coins burst out and bounce, and an item flies up to the party.
- **Mimics:** about one iron-bound chest or strongbox in twelve. Opening it, the chest grows teeth and bites (a greedy hero first); a Ranger or Rogue may poke it with a stick first, and then the party strikes first. Killed, it gives up the chest's loot, with a better item chance.
- **Chest traps by stance:** iron-bound (25%) and ornate (40%) chests can hold a needle (one hero), choking gas (everyone) or an alarm bell (two monsters come running). Cautious parties always check and disarm (a few seconds); Balanced ones may have a Rogue, protective or curious hero spot it; Bold ones tear it open, trap and all, for 20% more gold.
- **Rope bridges:** some mountain, hill, snow, badland and forest trails cross a gorge. The party crosses single file at 60% speed, so only the front reaches a fight first; a nearby group may hold the far end. A cowardly hero may freeze halfway; Dawnwings fly over.
- **Story loot:** unguarded crates are a dead adventurer's pack (its map marks a new site in the area when the report comes in), a goblin stash (a heap of one material) or an overturned wagon (a good chance of an item).
- **Find sets:** on some trips, three standing stones, spirit lanterns, cairns, tide bells or fire altars (by biome) stand along the trail. Click each while the party is near (they pulse); light all three for a hidden cache and +1 hold.
- **Field journal** (Hall of Deeds): every discovery seen, page by page for each kind of land explored. A full page gives +10% gold on trips to that land.
- **Area stories** (`data/stories.ts`): three chapters per area after the tutorial, told by the area's main monster family. 1: someone on the road asks for help; come home and the guild takes it on (+1 hold). 2: a tough lookout or den to clear (+1). 3: a named chief (three times as tough) with guards, and their chest (+3). The Map shows the next chapter.
- **Trip goals** (Orders → Goal): Hunt the alpha (a marked brute joins a group; a bounty), Rescue the traveller (bring them home alive: gold and +1 hold), Map the far reaches (press on into the last 15% of the trail; the party turns back later; pack pieces and +1 hold), Clear the area (beat every group; a bounty). Failing costs only time. The report says whether it was done.

**The night camp (phase 4j):** trips of 4 minutes or more make camp around 42% of the trail. The party sits in a ring round the fire for 10 seconds and talks (a fond friend saves someone the warm spot, a grudge-holder tells the old story again, and each personality's habit: the greedy one counts coins, the coward jumps at owls, the steady one cooks). Then the evening is the Guildmaster's choice card, or the Captain's: Rest well (heals half and fills the mana; a Cleric or Bard heals more), Keep watch (something prowls the camp: fight it for loot; a Ranger or Beastmaster hears it coming), or Tell stories (morale up and +15% experience, +25% with a Bard). The trip's turn-back time moves by the length of the stop.

**The road ahead (phase 4k):** the Watch screen's info box lists the next five things on the trail, in order (`roadAhead` in `sim/encounters.ts`): side paths, chests, brawls, the troll bridge, the merchant's wagon, nests, discoveries, landmarks, hazards, rope bridges, the night camp, find-set markers, the story's lookout or chief, and the goal's target. Ambushes and thieves stay a surprise. Where there's a decision coming, set a waypoint: Take the path / Keep to the road, Go for it / Leave it (chests), Charge in / Wait it out (brawls), Fight / Pay the toll (the troll), or leave it to the Captain (the default). Waypoints are player inputs, so trips still replay the same; the chronicle says when the Guildmaster's mark decided it.

**Living areas (phase 4l, `core/life.ts`):** look after an area and a settlement grows at the start of its trail: a hamlet once the area is secured (+5% gold, a welcome), a village once its story is told or after 6 trips home (+10%, a trader on the road every trip), a market town after 12 trips home (+15%, villagers mark the first group, which starts weaker, and the market adds a pack piece). The Map's "Secured" badge becomes Hamlet, Village or Town, and the area panel says what it does and what it needs to grow; on the trail, houses (and a market stall) stand at the start. Ignored trouble now grows where it sits (each time it would spread, its camp, warbands or gloom get bigger and richer, up to 3 steps) and, half-way to spreading, burns the area's settlement back a step. While an area is troubled its people hide (no perks); clearing the trouble brings them back.

**The expedition deck (phase 4m, `core/deck.ts`):** every area has a deck: its encounters, the discoveries of its kind of land, its features (rope bridge, find set) and up to three rare cards. Each trip is dealt a hand of 4 to 7 (longer trips, Explore orders and curious heroes draw more; the focus favours its discoveries; rare cards are drawn a seventh as often), and the hand decides what waits on the trail: the encounters (up to 2, or 3 on longer trips), the discoveries (up to 4, at least 1), a rope bridge or a find set. A new area's deck shows 6 cards; every point of hold opens 2 more, and a secured area has the whole deck. Cards dealt are remembered: the Map's area panel shows how much of the deck is open and seen, and "View deck" lays it out (seen cards face up, unseen face down, locked ones saying what opens them; rare cards gold-edged). A new rare card gets a toast.

- **The White Stag:** stands among the trees and runs when the party comes near. Bring it down before it gets 750 paces away: gold, a Veteran pack piece and high spirits.
- **The Lost Caravan:** a rich wreck by the road: 45-60 gold per tier and an item for sure.
- **Shrine of the Old Gods:** heals the party fully and blesses the rest of the trip (+20% gold and experience).

**Dungeon delves (phase 4n, `sim/delve.ts`):** a party sent to a dungeon site walks a shorter trail to the dungeon's mouth and goes down the stairs. The path carries on underground, drawn below the map: five stone rooms in a row, with doorways, torches and flagstones.

1. **The entry hall:** its guards.
2. **The trap corridor:** pressure plates and dart holes. A Rogue wedges the plates; a Cautious party creeps through testing every stone (slow, safe); anyone else takes darts all the way along.
3. **The locked door:** a Rogue picks it (2 s), a Mage reads its runes (2.5 s), otherwise they force it (7 s). The Guildmaster can click the lever on the wall to open it at once.
4. **The crypt:** sarcophagi, more monsters, and an alcove with a chest.
5. **The Warden's hall:** the Warden (the area's toughest monster, four times over, named for the dungeon) and its guards, then the vault.

The party turns back later while underground, and climbs back up the stairs on the way home. The road-ahead panel lists the way down and each room. Clearing the rooms and the Warden deals with the site (+1 hold), as before.

**Check-up (phase 4o):** watched each new piece in the game and ran balance on rings 1-4.

- Fixes from watching: a mimic now springs out past its chest, away from the trail (it was hidden among the party). Named bosses made from ordinary monsters (a dungeon's Warden, a lair's Great beast, a story chief) are drawn half again as big. The Warden is the toughest of the area's own monsters, preferring a non-beast (it was a Tusk Boar or a winter Frost Wolf). The road-ahead panel lists the Shrine of the Old Gods and the Lost Caravan.
- Balance (expected-strength party, rings 1-4): a new area's 6-card deck pays the same as no deck; a full, secured deck pays about 12-20% more (more encounters, rare cards); 95-100% of trips come home everywhere. To keep long-tended areas from stacking too high, settlements now give +3% / +6% / +10% gold (was 5/10/15) and the Lost Caravan 30-40 gold per tier (was 45-60).

**Tribe Embassies (roadmap phase 3, `core/embassy.ts`, `ui/screens/embassy.ts`):** a new building, the Embassy (left edge of town; its plot opens at Town Hall 2 after 6 trips). Its Envoys' Hall keeps desks for 2, 4, then all 8 tribes; opening a tribe's embassy costs gold and that tribe's two ascension materials.

- **Reputation (0-100) per open embassy:** any trip home with 3 or more of the tribe in the party: +2. A **tribe quest** (five of the tribe, home safe from the tribe's own land: Old Mill Road, Ironspine, Elderwood, Cinderreach, Fen of Whispers, the Gloaming, the Drifting Spires, Barrow Fields): +10 and a Tribe Pack.
- **Milestones**, each with a Tribe Pack as a token: **Friend (10)**: Tribe Packs hold 4 of the tribe instead of 3. **Ally (30)**: the tribe's gear recipe, crafted at the embassy (450 gold and 15 of each tribe material): Hearthguard Shield, Deeprune Plate, Heartwood Bow, Cinderbrand Axe, Reedfang, Moonglass Staff, Dawnstar Mace, Gravecloak (tier 3, never sold in shops). **Kin (60)**: the Legend chain, three trials in the tribe's land (The Road; The Proving: beat every group; The Calling: nobody knocked out), ending with the tribe's Legendary hero (a second copy-pair if already owned). The Thornkin and the Fenfolk have no Legend: their chain ends with their Epic (Oakhewn, Quill), at 3 stars.
- **Tribe Packs:** five hero cards at Recruit Pack odds, 3 (or 4) of them from the tribe; no spells, no effect on the Recruit Pack bad-luck counter. They're earned, not bought: unlike the design doc's first idea, gold still never buys packs.

**Animations (roadmap phase 4):**

- **Map: fog burns away.** When an area is explored, its old fog tile sits on top, scorches amber, flares at the edges, throws a few embers and fades away (about 2.5 s), once per area.
- **Map: party banners on the roads.** Each party out has a dashed, marching road from Greyford to its area and a waving banner (Party I red, Party II blue) that moves with the trip: along the road out on far trips, then with the party's progress along its trail (out as it explores, back as it heads home), then the road home (`Game.mapProgress`). Scouts carry a small blue pennant: out for the first 30% of their trip, at the area, back for the last 30%.
- **Map: stamps.** A new trouble badge, a new site count, or a new Secured / settlement badge stamps down (big and tilted to normal, with a ring of dust), once.
- Map animations are remembered in the save (`mapSeen`, `mapStamps`; an older save starts with everything seen) and survive the Map's frequent redraws (each picks up where it is).
- **Packs:** the pack shakes, its top strip tears off and flies away while light pours out (coloured by the best card inside); the cards deal out of it one after another; turning over a Rare, Epic or Legendary throws rays of light behind the card, and a Legendary flashes the screen.

**A seamless world map (`src/art/worldTerrain.ts`):** explored land is drawn as one continuous surface under the hex tiles, so lines match from hex to hex.

- **Borders:** each hex edge between two explored areas is one wiggly line, seeded by its two corners, so both neighbours draw the same border; areas of the same kind of land merge. Edges against unexplored fog stay straight.
- **Coastlines:** each hex corner is water or land from the three hexes that share it (sea and reef count 2, coast 1, water at 3 or more), so one sea hex alone doesn't drown the land beside it. The shoreline crosses each edge at a point both hexes agree on and leaves it at a right angle on both sides, so it runs on smoothly; a sandy beach and a line of foam follow it. Shorelines are worked out from the whole world, so they don't move as land is explored.
- **Roads:** one network from Greyford out through the explored land (not over the sea or the sky): each area links to a neighbour nearer town, through the middle of their shared edge, so the roads join up.
- **Tile art as scenery:** the painted tiles keep their trees, mountains and buildings, but lose their own backgrounds and anything drawn from edge to edge (roads, streams, shorelines, bands of ground), and fade out towards the hex edge. Hex outlines on explored land are thin; selection and trouble still show strong.
- **Rivers:** one network for the whole world (`riverNetwork`), so it doesn't change as land is explored. Every hex knows its steps to the sea; springs rise in some mountain, hill, glacier, mine and snow-forest areas (28 of them), and each river steps a hex nearer the sea at a time, lower ground first, so every river ends in the sea. Rivers that meet merge and run on wider. In a hex, the rivers come in through their edges, join at one point and leave through the edge towards the sea; each crossing is the same point from both sides and the river leaves it square to the edge, so rivers run on smoothly. They're drawn under the sea (they run into it at the shore) and under the roads. Springs show as a little pool.

**Spells are rare (Grimoires super rare):**

- **Grimoires** now need 10 pieces (was 6) and never turn up in ordinary chests or clicked finds; supply contracts pay a Recruit Pack instead. Grimoire pieces come only from the rare secret paths (4%), shrine sites and the bonus for trips to the world's edge (ring 10).
- **Spells in hero packs:** at most one spell card per pack, now and then, and only once the Mage Tower is built: Recruit Packs 7%, Veteran Packs 12%, Champion Packs 20% (it used to be 10-15% per card, so most Recruit Packs had one). The spell takes the place of one of the lesser cards.
- **The Mage Tower's first scholar** brings one Common spell when it's built, so the spellbook never opens empty.
- So, roughly: 1-2 spells in the early game (the tower's, and one from about a dozen Recruit Packs), a few more in the mid game, and several in the late game as Veteran and Champion Packs come in (plus the odd Grimoire).

**The first ring pays in Novice Packs:**

- On trips to the first ring (ring 1), any pack piece but a Novice one stays what it is only 1 time in 10; otherwise it's a Novice Pack piece (`RING1_KEEP`). That covers chests, cleared trouble, secret paths, sites and everything else. The chronicle names what was actually found. Starter party, ring 1: about 0.93 Novice pieces a trip, 0.10 Recruit and 0.02 Veteran pieces (a Recruit Pack every ~50 trips).
- **Contracts** pay Novice Packs in the early days (`earlyDays`: the Town Hall still at level 1, or nothing explored past ring 1). That's bounties, scout requests and supplies; it was mainly the supply contracts (paying a Recruit Pack since the Grimoire change) and the tier-2 bounties (a Recruit Pack plus Veteran pieces) that handed out Recruit Packs early.
- Two fixes found on the way: a passing rival company no longer empties a site's hoard (or the Lost Caravan), and a lair's hoard lies on the trail just past the beast (off to the side, the party could walk by it).

**Someone looks before a discovery is decided:** on the way out, when the party is about 200 paces from a discovery, one hero runs over to it (a curious one, else a Rogue or Ranger, else the Captain), calling out ("What's this?"). The party doesn't walk past it until they're standing beside it. Only then does the choice card open ("A DISCOVERY"), and the party waits 6 seconds for the Guildmaster's word, with the bar counting down, before the Captain decides; choosing sooner sends them on at once. The time spent waiting doesn't eat into the trail: the party turns back that much later. The night camp's card opens when the party sits down at the fire, and it's decided when they get up. On the way home (a trip cut short), the Captain still decides in passing.

**Trip orders open with the town:** each order comes with the building that teaches it (`ORDER_UNLOCKS` in `core/unlocks.ts`): **Focus** with the Guild Hall at level 2, **Stance** with a Weaponsmith, **When to retreat** with a Temple, **Goals** with the Town Hall at level 3, and **waypoints on the road ahead** (Watch screen) with the Stables. Until then the party goes out on steady orders (explore, balanced, retreat at 30%, no goal; the Captain makes the calls), and the Map's orders panel says which order opens next and what it needs. Each one is announced when it opens. On the area panel, the Deck line shows from Town Hall 2 and the Settlement line once the area is secured.

**Camera fix:** the Watch screen's camera centres on the party again. It averaged everyone on the party's side, including the escort wagon and the lost traveller (Rescue goal) waiting far up the trail, which pulled the view ahead of the party. It now leaves out anyone still waiting up the trail or gone, and anyone far from the leader.

**Speech bubbles follow the speaker:** on the Watch screen, a hero's (or anyone's) speech bubble rides above their head as they move, lifting a little and fading at the end, instead of staying where they stood. A new line from the same speaker replaces their last bubble.

**New card art (phase 3r):** every card is redrawn in the style of the final card design (Brannoc's card in the concept canvas).

- **Frames by tribe material:** Ironroot iron, Freeholder oak and brass, Thornkin bark, Ashborn obsidian with ember edges, Fenfolk verdigris, Moonveil moon-silver, Dawnwings white gold and Hollowed bone. Each has rivets, corner brackets, a name plate, the tribe's emblem, a class badge, a rarity ribbon and a parchment panel. Epic and Legendary cards get gems and a glow; Legendary cards add a foil sheen.
- **Painted portraits** (`src/art/portraits.ts`): a bust over the tribe's home.
  - Homes: a dwarf hall at dusk, farmland and a windmill, a sunlit forest, a volcano, a misty marsh, a moonlit night with moths, cloud spires, and a graveyard in the mist.
  - Each tribe has its own head: dwarves, elves with long ears, tusked Ashborn, frog-eyed Fenfolk with fins, moth-folk with antennae and dark eyes, winged Dawnwings, and pale Hollowed with glowing eyes.
- **Every hero has a persona:** hair, beard, brows, eyes and mouth set to their character, tells and a prop of their own. Some examples:
  - Brannoc: the broken horn, the scar, the gap tooth and the pipe.
  - Mirela: her lantern.
  - Rowan: a cap and a coin.
  - Tamsin: winking under a feathered cap.
  - Dorrik: a lit bomb.
  - Faelan: a mushroom hat.
  - Ssiv: sticking his tongue out.
  - Pip: sweating behind his lantern.
  - Morrow: a bone crown.
  - Bruni: a singed beard.
  - Beastmasters have their animal peeking in.

  Distinctive hair isn't hidden under the class's usual hat. All 58 heroes and the 8 secret ones are covered (secret ones show as silhouettes until found).
- **Spell cards** use the same frame in arcane silver, with the sigil glowing in a circle of runes.
- **Speed:** each card's art is drawn once and cached as an image. Names, stars, levels and text are laid over it in the game's fonts, so they stay crisp at any size.
- **Every card is 5:7, the pack's shape.** Opening a pack deals the cards at exactly the pack's size, all five the same, with backs in the pack's colours and seal. The hero window shows the card large.
- The Deeds screen's prestige portraits use the new busts. The map sprites are unchanged.

**Scouting, sites, captains and secret heroes (phase 3q):**

- **Scouts open the map.** A party can't go anywhere unmapped. Scouts are Rangers, Rogues and Beastmasters, plus a few curious others: Tamsin, Faelan, Ixa, Pip and Lumen.
  - Send one from the Map. A scouting trip is a timed job for that hero alone, settled when it ends: scouting time by ring plus the road (scouts travel light), and Rangers are 15% quicker.
  - The odds depend on the scout's power against a fifth of the area's recommendation: about 95% at full strength, 70% at three quarters, 40% at half. Thornkin get a bonus in forests and haunted woods; Rogues and Moonveil a small one everywhere.
  - A scout who is spotted comes back wounded. In a skull area there's a 35% chance they don't come back.
  - Areas that need a tribe ability need a scout of that tribe: only a Fenfolk scout can swim out to a sea area.
  - While scouting, a hero is away: their party can't leave until they're back.
- **Searching known land finds sites.** A scout searching a mapped area finds one site, sometimes two (up to 3 per area, one of each kind):

  | Site | What's there |
  | --- | --- |
  | Camp | Two war bands guarding a hoard |
  | Lair | A great beast of the area (six times the health) with two guards, and its hoard |
  | Dungeon | Three rooms of monsters, then a vault |
  | Cache | Loot under a light guard |
  | Shrine | Heals the party, steadies their blows and leaves a Grimoire piece |

  - Rangers find more lairs, Rogues more caches and dungeons, and bards and mages more shrines.
  - On the Map, choose "Go for" a site. Sites sit partway along the trail, and a site trip gets 20% more time.
  - A site that's dealt with is gone; one that isn't stays for another try.
  - Hoards pay gold, an item and pack pieces (Champion pieces from tier 5).
  - Slaying a Deep Marches lair beast counts for the Legendary chest.
- **Site balance**, for a party at the recommended power:
  - caches and shrines almost always;
  - camps 4–6 in 6;
  - lairs 4–6 in 6;
  - dungeons 3–4 in 6, for about 1.5–1.8 times a normal trip's gold plus the vault.
- **On screen:**
  - Map tiles show gold badges for found sites and a blue eye for scouts on the way.
  - The top bar has a chip per scout.
  - The Guild Hall has a Scouts panel with recent reports.
  - The tutorial has a new step, "Scout new land" (11 steps now), and Next Goals points at scouting early on.
  - Cartographer contracts are done by scouts.
- **Every hero is a different Captain.** 20 styles, from born leaders to people who should never be asked:

  | Grade | Styles |
  | --- | --- |
  | Great | Born to lead: +10% damage, gold and XP (Solenne, Aldric, Marta) |
  | Good | Drillmaster (+15% XP), Quartermaster (+30% materials), Pathfinder (+20% walking speed), Shadow (strikes first in every fight), Field medic (+20% healing), Lucky star (more glints and a chest), Inspiring (+8% damage and healing) |
  | Mixed | Bulwark, Hothead, Treasure nose, Miser, Scholar, Glory-seeker (bigger fights for more gold and XP), Dreamer, Grim, Worrier |
  | Poor | Tyrant (Embermaw: a brilliant fighter, an awful boss), Hopeless with maps (Pip) |
  | Plain | Mudtail, Ossian |

  It's shown in the hero window, the Party screen (colour-coded), on the Captain buttons and in the Map's orders. The chronicle names the style.
- **Secret heroes: one per tribe**, each breaking their tribe's mould:

  | Tribe | Hero |
  | --- | --- |
  | Freeholders | Marta the Lost Heir (legendary rogue) |
  | Thornkin | Oakhewn the Bark-Knight (warrior) |
  | Ironroot | Runa Deepglow (legendary mage) |
  | Ashborn | Yssa Emberpriest (cleric) |
  | Fenfolk | Quill Tidewatcher (ranger) |
  | Moonveil | Sable the Moonblade (legendary warrior) |
  | Dawnwings | Corvin Featherthief (rogue) |
  | Hollowed | Lament the Last Song (bard) |

  - They're never in packs until found. They join on their own when the guild does something that catches their eye, after which they can also turn up in packs.
  - The Heroes screen shows only silhouettes and a rumour each; the conditions are in `src/core/secretHeroes.ts`.

**Spell rework and mid-game balance (phase 3p):**

- **Spells start locked.**
  - A new guild has no spells. Building the **Mage Tower** opens the spellbook: 2 slots at level 1, then 3, 4 and 5 (a new level 4, which needs Town Hall 4).
  - Hero packs only mix in spell cards once the Mage Tower stands. Grimoires are always all spells, and cards found early wait in the collection.
  - The tutorial's "Lend a hand" step is now about clicking glints. Its gift pack is all heroes.
  - Older saves keep the slots they had: loading one raises its Mage Tower by a level.
- **Commons are blessings.** Three new spells, each lasting 30 seconds with a 45-second cooldown:
  - **Fortune's Favor:** +50% gold from foes, chests and glints, and glints twice as often.
  - **Bountiful Harvest:** double materials.
  - **Sage's Insight:** +50% XP.

  Each level adds 20% to the bonus. Reveal stays common, and the Watch screen shows running blessings with a countdown.
- **Damage is rarer:**

  | Rarity | Spells |
  | --- | --- |
  | Uncommon | Healing Rain, Haste, Ward against Fear, Entangling Roots, Stoneskin |
  | Rare | Rallying Cry, Lightning Strike, Frost Nova |
  | Epic | Fireball |
  | Legendary | Meteor, Second Wind |

  Lightning, Fireball and Meteor hit a little harder for it. 15 spells in all.
- **Power now counts gear.** On the Map and Party screens and in the hero window, power includes weapons, armor and jewelry. Hero cards still show the hero alone.
  - The old "recommended" ignored gear, which made the mid game look harder than it was. Over 40 trips, a party following it never once lost a hero.
- **New recommendations, fitted from test runs** (a sweep of levels 4–28 × no gear to Mithril × tiers 2–7, plus the Deep Marches runs):

  | Tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | Recommended power | 400 | 480 | 800 | 1,100 | 1,300 | 1,650 | 2,200 | 2,800 | 3,500 | 4,200 |

  The Map says whether a trip is comfortable, risky (within 15% under), dangerous or too dangerous.
- **What that gives,** in a 70-trip run of a fresh guild:
  - at the recommendation: about 84% of trips come home clean, 12% with a hero knocked out, and 4% retreat;
  - one tier above: about 70% retreat;
  - tier 5 by about trip 40, and average level 15–18 by trip 70.
- **The early stone wall:**
  - Town Hall 2 now needs 30 stone (was 50).
  - The first Market level needs no stone (was 5), so you can always buy stone.
  - Without this, a guild could sit at Town Hall 1 for 20 trips with thousands of gold it couldn't spend.

**Playtest pass (phase 3o):** a fresh game played through the tutorial and about 30 early trips (to ring 3), then the late-game screens. Fixes:

- **The tutorial guide no longer covers what it asks for.**
  - On the screen a step is about, it's a banner at the top of the page.
  - Elsewhere it floats in the corner, and the page has room to scroll out from under it.
  - Before, it hid slot 1's buttons on the Party screen, the Recruit Pack's Open button, and the bench (where the new hero goes).
- **Escape closes the window on top.**
- **Next Goals says what the Town Hall is short of** (for example "34 stone") and where that turns up, and mentions that the Market sells materials. Stone was the early bottleneck: none of the first areas give it.
- **The Market:**
  - buys materials 25 at a time, as well as 5;
  - shows named gear in gold with its lore;
  - asks before selling a piece of named gear.
- **Times over an hour show as h:mm:ss.** Before, the top-bar trip chips and the Tavern timer read "245:01".
- **The top bar:** Essence and Starshards have icons, so they still make sense when narrow windows hide the labels.
- **Small things:**
  - no more "+0" floating over heroes already at full health;
  - "Construction finished: Tavern." (it used to print the internal id);
  - a brand-new guild is welcomed, not "welcomed back";
  - "1 pack opened";
  - the prestige cards' "UNLOCKED" no longer runs into a long class name.

**The Siege of Dragonmaw (phase 3n):** the last and hardest large battle. It is fought at the Wyrm Throne, ring 9, the heart of the Dragonmaw range east of Greyford: tier 9, a skull area, and 160 minutes on the road each way.

1. **The approach:** cultist camps and drake nests on the side paths. Each one cleared means two fewer waves of the brood.
2. **The altars:** three blood altars on the field keep summoning cultists (and the odd wyrmling) until they are broken. Melee heroes go for a nearby altar.
3. **The brood:** waves of drakes, wyrmlings and cultists come down the mountain while the Elder Wyrm circles overhead.
   - Every 10 seconds she breathes fire on a spot shown on the ground just before it lands. It hits for a fifth of each hero's health (half for Ashborn) and leaves burning scorch for 14 seconds.
   - Three clickable **ballistas** stand at the field's edge. Each bolt that hits makes her break off her next pass and takes 12% off her health when she lands (up to three bolts).
4. **Kalvorax the Elder Wyrm:** she lands in front of her cave with two drakes. Below half health she rears up, breathes fire across the field and calls three more drakes.
5. **The hoard:**
   - double the usual vault gold, three Mithril items and a piece of named gear;
   - 3 Starshards, plus the Legendary chest for a slain lord (more Starshards and a likely second piece of named gear);
   - 4 Veteran and 3 Champion pieces, and a sealed chest.

   The Elder Wyrm counts as a full-grown dragon for the Dragonslayer, and Dragonmaw stays quiet for two weeks.
- **Balance**, from test runs (wins out of 8, no spells):

  | Who went | Wins |
  | --- | --- |
  | One party, awakened three times, named gear | 0 (overrun by the brood) |
  | Both parties, awakened twice, Mithril | 1 |
  | Both parties, awakened three times, Mithril | 4 |
  | Both parties, awakened three times, named gear | 6 |
  | The same, clicking the ballistas | 8 |

  It's built for both parties together.
- **Fixes along the way:**
  - The altars (and the barrow tombs) are no longer announced as an "Ambush!".
  - Encounter lines now say "an Ash Cultist", and named bosses get no article.
  - At Dragonmaw, standing in scorch gets one chronicle line for the whole party instead of one per hero.

**Rings 8 to 10: the Deep Marches (phase 3m):**

- **330 areas:** the map now runs to ring 10. Rings 8–10 add 162 generated areas, and every one of them is a skull area (heroes knocked out there can die for good).
- **Danger tiers 7–10:** ring 8 is tier 7–8, ring 9 is 8–9, ring 10 is 9–10. Above tier 7 monsters grow faster again, because these rings are made for awakened heroes. The deep tiers don't add the extra skull toughness that the three ring-4 skull areas have.
- **Long roads:** 100 minutes each way to ring 8 (about 3.7 hours in all), 160 to ring 9 (about 5.7 hours), and 240 to ring 10 (about 8.4 hours), as the design's 3–12 hour scale says.
- **The Stables** (new building, 3 levels) cut the road time to rings 5 and out by 15%, 30% or 45%. The cut is fixed when a party leaves.
- **Lords in their lairs:** about a quarter of deep areas have a lord at the end of the trail, picked by terrain:
  - an Elder Dragon in the fire-lands;
  - a Frost Wyrm in the snow;
  - a Stone Titan on the peaks;
  - the Grey Alpha in the woods and plains;
  - a Dread Lord among the dead;
  - a Leviathan by the sea and marsh.

  Drakes join the fire and mountain monsters. A Frost Wyrm counts as a full-grown dragon for the Dragonslayer.
- **Legendary chests:** slay the lord, or clear every group, and the party brings home a Legendary chest. It holds Starshards (more for a slain lord and deeper rings) and sometimes a piece of named gear. Ordinary chests out there can hold a Starshard too.
- **Named gear:** 12 one-of-a-kind items that are never sold in town, shown in gold with a line of lore. Examples: Dawnbreaker, Whisper, Starfall, the Ember Staff, Wyrmscale Mail, the Aegis of Greyford and the Crown of the Marches.
- **Awakening:** a hero at their last star and level cap can be awakened on the Heroes screen with Starshards and gold, up to three times:

  | Awakening | Cost | Each one gives |
  | --- | --- | --- |
  | First | 3 Starshards, 2,500 gold | +5 level cap, +10% every stat |
  | Second | 6 Starshards, 6,000 gold | +5 level cap, +10% every stat |
  | Third | 10 Starshards, 12,000 gold | +5 level cap, +10% every stat |

- **More pieces for the road:** coming home from ring 8 adds two Champion and two Veteran pieces; ring 9, three Champion and a Veteran; ring 10, four Champion and two Grimoire.
- **New achievements:**
  - Into the Deep (explore ring 8): a Champion Pack.
  - World's End (explore ring 10): two Champion Packs.
  - Lord of the Deep (slay 3 lair lords): two Champion Packs.
  - Awakened (awaken a hero): 3,000 gold.
- **Map:** the map can now be zoomed (+ and − buttons) and dragged. It opens centred on the selected area, and ◎ jumps back to it.
- **Balance:** test runs, 12 trips each, without spells, with a 30% retreat rule. Lords are the hardest fights; at tier 10, a fully awakened party in named gear wins about 5 in 12.

  | Party | Tier 8 | Tier 9 | Tier 10 |
  | --- | --- | --- | --- |
  | Legend (level 40, 5★, Mithril) | 8 | – | – |
  | Awakened once | 12 | 2 | 0 |
  | Awakened twice | 12 | 7 | 0 |
  | Awakened three times | 12 | 10 | 6 |
  | Awakened three times, named gear | 12 | 12 | 10 |

  A legend party wins all 12 trips at tier 7. Deaths are common for parties out of their depth.

**Rings 5 to 7: the far Marches (phase 3l):**

- **168 areas:** the map now runs to ring 7. Every hex has an area: the gaps in ring 4 are filled, and rings 5–7 are new, 119 generated areas in all.
- **Generated, but each direction keeps its character:**
  - east: fire;
  - north-east: peaks and sky islands;
  - north: snow and old forest;
  - west: the sea (Fenfolk only), and sky islands (Dawnwings only);
  - south-west: marsh and haunted woods;
  - south: barrows and plains.

  Names, monsters and descriptions come from per-terrain tables. The same map comes out every time.
- **Travel time:** far trips include a road out and home on top of the adventure: 15 minutes each way for ring 5 (about 45 minutes in all), 35 for ring 6 (about 1.5 hours), 70 for ring 7 (about 2.5 hours). On the road, the Watch screen shows a countdown, and spells and clicks wait for arrival. The report comes when the party is home. The Map shows the full trip length.
- **The long road pays:** returning from ring 5 adds a Veteran piece; ring 6, two Veteran and a Champion; ring 7, two Champion and a Veteran. Exploring ring 7 earns the Edge of the Map achievement (a Champion Pack).
- **Danger:** tiers above 4 now grow faster. A strong party handles tier 5 and about half of tier 6; an endgame party handles most of tier 7. Skull areas were retuned to stay as dangerous as before.

**More large battles (phase 3k):** sieges now come in kinds that share one engine (approach, then the battle, then the boss and the hoard; razed for two weeks after a win).

- **Barrow Uprising** (ring 4, south-west of Mirewood): an open barrow field with no walls. Four tombs keep raising the dead until the party breaks their seals (melee heroes go for a seal when one is close). Clickable holy water scorches the dead and cracks seals. With every seal broken, the Barrow King rises from the great mound and calls more of his guard when hurt.
- **The Bandit King's Hold** (ring 4, past Old King's Road): a stockade with crossbow towers, waves of bandits and war beasts, and the Bandit King in the keep. Three cages in the courtyard hold prisoners: break a cage, or click the prison key by the gate, and three freed prisoners join the fight. They aren't party members, so they get no XP or wounds.
- **Balance:** both sit alongside the Goblin Fortress. A party at the expected tier-4 strength wins 3–5 sieges in 8 without spells, and a strong party nearly always wins.
- **The Cinder Legion** (ring 6, in the fire-lands east of Greyford, 35 minutes on the road each way):
  - A burning plain. Ranks of imps, magma hounds, ash goblins and fire elementals march in while fire fissures open and the burning ground spreads.
  - Heroes standing in fire burn every second. Ashborn walk through unharmed, and fire creatures heal in it.
  - Frost Nova and clickable water cisterns put fires out.
  - The Cinder Lord waits at his black spire, and sets the ground around him alight when hurt.
  - Balance: an endgame party (level 30, 4★, Mithril) wins about half the time, and 7 in 8 with three Ashborn.
- **The Siege of Dragonmaw** (phase 3n): see below.

**Day, night, seasons and road events (phase 3j):**

- **Day and night:** a world clock runs one cycle per hour: 45 minutes of day, then 15 of night. At night, spirits and wolves join the monsters, Moonveil heroes are 15% stronger, glints are worth 50% more, and the battle map darkens around the party's lantern light.
- **Seasons:** each lasts a real day.
  - Spring: +50% herbs.
  - Summer: one more chest per trip.
  - Autumn: +30% wood and hides.
  - Winter: frost wolves appear, frozen streams speed up marsh and coast trips, and snow covers the map.
- **A trip keeps its conditions:** it uses the time and season it left in, so replays stay exact. The top bar shows the clock and season, and the Map explains what leaving now means.
- **Road events:** about a third of trips meet one of these.
  - **A travelling merchant:** click the cart to buy a good item plus tonics for the party, paid from the trip's gold.
  - **A rival company:** bold orders, or a reckless or glory-hound Captain, means a fight worth extra gold. Otherwise the rivals empty the next chests first.
  - **A sudden storm:** slower going, ranged attacks weaker, no glints, and rain on the map.

**Endgame permadeath (phase 3i):**

- **Three skull areas (tier 5):** Dragonmaw (with the Elder Dragon in its lair), the Bone Wastes and the White Silence. They sit in ring 4, as an early taste of the skull lands; the Deep Marches (rings 8–10, phase 3m) are where the real skull country begins.
- **Danger and reward:** monsters there are much tougher than the tier says, and gold is 60% richer.
- **Death:** a hero knocked out there dies for good, unless:
  - a Phoenix Feather (Market level 3, 900 gold) burns to raise them, after which the feather is gone;
  - a Cleric or Paladin drags them out (once each per trip);
  - or Second Wind raises them before the trip ends.
- **On screen:** the map warns with a ☠ badge and panel, and asks before sending anyone. The report names the fallen. Their gear returns to the storehouse, and the Guild Hall's Hall of the Fallen keeps a plaque for each, with some Essence returned.
- **Dragonslayer:** slaying the Elder Dragon unlocks the class. In tests an endgame party (level 30, 4★, Mithril) wins at Dragonmaw about 5 times in 8.

**Tutorial (phase 3h):** a guide panel walks a new player through ten steps, pulsing the tab it points at:

1. Read a hero card.
2. Form the party.
3. Send the first trip (heroes can't be knocked out on it).
4. Cast Healing Rain and click a glint.
5. Collect the report (it brings starter gear and Tavern materials).
6. Equip the sword, shield, jerkin and ring.
7. Build the Tavern.
8. Open its gift pack (a Rare hero and a spell card guaranteed).
9. Put the Rare hero in the party.
10. Send a trip alone.

While the tutorial runs, area trouble and contracts wait. Afterwards the quest board opens and a Next Goals panel points to the Weaponsmith and Town Hall level 2. "Skip tutorial" still gives the starter gear and the gift pack. Older saves skip it automatically.

**Packs from pieces, and the quest board (phase 3g):**

- Gold no longer buys packs. There are four pack types, each put together from its own pieces:
  - **Recruit** (5 pieces): the usual odds.
  - **Grimoire** (6): spell cards only.
  - **Veteran** (8): no Commons, a Rare or better guaranteed.
  - **Champion** (12): Rare or better only, an Epic or better guaranteed.
- **Pieces** come from chests (better ones in more dangerous areas), glints the Guildmaster clicks, secret paths, cleared trouble and the fortress vault.
- **Whole packs** come from sealed chests, the Tavern, achievements and the quest board.
- **Quest board** in the Guild Hall: three contracts at a time (bounties, scouting, supplies, ending trouble, storming the fortress, coming home unhurt). They pay in packs; finished or dropped contracts are replaced 20 minutes later.

**Area states (phase 3f):** the world changes while the guild is busy. Every 45 minutes a world event happens (caught up after time away, capped), and never more than three areas are troubled at once.

- **Infested:** a goblin camp moves in, right across the trail.
- **Corrupted:** fae gloom: spirits join the monsters, morale drops, and a Gloom Heart has to be destroyed.
- **Besieged:** while Gnashgut's Fortress stands, its warbands raid areas within two tiles. Razing the fortress scatters them.
- **Clearing trouble:** a trip that clears it calms the area and shields it and its neighbours from new trouble for 8 hours. Troubled trips are harder but pay more (in tests, 35–65% more gold).
- **Ignoring trouble:** it spreads to a neighbouring area after 3–5 hours.
- **On screen:** troubled areas get a coloured border and badge on the map. Their panel explains the trouble and shows when it will spread, the Guild Hall lists all current trouble with "Show on map", and the Watch screen states the goal.

**Tribe map abilities (phase 3e):** with 3 or more of a tribe in a party:

- **Gated areas (ring 4):** four new areas, alongside the three from phase 3a:
  - the Cinder Caldera (Ashborn cross lava);
  - the Veiled Glade (Moonveil; it doesn't even show on the map unless a party has 3+ Moonveil);
  - Blightmoor Crypts (Hollowed walk cursed ground);
  - Thornheart (Thornkin slip through unseen).
- **Secret paths:** in its home terrain, every tribe finds a side path nobody else sees, and always takes it. Freeholders find hidden villages, Thornkin elf-paths, Ironroot ore seams, Ashborn lava paths, Fenfolk sunken wrecks, Moonveil spirit gates, Dawnwings cliff-top eyries, and Hollowed sealed crypts (with guards). They pay out in gold, materials and items; some also heal or refill mana. The map lists the secret paths an area can hide.
- **Travel perks:** Freeholders travel 25% faster on farmland and plains, so trips there end sooner. In forests, Thornkin move unseen: only groups right by the trail notice the party, the party strikes first, and reckless heroes are held back.
- **Balance:** abilities change where a party can go, not how strong it is. In tests, a matching tribe party at tier-4 strength returns from the new areas about as often as from other tier-4 areas.

**A second party (phase 3d):**

- Guild Hall level 3 founds Party II. Each party has its own five slots, rows and Captain. A hero belongs to one party at a time; picking a hero from the other party (while it's at home) moves them over.
- Both parties can be out on different trips at once. The top bar shows a chip per trip, the Watch screen has a switcher, and reports queue up in the Guild Hall ("Next report").
- On the Map, "Who goes" picks Party I, Party II, or, for sieges, both together.
- The spellbook is the Guildmaster's: every trip takes its own copy of the spells, with its own mana.
- Older saves are upgraded: their party becomes Party I. A third party is planned for later.

**Large battle: the Goblin Fortress (phase 3c):**

- Gnashgut's Fortress sits in ring 4, next to Thornback Ridge and Ember Rift. A trip there is a siege, about twice as long as a ring-3 trip, with about a hundred goblins over the whole battle.
- **Approach:** both side paths lead to goblin camps. The Captain decides whether to take them, and each camp cleared means two fewer waves at the gate.
- **Breach:** the party breaks the gate while archers shoot from the towers. Melee heroes can't reach the towers; nobody crosses the wall until the gate is down.
- **The horde:** waves of 14 (spearmen, archers, wolf riders, bombers and shamans) pour through the gateway, up to about 40 at once. The party holds the gateway, so goblins bunch up in the gap. Once it's quiet, the heroes go after stragglers.
- **The keep:** Warlord Gnashgut and his Ironguard. The warlord rages below half health.
- **The player helps:** spells on the packed horde, and powder kegs to click (one by the wall, two inside the gate) that blow up goblins and crack the gate.
- **Aftermath:** the vault holds 1,000 gold, three Mithril items and a sealed chest. The fortress then lies razed for two weeks; until it is rebuilt, a trip there is a short visit to the ruins. Winning earns the Fortress Breaker achievement.
- **Two parties together:** with a second party, both can march to a siege as one force of 10 heroes, led by Party I's Captain.
- **Balance, without spells or kegs:** a party at the expected tier-4 strength wins about half its sieges, a strong party nearly always wins, and a weak one never gets past the camps.

## Code layout

| Folder | What's in it |
| --- | --- |
| `src/core` | Rules with no graphics: data, heroes, packs, save state |
| `src/core/sim` | The expedition simulation (10 ticks per second, deterministic) |
| `src/art` | SVG generators: hero and enemy sprites, card art, and the town of Greyford |
| `src/render` | PixiJS view of a running expedition |
| `src/ui` | HTML screens: the town, Guild Hall, Heroes, Party, Packs, Map, Watch |
| `tests` | Vitest tests for the core |
