from common import T, N, Q, S, Z

# 4 ------------------------------------------------------------------ 四下 Weather
# Weather Town: every corner has its own weather friend. The town's weather vane is stuck and the sky is grey —
# change the weather with magic, tell people "It's sunny / rainy / windy / snowy / cloudy", answer "Is it cold?"
# and "Can I go outside now?". Story lines: Mr Sunny (the weather report, ends with a rainbow) · Lucy (rainy days)
# · Ben (a windy day for his kite) · Anna (a snowy day) · Sally (a hot day at the beach).
WEATHER = ['sunny', 'rainy', 'snowy', 'windy', 'cloudy', 'hot', 'cold', 'warm', 'cool', 'sun', 'rain', 'snow', 'wind', 'cloud']

WORLD = dict(id='weather-town', order=4, grade='四年级下册', gradeNum=4, unit="Unit · Weather: What's the weather like?（天气）", title='Weather Town', titleZh='天气小镇', scene='weather_town', start={'weather': 'cloudy'},
  bounds=52,
  intro=['这里是天气小镇，天气全听魔法的！雪人角、水坑小巷、阳光海滩、风筝山……每个角落都有自己的天气。', '你可以念：“Make it sunny!”“Make it rainy!” 先去广场找天气先生 Mr Sunny 吧：“Go to Mr Sunny!”'],
  vocab=['weather', 'sunny', 'rainy', 'cloudy', 'windy', 'snowy', 'hot', 'cold', 'warm', 'cool', 'outside', 'umbrella', 'kite'],
  patterns=["What's the weather like? It's sunny.", "Is it cold? Yes, it is. / No, it isn't.", 'Can I go outside now? Yes, you can.', "It's hot and sunny.", 'Make it windy!'],
  spawn={'pos': [0, 0, 44], 'rot': 3.14159},
  zones=[
    Z('gate', 'Town Gate', '小镇大门', (0, 40), 8),
    Z('square', 'Weather Square', '天气广场', (0, 6), 10),
    Z('kite', 'Kite Hill', '风筝山', (26, -20), 11),
    Z('puddle', 'Puddle Lane', '水坑小巷', (-27, -4), 10),
    Z('snow', 'Snow Corner', '雪人角', (-24, -30), 10),
    Z('cloud', 'Cloud Garden', '云朵花园', (0, -34), 9),
    Z('beach', 'Sunny Beach', '阳光海滩', (29, 14), 10),
    Z('bus', 'Bus Stop', '公交车站', (-24, 26), 9),
    Z('cafe', 'Warm Soup Café', '热汤小馆', (22, 32), 8),
  ],
  decor=[
    # streets
    {'k': 'path', 'pts': [[0, 50], [0, 6]], 'w': 4, 'color': '#c8c2b6'},
    {'k': 'plaza', 'at': [0, 6], 'r': 9, 'color': '#d8d0c0'},
    {'k': 'path', 'pts': [[0, 6], [0, -29]], 'w': 3.2, 'color': '#c8c2b6'},
    {'k': 'plaza', 'at': [0, -34], 'r': 6, 'color': '#cfe6c0'},
    {'k': 'path', 'pts': [[0, 6], [20, 8], [25, 11]], 'w': 3, 'color': '#c8c2b6'},
    {'k': 'path', 'pts': [[0, 4], [18, -12], [22, -16]], 'w': 3, 'color': '#c8c2b6'},
    {'k': 'path', 'pts': [[0, 6], [-20, 0], [-24, -1]], 'w': 3, 'color': '#c8c2b6'},
    {'k': 'path', 'pts': [[-24, -1], [-22, -24]], 'w': 2.8, 'color': '#c8c2b6'},
    {'k': 'path', 'pts': [[0, 26], [-20, 24]], 'w': 2.8, 'color': '#c8c2b6'},
    {'k': 'path', 'pts': [[0, 26], [18, 30]], 'w': 2.8, 'color': '#c8c2b6'},
    {'k': 'path', 'pts': [[0, -30], [-17, -28]], 'w': 2.6, 'color': '#c8c2b6'},
    {'k': 'path', 'pts': [[0, -30], [20, -23]], 'w': 2.6, 'color': '#c8c2b6'},
    # town houses
    {'k': 'house', 'at': [-10, 19], 'rot': 1.5708, 'w': 5, 'h': 3.8, 'wall': '#f6e0c2', 'roof': '#c8553d'},
    {'k': 'house', 'at': [10, 19], 'rot': -1.5708, 'w': 5, 'h': 3.6, 'wall': '#d8e8f6', 'roof': '#4f7fb8'},
    {'k': 'house', 'at': [-11, -14], 'rot': 1.2, 'w': 5, 'h': 3.4, 'wall': '#e8f0d0', 'roof': '#5f9f4e'},
    {'k': 'house', 'at': [10, -21], 'rot': -0.6, 'w': 5, 'h': 3.6, 'wall': '#f4d8c8', 'roof': '#d9a23a'},
    {'k': 'house', 'at': [-14, 34], 'rot': 2.6, 'w': 5, 'h': 3.6, 'wall': '#e8d0e8', 'roof': '#4f7fb8'},
    {'k': 'lamp', 'at': [-3, 24]}, {'k': 'lamp', 'at': [3, 24]}, {'k': 'lamp', 'at': [-3, -18]}, {'k': 'lamp', 'at': [3, -18]},
    # gate
    {'k': 'model', 'm': 'flower_bed', 'at': [-6, 34], 'rot': 1.57}, {'k': 'model', 'm': 'flower_bed', 'at': [6, 34], 'rot': 1.57},
    {'k': 'fence', 'from': [-18, 42], 'to': [-5, 42]}, {'k': 'fence', 'from': [5, 42], 'to': [18, 42]},
    {'k': 'tree', 'at': [-11, 40], 's': 1.2}, {'k': 'tree', 'at': [11, 40], 's': 1.2},
    # weather square
    {'k': 'model', 'm': 'bench', 'at': [-6.5, 1], 'rot': 0.8, 'solid': 0.9}, {'k': 'model', 'm': 'bench', 'at': [6.5, 1], 'rot': -0.8, 'solid': 0.9},
    {'k': 'model', 'm': 'microphone', 'at': [-8, 12.5]}, {'k': 'model', 'm': 'flower_bed', 'at': [-7, -4], 'rot': 0.3},
    # kite hill
    {'k': 'meadow', 'at': [26, -21], 'r': 10, 'n': 70},
    {'k': 'grove', 'at': [38, -32], 'r': 6, 'n': 6, 'kind': 'pine'}, {'k': 'tree', 'at': [18, -28], 's': 1.2},
    {'k': 'model', 'm': 'bench', 'at': [20, -24], 'rot': 1.0, 'solid': 0.9},
    # puddle lane
    {'k': 'pond', 'at': [-30, -9], 'r': 3.5, 'sx': 1.2}, {'k': 'pond', 'at': [-21, -12], 'r': 1.6},
    {'k': 'model', 'm': 'umbrella', 'at': [-33, -2], 's': 1.3}, {'k': 'model', 'm': 'bush', 'at': [-34, 3]}, {'k': 'model', 'm': 'bush', 'at': [-19, 4]},
    # snow corner
    {'k': 'mountain', 'at': [-36, -42], 'r': 10, 'h': 9, 'snow': True},
    {'k': 'grove', 'at': [-34, -30], 'r': 4, 'n': 5, 'kind': 'pine'}, {'k': 'pine', 'at': [-14, -38], 's': 1.2},
    {'k': 'model', 'm': 'snowman', 'at': [-17, -36], 's': 0.6},
    # cloud garden
    {'k': 'meadow', 'at': [0, -36], 'r': 8, 'n': 70},
    {'k': 'model', 'm': 'flower_bed', 'at': [-8, -37], 'rot': 0.5}, {'k': 'model', 'm': 'flower_bed', 'at': [8, -30], 'rot': -0.5},
    {'k': 'grove', 'at': [0, -48], 'r': 8, 'n': 8, 'kind': 'tree'},
    # beach
    {'k': 'plaza', 'at': [31, 14], 'r': 9, 'color': '#f2dfa8'},
    {'k': 'pond', 'at': [38, 18], 'r': 6, 'sx': 1.3},
    {'k': 'model', 'm': 'umbrella', 'at': [33, 5], 's': 2.2}, {'k': 'model', 'm': 'beach_ball', 'at': [22, 20]},
    # bus stop
    {'k': 'model', 'm': 'city_bus', 'at': [-34, 22], 'rot': 1.5708, 'solid': 2.2},
    {'k': 'model', 'm': 'traffic_light', 'at': [-17, 20]}, {'k': 'tree', 'at': [-30, 34], 's': 1.1},
    # café
    {'k': 'house', 'at': [27, 36], 'rot': -2.4, 'w': 5, 'h': 3.6, 'wall': '#fbe7c6', 'roof': '#c8553d'},
    {'k': 'model', 'm': 'picnic_table', 'at': [17, 35], 'rot': 0.3, 'solid': 1.2}, {'k': 'model', 'm': 'potted_plant', 'at': [23, 28]},
    # edges
    {'k': 'grove', 'at': [44, -6], 'r': 6, 'n': 6, 'kind': 'mix'}, {'k': 'grove', 'at': [-44, 8], 'r': 6, 'n': 6, 'kind': 'mix'},
    {'k': 'pine', 'at': [38, 34], 's': 1.3}, {'k': 'pine', 'at': [-40, 36], 's': 1.3},
  ],
  things=[
    # Town Gate
    T('sign_welcome', 'welcome sign', 'signpost', (-3.5, 0, 36), '欢迎牌', aliases=['sign'], radius=0.4, can=['read'], text="Welcome to Weather Town!\nWhat's the weather like today?\nAsk Mr Sunny!"),
    # Weather Square
    T('vane', 'weather vane', 'weather_vane', (0, 0, 4), '风向标', aliases=['vane', 'rooster', 'weather machine'], radius=0.6, can=['fly']),
    T('board', 'weather board', 'signpost', (6, 0, 11), '天气牌', aliases=['board', 'sign'], radius=0.4, can=['read'], text='Weather Town\nMonday: sunny\nTuesday: rainy\nWednesday: windy\nThursday: snowy'),
    T('lamp1', 'lamp', 'lamp_post', (6, 0, -2), '路灯', aliases=['light', 'lamp post'], radius=0.3, can=['light']),
    # Kite Hill
    T('windmill', 'windmill', 'windmill', (31, 0, -25), '风车', radius=2.0, can=['fly']),
    T('kite', 'kite', 'kite', (25, 0, -23.5), '风筝', tags=['colourful'], radius=0, can=['pick', 'fly']),
    # Puddle Lane
    T('duck', 'duck', 'duck', (-30, 0, -3.5), '鸭子', tags=['yellow', 'small'], color='yellow', radius=0.4, can=['fly', 'pick'], params={'voice': 'animal'},
      chatter=['Quack! It\'s rainy. I like rainy days!', 'Quack, quack! What\'s the weather like? It\'s rainy!']),
    T('frog', 'frog', 'frog', (-24, 0, -11), '青蛙', tags=['green', 'small'], color='green', radius=0.3, can=['fly', 'pick'], params={'voice': 'animal'},
      chatter=['Ribbit! Is it rainy? Yes, it is! Ribbit!']),
    T('boots', 'rain boots', 'rain_boots', (-26, 0, 3), '雨靴', aliases=['boots', 'wellies'], tags=['yellow'], color='yellow', radius=0, can=['pick', 'fly']),
    # Snow Corner
    T('snowman', 'snowman', 'snowman', (-27, 0, -31), '雪人', tags=['white'], color='white', radius=0.6, can=['fly'], reveal=['ws_coldq'], revealOn='dance'),
    T('sled', 'sled', 'sled', (-21, 0, -34.5), '雪橇', aliases=['sledge'], tags=['red'], radius=0.6, can=['fly', 'ride']),
    T('hat', 'woolly hat', 'woolly_hat', (-24.5, 0, -25), '毛线帽', aliases=['hat', 'wool hat'], radius=0, can=['pick', 'fly']),
    T('penguin', 'penguin', 'penguin', (-30.5, 0, -25.5), '企鹅', radius=0.5, can=['fly', 'pick'], params={'voice': 'animal'},
      chatter=['Brrr! It\'s cold! I like snowy days!', 'Is it cold? Yes, it is! Hooray!']),
    # Cloud Garden
    T('balloon', 'balloon', 'hot_air_balloon', (4.5, 0, -37), '热气球', aliases=['hot air balloon'], radius=2.0, can=['fly'], params={'h': 4.5}, reveal=['ws_cloudy'], revealOn='fly'),
    T('flowers', 'flowers', 'flowers', (-6, 0, -37), '花', aliases=['flower'], radius=0.4, can=['grow', 'pick']),
    T('sheep', 'sheep', 'sheep', (-4.5, 0, -31), '绵羊', tags=['white'], color='white', radius=0.6, can=['fly', 'pick'], params={'voice': 'animal'},
      chatter=['Baa! I look like a cloud! Baa!', 'It\'s cloudy today. Baa, baa!']),
    # Sunny Beach
    T('ball', 'beach ball', 'beach_ball', (27, 0, 18.5), '沙滩球', aliases=['ball'], radius=0.4, can=['pick', 'fly']),
    T('sandcastle', 'sandcastle', 'sandcastle', (31, 0, 10), '沙堡', aliases=['castle', 'sand castle'], radius=0.6, can=['fly'], reveal=['ws_hotsunny'], revealOn='big'),
    T('sunglasses', 'sunglasses', 'sunglasses', (28, 0, 7), '太阳镜', aliases=['glasses'], tags=['red'], radius=0, scale=1.8, can=['pick', 'fly']),
    # Bus Stop
    T('bus_stop', 'bus stop', 'bus_stop', (-27, 0, 28.5), '公交车站', aliases=['stop'], radius=1.2),
    T('umbrella', 'umbrella', 'umbrella', (-21, 0, 22.5), '雨伞', tags=['red'], color='red', radius=0, can=['pick', 'fly'], params={'h': 1.1}),
    T('bike', 'bike', 'bicycle', (-30, 0, 24), '自行车', aliases=['bicycle'], tags=['red'], radius=0.7, can=['fly', 'ride']),
    T('lamp2', 'lamp', 'lamp_post', (-19, 0, 29), '路灯', aliases=['light', 'lamp post'], radius=0.3, can=['light'], label=False),
    # Warm Soup Café
    T('soup_sign', 'soup sign', 'signpost', (20, 0, 28.5), '热汤招牌', aliases=['sign', 'menu'], radius=0.4, can=['read'], text="Warm Soup Café\nIt's cold outside.\nHave some hot soup!"),
    T('teapot', 'teapot', 'teapot', (24.5, 0, 30.5), '茶壶', aliases=['tea', 'pot'], radius=0.3, can=['pick', 'fly']),
  ],
  npcs=[
    N('sunny', 'Mr Sunny', 'weatherman', (-4, 0, 9), 'funny', 'Mr Sunny, a funny TV weatherman who gives the weather report in Weather Square; grade-4 English about weather; loves asking "What\'s the weather like?"', "Hello, hello! I'm Mr Sunny, the weatherman! What's the weather like today?", '天气先生', aliases=['weatherman', 'mr sunny', 'man'],
      idle=['What a lovely day!', "What's the weather like? It's sunny! Ha ha!", 'Here is the weather report!'],
      chatter=["What's the weather like today? Let's see!", "It's cloudy. Oh no! I like sunny days!", 'Is it cold? Is it hot? Ask me!']),
    N('lucy', 'Lucy', 'girl_raincoat', (-23, 0, -1.5), 'child', 'Lucy, a little girl in a yellow raincoat who loves puddles and rainy days; very simple English', "Hi! I'm Lucy. I love rainy days!", '露西', aliases=['girl', 'lucy'],
      idle=['Splash, splash! I love puddles!', "It's rainy. I have my umbrella!"],
      chatter=["It's rainy! Can I go outside now?", 'Where is my umbrella? It\'s red!', 'I like rainy days. Do you?']),
    N('ben', 'Ben', 'student', (22, 0, -18.5), 'child', 'Ben, a boy on Kite Hill who wants to fly his kite on a windy day; very simple English', "Hi, I'm Ben. I want to fly my kite!", '本', aliases=['boy', 'ben'],
      idle=['Look at my kite! It\'s so high!', "It's windy. I like windy days!"],
      chatter=["Is it windy? No, it isn't. Oh no!", 'I need a windy day for my kite!']),
    N('anna', 'Anna', 'girl_scarf', (-20, 0, -27.5), 'child', 'Anna, a girl in a warm scarf who loves snow and snowmen; very simple English', "Hi! I'm Anna. I like snowy days!", '安娜', aliases=['girl', 'anna'],
      idle=["It's cold. I have my scarf!", 'Look at the snowman! He is big!'],
      chatter=['Brrr! Is it cold? Yes, it is!', 'I want a snowy day! Can you help me?']),
    N('sally', 'Sally', 'girl_sunhat', (25, 0, 15), 'child', 'Sally, a girl in a big sun hat at Sunny Beach who loves hot sunny days; very simple English', "Hi! I'm Sally. It's hot and sunny at the beach!", '萨莉', aliases=['girl', 'sally'],
      idle=['I like sunny days!', "It's hot. Let's play with the ball!"],
      chatter=["It's hot and sunny! I like the beach!", 'Where are my sunglasses?', "What's the weather like in Sydney? It's hot!"]),
  ],
  quests=[
    # Mr Sunny: the weather report — ends with a rainbow
    Q('wt_sun', 'magic', '说', 'sunny', '天太阴了：用咒语让天晴', 'Make it sunny', ["Oh no! It's so cloudy and grey today. My weather vane is stuck! Can you change the weather?"], ['Make it sunny!'], ["Look! It's sunny! Thank you!"], prompt='Say: Make it sunny!', goal='weather:sunny', tipZh='念咒语让天晴：“Make it sunny!”'),
    Q('wt_ask', 'speak', '说', 'sunny', '回答天气先生：现在天气怎么样？', "What's the weather like?", ['Now, tell the people of Weather Town!'], ["It's sunny.", "It's warm and sunny."], ['Correct! Great weather report!'], prompt="What's the weather like now?", accept=[WEATHER], needs='wt_sun', tipZh='看看天空，回答：“It\'s sunny.”'),
    Q('wt_listen', 'listen', '听', 'sunny', '听天气预报，选出哈尔滨的天气', 'Listen to the weather report', ["It's time for the weather report. Listen!"], [], ["Yes! It's snowy and cold in Harbin. Brrr!"], prompt="What's the weather like in Harbin?", audio="Good morning! Here is the weather report. In Beijing, it's sunny and warm. In Shanghai, it's rainy. In Harbin, it's snowy and cold.", options=['Sunny and warm', 'Snowy and cold', 'Rainy and cool'], answer=1, video='weather.mp4', needs='wt_ask'),
    Q('sunny_vane', 'magic', '说', 'sunny', '修好天气机器：让风向标转起来', 'Make the weather vane spin', ['My weather vane is stuck! It can\'t tell the weather. Can you make the weather vane spin?'], ['Make the weather vane spin!'], ['It works! It\'s spinning! Thank you, little wizard!'], prompt='Say: Make the weather vane spin!', goal='spin:vane', needs='wt_listen', tipZh='风向标就在广场中间。念咒语：“Make the weather vane spin!”'),
    Q('sunny_rainbow', 'magic', '说', 'sunny', '天气都好啦！变出一道彩虹庆祝', 'Make a rainbow!', ['Sunny, rainy, windy, snowy! Weather Town is happy again. Let\'s finish the report with a rainbow!'], ['Make a rainbow!'], ["Wow! A rainbow! What's the weather like? It's beautiful! Thank you!"], prompt='Say: Make a rainbow!', goal='rainbow', needs='sunny_vane'),
    Q('wt_read', 'read', '读', 'board', '读天气牌：星期二天气怎么样？', 'Read the weather board', [], [], ["Right! It's rainy on Tuesday. Take an umbrella!"], passage='Weather Town\nMonday: sunny\nTuesday: rainy\nWednesday: windy\nThursday: snowy', prompt="What's the weather like on Tuesday?", options=['Sunny', 'Rainy', 'Windy'], answer=1),
    # Lucy: rainy days
    Q('wt_umbrella', 'do', '说', 'lucy', '把雨伞给 Lucy', 'Give Lucy her umbrella', ["It's going to rain! Where is my umbrella? It's red! I think it's near the bus stop."], ['Give the umbrella to Lucy.'], ['My umbrella! Thank you! Now I can play in the rain!'], prompt='Can you give me my umbrella, please?', goal='give:umbrella:lucy', tipZh='红雨伞在北边的公交车站旁。说：“Give the umbrella to Lucy!”'),
    Q('lucy_rain', 'magic', '说', 'lucy', 'Lucy 想踩水坑：让天下雨', 'Make it rainy', ['I have my umbrella. Now I want to jump in the puddles! Can you make it rainy?'], ['Make it rainy!'], ["Yay! It's rainy! Splash, splash!"], prompt='Say: Make it rainy!', goal='weather:rainy', needs='wt_umbrella'),
    Q('lucy_out', 'speak', '说', 'lucy', '回答 Lucy：我现在能出去玩吗？', 'Can I go outside now?', ["I have my umbrella and my rain boots. It's rainy outside."], ['Yes, you can.'], ['Hooray! Thank you! Splash, splash!'], prompt='Can I go outside now?', accept=[['yes', 'you can', 'sure', 'of course', 'okay', 'ok']], needs='lucy_rain', tipZh='Lucy 问她能不能出去玩。回答：“Yes, you can.”'),
    Q('wt_write', 'write', '写', 'lucy', '写出天气：需要带雨伞的天气', 'Write the weather', ['Can you write a weather word?'], ['rainy'], ['Yes! Rainy! I love rainy days!'], prompt='You need an umbrella on a ___ day. Write the weather.', accept=[['rainy', 'rain']], needs='lucy_out'),
    # Ben: a windy day
    Q('wt_wind', 'magic', '说', 'ben', '帮 Ben 放风筝：让天起风', 'Make it windy', ["Is it windy? No, it isn't. My kite can't fly!"], ['Make it windy!'], ["Whoosh! It's windy! Thank you!"], prompt='Say: Make it windy!', goal='weather:windy', tipZh='念咒语：“Make it windy!”'),
    Q('ben_kite', 'magic', '说', 'ben', '起风啦：让风筝飞起来', 'Make the kite fly', ["It's windy now! Can you make my kite fly?"], ['Make the kite fly!'], ['Look at my kite! It\'s so high! I like windy days!'], prompt='Say: Make the kite fly!', goal='fly:kite', needs='wt_wind'),
    # Anna: a snowy day
    Q('anna_snow', 'magic', '说', 'anna', 'Anna 想堆雪人：让天下雪', 'Make it snowy', ['I want to play with the snowman. Can you make it snowy?'], ['Make it snowy!'], ["Snow! It's snowy! Thank you!"], prompt='Say: Make it snowy!', goal='weather:snowy', tipZh='念咒语让天下雪：“Make it snowy!”'),
    Q('anna_cold', 'speak', '说', 'anna', '回答 Anna：今天热吗？', 'Is it hot?', ['Brrr! Look at the snow! Is it hot today?'], ["No, it isn't. It's cold."], ["Yes! It's cold. I have my warm scarf!"], prompt='Is it hot today?', accept=[['no', 'not', 'cold']], needs='anna_snow', tipZh='下雪了，冷不冷？回答：“No, it isn\'t. It\'s cold.”'),
    Q('anna_snowman', 'magic', '说', 'anna', '把雪人变大', 'Make the snowman big', ['I like snowy days. Can you make the snowman big?'], ['Make the snowman big!'], ['Wow! A big snowman! Hello, snowman!'], prompt='Say: Make the snowman big!', goal='big:snowman', needs='anna_cold'),
    # Sally: a hot day at the beach
    Q('sally_listen', 'listen', '听', 'sally', '听世界天气预报，选出悉尼的天气', 'The world weather', ["Let's listen to the world weather report! What's the weather like in Sydney?"], [], ["Yes! It's hot and sunny in Sydney. Just like the beach!"], prompt="What's the weather like in Sydney?", audio="Hello! Here is the world weather. It's hot and sunny in Sydney. It's cloudy and cool in London. It's snowy and cold in Moscow.", options=['Hot and sunny', 'Cloudy and cool', 'Snowy and cold'], answer=0),
    Q('sally_glasses', 'do', '说', 'sally', '把太阳镜送给 Sally', 'Give Sally her sunglasses', ["It's so sunny and hot! Where are my sunglasses? They are near the sandcastle."], ['Give the sunglasses to Sally.'], ['My sunglasses! Thank you! Now I like the sun!'], goal='give:*:sally', needs='sally_listen', tipZh='太阳镜在沙堡旁边。说：“Give the sunglasses to Sally!”'),
    # the café sign
    Q('cafe_read', 'read', '读', 'soup_sign', '大声读出热汤小馆的招牌', 'Read the café sign', [], ["It's cold outside. Have some hot soup!"], ['You read it! Hot soup on a cold day. Yummy!'], passage="It's cold outside. Have some hot soup!", readAloud=True, prompt='Read the sign aloud.'),
  ],
  words=[
    S('ws_weather', 'weather', '天气', (3, 16)), S('ws_sunny', 'sunny', '晴朗的', (-3, 21)), S('ws_rainy', 'rainy', '下雨的', (-19, -6)),
    S('ws_cloudy', 'cloudy', '多云的', (8, -33), hidden=True), S('ws_windy', 'windy', '有风的', (28, -14)), S('ws_snowy', 'snowy', '下雪的', (-16, -32)),
    S('ws_hot', 'hot', '热的', (21, 18)), S('ws_cold', 'cold', '冷的', (-16, -24)), S('ws_warm', 'warm', '暖和的', (14, 31)), S('ws_cool', 'cool', '凉爽的', (-12, -4)),
    S('ws_what', "What's the weather like?", '天气怎么样？', (0, 28)),
    S('ws_sunnyday', "It's sunny today.", '今天天气晴朗。', (12, 4)),
    S('ws_outside', 'Can I go outside now?', '我现在能出去吗？', (-17, 2)),
    S('ws_youcan', 'Yes, you can.', '是的，你可以。', (-13, 25)),
    S('ws_makewind', 'Make it windy!', '让天刮风吧！', (14, -6)),
    S('ws_coldq', 'Is it cold? Yes, it is.', '冷吗？是的，冷。', (-30, -34), hidden=True),
    S('ws_hotsunny', "It's hot and sunny.", '天气又热又晴朗。', (34, 7), hidden=True),
  ],
  spellIdeas=[{'say': 'Make it snowy!', 'zh': '让天下雪'}, {'say': 'Make it rainy!', 'zh': '让天下雨'}, {'say': 'Make it cloudy!', 'zh': '让天变阴'},
    {'say': 'Make the windmill spin!', 'zh': '让风车转起来', 'near': 'windmill'}, {'say': 'Make the kite fly!', 'zh': '让风筝飞起来', 'near': 'kite'}, {'say': 'Make the umbrella big!', 'zh': '把雨伞变大', 'near': 'umbrella'},
    {'say': 'Make the snowman dance!', 'zh': '让雪人跳舞（会有秘密哦）', 'near': 'snowman'}, {'say': 'Make the sandcastle big!', 'zh': '把沙堡变大（会有秘密哦）', 'near': 'sandcastle'},
    {'say': 'Make the balloon fly!', 'zh': '让热气球飞起来（会有秘密哦）', 'near': 'balloon'}, {'say': 'Freeze the duck!', 'zh': '把鸭子冻住', 'near': 'duck'}, {'say': 'Melt the snowman!', 'zh': '把雪人融化', 'near': 'snowman'},
    {'say': 'Make it winter!', 'zh': '变成冬天'}, {'say': 'Make it night!', 'zh': '让天黑下来'}, {'say': 'Turn the penguin into a duck!', 'zh': '把企鹅变成鸭子', 'near': 'penguin'},
    {'say': 'Make the sheep fly!', 'zh': '让绵羊飞起来', 'near': 'sheep'}, {'say': 'Make the rain boots dance!', 'zh': '让雨靴跳舞', 'near': 'boots'}],
)
