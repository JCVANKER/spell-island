from common import T, N, Q, S, Z

# 5 ------------------------------------------------------------------ 五上 In a nature park
# A big nature park cut in two by the Blue River (three bridges). Ranger Sam is drawing a new park map and needs
# the little wizard to tell him what there is: There is / There are… · Is there…? · Are there any…?
WORLD = dict(id='nature-park', order=5, grade='五年级上册', gradeNum=5, unit='Unit · In a nature park: There is / There are…（自然公园）', title='Green Nature Park', titleZh='绿野自然公园', scene='park',
  bounds=54,
  intro=['欢迎来到绿野自然公园！这里有河、有湖、有森林、有大山，还有一个小村庄。', '护林员 Sam 正在画新的公园地图，需要你帮忙。描述东西要用 There is / There are。先去找他：“Go to Ranger Sam!”'],
  vocab=['nature park', 'river', 'lake', 'forest', 'mountain', 'hill', 'bridge', 'boat', 'village', 'house', 'building', 'tree', 'flower', 'grass', 'cloud', 'there is', 'there are', 'is there', 'are there any'],
  patterns=['There is a river in the park.', 'There are three bridges.', 'Is there a lake? Yes, there is.', 'Are there any fish? Yes, there are.', "Are there any tall buildings? No, there aren't."],
  spawn={'pos': [0, 0, 46], 'rot': 3.14159},
  zones=[
    Z('gate', 'Park Gate', '公园大门', (0, 40), 7),
    Z('centre', 'Visitor Centre', '游客中心', (0, 22), 9),
    Z('river', 'Blue River', '蓝色小河', (2, -1), 9),
    Z('lake', 'Swan Lake', '天鹅湖', (-30, 20), 12),
    Z('meadow', 'Flower Meadow', '花草地', (30, 13), 10),
    Z('balloon', 'Balloon Hill', '热气球山坡', (27, 37), 8),
    Z('forest', 'Deep Forest', '密林', (-30, -23), 12),
    Z('camp', 'Mountain Camp', '山脚营地', (3, -32), 10),
    Z('village', 'Hill Village', '山坡村庄', (31, -25), 11),
  ],
  decor=[
    # the Blue River runs east-west across the park; three bridges cross it
    {'k': 'path', 'pts': [[-58, 0], [-34, 3], [-14, -3], [8, 1], [24, -4], [40, 0], [58, -3]], 'w': 5.5, 'color': '#6fb8e0'},
    # walking paths
    {'k': 'path', 'pts': [[0, 50], [0, 30], [0, 22]], 'w': 4},
    {'k': 'plaza', 'at': [0, 22], 'r': 7.5, 'color': '#e8d6a8'},
    {'k': 'path', 'pts': [[0, 22], [0, 6], [0, -8], [2, -24], [3, -30]], 'w': 3.4},
    {'k': 'path', 'pts': [[0, 22], [-12, 16], [-19, 18]], 'w': 3},
    {'k': 'path', 'pts': [[-19, 18], [-24, 10], [-30, 6], [-30, -2], [-30, -16]], 'w': 3},
    {'k': 'path', 'pts': [[0, 22], [14, 16], [24, 12]], 'w': 3},
    {'k': 'path', 'pts': [[24, 12], [30, 6], [31, -2], [31, -12], [31, -24]], 'w': 3},
    {'k': 'path', 'pts': [[0, 30], [14, 33], [24, 36]], 'w': 2.8},
    {'k': 'path', 'pts': [[-30, -16], [-14, -26], [0, -30]], 'w': 2.8},
    {'k': 'path', 'pts': [[3, -30], [18, -26], [31, -24]], 'w': 2.8},
    {'k': 'plaza', 'at': [3, -32], 'r': 5.5, 'color': '#d8c49a'},
    {'k': 'plaza', 'at': [31, -26], 'r': 5, 'color': '#e2cf9e'},
    # Swan Lake
    {'k': 'pond', 'at': [-30, 20], 'r': 7, 'sx': 1.3},
    {'k': 'rock', 'at': [-38, 12], 's': 1.2}, {'k': 'rock', 'at': [-22, 29], 's': 0.8},
    {'k': 'model', 'm': 'bench', 'at': [-17, 24], 'rot': -1.57, 'solid': 0.9},
    # mountains in the north, behind the camp
    {'k': 'mountain', 'at': [-30, -66], 'r': 22, 'h': 18, 'color': '#7fa36a', 'snow': True},
    {'k': 'mountain', 'at': [6, -70], 'r': 26, 'h': 24, 'color': '#86a870', 'snow': True},
    {'k': 'mountain', 'at': [40, -60], 'r': 18, 'h': 15, 'color': '#7fa36a', 'snow': True},
    {'k': 'rock', 'at': [-6, -37], 's': 1.4}, {'k': 'rock', 'at': [12, -40], 's': 1.6}, {'k': 'rock', 'at': [-2, -42], 's': 1.0},
    # Deep Forest
    {'k': 'pine', 'at': [-19, -29], 's': 1.3}, {'k': 'pine', 'at': [-24, -35], 's': 1.4}, {'k': 'pine', 'at': [-33, -35], 's': 1.2},
    {'k': 'pine', 'at': [-37, -23], 's': 1.3}, {'k': 'tree', 'at': [-16, -18], 's': 1.2}, {'k': 'pine', 'at': [-44, -14], 's': 1.3},
    {'k': 'tree', 'at': [-28, -14], 's': 1.1}, {'k': 'pine', 'at': [-42, -36], 's': 1.2},
    {'k': 'grove', 'at': [-48, -26], 'r': 7, 'n': 8, 'kind': 'pine', 's': 1.3},
    {'k': 'grove', 'at': [-14, -44], 'r': 5, 'n': 5, 'kind': 'mix', 's': 1.2},
    # Flower Meadow and Balloon Hill
    {'k': 'meadow', 'at': [30, 12], 'r': 9, 'n': 90}, {'k': 'meadow', 'at': [27, 36], 'r': 7, 'n': 50},
    {'k': 'meadow', 'at': [-10, 34], 'r': 5, 'n': 30}, {'k': 'meadow', 'at': [-24, -6], 'r': 5, 'n': 30},
    {'k': 'model', 'm': 'flower_bed', 'at': [-5, 30], 'rot': 1.57}, {'k': 'model', 'm': 'flower_bed', 'at': [5, 31], 'rot': 1.57},
    {'k': 'model', 'm': 'bush', 'at': [38, 8]}, {'k': 'model', 'm': 'bush', 'at': [22, 6]}, {'k': 'model', 'm': 'bush', 'at': [36, 24]},
    {'k': 'tree', 'at': [40, 16], 's': 1.2}, {'k': 'tree', 'at': [18, 24], 's': 1.1},
    # Visitor Centre
    {'k': 'model', 'm': 'bench', 'at': [-7, 24], 'rot': 1.57, 'solid': 0.9}, {'k': 'model', 'm': 'bench', 'at': [8, 14], 'rot': -1.57, 'solid': 0.9},
    {'k': 'model', 'm': 'bush', 'at': [-8, 27]}, {'k': 'model', 'm': 'bush', 'at': [9, 24]},
    # Hill Village
    {'k': 'house', 'at': [19, -35], 'rot': 0.3, 'w': 5, 'h': 3.6, 'wall': '#f6e0c2', 'roof': '#c8553d'},
    {'k': 'house', 'at': [29, -39], 'rot': 0, 'w': 5, 'h': 3.4, 'wall': '#e8f0d0', 'roof': '#5f9f4e'},
    {'k': 'house', 'at': [39, -33], 'rot': -0.4, 'w': 4.6, 'h': 3.4, 'wall': '#f4d8c8', 'roof': '#4f7fb8'},
    {'k': 'house', 'at': [43, -13], 'rot': -1.4, 'w': 4.6, 'h': 3.4, 'wall': '#f6e0c2', 'roof': '#d9a23a'},
    {'k': 'fence', 'from': [20, -24], 'to': [20, -30]}, {'k': 'fence', 'from': [20, -30], 'to': [28, -32]},
    # edges
    {'k': 'grove', 'at': [0, 62], 'r': 10, 'n': 8, 'kind': 'pine', 's': 1.2},
    {'k': 'tree', 'at': [-12, 42], 's': 1.2}, {'k': 'tree', 'at': [12, 44], 's': 1.2},
    {'k': 'pine', 'at': [-46, 8], 's': 1.3}, {'k': 'pine', 'at': [-44, 30], 's': 1.2}, {'k': 'pine', 'at': [50, 6], 's': 1.2}, {'k': 'pine', 'at': [46, 26], 's': 1.2},
    {'k': 'lamp', 'at': [-3, 33]}, {'k': 'lamp', 'at': [3, 6]}, {'k': 'lamp', 'at': [-3, -8]},
  ],
  things=[
    # Park Gate
    T('park_sign', 'park sign', 'signpost', (-4, 0, 37), '公园告示牌', aliases=['sign', 'board', 'welcome sign'], radius=0.4, can=['read'], text="Welcome to Green Nature Park!\nThere is a river and a lake.\nThere are three bridges.\nPlease don't pick the flowers."),
    T('lamp1', 'lamp', 'lamp_post', (4, 0, 36), '路灯', aliases=['light', 'lamp post'], radius=0.3, can=['light']),
    # Visitor Centre
    T('station', 'ranger station', 'cabin', (-12, 0, 22), '护林站小木屋', aliases=['cabin', 'house', 'station', 'log cabin'], rot=1.5708, radius=2.4, can=['light']),
    T('map_board', 'park map', 'signpost', (6, 0, 27), '公园地图', aliases=['map', 'map board'], radius=0.4, can=['read'], text='PARK MAP\nThere is a forest in the north-west.\nThere is a village in the north-east.\nThere are mountains near the camp.'),
    # Blue River
    T('river', 'river', 'none', (9, 0, 2), '河', aliases=['stream', 'blue river'], radius=0, label=True),
    T('bridge1', 'bridge', 'bridge', (0, 0, -0.5), '桥', aliases=['wooden bridge', 'big bridge'], rot=0, radius=0, label=True),
    T('bridge2', 'bridge', 'bridge', (-30, 0, 1.8), '桥', aliases=['forest bridge'], rot=0, radius=0, label=False),
    T('bridge3', 'bridge', 'bridge', (31, 0, -2.3), '桥', aliases=['village bridge'], rot=0, radius=0, label=False),
    T('fish', 'fish', 'fish', (13, 0, -0.5), '鱼', tags=['orange', 'small'], color='orange', radius=0.3, can=['fly'], params={'voice': 'animal'}, chatter=['Blub, blub! There are many fish in the river!', 'Is there a river in the park? Yes, there is. I live here!']),
    T('frog', 'frog', 'frog', (-8, 0, 2.8), '青蛙', tags=['green', 'small'], color='green', radius=0.3, can=['fly', 'pick'], params={'voice': 'animal'}, chatter=['Ribbit! There is a river. There are many bugs. Ribbit!']),
    # Swan Lake
    T('lake', 'lake', 'none', (-30, 0, 20), '湖', aliases=['pond', 'swan lake'], radius=0, label=True),
    T('boat', 'boat', 'boat', (-21.5, 0.05, 23), '小船', tags=['red', 'small'], color='red', radius=0.6, can=['fly']),
    T('swan', 'swan', 'swan', (-33, 0, 17), '天鹅', tags=['white'], color='white', radius=0.5, can=['fly'], params={'voice': 'animal'}, chatter=['There is a swan on the lake. It is me!', 'Are there any ducks? Yes, there are!']),
    T('duck', 'duck', 'duck', (-36, 0, 24), '鸭子', tags=['yellow', 'small'], color='yellow', radius=0.4, can=['fly'], params={'voice': 'animal'}, chatter=['Quack! There are two birds on the lake: a swan and me!']),
    T('lake_sign', 'lake sign', 'signpost', (-19, 0, 14), '湖边告示牌', aliases=['sign', 'board'], radius=0.4, can=['read'], text="SWAN LAKE\nThere is a red boat on the lake.\nThere are swans and ducks, too.\nIs there a bridge? No, there isn't."),
    # Flower Meadow
    T('flowers', 'flowers', 'flowers', (30, 0, 9), '花', aliases=['flower'], radius=0, can=['grow']),
    T('easel', 'easel', 'easel', (35, 0, 16), '画架', aliases=['picture', 'painting'], radius=0.6, can=['fly']),
    T('rabbit', 'rabbit', 'rabbit', (24, 0, 18), '兔子', tags=['white', 'small'], color='white', radius=0.4, can=['fly', 'pick'], params={'voice': 'animal'}, chatter=['There is green grass. There are many flowers. I love the meadow!']),
    # Balloon Hill
    T('balloon', 'hot air balloon', 'hot_air_balloon', (30, 0, 39), '热气球', aliases=['balloon'], radius=1.8, can=['fly'], reveal=['ws_sky'], revealOn='fly'),
    T('picnic', 'picnic table', 'picnic_table', (20, 0, 41), '野餐桌', aliases=['table', 'picnic'], radius=1.2),
    # Deep Forest
    T('forest', 'forest', 'none', (-32, 0, -24), '森林', aliases=['woods', 'deep forest'], radius=0, label=True),
    T('deer', 'deer', 'deer', (-22, 0, -12), '小鹿', tags=['brown'], color='brown', radius=0.6, can=['fly'], params={'voice': 'animal'}, chatter=['Shh! There are many trees in the forest. I can hide!']),
    T('owl', 'owl', 'owl', (-39, 0, -16), '猫头鹰', aliases=['ollie'], tags=['brown'], color='brown', radius=0.4, can=['fly'], params={'voice': 'animal'}, chatter=['Hoo hoo! Is there a moon? Not yet... Zzz...']),
    T('chest', 'treasure chest', 'treasure_chest', (-40, 0, -30), '宝箱', aliases=['chest', 'box', 'treasure'], radius=0.6, can=['open', 'fly'], reveal=['ws_treasure'], revealOn='open'),
    # Mountain Camp
    T('tent', 'tent', 'tent', (9, 0, -35), '帐篷', tags=['orange'], color='orange', radius=1.4, can=['open']),
    T('lantern', 'lantern', 'lantern', (-3, 0, -30), '灯笼', aliases=['lamp', 'camp lamp'], radius=0.4, can=['light'], reveal=['ws_stars'], revealOn='light'),
    T('mountain', 'mountain', 'none', (6, 0, -62), '山', aliases=['mountains', 'hill', 'hills'], radius=0, label=True, params={'unreachable': True}),
    # Hill Village
    T('village_sign', 'village sign', 'signpost', (22, 0, -16), '村口告示牌', aliases=['sign', 'board'], radius=0.4, can=['read'], text="HILL VILLAGE\nThere are many small houses.\nThere is a windmill.\nThere aren't any tall buildings."),
    T('windmill', 'windmill', 'windmill', (44, 0, -24), '风车', radius=1.6, can=['fly']),
    T('sheep', 'sheep', 'sheep', (24, 0, -27), '绵羊', tags=['white'], color='white', radius=0.6, can=['fly', 'pick'], params={'voice': 'animal'}, chatter=['Baa! There are many houses in the village. Baa!']),
  ],
  npcs=[
    N('sam', 'Ranger Sam', 'ranger', (3, 0, 19), 'man', 'Ranger Sam, a kind park ranger drawing a new park map; grade-5 English (There is / There are, Is there…? Are there any…?)', "Hi there! I'm Ranger Sam. Welcome to Green Nature Park!", '护林员山姆', aliases=['ranger', 'sam'],
      idle=['There is a river in the park. There are three bridges.', 'Is there a lake? Yes, there is!', 'Nature is beautiful. Please love it!'],
      chatter=['There is a forest in the north. There are many trees!', 'Is there a river in the park? Yes, there is.', 'There are three bridges over the river.'],
      knows=['There is a river, a lake, a forest, a camp and a village in the park.', 'There are three bridges.', "There aren't any tall buildings in the park."]),
    N('kevin', 'Kevin', 'student', (-5, 0, 27), 'child', 'Kevin, a curious boy who wants to go boating and fishing; grade-5 English', "Hi! I'm Kevin. I want to go boating!", '凯文', aliases=['boy', 'kevin'],
      idle=['Boating is fun!', 'Are there any fish in the river? Yes, there are!'],
      chatter=['Is there a lake in the park? I want to go boating!', 'There is a boat on the lake. Cool!']),
    N('lily', 'Lily', 'art_girl', (31, 0, 15), 'child', 'Lily, a girl painting a picture of the nature park; grade-5 English', "Hi! I'm Lily. I'm painting the park!", '莉莉', aliases=['girl', 'lily', 'painter'],
      idle=['There are many flowers in my picture!', 'I love painting nature.'],
      chatter=['There are many flowers in the meadow. So pretty!', 'There is a hot air balloon on the hill!']),
    N('nutty', 'Nutty', 'squirrel', (-27, 0, -27), 'animal', 'Nutty, a playful squirrel who lives in the forest and plays hide-and-seek; simple grade-5 English', "Hi! I'm Nutty the squirrel. Welcome to my forest!", '松鼠坚果', aliases=['squirrel', 'nutty'], tags=['red'], color='red',
      idle=['There are many trees here. I love my forest!', 'Is there a deer? Yes, there is!'],
      chatter=['There are many trees in the forest!', 'Is there an owl in the forest? Yes, there is. Shh, it is sleeping!']),
    N('granny', 'Granny Rose', 'granny', (34, 0, -21), 'granny', 'Granny Rose, a kind old woman who lives in Hill Village; grade-5 English about her village', "Hello, dear! I'm Granny Rose. Welcome to Hill Village!", '罗丝奶奶', aliases=['granny', 'grandma', 'rose', 'old woman'],
      idle=["There aren't any tall buildings here. It's quiet.", 'There are many small houses in my village.'],
      chatter=['There is a windmill in my village.', "Are there any tall buildings? No, there aren't."]),
  ],
  quests=[
    # Ranger Sam: the new park map (main line)
    Q('np_river', 'speak', '说', 'sam', '回答护林员：公园里有河吗？', 'Is there a river?', ["I'm making a new map of the park for our visitors. Can you help me?", 'Look around. Is there a river in the park?'], ['Yes, there is.'], ["Yes, there is! There's a river in the park. I'll put it on the map."], prompt='Is there a river in the park?', accept=[['yes', 'there is']], tipZh='Sam 问：“公园里有河吗？”有的话就回答：“Yes, there is.”'),
    Q('np_bridges', 'speak', '说', 'sam', '沿着河数一数：有几座桥？', 'How many bridges?', ['Now walk along the river and count the bridges.'], ['There are three bridges.'], ['Right! There are three bridges over the river.'], prompt='How many bridges are there?', accept=[['three', '3']], needs='np_river', tipZh='沿着小河走一走，数一数有几座桥，然后说：“There are three bridges.”'),
    Q('np_listen', 'listen', '听', 'sam', '听描述，选出村里没有的东西', 'Listen and choose', ['My friend lives in a village. Listen to her.'], [], ["Yes! There isn't a mountain in her village."], prompt="What isn't in her village?", audio="In my village, there is a big lake and a small river. There are many trees and flowers. But there isn't a mountain.", options=['A lake', 'A mountain', 'Trees'], answer=1, video='park.mp4', needs='np_bridges'),
    Q('np_write', 'write', '写', 'sam', '写一句话：There is a … in the park.', 'Write a sentence', ['Write about the park for our map!'], ['There is a lake in the park.'], ['Wonderful sentence! It goes on the map.'], prompt='Write: There is a ___ in the park.', accept=[['there is', 'theres', 'there are'], ['lake', 'river', 'bridge', 'boat', 'cabin', 'house', 'tree', 'flower', 'mountain', 'park', 'forest', 'village', 'windmill', 'tent', 'balloon']], needs='np_listen', tipZh='写一句：“There is a … in the park.” 比如 lake、river、forest。'),
    Q('np_party', 'magic', '说', 'sam', '地图画好啦！放烟花庆祝', 'Fireworks!', ["The map is finished! There is a river, a lake, a forest and a village. Let's celebrate!"], ['Fireworks!'], ['Wow! Thank you, little wizard! Now everyone can enjoy Green Nature Park!'], prompt='Say: Fireworks!', goal='fireworks', needs='np_write'),
    # signs
    Q('np_read', 'read', '读', 'park_sign', '读告示牌：公园里不能做什么？', 'Read the park sign', [], [], ["Right! Please don't pick the flowers."], passage="Welcome to Green Nature Park! There is a river and a lake. There are three bridges. Please don't pick the flowers.", prompt="What can't you do in the park?", options=['Go boating', 'Pick the flowers', 'Walk on the bridge'], answer=1),
    Q('map_read', 'read', '读', 'map_board', '大声读出公园地图', 'Read the map', [], ['There is a forest in the park.'], ['Great reading! Now you know the park.'], passage='There is a forest in the park. There are mountains near the camp.', readAloud=True, prompt='Read the map aloud.'),
    Q('lake_read', 'read', '读', 'lake_sign', '读湖边告示牌：湖上有桥吗？', 'Is there a bridge on the lake?', [], [], ["Right! There isn't a bridge on the lake. But there is a red boat!"], passage="SWAN LAKE\nThere is a red boat on the lake.\nThere are swans and ducks, too.\nIs there a bridge? No, there isn't.", prompt='Is there a bridge on the lake?', options=['Yes, there is.', "No, there isn't.", 'Yes, there are.'], answer=1),
    Q('village_read', 'read', '读', 'village_sign', '大声读出村口告示牌', 'Read the village sign', [], ['There are many small houses.'], ["Well done! There aren't any tall buildings in Hill Village."], passage="There are many small houses. There aren't any tall buildings.", readAloud=True, prompt='Read the sign aloud.'),
    # Kevin: boating and fishing
    Q('kv_boat', 'guide', '说', 'kevin', '带 Kevin 去天鹅湖坐船', 'Take Kevin to the boat', ['Is there a lake in the park? I want to go boating!', 'Can you take me to the boat? I will follow you.'], ['Follow me!', 'Go to the boat.'], ["The boat! There is a boat on the lake! Thank you! Let's go boating!"], prompt='Take me to the boat, please!', to='boat', tipZh='Kevin 会跟着你走。告诉小魔法师：“Go to the boat!” 小船在西边的天鹅湖。'),
    Q('kv_fish', 'speak', '说', 'kevin', '回答 Kevin：河里有鱼吗？', 'Are there any fish?', ['I want to go fishing, too! Look at the Blue River.'], ['Yes, there are.'], ['Great! There are fish in the river!'], prompt='Are there any fish in the river?', accept=[['yes', 'there are']], needs='kv_boat', tipZh='Kevin 问：“河里有鱼吗？”去河边看看，回答：“Yes, there are.”'),
    Q('kv_jump', 'magic', '说', 'kevin', '鱼在水下看不见：让鱼跳起来', 'Make the fish jump', ["I can't see the fish. They are under the water!"], ['Make the fish jump!'], ['Wow! A jumping fish! There are fish in the river!'], prompt='Say: Make the fish jump!', goal='hop:fish', needs='kv_fish', tipZh='念咒语：“Make the fish jump!”'),
    Q('kv_write', 'write', '写', 'kevin', '写单词：过河要走的东西', 'Write the word', ['Spelling time! How do we walk over the river?'], ['bridge'], ['B-R-I-D-G-E! Bridge! Great spelling!'], prompt='We walk over the river on a ___ . Write the word.', accept=[['bridge']], needs='kv_jump'),
    # Lily: a picture of the park
    Q('ly_see', 'speak', '说', 'lily', '告诉 Lily 你在花草地看到了什么', 'What can you see?', ["I'm painting a picture of the park. Can you help me?"], ['There are many flowers.', 'There is a hot air balloon.'], ['Yes! I will paint it. Thank you!'], prompt='What can you see in the meadow?', accept=[['there is', 'there are']], judge="The child describes something in the park with 'There is…' or 'There are…' (e.g. 'There are many flowers.'). Accept any sensible description.", tipZh='Lily 问你在花草地看见了什么。用“There is a … / There are many …”回答。'),
    Q('ly_flower', 'magic', '说', 'lily', '画里还要更多花：变出花来', 'Grow a flower', ['My picture needs more flowers. Can you help?'], ['Grow a flower!'], ['Lovely! Now there are many, many flowers!'], prompt='Say: Grow a flower!', goal='grow:flower|big:flowers', needs='ly_see'),
    Q('ly_rainbow', 'magic', '说', 'lily', '天上还没有彩虹：变一道彩虹', 'Make a rainbow', ["There isn't a rainbow in the sky. A rainbow will make my picture perfect!"], ['Make a rainbow!'], ['Beautiful! There is a rainbow over the park! My picture is finished!'], prompt='Say: Make a rainbow!', goal='rainbow', needs='ly_flower'),
    # Nutty the squirrel: hide-and-seek in the forest
    Q('nt_what', 'speak', '说', 'nutty', '告诉松鼠：森林里有什么？', 'What is there in the forest?', ['This is my forest. Look around!'], ['There are many trees.', 'There is a deer.'], ['Yes! You have good eyes!'], prompt='What is there in the forest?', accept=[['there is', 'there are']], judge="The child says what is in the forest with 'There is…' or 'There are…' (trees, a deer, an owl, a chest…). Accept any sensible answer.", tipZh='松鼠问森林里有什么。可以说：“There are many trees.” 或 “There is a deer.”'),
    Q('nt_deer', 'magic', '说', 'nutty', '小鹿躲起来了：把它叫过来', 'Deer, come here!', ["My friend the deer is playing hide-and-seek. Is there a deer near here? Call her!"], ['Deer, come here!'], ['Ha ha! There she is! Thank you!'], prompt='Say: Deer, come here!', goal='summon:deer', needs='nt_what', tipZh='把小鹿叫过来：“Deer, come here!”'),
    Q('nt_night', 'magic', '说', 'nutty', '猫头鹰晚上才醒：让天黑下来', 'Make it night', ['Ollie the owl is sleeping. Owls wake up at night. Can you make it night?'], ['Make it night!'], ['Hoo hoo! Ollie is awake! Look, there are many stars in the sky!'], prompt='Say: Make it night!', goal='night', needs='nt_deer'),
    # Granny Rose: Hill Village
    Q('gr_windmill', 'magic', '说', 'granny', '村里的风车不转了：让它转起来', 'Make the windmill spin', ["There is a windmill in my village, but it's tired today. Can you help it?"], ['Make the windmill spin!'], ['Look, it is spinning again! Thank you, dear!'], prompt='Say: Make the windmill spin!', goal='spin:windmill|dance:windmill', tipZh='让风车转起来：“Make the windmill spin!”'),
    Q('gr_listen', 'listen', '听', 'granny', '听奶奶介绍村子，选出村里有的东西', 'Listen and choose', ['Let me tell you about my village. Listen!'], [], ['Yes! There is a windmill. But there aren\'t any tall buildings.'], prompt="What is there in Granny's village?", audio="My village is next to the river. There are many small houses and there is a windmill. There aren't any tall buildings. It's quiet and beautiful.", options=['A windmill', 'A tall building', 'A big lake'], answer=0, needs='gr_windmill'),
  ],
  words=[
    S('ws_river', 'river', '河', (5, 5)), S('ws_bridge', 'bridge', '桥', (-4, -4)), S('ws_lake', 'lake', '湖', (-19, 26)),
    S('ws_boat', 'boat', '小船', (-24, 32)), S('ws_flower', 'flower', '花', (27, 5)), S('ws_grass', 'grass', '草', (36, 11)),
    S('ws_forest', 'forest', '森林', (-25, -14)), S('ws_mountain', 'mountain', '山', (8, -42)), S('ws_village', 'village', '村庄', (26, -19)),
    S('ws_house', 'house', '房子', (34, -31)), S('ws_tree', 'tree', '树', (-36, -29)),
    S('ws_there_is', 'There is a river in the park.', '公园里有一条河。', (-6, 8)),
    S('ws_there_are', 'There are three bridges.', '有三座桥。', (22, 3)),
    S('ws_is_there', 'Is there a lake? Yes, there is.', '有湖吗？有。', (-15, 15)),
    S('ws_any', "Are there any tall buildings? No, there aren't.", '有高楼吗？没有。', (37, -20)),
    S('ws_sky', 'There are many clouds in the sky.', '天上有很多云。', (35, 34), hidden=True),
    S('ws_treasure', 'There is a treasure in the forest!', '森林里有宝藏！', (-36, -33), hidden=True),
    S('ws_stars', 'Are there any stars? Yes, there are.', '有星星吗？有。', (-7, -27), hidden=True),
  ],
  spellIdeas=[{'say': 'Make the balloon fly!', 'zh': '让热气球飞起来（会发现秘密哦）', 'near': 'balloon'}, {'say': 'Open the chest!', 'zh': '打开森林里的宝箱', 'near': 'chest'}, {'say': 'Light the lantern!', 'zh': '点亮营地的灯笼', 'near': 'lantern'},
    {'say': 'Make the boat fly!', 'zh': '让小船飞起来', 'near': 'boat'}, {'say': 'Make three swans!', 'zh': '变出三只天鹅', 'near': 'swan'}, {'say': 'Make the frog jump!', 'zh': '让青蛙跳一跳', 'near': 'frog'},
    {'say': 'Make the deer dance!', 'zh': '让小鹿跳舞', 'near': 'deer'}, {'say': 'Turn the sheep into a panda!', 'zh': '把绵羊变成熊猫', 'near': 'sheep'}, {'say': 'Make the tent big!', 'zh': '把帐篷变大', 'near': 'tent'},
    {'say': 'Light the ranger station!', 'zh': '点亮护林站', 'near': 'station'}, {'say': 'Grow a tree!', 'zh': '长出一棵树'}, {'say': 'Make it rain!', 'zh': '让天下雨'},
    {'say': 'Make the owl sing!', 'zh': '让猫头鹰唱歌', 'near': 'owl'}, {'say': 'Make the rabbit pink!', 'zh': '把兔子变成粉色', 'near': 'rabbit'}, {'say': 'Make bubbles!', 'zh': '变出好多泡泡'}],
)
