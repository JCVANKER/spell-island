from common import T, N, Q, S, Z

# 6 ------------------------------------------------------------------ 五下 My favourite season
# A big valley with a corner for every season around Season Square. The seasons obey magic ("Make it winter!"),
# and everyone has a favourite: Which season do you like best? · I like … best. · Why? Because I can …
WORLD = dict(id='season-valley', order=6, grade='五年级下册', gradeNum=5, unit='Unit · My favourite season: Which season do you like best? Why?（季节）', title='Four Seasons Valley', titleZh='四季山谷', scene='valley', start={'season': 'summer'},
  bounds=52,
  intro=['欢迎来到四季山谷！这里有春之花园、夏日湖滩、秋天果园和冬日雪坡，季节也听你的魔法！', '山谷里的每个人都有最喜欢的季节。先去季节广场找 Mia：“Go to Mia!”'],
  vocab=['season', 'spring', 'summer', 'autumn', 'fall', 'winter', 'best', 'why', 'because', 'warm', 'hot', 'cool', 'cold', 'fly kites', 'swim', 'pick apples', 'make a snowman', 'go on a picnic', 'leaves'],
  patterns=['Which season do you like best?', 'I like winter best.', 'Why? Because I can make a snowman.', "Summer is hot. Autumn is golden.", 'Make it spring!'],
  spawn={'pos': [0, 0, 44], 'rot': 3.14159},
  zones=[
    Z('gate', 'Valley Gate', '山谷入口', (0, 38), 7),
    Z('square', 'Season Square', '季节广场', (0, 14), 9),
    Z('spring', 'Spring Garden', '春之花园', (-27, 22), 10),
    Z('kites', 'Kite Field', '风筝草地', (-37, 0), 8),
    Z('summer', 'Summer Beach', '夏日湖滩', (27, 19), 11),
    Z('autumn', 'Autumn Orchard', '秋天果园', (-27, -21), 11),
    Z('winter', 'Winter Hill', '冬日雪坡', (26, -23), 11),
    Z('picnic', 'Picnic Hill', '野餐山坡', (0, -34), 8),
  ],
  decor=[
    # paths from Season Square to every season
    {'k': 'path', 'pts': [[0, 50], [0, 30], [0, 14]], 'w': 4},
    {'k': 'plaza', 'at': [0, 14], 'r': 8, 'color': '#e8d6a8'},
    {'k': 'path', 'pts': [[0, 14], [-14, 18], [-24, 21]], 'w': 3},
    {'k': 'path', 'pts': [[-14, 18], [-26, 8], [-34, 1]], 'w': 2.8},
    {'k': 'path', 'pts': [[0, 14], [14, 17], [22, 18]], 'w': 3},
    {'k': 'path', 'pts': [[0, 14], [-10, 0], [-22, -14], [-26, -19]], 'w': 3},
    {'k': 'path', 'pts': [[0, 14], [10, 0], [20, -14], [24, -19]], 'w': 3},
    {'k': 'path', 'pts': [[0, 6], [0, -20], [0, -30]], 'w': 3},
    {'k': 'path', 'pts': [[-22, -14], [-10, -26], [0, -30]], 'w': 2.6},
    {'k': 'path', 'pts': [[20, -14], [10, -26], [0, -30]], 'w': 2.6},
    # Spring Garden: flowers and blossom trees
    {'k': 'meadow', 'at': [-27, 22], 'r': 9, 'n': 110}, {'k': 'meadow', 'at': [-36, 2], 'r': 7, 'n': 50},
    {'k': 'model', 'm': 'flower_bed', 'at': [-20, 15], 'rot': 0.3}, {'k': 'model', 'm': 'flower_bed', 'at': [-30, 15], 'rot': -0.3}, {'k': 'model', 'm': 'flower_bed', 'at': [-27, 30], 'rot': 0},
    {'k': 'tree', 'at': [-38, 18], 's': 1.2, 'leaf': '#f4a6c8'}, {'k': 'tree', 'at': [-18, 31], 's': 1.1, 'leaf': '#f4a6c8'}, {'k': 'tree', 'at': [-37, 32], 's': 1.2, 'leaf': '#f7c6d9'},
    {'k': 'model', 'm': 'bench', 'at': [-16, 23], 'rot': -1.57, 'solid': 0.9},
    # Kite Field
    {'k': 'model', 'm': 'windmill', 'at': [-45, 8], 'rot': 0.6, 'solid': 1.4},
    # Summer Beach: sand and a little lake
    {'k': 'plaza', 'at': [25, 19], 'r': 8, 'color': '#f2dfa8'},
    {'k': 'pond', 'at': [37, 20], 'r': 5, 'sx': 1.2},
    {'k': 'model', 'm': 'boat', 'at': [37, 24], 'rot': 0.4},
    {'k': 'model', 'm': 'bush', 'at': [16, 13]}, {'k': 'tree', 'at': [33, 30], 's': 1.2}, {'k': 'tree', 'at': [42, 10], 's': 1.1},
    # Autumn Orchard
    {'k': 'tree', 'at': [-17, -30], 's': 1.2, 'leaf': '#e8913a'}, {'k': 'tree', 'at': [-38, -32], 's': 1.2, 'leaf': '#d9542e'}, {'k': 'tree', 'at': [-40, -14], 's': 1.1, 'leaf': '#f2b437'},
    {'k': 'tree', 'at': [-13, -9], 's': 1.0, 'leaf': '#e8913a'}, {'k': 'tree', 'at': [-30, -36], 's': 1.1, 'leaf': '#f2b437'},
    {'k': 'model', 'm': 'apple_crate', 'at': [-31, -18], 'rot': 0.5, 'solid': 0.6},
    {'k': 'fence', 'from': [-42, -6], 'to': [-30, -8]}, {'k': 'fence', 'from': [-42, -6], 'to': [-44, -20]},
    # Winter Hill: pines, rocks and a snowy mountain behind
    {'k': 'pine', 'at': [16, -32], 's': 1.3}, {'k': 'pine', 'at': [24, -34], 's': 1.4}, {'k': 'pine', 'at': [36, -30], 's': 1.3}, {'k': 'pine', 'at': [38, -14], 's': 1.2},
    {'k': 'pine', 'at': [14, -12], 's': 1.1},
    {'k': 'mountain', 'at': [36, -58], 'r': 20, 'h': 18, 'color': '#dfe8ee', 'snow': True},
    {'k': 'rock', 'at': [28, -14], 's': 0.9},
    # Picnic Hill
    {'k': 'meadow', 'at': [0, -34], 'r': 7, 'n': 50},
    {'k': 'model', 'm': 'hot_air_balloon', 'at': [9, -40], 'rot': 0, 'solid': 1.8},
    {'k': 'tree', 'at': [-9, -32], 's': 1.2},
    # mountains around the valley
    {'k': 'mountain', 'at': [-30, -62], 'r': 22, 'h': 18, 'color': '#86a870', 'snow': True},
    {'k': 'mountain', 'at': [4, -66], 'r': 24, 'h': 20, 'color': '#86a870', 'snow': True},
    {'k': 'mountain', 'at': [-62, 10], 'r': 16, 'h': 12, 'color': '#86a870'}, {'k': 'mountain', 'at': [62, 4], 'r': 16, 'h': 12, 'color': '#86a870'},
    # Season Square and the gate
    {'k': 'model', 'm': 'bench', 'at': [-7, 10], 'rot': 1.57, 'solid': 0.9}, {'k': 'model', 'm': 'bench', 'at': [8, 21], 'rot': -1.57, 'solid': 0.9},
    {'k': 'model', 'm': 'bush', 'at': [-6, 26]}, {'k': 'model', 'm': 'bush', 'at': [6, 26]},
    {'k': 'tree', 'at': [-12, 40], 's': 1.2}, {'k': 'tree', 'at': [12, 40], 's': 1.2},
    {'k': 'grove', 'at': [0, 62], 'r': 10, 'n': 8, 'kind': 'mix', 's': 1.2},
    {'k': 'lamp', 'at': [-3, 30]}, {'k': 'lamp', 'at': [3, 30]},
  ],
  things=[
    # Valley Gate + Season Square
    T('lamp1', 'lamp', 'lamp_post', (4, 0, 36), '路灯', aliases=['light', 'lamp post'], radius=0.3, can=['light']),
    T('fountain', 'fountain', 'fountain', (0, 0, 12), '喷泉', radius=1.8, can=['light']),
    T('season_sign', 'season sign', 'signpost', (-6, 0, 20), '季节告示牌', aliases=['sign', 'board', 'notice'], radius=0.4, can=['read'], text="In spring, it's warm. We can fly kites.\nIn summer, it's hot. We can swim.\nIn autumn, it's cool. We can pick apples.\nIn winter, it's cold. We can make a snowman."),
    T('vane', 'weather vane', 'weather_vane', (7, 0, 8), '风向标', aliases=['vane', 'season vane'], radius=0.4, can=['fly']),
    # Spring Garden
    T('flowers', 'flowers', 'flowers', (-24, 0, 18), '花', aliases=['flower'], radius=0, can=['grow']),
    T('swing', 'swing', 'swing', (-33, 0, 25), '秋千', radius=1.2, can=['fly']),
    T('rabbit', 'rabbit', 'rabbit', (-21, 0, 26), '兔子', tags=['white', 'small'], color='white', radius=0.4, can=['fly', 'pick'], params={'voice': 'animal'}, chatter=["Hop hop! I like spring best because it's warm and green!"]),
    # Kite Field
    T('kite', 'kite', 'kite', (-39, 0, -2), '风筝', tags=['red'], color='red', radius=0.4, can=['fly', 'pick']),
    # Summer Beach
    T('lake', 'lake', 'none', (37, 0, 20), '湖', aliases=['pond', 'water'], radius=0, label=True),
    T('ball', 'beach ball', 'beach_ball', (25, 0, 13), '沙滩球', aliases=['ball'], radius=0.4, can=['fly', 'pick']),
    T('sandcastle', 'sandcastle', 'sandcastle', (27, 0, 25), '沙堡', aliases=['sand castle', 'castle'], radius=0.6, can=['fly'], reveal=['ws_swim'], revealOn='big'),
    T('cart', 'ice cream cart', 'ice_cream_cart', (18, 0, 26), '冰淇淋车', aliases=['cart', 'ice cream car'], radius=1.3, can=['fly']),
    # Autumn Orchard
    T('apple_tree', 'apple tree', 'fruit_tree', (-30, 0, -25), '苹果树', aliases=['tree'], radius=1.0, can=['grow']),
    T('apple_tree2', 'apple tree', 'fruit_tree', (-21, 0, -29), '苹果树', aliases=['tree'], radius=1.0, can=['grow'], label=False),
    T('leaves', 'leaves', 'leaf_pile', (-16, 0, -14), '落叶堆', aliases=['leaf pile', 'leaf'], tags=['red', 'yellow'], radius=0.6, can=['fly'], reveal=['ws_leaves'], revealOn='fly'),
    T('pumpkin', 'pumpkin', 'pumpkin', (-35, 0, -13), '南瓜', tags=['orange', 'big'], color='orange', radius=0.5, can=['grow', 'pick']),
    T('scarecrow', 'scarecrow', 'scarecrow', (-37, 0, -25), '稻草人', radius=0.5, can=['fly'], params={'voice': 'funny'}, chatter=['Hello! I like autumn best. Why? Because the apples are red!', 'Autumn is golden. Look at the leaves!']),
    T('orchard_sign', 'orchard sign', 'signpost', (-17, 0, -21), '果园告示牌', aliases=['sign', 'board'], radius=0.4, can=['read'], text='AUTUMN ORCHARD\nAutumn is golden.\nI like autumn best because I can pick apples.'),
    # Winter Hill
    T('sled', 'sled', 'sled', (31, 0, -28), '雪橇', aliases=['sledge'], tags=['red'], radius=0.6, can=['fly', 'pick']),
    T('hat', 'woolly hat', 'woolly_hat', (19, 0, -27), '毛线帽', aliases=['hat', 'wool hat'], tags=['red'], radius=0.2, can=['pick']),
    T('penguin', 'penguin', 'penguin', (32, 0, -18), '企鹅', tags=['black', 'white'], color='black', radius=0.5, can=['fly', 'pick'], params={'voice': 'animal'}, chatter=["I like winter best because it's cold and snowy!", 'Which season do you like best? Winter, winter, winter!']),
    T('winter_sign', 'winter sign', 'signpost', (18, 0, -17), '雪坡告示牌', aliases=['sign', 'board'], radius=0.4, can=['read'], text="WINTER HILL\nWinter is cold and white.\nWe can make a snowman and go sledding.\nDon't forget your hat!"),
    # Picnic Hill
    T('picnic', 'picnic table', 'picnic_table', (0, 0, -33), '野餐桌', aliases=['table', 'picnic'], radius=1.2),
    T('chest', 'treasure chest', 'treasure_chest', (-6, 0, -38), '宝箱', aliases=['chest', 'box', 'treasure', 'picnic basket'], radius=0.6, can=['open', 'fly'], reveal=['ws_picnic'], revealOn='open'),
  ],
  npcs=[
    N('mia', 'Mia', 'girl_scarf', (3, 0, 19), 'child', 'Mia, a cheerful girl who asks everyone about their favourite season; grade-5 English (Which season do you like best? Why? Because…)', "Hi! I'm Mia. I love all the seasons!", '米娅', aliases=['girl', 'mia'],
      idle=['Which season do you like best?', 'I like spring best because the flowers are pretty!', 'Try a season spell: Make it autumn!'],
      chatter=['Which season do you like best?', 'I like spring best. Why? Because I can fly kites!', 'Spring is green. Summer is hot. Autumn is golden. Winter is white!']),
    N('snow', 'Mr Snow', 'snowman', (24, 0, -21), 'oldman', 'Mr Snow, a funny talking snowman who melts in summer and loves winter; grade-5 English about seasons', "Oh, hello! I'm Mr Snow. Is it summer? I'm melting!", '雪人先生', aliases=['snowman', 'mr snow', 'snow man'], tags=['white'], ouch='Ouch! My carrot nose!',
      idle=['I like winter best because it snows!', 'Brrr! Winter is cold. I love it!'],
      chatter=['I like winter best. Why? Because I am a snowman!', "Summer is hot. Help! I'm melting!"]),
    N('tom', 'Tom', 'student', (-32, 0, 3), 'child', 'Tom, a boy who loves flying kites in spring; grade-5 English', "Hi! I'm Tom. I like spring best!", '汤姆', aliases=['boy', 'tom'],
      idle=['I like spring best because I can fly kites.', 'Spring is warm and windy. Great for kites!'],
      chatter=['I like spring best because I can fly kites!', 'Spring is pretty. The flowers are pink and yellow.']),
    N('sunny', 'Sunny', 'girl_sunhat', (22, 0, 19), 'child', 'Sunny, a girl who loves summer, swimming and ice cream; grade-5 English', "Hi! I'm Sunny. Summer is my favourite season!", '桑妮', aliases=['girl', 'sunny'],
      idle=["I like summer best because I can swim!", "It's hot. I want an ice cream!"],
      chatter=['I like summer best. Why? Because I can swim in the lake!', 'Summer is hot. Let\'s eat ice cream!']),
    N('farmer', 'Farmer Brown', 'fruit_seller', (-26, 0, -19), 'man', 'Farmer Brown, a happy apple farmer who loves autumn; grade-5 English', "Hello! I'm Farmer Brown. Welcome to my orchard!", '布朗农夫', aliases=['farmer', 'brown', 'man', 'uncle'],
      idle=['I like autumn best because I can pick apples!', 'Autumn is cool and golden.'],
      chatter=['I like autumn best. Why? Because I can pick apples!', 'In autumn, the leaves are red and yellow.']),
  ],
  quests=[
    # Mia: the season survey (main line)
    Q('sv_best', 'speak', '说', 'mia', '回答 Mia：你最喜欢哪个季节？', 'Which season do you like best?', ['I am asking everyone in the valley. I have a question for you!'], ['I like spring best.', 'I like winter best.'], ['Me too! I like it too!'], prompt='Which season do you like best?', accept=[['spring', 'summer', 'autumn', 'fall', 'winter']], tipZh='Mia 问你最喜欢哪个季节，可以说：“I like … best.”'),
    Q('sv_why', 'speak', '说', 'mia', '告诉 Mia 为什么喜欢（用 because）', 'Why?', ['Why do you like it?'], ['Because I can make a snowman.', 'Because I can swim.'], ['Great reason! That sounds fun!'], prompt='Why do you like it?', accept=[['because', 'cause', 'i can']], judge="The child gives a reason for liking a season, ideally starting with 'because' (e.g. 'Because I can swim.'). Accept any sensible reason.", needs='sv_best', tipZh='Mia 问“为什么？”用 because 回答：“Because I can …”'),
    Q('sv_listen', 'listen', '听', 'mia', '听一听：她为什么喜欢秋天？', 'Listen and choose', ['Listen to my friend Lily!'], [], ['Yes! She can pick apples with her grandma.'], prompt='Why does Lily like autumn?', audio="Hi, I'm Lily. I like autumn best. The weather is cool and the leaves are golden. I can pick apples with my grandma.", options=['She can swim', 'She can pick apples', 'She can make a snowman'], answer=1, video='season.mp4', needs='sv_why'),
    Q('sv_write', 'write', '写', 'mia', '写出季节：可以堆雪人的季节', 'Write the season', ['Write a season for me!'], ['winter'], ['Yes! W-I-N-T-E-R, winter!'], prompt='You can make a snowman in ___. Write the season.', accept=[['winter']], needs='sv_listen'),
    Q('sv_party', 'magic', '说', 'mia', '调查完成！放烟花庆祝四季', 'Fireworks!', ['Thank you! Now I know: everyone likes a different season. Spring, summer, autumn, winter, they are all great! Let\'s have a season party!'], ['Fireworks!'], ['Wow! Happy spring, summer, autumn and winter! Thank you, little wizard!'], prompt='Say: Fireworks!', goal='fireworks', needs='sv_write'),
    # signs
    Q('sv_read', 'read', '读', 'season_sign', '读告示牌：哪个季节可以放风筝？', 'Read the season sign', [], [], ["Yes! In spring, it's warm. We can fly kites."], passage="In spring, it's warm. We can fly kites.\nIn summer, it's hot. We can swim.\nIn autumn, it's cool. We can pick apples.\nIn winter, it's cold. We can make a snowman.", prompt='When can we fly kites?', options=['In spring', 'In summer', 'In winter'], answer=0),
    Q('orchard_read', 'read', '读', 'orchard_sign', '大声读出果园告示牌', 'Read the orchard sign', [], ['Autumn is golden.'], ['Lovely reading! Autumn is golden.'], passage='Autumn is golden. I like autumn best because I can pick apples.', readAloud=True, prompt='Read the sign aloud.'),
    Q('winter_read', 'read', '读', 'winter_sign', '读雪坡告示牌：冬天是什么样的？', 'What is winter like?', [], [], ['Right! Winter is cold and white.'], passage="WINTER HILL\nWinter is cold and white.\nWe can make a snowman and go sledding.\nDon't forget your hat!", prompt='What is winter like?', options=['Hot and sunny', 'Cold and white', 'Warm and green'], answer=1),
    # Mr Snow: the melting snowman
    Q('sv_winter', 'magic', '说', 'snow', '雪人要化了：把季节变成冬天', 'Make it winter', ["It's summer and it's so hot. I'm melting! Help!"], ['Make it winter!'], ['Ahh, snow! Thank you! I like winter best!'], prompt='Say: Make it winter!', goal='season:winter', tipZh='雪人快化了！念咒语把季节变成冬天：“Make it winter!”'),
    Q('sn_hat', 'do', '说', 'snow', '雪人的头好冷：把毛线帽送给他', 'A hat for Mr Snow', ['Brrr! Now my head is cold. There is a woolly hat on the hill. Can you bring it to me?'], ['Pick up the hat.', 'Give the hat to Mr Snow.'], ['A red woolly hat! I look great! Thank you!'], goal='give:*:snow', needs='sv_winter', tipZh='先捡起帽子：“Pick up the hat!” 再送给雪人：“Give the hat to Mr Snow!”'),
    Q('sn_can', 'speak', '说', 'snow', '回答雪人：冬天你能做什么？', 'What can you do in winter?', ['I love winter. What can you do in winter?'], ['I can make a snowman.', 'I can go sledding.'], ['Ha ha! Make a snowman? Make a friend for me!'], prompt='What can you do in winter?', accept=[['snowman', 'snow', 'skate', 'ski', 'sled', 'sledding', 'ice']], judge="The child says something people can do in winter (e.g. 'I can make a snowman.', 'I can skate.'). Accept any sensible winter activity.", needs='sn_hat', tipZh='雪人问冬天能做什么。可以说：“I can make a snowman.”'),
    Q('sv_spring', 'magic', '说', 'snow', '雪人的花朋友在睡觉：把季节变成春天', 'Make it spring', ['My friends the flowers are sleeping under the snow. They miss the sun!'], ['Make it spring!'], ['Look, the flowers are waking up! Goodbye, my friends, see you next winter!'], prompt='Say: Make it spring!', goal='season:spring', needs='sn_can'),
    # Tom: kites in spring
    Q('tm_listen', 'listen', '听', 'tom', '听 Tom 说：他为什么喜欢春天？', 'Why does Tom like spring?', ['Listen! I will tell you about my favourite season.'], [], ['Yes! He can fly kites with his dad.'], prompt='Why does Tom like spring?', audio="I'm Tom. I like spring best. It's warm and the flowers are pretty. I can fly kites with my dad.", options=['He can fly kites', 'He can swim', 'He can pick apples'], answer=0),
    Q('tm_wind', 'magic', '说', 'tom', '没有风筝飞不起来：让天刮风', 'Make it windy', ["Oh no, there isn't any wind today. My kite can't fly!"], ['Make it windy!'], ['Whoosh! The wind is here! Thank you!'], prompt='Say: Make it windy!', goal='weather:windy', needs='tm_listen'),
    Q('tm_kite', 'magic', '说', 'tom', '让 Tom 的风筝飞起来', 'Make the kite fly', ['Now help my kite go up high!'], ['Make the kite fly!'], ['Look! It is flying high! I like spring best because I can fly kites!'], prompt='Say: Make the kite fly!', goal='fly:kite', needs='tm_wind'),
    Q('tm_write', 'write', '写', 'tom', '填空：春天我们可以放什么？', 'Write the word', ['Spelling time! What can we fly in spring?'], ['kites'], ['K-I-T-E-S! Kites! Well done!'], prompt='In spring, we can fly ___ . Write the word.', accept=[['kite']], needs='tm_kite'),
    # Sunny: summer fun
    Q('su_can', 'speak', '说', 'sunny', '回答 Sunny：夏天你能做什么？', 'What can you do in summer?', ['I like summer best! What can you do in summer?'], ['I can swim.', 'I can eat ice cream.'], ['Yes! Summer is so much fun!'], prompt='What can you do in summer?', accept=[['swim', 'ice cream', 'beach', 'sandcastle', 'boat', 'play', 'water']], judge="The child says something people can do in summer (e.g. 'I can swim.'). Accept any sensible summer activity.", tipZh='Sunny 问夏天能做什么。可以说：“I can swim.”'),
    Q('su_icecream', 'do', '说', 'sunny', '天太热了：变个冰淇淋送给 Sunny', 'Ice cream for Sunny', ["Summer is hot. Phew! The ice cream man is not here. Can you make an ice cream for me?"], ['Make an ice cream!', 'Give the ice cream to Sunny.'], ['Mmm, cold and yummy! I like summer best!'], goal='give:*:sunny', needs='su_can', tipZh='先变冰淇淋：“Make an ice cream!” 再送给她：“Give the ice cream to Sunny!”'),
    Q('su_ball', 'magic', '说', 'sunny', '让沙滩球跳起来', 'Make the ball jump', ["Let's play! Can you make my beach ball jump?"], ['Make the ball jump!'], ['Boing, boing! Summer is the best!'], prompt='Say: Make the ball jump!', goal='hop:ball', needs='su_icecream'),
    # Farmer Brown: autumn apples
    Q('fb_autumn', 'magic', '说', 'farmer', '苹果还是绿的：把季节变成秋天', 'Make it autumn', ['My apples are still small and green. Apples are red in autumn. Can you help?'], ['Make it autumn!'], ['Look! The leaves are golden and the apples are red. I like autumn best!'], prompt='Say: Make it autumn!', goal='season:autumn', tipZh='把季节变成秋天：“Make it autumn!”'),
    Q('fb_apples', 'magic', '说', 'farmer', '帮农夫摘苹果：让天上掉苹果', 'Make it rain apples', ["Now it's time to pick apples. There are so many! Can you help me?"], ['Make it rain apples!'], ['Ha ha! Apples everywhere! I like autumn best because I can pick apples!'], prompt='Say: Make it rain apples!', goal='fruit_rain:apple', needs='fb_autumn'),
  ],
  words=[
    S('ws_season', 'season', '季节', (-4, 6)), S('ws_spring', 'spring', '春天', (-30, 20)), S('ws_summer', 'summer', '夏天', (30, 15)),
    S('ws_autumn', 'autumn', '秋天', (-25, -24)), S('ws_winter', 'winter', '冬天', (28, -25)),
    S('ws_kites', 'fly kites', '放风筝', (-36, -6)), S('ws_swim', 'go swimming', '去游泳', (30, 27), hidden=True),
    S('ws_apples', 'pick apples', '摘苹果', (-33, -21)), S('ws_snowman', 'make a snowman', '堆雪人', (21, -24)),
    S('ws_cold', 'cold', '寒冷', (34, -22)), S('ws_warm', 'warm', '温暖', (-24, 12)),
    S('ws_which', 'Which season do you like best?', '你最喜欢哪个季节？', (5, 24)),
    S('ws_best', 'I like winter best.', '我最喜欢冬天。', (16, -20)),
    S('ws_because', 'Because I can fly kites.', '因为我可以放风筝。', (-28, 5)),
    S('ws_hot', 'Summer is hot.', '夏天很热。', (20, 12)),
    S('ws_leaves', 'The leaves are red and yellow.', '树叶是红色和黄色的。', (-18, -11), hidden=True),
    S('ws_picnic', "Spring is pretty. Let's go on a picnic!", '春天很美，我们去野餐吧！', (-3, -40), hidden=True),
  ],
  spellIdeas=[{'say': 'Make it autumn!', 'zh': '变成秋天'}, {'say': 'Make it winter!', 'zh': '变成冬天'}, {'say': 'Make the sandcastle big!', 'zh': '把沙堡变大（会发现秘密哦）', 'near': 'sandcastle'},
    {'say': 'Make the leaves fly!', 'zh': '让落叶飞起来（会发现秘密哦）', 'near': 'leaves'}, {'say': 'Open the chest!', 'zh': '打开野餐山坡的宝箱', 'near': 'chest'}, {'say': 'Make the snowman dance!', 'zh': '让雪人跳舞', 'near': 'snow'},
    {'say': 'Make the swing fly!', 'zh': '让秋千飞起来', 'near': 'swing'}, {'say': 'Make the pumpkin giant!', 'zh': '把南瓜变得超级大', 'near': 'pumpkin'}, {'say': 'Make three penguins!', 'zh': '变出三只企鹅', 'near': 'penguin'},
    {'say': 'Make it snowy!', 'zh': '让天下雪'}, {'say': 'Make an ice cream!', 'zh': '变一个冰淇淋'}, {'say': 'Freeze the fountain!', 'zh': '把喷泉冻住', 'near': 'fountain'},
    {'say': 'Make the scarecrow sing!', 'zh': '让稻草人唱歌', 'near': 'scarecrow'}, {'say': 'Grow a tree!', 'zh': '长出一棵树'}, {'say': 'Turn the pumpkin into a cake!', 'zh': '把南瓜变成蛋糕', 'near': 'pumpkin'}],
)
