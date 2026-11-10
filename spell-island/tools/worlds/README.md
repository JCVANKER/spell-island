# Writing a lesson world (v2)

Each `wNN_*.py` file defines `WORLD = dict(...)` for one textbook-unit world of 咒语岛 (Spell Island), a 3D
voice game: a Chinese primary/junior-school child speaks English to a little wizard, **Milo**, who walks,
talks to people and casts spells. `w01_rainbow_zoo.py` is the reference world — copy its shape and richness.

Build + check (run from the repo root):

```
python3 tools/make_worlds.py --only w05          # writes content/worlds/05-*.json for that world only
PENDING_MODELS="$(cat /home/claude/spell-assets/new_ids.txt)" ONLY=nature-park npx tsx tools/validate-worlds.ts
```

The validator must report **0 errors** for your worlds (warnings about PENDING models are fine — those 3D
models are still being generated and will be installed later).

## Quality bar (v2)

- **Big and explorable**: `bounds` 46–58 (metres from the centre; the wizard walks ~3 m/s and runs over long
  distances by himself). 6–9 named `zones` (areas with a theme), connected by `path`s, each with something to
  find. Spawn at the south edge, facing north: `spawn={'pos': [0, 0, bounds-8], 'rot': 3.14159}` (−z is north).
- **Lots to touch**: 20–30 `things` (props, animals, signs, chests, lamps…) + 4–6 `npcs`. Almost every thing
  should be fun to cast spells on.
- **More tasks**: 14–18 `quests` covering all four skills 听说读写 (listen / speak / read / write) plus many
  magic / do quests that use the lesson's language. Chain them with `needs` into 3–4 story lines (one per NPC
  or zone) so the child can switch between lines freely. End one line with a celebration (fireworks, rainbow…).
- **Key words and sentences everywhere** (this is the point of v2): the unit's key vocabulary and its 3–5 key
  sentence patterns must appear again and again — in NPC `greet`/`idle`/`chatter`, signs (`text`), quest
  intros/models, listening audio, and as **word stars**.
- **Word stars** (`words`): 14–18 per world. ~10 single words / short phrases of the unit + 4–6 whole key
  sentences. 2–3 of them `hidden=True` and revealed as secrets by a spell on a thing (`reveal=[...]`,
  `revealOn='open' | 'light' | 'small' | 'big' | 'fly' | 'dance' | 'tint' | 'freeze' | 'any' ...`) — e.g. a
  treasure chest that opens, a lamp lit at night, a snowman made big. Spread them over the zones, ~2–4 m away
  from things so they don't overlap.
- **Original content only**: stories, names and texts are ours, aligned with the textbook unit's topic and
  sentence patterns (人教/PEP-style). Never copy textbook passages. Language level must fit the grade (3–4:
  very short sentences; 5–6: there is / because / can; 7–9: natural but short, polite forms, clauses).
- Everything a child must say has to be sayable by a Chinese kid at that grade. Model answers short.

## Schema (helpers in `common.py`)

```python
T(id, name, model, (x, y, z) | (x, z), zh, **k)   # a thing. k: aliases, tags, color, radius (obstacle, 0 = walk-through),
                                                  #   can=['light','open','fly','pick','eat','read','grow','ride'],
                                                  #   text='sign text\nline 2' (readable), rot, scale, label=False,
                                                  #   params={'h': height_m, 'voice': 'animal'}  (voice → it talks back),
                                                  #   chatter=['line', ...]  (said when the wizard walks by; needs a voice),
                                                  #   reveal=['ws_x', 'thing_y'], revealOn='open', hidden=True
N(id, name, model, pos, voice, persona, greet, zh, **k)  # an NPC; k as T plus idle=[...], chatter=[...], knows=[...]
Q(id, kind, skill, giver, titleZh, title, intro, model, done, **k)   # a quest (see kinds below)
S(id, say, zh, (x, z), hidden=False)              # a word star — id must start with 'ws_'
Z(id, name, zh, (x, z), r)                        # a zone
```

World keys: `id, order, grade, gradeNum, unit, title, titleZh, scene, bounds, intro (2 short Chinese lines from the
companion; 2nd line tells the child what to say first), vocab, patterns, spawn, zones, decor, things, npcs, quests,
words, spellIdeas, start (optional: {'weather': 'cloudy'} / {'season': 'summer'})`. Keep `id`, `order`, `scene`
and the `video` file names of the existing world (listening videos already exist: keep the listen quest that has
`video=`; other listen quests have no video, that's fine).

NPC `voice` roles: woman, lady, teacher, man, funny, youngman, oldman, granny, child, guard, animal.

### Quest kinds
- `speak`: giver asks `prompt`; `accept` = list of groups, each group needs ≥1 of its words/phrases
  (e.g. `[['yes', 'no'], ['i do', 'i dont']]`). Every `model` sentence must pass its own accept (validator checks).
  Or `judge='...'` for open answers (the LLM judges), e.g. "Why?" questions.
- `listen`: `audio` (read by the narrator, child can't see it), `options` (3), `answer` (index). Audio 2–4 sentences.
- `read`: on a sign thing (giver = the sign). Either `readAloud=True` + `passage` (child reads it aloud), or
  `passage` + `prompt` + `options` + `answer` (comprehension).
- `write`: child types an answer; `prompt`, `accept` like speak; `model` = the answer. Single words/short phrases.
- `choose`: `prompt` + `options` + `answer`.
- `magic` / `do`: `goal` = an event; `model` = the sentence(s) the child says (the validator checks the rule brain
  understands them AND that they fire the goal). `|` separates alternatives: `goal='happy:tiger|dance:tiger'`.
- `guide`: `to` = a thing id; the giver follows the wizard there (give directions to Milo: "Go to the bridge").
- `needs='other_quest_id'` chains; `tipZh` = the companion's Chinese tip (say what to say, in “…”).

### Spells and their goal events (what the child can say → event)
| Child says | event |
|---|---|
| Make the X yellow / rainbow | `tint:X:yellow`, `tint:X:rainbow` |
| Make the X fly | `fly:X` |
| Make the X big / giant · small / tiny | `big:X` · `small:X` |
| Make the X dance · jump · shake · sing · sleep | `dance:X` · `hop:X` · `shake:X` · `sing:X` · `nap:X` |
| Make the X glow / shine | `glow:X` |
| Make the X spin | `spin:X` |
| Freeze the X · Melt the X | `freeze:X` · `melt:X` |
| Make the X disappear · appear | `vanish:X` · `appear:X` |
| Make three Xs / more Xs | `clone:X` |
| X, come here! | `summon:X` |
| Turn the X into a frog / cake | `into:X:frog` (animals: pig cat dog duck rabbit frog panda monkey elephant tiger bear sheep horse dragon penguin snowman pumpkin fish bird owl squirrel swan deer lion giraffe zebra ball balloon; or any food) |
| Turn the X back | `restore:X` |
| Make the X happy / sad / angry / surprised | `happy:X` · `sad:X` · `angry:X` · `surprised:X` |
| Make the X run | `scurry:X` |
| Light the X · Turn off the X | `light:X` · `dark:X` (X needs can=['light']) |
| Open the X | `open:X` (X needs can=['open']) |
| Heal Tim | `heal:tim` |
| Make it night · day · Make a rainbow · Fireworks! · Make bubbles | `night` · `day` · `rainbow` · `fireworks` · `bubbles` |
| Make it sunny/rainy/snowy/windy/cloudy · Make it spring/summer/autumn/winter | `weather:sunny` · `season:spring` |
| Make a cake / an apple (any food) | `conjure:cake` |
| Grow a tree · Make it rain apples | `grow:tree` · `fruit_rain:apple` |
| Give the X to Y (or give a food) | `give:X:Y` — use `give:*:Y` |
| Put the X on/in/under the Y | `put:X:Y:on` |
| Pick up the X · Go to the X · Talk to X · Read the X | `pick:X` · `reach:X` · `talk:X` · `read:X` |
| any spell on X | `spell:X` |

Foods: cake apple banana orange pear watermelon grapes durian strawberry ice cream pizza bread candy cookie carrot
egg hamburger hot dog noodles rice peach lemon mango.

### Decor (non-interactive scenery, `decor=[...]`)
```
{'k': 'path', 'pts': [[x,z], [x,z], ...], 'w': 3}      {'k': 'plaza', 'at': [x,z], 'r': 8, 'color': '#e8d6a8'}
{'k': 'pond', 'at': [x,z], 'r': 5, 'sx': 1.3}           {'k': 'fence', 'from': [x,z], 'to': [x,z]}
{'k': 'tree'|'pine', 'at': [x,z], 's': 1.2}              {'k': 'grove', 'at': [x,z], 'r': 8, 'n': 10, 'kind': 'mix'|'tree'|'pine'}
{'k': 'house', 'at': [x,z], 'rot': 0, 'w': 5, 'h': 3.6, 'wall': '#f6e0c2', 'roof': '#c8553d'}
{'k': 'mountain', 'at': [x,z], 'r': 10, 'h': 8, 'snow': False}   {'k': 'rock', 'at': [x,z], 's': 1}
{'k': 'meadow', 'at': [x,z], 'r': 6, 'n': 50}  (little flowers)   {'k': 'lamp', 'at': [x,z]}
{'k': 'shelf', 'at': [x,z], 'rot': 0, 'w': 4, 'h': 3.2}  (bookshelf, for indoor)
{'k': 'model', 'm': '<model key>', 'at': [x,z], 'rot': 0, 's': 1, 'solid': 0.9}  (any 3D model as scenery)
```
When `decor` is given, the scene's old built-in props are not drawn (only ground, sky, palette, clouds), so build
the whole look yourself: paths between zones, a plaza, trees/groves along the edges, flower meadows, benches,
fences, water, houses. Keep 2–3 m clear around things/NPCs and along paths. Scene `classroom` is an indoor hall
whose size follows `bounds` (use ~22–26 there, and `shelf`/`model` decor).

### 3D models (`model` / decor `m`)
Installed: wizard owl red_panda capybara baby_dragon penguin wizard_tower portal_arch pig treasure_chest signpost
cake zookeeper duck cat dog panda monkey rabbit fruit_seller watermelon fruit_basket teacher student desk
blackboard schoolbag pencil_box weatherman girl_raincoat umbrella kite windmill ranger boat bridge flowers cabin
snowman girl_scarf swing tourist museum post_office hospital cinema bookstore guitar_boy dancer_girl drum_set
chess_table healer sick_boy cauldron herb_hut guard guide knight_armor dragon_statue castle_gate elephant_mom
baby_elephant giraffe zebra lion fruit_tree berry_bush acacia lantern magic_door book_pile stall_fruit
(procedural: lamp_post, house, round_tree, pine, none = invisible marker)

Being generated now (use them freely; listed in /home/claude/spell-assets/new_ids.txt with descriptions in
/home/claude/spell-assets/add_jobs_v2.py): bench fountain flower_bed bush hot_air_balloon tiger brown_bear parrot
frog sheep horse zoo_gate ice_cream_cart apple_crate banana_bunch grapes strawberry_basket orange_crate juice_stand
shopper_girl granny school_chair wall_clock globe computer potted_plant crayon_box weather_vane rain_boots
sunglasses sled woolly_hat girl_sunhat swan deer squirrel tent picnic_table fish leaf_pile beach_ball sandcastle
scarecrow pumpkin city_bus bicycle taxi traffic_light school_building supermarket police_officer bus_stop piano
violin microphone easel pingpong_table soccer_ball art_girl teapot medicine_bottle herb_plant honey_jar sick_girl
cozy_bed painting_frame crown_display throne vase ticket_booth gift_shop cannon

Models have a natural height (in brackets in the manifest); override with `params={'h': metres}` if needed.
Reusing a model for several things is fine (three benches, two lamps), and humans can be reused for different
NPCs (e.g. `student` for two kids) — give them different names.
