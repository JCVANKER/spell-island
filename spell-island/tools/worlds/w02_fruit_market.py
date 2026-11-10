from common import T, N, Q, S, Z

# 2 ------------------------------------------------------------------ 三下 Fruits: Do you like…?
# Today is the Fruit Festival! A big market of fruit corners around Fruit Plaza. Everybody asks
# "Do you like …?" — answer them, ask them, make fruit with magic and give it away.
# Story lines: Uncle Bob (the festival, ends with fireworks) · Tom (bananas, not lemons) · Momo the monkey
# (apples up in the tree) · Granny Rose (grapes for her fruit salad) · Lily (strawberry juice).
FRUITS = ['apple', 'banana', 'orange', 'pear', 'watermelon', 'grape', 'strawberry', 'peach', 'mango', 'durian', 'lemon', 'fruit']
YESNO = [['yes', 'no', 'i like', 'i do not', 'i love', 'not really', 'of course']]

WORLD = dict(id='fruit-market', order=2, grade='三年级下册', gradeNum=3, unit='Unit · Fruits: Do you like…?（水果）', title='Fruit Market', titleZh='水果魔法集市', scene='market',
  bounds=50,
  intro=['今天是水果魔法集市的水果节！苹果园、香蕉角、葡萄园、西瓜地……大家都在问：“Do you like …?”', '喜欢就说“Yes, I do.”，不喜欢就说“No, I don\'t.” 先去广场找卖水果的 Uncle Bob 吧：“Go to Uncle Bob!”'],
  vocab=['fruit', 'apple', 'banana', 'orange', 'pear', 'watermelon', 'grapes', 'strawberry', 'like', 'big', 'small'],
  patterns=["Do you like pears? Yes, I do. / No, I don't.", 'I like bananas.', "I don't like oranges.", 'Can I have some grapes, please? Here you are.', 'Make it rain apples!'],
  spawn={'pos': [0, 0, 42], 'rot': 3.14159},
  zones=[
    Z('gate', 'Market Gate', '集市大门', (0, 38), 8),
    Z('plaza', 'Fruit Plaza', '水果广场', (0, 6), 10),
    Z('banana', 'Banana Corner', '香蕉角', (30, 8), 9),
    Z('orchard', 'Apple Orchard', '苹果园', (26, -20), 11),
    Z('juice', 'Juice Bar', '果汁吧', (22, 30), 9),
    Z('grape', 'Grape Garden', '葡萄园', (-26, -20), 11),
    Z('melon', 'Watermelon Patch', '西瓜地', (-30, 8), 10),
    Z('picnic', 'Picnic Lawn', '野餐草坪', (-22, 32), 9),
    Z('hill', 'Strawberry Hill', '草莓山坡', (0, -32), 10),
  ],
  decor=[
    # paths and plazas
    {'k': 'path', 'pts': [[0, 48], [0, 6]], 'w': 4},
    {'k': 'plaza', 'at': [0, 6], 'r': 9, 'color': '#e3cfa0'},
    {'k': 'path', 'pts': [[0, 6], [0, -27]], 'w': 3.2},
    {'k': 'plaza', 'at': [0, -31], 'r': 6, 'color': '#e8d9b0'},
    {'k': 'path', 'pts': [[0, 6], [20, 6], [27, 8]], 'w': 3.2},
    {'k': 'path', 'pts': [[27, 8], [26, -12]], 'w': 3},
    {'k': 'path', 'pts': [[0, 6], [-20, 6], [-27, 8]], 'w': 3.2},
    {'k': 'path', 'pts': [[-27, 8], [-26, -12]], 'w': 3},
    {'k': 'path', 'pts': [[0, 26], [17, 28]], 'w': 2.8},
    {'k': 'path', 'pts': [[0, 26], [-17, 31]], 'w': 2.8},
    {'k': 'path', 'pts': [[0, -28], [19, -21]], 'w': 2.6},
    {'k': 'path', 'pts': [[0, -28], [-19, -21]], 'w': 2.6},
    # market gate
    {'k': 'model', 'm': 'lantern', 'at': [-4, 40]}, {'k': 'model', 'm': 'lantern', 'at': [4, 40]},
    {'k': 'model', 'm': 'flower_bed', 'at': [-6, 32], 'rot': 1.57}, {'k': 'model', 'm': 'flower_bed', 'at': [6, 32], 'rot': 1.57},
    {'k': 'fence', 'from': [-18, 42], 'to': [-5, 42]}, {'k': 'fence', 'from': [5, 42], 'to': [18, 42]},
    # market houses and extra stalls around the plaza
    {'k': 'house', 'at': [-14, 18], 'rot': 0.8, 'w': 5, 'h': 3.6, 'wall': '#f6e0c2', 'roof': '#c8553d'},
    {'k': 'house', 'at': [14, 18], 'rot': -0.8, 'w': 5, 'h': 3.8, 'wall': '#e8d0e8', 'roof': '#4f7fb8'},
    {'k': 'house', 'at': [-14, -8], 'rot': 2.3, 'w': 5, 'h': 3.4, 'wall': '#d8ecd0', 'roof': '#5f9f4e'},
    {'k': 'house', 'at': [14, -8], 'rot': -2.3, 'w': 5, 'h': 3.6, 'wall': '#f4d8c8', 'roof': '#d9a23a'},
    {'k': 'model', 'm': 'stall_fruit', 'at': [8, -2], 'rot': -0.7, 'solid': 1.8},
    {'k': 'model', 'm': 'stall_fruit', 'at': [-8, 12], 'rot': 2.4, 'solid': 1.8},
    {'k': 'model', 'm': 'bench', 'at': [-5, -3], 'rot': 0.6, 'solid': 0.9}, {'k': 'model', 'm': 'bench', 'at': [6, 14], 'rot': -2.5, 'solid': 0.9},
    {'k': 'lamp', 'at': [-3, 22]}, {'k': 'lamp', 'at': [3, 22]}, {'k': 'lamp', 'at': [-3, -16]}, {'k': 'lamp', 'at': [3, -16]},
    # banana corner
    {'k': 'tree', 'at': [37, 3], 's': 1.2}, {'k': 'tree', 'at': [36, 16], 's': 1.1},
    {'k': 'model', 'm': 'bench', 'at': [25, 13], 'rot': 3.14, 'solid': 0.9},
    {'k': 'model', 'm': 'bush', 'at': [22, 1]}, {'k': 'model', 'm': 'bush', 'at': [34, -2]},
    # apple orchard
    {'k': 'model', 'm': 'fruit_tree', 'at': [19, -27], 'solid': 1.0}, {'k': 'model', 'm': 'fruit_tree', 'at': [34, -28], 'solid': 1.0},
    {'k': 'model', 'm': 'fruit_tree', 'at': [36, -19], 'solid': 1.0}, {'k': 'model', 'm': 'fruit_tree', 'at': [20, -13], 'solid': 1.0},
    {'k': 'fence', 'from': [16, -10], 'to': [22, -10]}, {'k': 'fence', 'from': [30, -10], 'to': [38, -10]},
    {'k': 'meadow', 'at': [27, -21], 'r': 9, 'n': 50},
    # juice bar
    {'k': 'model', 'm': 'bench', 'at': [17, 34], 'rot': 1.57, 'solid': 0.9}, {'k': 'model', 'm': 'flower_bed', 'at': [14, 25], 'rot': 0.3},
    {'k': 'model', 'm': 'potted_plant', 'at': [29, 35]}, {'k': 'tree', 'at': [31, 37], 's': 1.1},
    # grape garden
    {'k': 'model', 'm': 'berry_bush', 'at': [-20, -25], 'solid': 0.7}, {'k': 'model', 'm': 'berry_bush', 'at': [-27, -28], 'solid': 0.7},
    {'k': 'model', 'm': 'berry_bush', 'at': [-34, -19], 'solid': 0.7}, {'k': 'model', 'm': 'berry_bush', 'at': [-21, -13], 'solid': 0.7},
    {'k': 'model', 'm': 'berry_bush', 'at': [-31, -11], 'solid': 0.7},
    {'k': 'grove', 'at': [-36, -34], 'r': 6, 'n': 6, 'kind': 'mix'},
    # watermelon patch
    {'k': 'model', 'm': 'watermelon', 'at': [-33, 3]}, {'k': 'model', 'm': 'watermelon', 'at': [-31, 13]}, {'k': 'model', 'm': 'watermelon', 'at': [-24, 12]},
    {'k': 'model', 'm': 'watermelon', 'at': [-36, 7]}, {'k': 'meadow', 'at': [-31, 8], 'r': 8, 'n': 40},
    {'k': 'fence', 'from': [-40, 0], 'to': [-40, 16]}, {'k': 'fence', 'from': [-40, 16], 'to': [-30, 18]},
    # picnic lawn
    {'k': 'meadow', 'at': [-22, 32], 'r': 8, 'n': 60},
    {'k': 'tree', 'at': [-30, 38], 's': 1.3}, {'k': 'tree', 'at': [-14, 38], 's': 1.0},
    {'k': 'model', 'm': 'bench', 'at': [-17, 36], 'rot': -1.2, 'solid': 0.9},
    # strawberry hill
    {'k': 'model', 'm': 'flower_bed', 'at': [-8, -26], 'rot': 0.5}, {'k': 'model', 'm': 'flower_bed', 'at': [8, -34], 'rot': -0.5},
    {'k': 'meadow', 'at': [0, -36], 'r': 8, 'n': 60},
    {'k': 'mountain', 'at': [0, -50], 'r': 12, 'h': 7, 'color': '#9cb87a'},
    {'k': 'grove', 'at': [18, -40], 'r': 7, 'n': 7, 'kind': 'tree'}, {'k': 'grove', 'at': [-18, -40], 'r': 7, 'n': 7, 'kind': 'pine'},
    # edges
    {'k': 'grove', 'at': [42, 22], 'r': 6, 'n': 6, 'kind': 'mix'}, {'k': 'grove', 'at': [-44, 24], 'r': 6, 'n': 6, 'kind': 'mix'},
    {'k': 'pine', 'at': [44, -6], 's': 1.3}, {'k': 'pine', 'at': [-44, -6], 's': 1.3},
  ],
  things=[
    # Market Gate
    T('sign_welcome', 'welcome sign', 'signpost', (-3.5, 0, 35), '欢迎牌', aliases=['sign', 'board'], radius=0.4, can=['read'], text='Welcome to the Fruit Festival!\nDo you like fruit?\nCome and see!'),
    T('balloon', 'balloon', 'hot_air_balloon', (13, 0, 37), '热气球', aliases=['hot air balloon'], radius=2.0, can=['fly'], params={'h': 4.5}),
    # Fruit Plaza
    T('fountain', 'fountain', 'fountain', (0, 0, 6), '喷泉', radius=1.8, can=['light']),
    T('stall', 'fruit stall', 'stall_fruit', (-7, 0, 1), '水果摊', aliases=['stall', 'shop', 'uncle bob\'s stall'], rot=0.6, radius=2.2),
    T('price', 'price board', 'signpost', (6, 0, 2), '价格牌', aliases=['board', 'sign', 'price'], radius=0.4, can=['read'], text='Apples: 2 yuan\nBananas: 3 yuan\nWatermelons: 10 yuan'),
    T('lamp1', 'lamp', 'lamp_post', (5, 0, 11), '路灯', aliases=['light', 'lamp post'], radius=0.3, can=['light']),
    # Banana Corner
    T('bananas', 'banana bunch', 'banana_bunch', (33, 0, 11), '一串香蕉', aliases=['bananas'], tags=['yellow'], color='yellow', radius=0.4, can=['pick', 'fly', 'eat']),
    T('lemon', 'lemon', 'food:lemon', (31.5, 0, 2.5), '柠檬', tags=['yellow', 'small'], color='yellow', radius=0, scale=2.2, can=['pick', 'fly', 'eat']),
    # Apple Orchard
    T('apple_tree', 'apple tree', 'fruit_tree', (27, 0, -23), '苹果树', aliases=['tree', 'fruit tree'], radius=1.2, can=['grow'], reveal=['ws_apple'], revealOn='shake'),
    T('apple_box', 'apple box', 'apple_crate', (30, 0, -16), '一箱苹果', aliases=['box', 'crate', 'apple crate'], tags=['red'], radius=0.6, can=['pick', 'fly']),
    # Juice Bar
    T('juice_stand', 'juice stand', 'juice_stand', (25, 0, 33), '果汁摊', aliases=['juice bar', 'juice shop', 'stand'], rot=-0.6, radius=1.6),
    T('orange_box', 'orange box', 'orange_crate', (28.5, 0, 28), '一箱橙子', aliases=['crate', 'orange crate'], radius=0.6, can=['pick', 'fly']),
    # Grape Garden
    T('grapes', 'grapes', 'grapes', (-23, 0, -18), '葡萄', tags=['purple'], color='purple', radius=0.3, can=['pick', 'fly', 'eat']),
    T('parrot', 'parrot', 'parrot', (-29.5, 0, -14), '鹦鹉', aliases=['bird', 'polly'], radius=0.4, can=['fly'], params={'voice': 'animal'},
      chatter=['Do you like grapes? Do you like grapes?', 'Yes, I do! Yes, I do!', 'Grapes, grapes! I like grapes!']),
    T('chest', 'treasure chest', 'treasure_chest', (-31, 0, -26), '宝箱', aliases=['chest', 'box', 'treasure'], radius=0.6, can=['open', 'fly'], reveal=['ws_have'], revealOn='open'),
    # Watermelon Patch
    T('watermelon', 'watermelon', 'watermelon', (-27, 0, 5), '西瓜', tags=['big', 'green'], color='green', radius=0.5, can=['pick', 'fly', 'eat']),
    T('scarecrow', 'scarecrow', 'scarecrow', (-35, 0, 12), '稻草人', radius=0.5, can=['fly'], reveal=['ws_dont'], revealOn='dance'),
    # Picnic Lawn
    T('picnic_table', 'picnic table', 'picnic_table', (-22, 0, 34), '野餐桌', aliases=['table'], radius=1.4),
    T('basket', 'fruit basket', 'fruit_basket', (-18.5, 0, 30.5), '水果篮', aliases=['basket'], radius=0.5, can=['pick', 'fly']),
    T('pear', 'pear', 'food:pear', (-25.5, 0, 30), '梨', tags=['yellow'], radius=0, scale=2.2, can=['pick', 'fly', 'eat']),
    T('rabbit', 'rabbit', 'rabbit', (-27, 0, 34), '兔子', aliases=['bunny'], tags=['white', 'small'], color='white', radius=0.4, can=['fly', 'pick'], params={'voice': 'animal'},
      chatter=['Hello! Do you like carrots? I do!', 'I don\'t like lemons. I like pears!']),
    # Strawberry Hill
    T('strawberries', 'strawberry basket', 'strawberry_basket', (-4, 0, -33), '一篮草莓', aliases=['strawberries', 'basket of strawberries'], tags=['red'], radius=0.4, can=['pick', 'fly', 'eat']),
    T('recipe', 'recipe sign', 'signpost', (5, 0, -35), '水果沙拉菜谱', aliases=['sign', 'recipe', 'board'], radius=0.4, can=['read'], text="Granny's Fruit Salad\nApples, pears and grapes.\nI like fruit salad!"),
    T('lamp2', 'lantern', 'lantern', (7.5, 0, -27), '灯笼', aliases=['lamp', 'light'], radius=0.4, can=['light'], params={'h': 2.2}),
  ],
  npcs=[
    N('bob', 'Uncle Bob', 'fruit_seller', (-4, 0, 6.5), 'man', 'Uncle Bob, a jolly fruit seller who runs the Fruit Festival; very simple grade-3 English about fruits; often asks "Do you like …?"', 'Fresh fruit! Fresh fruit! Hello, little wizard! Do you like fruit?', '水果叔叔', aliases=['uncle', 'bob', 'fruit seller', 'seller', 'man'],
      idle=['Fruit is good for you!', 'Do you like apples? I like apples!', 'Here you are! Have some fruit!'],
      chatter=['Apples! Bananas! Pears! Do you like pears?', 'Fresh fruit! I like watermelons. They are big!', 'Can I help you? Here you are!']),
    N('tom', 'Tom', 'student', (28, 0, 5), 'child', 'Tom, a friendly boy who loves bananas and does not like oranges or lemons; very simple English', "Hi! I'm Tom! I like bananas!", '汤姆', aliases=['boy', 'tom'],
      idle=['I like bananas. Yummy!', "I don't like lemons. They are sour!"],
      chatter=['Bananas, bananas! I like bananas!', "I don't like oranges. Do you like oranges?", 'Do you like bananas? I do!']),
    N('momo', 'Momo', 'monkey', (23, 0, -19), 'animal', 'Momo, a hungry little monkey in the apple orchard who loves apples and bananas; very simple English', 'Ooh ooh! Apples! I like apples!', '小猴 Momo', aliases=['monkey', 'momo'], tags=['brown'], color='brown',
      idle=['Ooh ooh! Apples, apples! Yummy!', 'I like apples. I like bananas, too!'],
      chatter=['Ooh ooh! Do you like apples?', 'The apples are so high! Ooh ooh!']),
    N('granny', 'Granny Rose', 'granny', (3, 0, -29.5), 'granny', 'Granny Rose, a kind old lady making a fruit salad for the festival; very simple, slow English', "Hello, dear! I'm Granny Rose. Do you like fruit salad?", '罗丝奶奶', aliases=['granny', 'grandma', 'rose', 'old lady'],
      idle=['Thank you, dear!', 'I like grapes. I like pears, too.'],
      chatter=['Can I have some grapes, please?', 'Strawberries are red and sweet. Do you like strawberries?', 'I like fruit salad. Yummy!']),
    N('lily', 'Lily', 'shopper_girl', (20.5, 0, 29), 'child', 'Lily, a cheerful girl who sells fruit juice at the Juice Bar; loves strawberries; very simple English', "Hi! I'm Lily. Juice! Fruit juice! Do you like juice?", '莉莉', aliases=['girl', 'lily'],
      idle=['Strawberry juice is yummy!', 'Here you are! Have some juice!'],
      chatter=['Orange juice! Apple juice! Do you like orange juice?', 'I like strawberries. They are red!', 'Yes, I do! I like juice!']),
  ],
  quests=[
    # Uncle Bob: the festival — ends with fireworks
    Q('fm_what', 'speak', '说', 'bob', '告诉 Uncle Bob 你喜欢什么水果', 'What fruit do you like?', ['Welcome to the Fruit Festival! I have apples, bananas, pears and grapes.'], ['I like bananas.', 'I like apples.'], ['Good choice! Here you are!'], prompt='What fruit do you like?', accept=[['like', 'love', 'want'], FRUITS], tipZh='Uncle Bob 问你喜欢什么水果。说：“I like …”，比如“I like bananas.”'),
    Q('fm_write', 'write', '写', 'bob', '写出水果：又大又绿，里面是红的', 'Write the fruit', ['Can you write the name of my biggest fruit?'], ['watermelon'], ['Wonderful! W-A-T-E-R-M-E-L-O-N!'], prompt='It is big and green. It is red inside. Write the fruit.', accept=[['watermelon', 'water melon']], needs='fm_what'),
    Q('bob_big', 'magic', '说', 'bob', '去西瓜地：把西瓜变大，参加水果节', 'Make the watermelon big', ['The festival needs a super big watermelon! Go to the Watermelon Patch. Can you make the watermelon big?'], ['Make the watermelon big!'], ['Wow! What a big watermelon! I like watermelons!'], prompt='Say: Make the watermelon big!', goal='big:watermelon', needs='fm_write', tipZh='西瓜在西边的西瓜地。念咒语：“Make the watermelon big!”'),
    Q('bob_party', 'magic', '说', 'bob', '水果节开始啦！放烟花庆祝', 'Fireworks!', ['Thank you, little wizard! The Fruit Festival can start now. Fireworks, please!'], ['Fireworks!'], ['Hooray! Happy Fruit Festival! Do you like fireworks? I do!'], prompt='Say: Fireworks!', goal='fireworks', needs='bob_big'),
    Q('fm_read', 'read', '读', 'price', '看价格牌：香蕉多少钱？', 'How much are the bananas?', [], [], ['Right! Bananas are three yuan.'], passage='Apples: 2 yuan\nBananas: 3 yuan\nWatermelons: 10 yuan', prompt='How much are the bananas?', options=['Two yuan', 'Three yuan', 'Ten yuan'], answer=1),
    # Tom: bananas yes, lemons no
    Q('fm_like', 'speak', '说', 'tom', '回答 Tom：你喜欢苹果吗？', 'Do you like apples?', ["Hi! I'm Tom. I like bananas. I have a question!"], ['Yes, I do.', "No, I don't."], ['Cool! I like apples, too!'], prompt='Do you like apples?', accept=YESNO, tipZh='Tom 问你喜不喜欢苹果。喜欢就说“Yes, I do.”，不喜欢就说“No, I don\'t.”'),
    Q('fm_listen', 'listen', '听', 'tom', '听 Tom 说，选出他不喜欢的水果', 'Listen and choose', ['Listen to me! What fruit do I not like?'], [], ["Yes! I don't like oranges. They are sour!"], prompt="What doesn't Tom like?", audio="Hi! I'm Tom. I like bananas. I like pears, too. But I don't like oranges.", options=['Bananas', 'Pears', 'Oranges'], answer=2, video='fruit.mp4', needs='fm_like'),
    Q('tom_banana', 'do', '说', 'tom', 'Tom 饿了：变一根香蕉给他', 'A banana for Tom', ["I'm hungry! I like bananas. Can I have a banana, please?"], ['Make a banana!', 'Give the banana to Tom.'], ['Thank you! Yummy! I like bananas!'], goal='give:*:tom', needs='fm_listen', tipZh='先变一根香蕉：“Make a banana!” 再送给他：“Give the banana to Tom!”'),
    Q('tom_lemon', 'magic', '说', 'tom', 'Tom 不喜欢柠檬：把柠檬变成香蕉', 'Turn the lemon into a banana', ["Look at this lemon. It's so sour! I don't like lemons. Can you turn it into a banana?"], ['Turn the lemon into a banana!'], ['Ha ha! A banana! Thank you! I like bananas!'], prompt='Say: Turn the lemon into a banana!', goal='into:lemon:banana', needs='tom_banana', tipZh='柠檬就在 Tom 旁边。念咒语：“Turn the lemon into a banana!”'),
    # Momo the monkey: apples up in the tree
    Q('fm_rain', 'magic', '说', 'momo', '帮小猴：让苹果从天上掉下来', 'Make it rain apples', ['Ooh ooh! I like apples! But the apples are too high!'], ['Make it rain apples!'], ['Apples, apples! Thank you! Ooh ooh!'], prompt='Say: Make it rain apples!', goal='fruit_rain:apple', tipZh='念咒语让苹果掉下来：“Make it rain apples!”'),
    Q('momo_like', 'speak', '说', 'momo', '回答小猴：你喜欢香蕉吗？', 'Do you like bananas?', ['Ooh ooh! I like apples. I like bananas, too!'], ['Yes, I do.', "No, I don't."], ['Ooh ooh! Bananas are yummy!'], prompt='Do you like bananas?', accept=YESNO, needs='fm_rain', tipZh='小猴问你喜不喜欢香蕉。回答：“Yes, I do.” 或者 “No, I don\'t.”'),
    Q('momo_shake', 'magic', '说', 'momo', '树上还有苹果：让苹果树摇一摇', 'Make the apple tree shake', ['Look! More apples up in the tree! Can you make the apple tree shake?'], ['Make the apple tree shake!'], ['Ooh ooh! Apples! And look, a word star!'], prompt='Say: Make the apple tree shake!', goal='shake:apple_tree', needs='momo_like', tipZh='让苹果树摇一摇，会掉下一个秘密哦：“Make the apple tree shake!”'),
    # Granny Rose: grapes for the fruit salad
    Q('granny_listen', 'listen', '听', 'granny', '听罗丝奶奶的购物清单，选出她要买的水果', 'Granny\'s shopping list', ['Listen to my shopping list, dear. What fruit do I want?'], [], ['Yes! Grapes and pears for my fruit salad.'], prompt='What does Granny want?', audio="Hello, Uncle Bob! Can I have some grapes, please? And some pears, too. I don't like bananas.", options=['Grapes and pears', 'Apples and oranges', 'Bananas and strawberries'], answer=0),
    Q('granny_grapes', 'do', '说', 'granny', '把葡萄送给罗丝奶奶', 'Grapes for Granny', ['I like grapes. Can I have some grapes, please? The grapes are in the Grape Garden.'], ['Give the grapes to Granny.'], ['Thank you, dear! I like grapes. Here you are, a strawberry for you!'], goal='give:*:granny', needs='granny_listen', tipZh='葡萄在西北边的葡萄园。说：“Give the grapes to Granny!” 也可以先变一串：“Make some grapes!”'),
    Q('granny_read', 'read', '读', 'recipe', '大声读出奶奶的水果沙拉菜谱', 'Read the recipe', [], ['Apples, pears and grapes. I like fruit salad!'], ['You read it! Apples, pears and grapes. Yummy!'], passage='Apples, pears and grapes. I like fruit salad!', readAloud=True, prompt='Read the sign aloud.'),
    # Lily: strawberry juice
    Q('lily_ask', 'speak', '说', 'lily', '问问 Lily：你喜欢……吗？', 'Ask Lily a question', ["Hi! I'm Lily. Now you ask me! Ask: Do you like …?"], ['Do you like pears?', 'Do you like strawberries?'], ['Yes, I do! I like all fruit! I like strawberries best.'], prompt='Ask Lily: Do you like …?', accept=[['do you like', 'you like'], FRUITS], tipZh='这次你来提问！说：“Do you like …?” 比如“Do you like pears?”'),
    Q('lily_write', 'write', '写', 'lily', '写出水果：p _ _ r', 'Write the fruit', ["Let's play a spelling game!"], ['pear'], ['P-E-A-R! Pear! Great!'], prompt='It is green or yellow. It is not an apple. p _ _ r. Write the fruit.', accept=[['pear']], needs='lily_ask'),
    Q('lily_juice', 'do', '说', 'lily', '变一个草莓送给 Lily 做果汁', 'A strawberry for Lily', ['I want to make strawberry juice. Can I have a strawberry, please?'], ['Make a strawberry!', 'Give the strawberry to Lily.'], ['Thank you! Strawberry juice! Do you like strawberry juice? Here you are!'], goal='give:*:lily', needs='lily_write', tipZh='先变一个草莓：“Make a strawberry!” 再送给她：“Give the strawberry to Lily!”'),
  ],
  words=[
    S('ws_banana', 'banana', '香蕉', (32, 15)), S('ws_apple', 'apple', '苹果', (24, -26), hidden=True), S('ws_orange', 'orange', '橙子', (30, 24)),
    S('ws_pear', 'pear', '梨', (-27, 38)), S('ws_watermelon', 'watermelon', '西瓜', (-23, 2)), S('ws_grapes', 'grapes', '葡萄', (-20, -21)),
    S('ws_strawberry', 'strawberry', '草莓', (-8, -30)), S('ws_fruit', 'fruit', '水果', (2.5, 15)), S('ws_like', 'like', '喜欢', (14, 6)),
    S('ws_here', 'Here you are.', '给你。', (-11, 6)),
    S('ws_doyou', 'Do you like pears?', '你喜欢梨吗？', (0, 25)),
    S('ws_yes', 'Yes, I do.', '是的，我喜欢。', (-12, 29)),
    S('ws_no', "No, I don't.", '不，我不喜欢。', (10, -25)),
    S('ws_ilike', 'I like bananas.', '我喜欢香蕉。', (25, 0)),
    S('ws_dont', "I don't like oranges.", '我不喜欢橙子。', (-37, 17), hidden=True),
    S('ws_have', 'Can I have some grapes, please?', '请给我一些葡萄好吗？', (-34, -29), hidden=True),
  ],
  spellIdeas=[{'say': 'Make the apple tree shake!', 'zh': '让苹果树摇一摇（会有秘密哦）', 'near': 'apple_tree'}, {'say': 'Open the chest!', 'zh': '打开宝箱', 'near': 'chest'},
    {'say': 'Make the scarecrow dance!', 'zh': '让稻草人跳舞（会有秘密哦）', 'near': 'scarecrow'}, {'say': 'Make the watermelon giant!', 'zh': '把西瓜变得超级大', 'near': 'watermelon'},
    {'say': 'Make it rain bananas!', 'zh': '让天上掉香蕉'}, {'say': 'Make three pears!', 'zh': '变出三个梨', 'near': 'pear'}, {'say': 'Make the balloon fly!', 'zh': '让热气球飞起来', 'near': 'balloon'},
    {'say': 'Make the parrot sing!', 'zh': '让鹦鹉唱歌', 'near': 'parrot'}, {'say': 'Turn the rabbit into a pear!', 'zh': '把兔子变成梨', 'near': 'rabbit'},
    {'say': 'Make the grapes big!', 'zh': '把葡萄变大', 'near': 'grapes'}, {'say': 'Make the fountain rainbow!', 'zh': '把喷泉变成彩虹色', 'near': 'fountain'},
    {'say': 'Make Momo dance!', 'zh': '让小猴跳舞', 'near': 'momo'}, {'say': 'Make Tom happy!', 'zh': '让 Tom 开心', 'near': 'tom'}, {'say': 'Light the lantern!', 'zh': '点亮灯笼', 'near': 'lamp2'},
    {'say': 'Make a durian!', 'zh': '变一个榴莲'}, {'say': 'Make it night!', 'zh': '让天黑下来'}],
)
