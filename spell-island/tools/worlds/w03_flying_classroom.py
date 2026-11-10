from common import T, N, Q, S, Z

# 3 ------------------------------------------------------------------ 四上 My classroom (in/on/under)
# A big magic school hall with corners to explore. A naughty wind spell made everything fly about —
# help everyone find their things ("Where is …? It's in / on / under / near the …") and tidy up before class.
# Story lines: Miss White (tidy the classroom, ends with bubbles) · Mike (lost things) · Sarah (art corner)
# · Professor Hoot (reading corner) · John (computer corner).
THINGS = ['blackboard', 'board', 'desk', 'chair', 'door', 'window', 'computer', 'book', 'light', 'picture', 'piano', 'clock', 'bag', 'schoolbag', 'globe', 'easel', 'teacher']

WORLD = dict(id='flying-classroom', order=3, grade='四年级上册', gradeNum=4, unit='Unit · My classroom: Where is it?（教室与方位 in/on/under）', title='The Flying Classroom', titleZh='会飞的教室', scene='classroom',
  bounds=24,
  intro=['我们来到了一间超大的魔法教室！一阵调皮的魔法风把东西吹得到处都是。', '有人问“Where is …?”，就用 in、on、under、near 回答：“It\'s under the desk.” 先去黑板前找 Miss White 吧：“Go to Miss White!”'],
  vocab=['classroom', 'desk', 'chair', 'blackboard', 'schoolbag', 'pencil box', 'book', 'door', 'window', 'light', 'computer', 'picture', 'in', 'on', 'under', 'near'],
  patterns=["Where is the schoolbag? It's under the desk.", "It's in / on / near the …", 'Put the book on the desk.', "What's in the classroom?", 'Open the door. Turn on the light.'],
  spawn={'pos': [0, 0, 16], 'rot': 3.14159},
  zones=[
    Z('entrance', 'Classroom Door', '教室门口', (0, 18), 5),
    Z('stage', 'Blackboard Stage', '黑板讲台', (0, -17), 6),
    Z('desks', 'Desk Rows', '课桌区', (0, -3), 7),
    Z('reading', 'Reading Corner', '读书角', (-15, -12), 6),
    Z('computer', 'Computer Corner', '电脑角', (15, -12), 6),
    Z('art', 'Art Corner', '美术角', (-16, 6), 5),
    Z('music', 'Music Corner', '音乐角', (16, 6), 5),
    Z('window', 'Window Garden', '窗边小花园', (12, 18), 5),
    Z('lost', 'Lost and Found', '失物招领处', (-12, 17), 5),
  ],
  decor=[
    # carpets: a red runner from the door to the blackboard, and a rug for every corner
    {'k': 'path', 'pts': [[0, 22], [0, -14]], 'w': 3, 'color': '#c86a5a'},
    {'k': 'plaza', 'at': [0, -17], 'r': 5.5, 'color': '#d8b88a'},
    {'k': 'plaza', 'at': [-15, -12], 'r': 5, 'color': '#c8b0dc'},
    {'k': 'plaza', 'at': [15, -12], 'r': 5, 'color': '#a8c8e8'},
    {'k': 'plaza', 'at': [-16, 6], 'r': 4.5, 'color': '#f2cc8f'},
    {'k': 'plaza', 'at': [16, 6], 'r': 4.5, 'color': '#b8dcb0'},
    {'k': 'plaza', 'at': [-12, 17], 'r': 4, 'color': '#e8c8c8'},
    {'k': 'path', 'pts': [[0, 10], [-13, 6]], 'w': 2.2, 'color': '#d8a888'}, {'k': 'path', 'pts': [[0, 10], [13, 6]], 'w': 2.2, 'color': '#d8a888'},
    {'k': 'path', 'pts': [[0, -11], [-12, -12]], 'w': 2.2, 'color': '#d8a888'}, {'k': 'path', 'pts': [[0, -11], [12, -12]], 'w': 2.2, 'color': '#d8a888'},
    # reading corner: shelves along the wall
    {'k': 'shelf', 'at': [-21.5, -9], 'rot': 1.5708, 'w': 4, 'h': 3.2}, {'k': 'shelf', 'at': [-17, -18.5], 'rot': 0.5, 'w': 4, 'h': 3.2},
    {'k': 'model', 'm': 'book_pile', 'at': [-19.5, -14.5]}, {'k': 'model', 'm': 'potted_plant', 'at': [-11, -19]},
    # stage
    {'k': 'model', 'm': 'potted_plant', 'at': [8, -20]}, {'k': 'model', 'm': 'globe', 'at': [-12.5, -6], 's': 0.8},
    # more desks and chairs (scenery)
    {'k': 'model', 'm': 'desk', 'at': [-10, -2], 'solid': 0.9}, {'k': 'model', 'm': 'desk', 'at': [10, -2], 'solid': 0.9},
    {'k': 'model', 'm': 'school_chair', 'at': [-10, -0.6], 'rot': 3.14, 'solid': 0.4}, {'k': 'model', 'm': 'school_chair', 'at': [10, -0.6], 'rot': 3.14, 'solid': 0.4},
    {'k': 'model', 'm': 'school_chair', 'at': [-5, 2.4], 'rot': 3.14, 'solid': 0.4},
    # art corner
    {'k': 'model', 'm': 'easel', 'at': [-21, 9], 'rot': 1.2, 'solid': 0.5}, {'k': 'model', 'm': 'painting_frame', 'at': [-20.5, 1.5], 'rot': 1.4, 'solid': 0.6},
    # music corner
    {'k': 'model', 'm': 'drum_set', 'at': [15, 10.5], 'rot': 3.4, 'solid': 0.9}, {'k': 'model', 'm': 'microphone', 'at': [12.5, 3]},
    # computer corner
    {'k': 'model', 'm': 'school_chair', 'at': [16, -12.4], 'rot': 3.14, 'solid': 0.4},
    # window garden
    {'k': 'model', 'm': 'potted_plant', 'at': [16, 21]}, {'k': 'model', 'm': 'potted_plant', 'at': [6.5, 20]}, {'k': 'model', 'm': 'flowers', 'at': [17.5, 16.5]},
    {'k': 'model', 'm': 'bench', 'at': [9, 14.5], 'rot': 0.6, 'solid': 0.9},
    # lost and found
    {'k': 'model', 'm': 'schoolbag', 'at': [-11, 20]}, {'k': 'model', 'm': 'book_pile', 'at': [-8, 20.5]},
  ],
  things=[
    # Classroom Door
    T('door', 'door', 'magic_door', (0, 0, 22.5), '门', aliases=['classroom door'], radius=0.6, can=['open'], params={'h': 3.2}),
    T('poster', 'poster', 'signpost', (-4, 0, 19), '海报', aliases=['sign'], radius=0.3, can=['read'], text='Our classroom is big and clean.\nThere are twenty desks and a big blackboard.\nWe love our classroom!'),
    T('window', 'window', 'none', (8.2, 3, 27.5), '窗户', aliases=['windows'], radius=0, label=True),
    # Blackboard Stage
    T('board', 'blackboard', 'blackboard', (0, 0, -21), '黑板', aliases=['board'], radius=1.0, can=['read'], text='Welcome to Class 4A!\nWhere is it?\nIn, on, under!'),
    T('tdesk', 'teacher desk', 'desk', (4.5, 0, -16), '讲台', aliases=["teacher's desk", 'big desk'], radius=0.9, scale=1.2),
    T('clock', 'clock', 'wall_clock', (-4.5, 3.2, -21.2), '挂钟', aliases=['wall clock'], radius=0),
    T('picture', 'picture', 'painting_frame', (-9, 0, -19), '图画', aliases=['painting'], radius=0.6, can=['fly']),
    # Desk Rows
    T('desk1', 'desk', 'desk', (-5, 0, -7), '课桌', aliases=['table'], radius=0.9, label=True),
    T('desk2', 'desk', 'desk', (5, 0, -7), '课桌', aliases=['table'], radius=0.9, label=False),
    T('desk3', 'desk', 'desk', (-5, 0, 1), '课桌', aliases=['table'], radius=0.9, label=False),
    T('desk4', 'desk', 'desk', (5, 0, 1), '课桌', aliases=['table'], radius=0.9, label=False),
    T('chair1', 'chair', 'school_chair', (5, 0, 2.6), '椅子', aliases=['seat'], rot=3.14, radius=0.4, label=True, can=['fly']),
    T('chair2', 'chair', 'school_chair', (-5, 0, -5.4), '椅子', aliases=['seat'], rot=3.14, radius=0.4, label=False, can=['fly']),
    T('bag', 'schoolbag', 'schoolbag', (-4.8, 0, -7.3), '书包', aliases=['bag', 'school bag', 'backpack'], tags=['blue'], color='blue', radius=0, can=['pick', 'fly']),
    T('pencilbox', 'pencil box', 'pencil_box', (5, 0.95, -7), '铅笔盒', aliases=['pencil case', 'pencil'], radius=0, can=['pick', 'fly']),
    T('book', 'book', 'book_pile', (2.6, 0, -2), '书', aliases=['english book'], radius=0.4, can=['pick', 'fly'], params={'h': 0.5}),
    T('ball', 'football', 'soccer_ball', (5.2, 0, 2.7), '足球', aliases=['ball', 'soccer ball'], radius=0, can=['pick', 'fly']),
    # Reading Corner
    T('lantern', 'lamp', 'lantern', (-11.5, 0, -15.5), '灯', aliases=['lantern', 'light'], radius=0.4, can=['light'], params={'h': 2.2}),
    T('storybooks', 'storybooks', 'book_pile', (-17.5, 0, -9.5), '故事书', aliases=['story books'], radius=0.5, can=['pick', 'fly']),
    T('story_sign', 'story sign', 'signpost', (-11, 0, -8.5), '故事牌', aliases=['sign', 'board'], radius=0.3, can=['read'], text="Where is the cat?\nIt's on the chair.\nWhere is the ball?\nIt's under the chair."),
    # Computer Corner
    T('desk5', 'desk', 'desk', (16, 0, -14), '电脑桌', aliases=['computer desk', 'table'], radius=0.9, label=False),
    T('computer', 'computer', 'computer', (16, 0.95, -14), '电脑', aliases=['pc'], radius=0, can=['light']),
    T('desk6', 'desk', 'desk', (19.5, 0, -8.5), '课桌', aliases=['table'], radius=0.9, label=False),
    T('globe', 'globe', 'globe', (19.5, 0.95, -8.5), '地球仪', aliases=['earth'], radius=0, can=['pick', 'fly']),
    # Art Corner
    T('easel', 'easel', 'easel', (-19, 0, 4), '画架', aliases=['drawing'], radius=0.6, can=['fly']),
    T('crayons', 'crayon box', 'crayon_box', (-17.6, 0, 5.4), '蜡笔盒', aliases=['crayons', 'crayon'], radius=0, can=['pick', 'fly']),
    # Music Corner
    T('piano', 'piano', 'piano', (19.5, 0, 5), '钢琴', radius=1.0, rot=-1.5708, reveal=['ws_near'], revealOn='sing'),
    # Window Garden
    T('chair3', 'blue chair', 'school_chair', (13, 0, 18), '蓝椅子', aliases=['chair'], tags=['blue'], color='blue', radius=0.4, label=False),
    T('cat', 'cat', 'cat', (13, 0.55, 18), '小猫', aliases=['kitty'], tags=['small', 'grey'], color='grey', radius=0, can=['fly', 'pick'], params={'voice': 'animal'},
      chatter=['Meow! I am on the chair!', 'Meow... Where is my ball?'], reveal=['ws_onchair'], revealOn='hop'),
    # Lost and Found
    T('chest', 'lost and found box', 'treasure_chest', (-14, 0, 17), '失物招领箱', aliases=['box', 'chest', 'lost box'], radius=0.6, can=['open', 'fly'], reveal=['ws_where'], revealOn='open'),
  ],
  npcs=[
    N('white', 'Miss White', 'teacher', (-3, 0, -15), 'teacher', 'Miss White, a kind grade-4 English teacher in a big magic classroom; asks "Where is …?" and likes a tidy classroom; very simple English', "Good morning! I'm Miss White. Welcome to our classroom!", '怀特老师', aliases=['teacher', 'miss', 'white'],
      idle=['Thank you! Our classroom is tidy now!', 'Where is the schoolbag? It\'s under the desk.', 'Open the door, please. Turn on the light, please.'],
      chatter=["What's in the classroom? A blackboard, many desks and chairs!", 'Where is my clock? Oh, it\'s near the blackboard.', 'Put the books on the desk, please!']),
    N('mike', 'Mike', 'student', (-10.5, 0, 14.5), 'child', 'Mike, a messy but friendly classmate who always loses things; very simple English', "Hi, I'm Mike! I can't find my things!", '迈克', aliases=['boy', 'mike'],
      idle=['Thank you! My things are in my schoolbag now.', 'Where is my ruler? Oh, it\'s under the desk!'],
      chatter=['Where is my book? Is it on the desk?', 'Where is my ball? Is it under the chair?', 'Oh no! Where is my pencil box?']),
    N('sarah', 'Sarah', 'art_girl', (-14, 0, 8.5), 'child', 'Sarah, a girl who loves drawing in the art corner; very simple English', "Hi! I'm Sarah. I like drawing!", '萨拉', aliases=['girl', 'sarah'],
      idle=['Look at my picture! It\'s colourful!', 'My crayons are near the easel.'],
      chatter=['Where are my crayons? Are they in my bag?', 'I like drawing. Do you like drawing?']),
    N('hoot', 'Professor Hoot', 'owl', (-14.5, 0, -12), 'animal', 'Professor Hoot, a wise old owl who lives in the reading corner and loves storybooks; very simple English', 'Hoo hoo! Welcome to the reading corner! Hoo!', '猫头鹰教授', aliases=['owl', 'hoot', 'professor'],
      idle=['Hoo! Books are my friends!', 'The cat is on the chair. Hoo hoo!'],
      chatter=['Hoo! Where is my book? It\'s on the shelf!', 'In, on, under! Hoo hoo!']),
    N('john', 'John', 'student', (12.5, 0, -9.5), 'child', 'John, a boy who loves computers and maps in the computer corner; very simple English', "Hi! I'm John. Look at the computer!", '约翰', aliases=['boy', 'john'],
      idle=['The globe is on the desk!', 'I like the computer!'],
      chatter=['Where is the globe? It\'s on the desk.', 'The computer is on the desk, near the window.']),
  ],
  quests=[
    # Miss White: tidy the classroom — ends with bubbles
    Q('cr_where', 'speak', '说', 'white', '回答老师：书包在哪里？', 'Where is the schoolbag?', ["Oh dear, the magic wind came! Someone's schoolbag is on the floor. Look at the first desk."], ["It's under the desk."], ["Yes! It's under the desk. Well done!"], prompt='Where is the schoolbag? Look at the desk.', accept=[['under', 'near', 'next to', 'by', 'beside']], tipZh='看看书包在课桌的哪里？用 in / on / under 回答：“It\'s under the desk.”'),
    Q('cr_door', 'magic', '说', 'white', '用咒语打开教室的门', 'Open the door', ["It's hot in here. The door is near the poster. Can you open the door with magic?"], ['Open the door!'], ['Thank you! What a nice breeze!'], prompt='Say: Open the door!', goal='open:door', needs='cr_where'),
    Q('cr_light', 'magic', '说', 'white', '读书角太黑了：把灯打开', 'Turn on the light', ['The reading corner is so dark. Professor Hoot can\'t read! Please turn on the light.'], ['Turn on the light!'], ['Thank you! Now the reading corner is bright!'], prompt='Say: Turn on the light!', goal='light:lantern', needs='cr_door', tipZh='读书角的灯没开。念咒语：“Turn on the light!” 也可以说“Light the lamp!”'),
    Q('cr_what', 'speak', '说', 'white', '回答老师：教室里有什么？', "What's in the classroom?", ['Look around! We have a big classroom.'], ['A blackboard and many desks.', 'Many desks and chairs.'], ['Yes! A blackboard, many desks and chairs. What a nice classroom!'], prompt="What's in the classroom?", accept=[THINGS], needs='cr_light', tipZh='说说教室里有什么，比如：“A blackboard and many desks.”'),
    Q('cr_write', 'write', '写', 'white', '写出单词：老师用粉笔在上面写字', 'Write the word', ['One more! Write a word for me.'], ['blackboard'], ['Excellent! B-L-A-C-K-B-O-A-R-D!'], prompt='I write on it with chalk. It is green or black. Write the word.', accept=[['blackboard', 'board', 'black board']], needs='cr_what'),
    Q('cr_party', 'magic', '说', 'white', '教室整整齐齐啦！变出泡泡庆祝', 'Make bubbles!', ['Hooray! Our classroom is clean and tidy now! Let\'s have a little party. Can you make bubbles?'], ['Make bubbles!'], ['Wow! Bubbles everywhere! Thank you, little wizard! Class can start now!'], prompt='Say: Make bubbles!', goal='bubbles', needs='cr_write'),
    Q('cr_read', 'read', '读', 'poster', '读海报：教室大不大？', 'Read the poster', [], [], ['Right! Our classroom is big and clean.'], passage='Our classroom is big and clean. There are twenty desks and a big blackboard. We love our classroom!', prompt='Is the classroom big?', options=["Yes, it is.", "No, it isn't."], answer=0),
    # Mike: lost things
    Q('cr_put', 'do', '说', 'mike', '帮 Mike 把书放到课桌上', 'Put the book on the desk', ['My book is on the floor, near the desks! Can you put it on the desk, please?'], ['Put the book on the desk.'], ['Thank you! Now my book is on the desk!'], prompt='Say: Put the book on the desk.', goal='put:book:*:on', tipZh='书掉在课桌区的地上。说：“Put the book on the desk.”'),
    Q('cr_listen', 'listen', '听', 'mike', '听 Mike 说，书在哪里？', 'Listen and choose', ['Listen! Where is my storybook?'], [], ["Yes! It's in my schoolbag. Thanks!"], prompt='Where is the book?', audio='My pencil box is on the chair. My ruler is under the desk. And my storybook is in my schoolbag.', options=['On the chair', 'In the schoolbag', 'Under the desk'], answer=1, video='classroom.mp4', needs='cr_put'),
    Q('mike_bag', 'do', '说', 'mike', '把铅笔盒放进书包里', 'Put the pencil box in the schoolbag', ['My pencil box is on the desk. My schoolbag is under the desk. Can you put the pencil box in the schoolbag?'], ['Put the pencil box in the schoolbag.'], ['Great! My pencil box is in my schoolbag. I can\'t lose it now!'], goal='put:pencilbox:bag:in', needs='cr_listen', tipZh='说：“Put the pencil box in the schoolbag.” 注意用 in（在……里面）。'),
    Q('mike_ball', 'speak', '说', 'mike', '告诉 Mike：足球在哪里？', 'Where is my ball?', ['Oh no! Where is my football? Look near the desks!'], ["It's under the chair."], ["Under the chair! There it is! Thank you!"], prompt='Where is my football?', accept=[['under'], ['chair', 'seat']], needs='mike_bag', tipZh='足球在课桌区一把椅子的下面。回答：“It\'s under the chair.”'),
    # Sarah: the art corner
    Q('sarah_crayon', 'speak', '说', 'sarah', '告诉 Sarah：蜡笔盒在哪里？', 'Where is my crayon box?', ['I want to draw a picture, but where is my crayon box? Is it in my bag?'], ["It's near the easel."], ['Near the easel! Yes! Thank you!'], prompt='Where is my crayon box?', accept=[['near', 'next to', 'beside', 'by', 'under']], tipZh='蜡笔盒就在画架旁边。回答：“It\'s near the easel.”'),
    Q('sarah_paint', 'magic', '说', 'sarah', '把画架变成彩虹色', 'Make the easel rainbow', ['My easel is so plain. Can you make it colourful? Make it rainbow!'], ['Make the easel rainbow!'], ['Wow! A rainbow easel! I like it!'], prompt='Say: Make the easel rainbow!', goal='tint:easel:rainbow', needs='sarah_crayon'),
    # Professor Hoot: the reading corner
    Q('hoot_read', 'read', '读', 'story_sign', '大声读出故事牌', 'Read the story sign', [], ["Where is the cat? It's on the chair."], ['Hoo hoo! You read it very well!'], passage="Where is the cat? It's on the chair. Where is the ball? It's under the chair.", readAloud=True, prompt='Read the sign aloud.'),
    Q('hoot_write', 'write', '写', 'hoot', '看窗边的小猫，写出方位词', 'Write the word', ['Hoo! Look at the cat in the Window Garden. Is the cat on the chair or under the chair?'], ['on'], ['Hoo hoo! O-N, on! The cat is on the chair!'], prompt='The cat is ___ the chair. Write the word.', accept=[['on']], tipZh='窗边的小猫坐在椅子上面。写“on”。'),
    Q('hoot_books', 'magic', '说', 'hoot', '会飞的教室：让故事书飞起来', 'Make the storybooks fly', ['Hoo! This is the Flying Classroom! Can you make my storybooks fly?'], ['Make the storybooks fly!'], ['Hoo hoo! Flying books! What fun!'], prompt='Say: Make the storybooks fly!', goal='fly:storybooks', needs='hoot_write'),
    # John: the computer corner
    Q('john_where', 'speak', '说', 'john', '回答 John：地球仪在哪里？', 'Where is the globe?', ['Where is the globe? I can\'t see it! Is it under the desk?'], ["It's on the desk."], ["Oh! It's on the desk. Thank you!"], prompt='Where is the globe?', accept=[['on', 'near'], ['desk', 'table', 'computer']], tipZh='地球仪就在电脑角的桌子上。回答：“It\'s on the desk.”'),
    Q('john_computer', 'magic', '说', 'john', '用咒语打开电脑', 'Turn on the computer', ['Now I want to see a map on the computer. Can you turn on the computer?'], ['Turn on the computer!'], ['Thank you! Look, a map of the world!'], prompt='Say: Turn on the computer!', goal='light:computer', needs='john_where'),
  ],
  words=[
    S('ws_desk', 'desk', '课桌', (-2, -9.5)), S('ws_chair', 'chair', '椅子', (8, 4.5)), S('ws_blackboard', 'blackboard', '黑板', (3, -19.5)),
    S('ws_schoolbag', 'schoolbag', '书包', (-8, -6)), S('ws_pencilbox', 'pencil box', '铅笔盒', (8.5, -8.5)), S('ws_door', 'door', '门', (3.5, 20)),
    S('ws_window', 'window', '窗户', (9.5, 21)), S('ws_light', 'light', '灯', (-9, -16)),
    S('ws_in', 'in', '在……里', (-2.5, 10)), S('ws_on', 'on', '在……上', (2.5, 7)), S('ws_under', 'under', '在……下', (-8.5, 3)), S('ws_nearw', 'near', '在……附近', (-19, 9.5)),
    S('ws_underdesk', "It's under the desk.", '它在课桌下面。', (-2, -4)),
    S('ws_inbag', "It's in the schoolbag.", '它在书包里。', (-7, 11)),
    S('ws_put', 'Put the book on the desk.', '把书放在课桌上。', (2.5, -12)),
    S('ws_where', 'Where is the schoolbag?', '书包在哪里？', (-17, 14.5), hidden=True),
    S('ws_onchair', "It's on the chair.", '它在椅子上。', (10, 18.5), hidden=True),
    S('ws_near', "It's near the window.", '它在窗户附近。', (21, 9), hidden=True),
  ],
  spellIdeas=[{'say': 'Make the book fly!', 'zh': '让书飞起来', 'near': 'book'}, {'say': 'Open the box!', 'zh': '打开失物招领箱（会有秘密哦）', 'near': 'chest'},
    {'say': 'Make the piano sing!', 'zh': '让钢琴唱歌（会有秘密哦）', 'near': 'piano'}, {'say': 'Make the cat jump!', 'zh': '让小猫跳一跳（会有秘密哦）', 'near': 'cat'},
    {'say': 'Make the desk small!', 'zh': '把课桌变小', 'near': 'desk1'}, {'say': 'Light the lamp!', 'zh': '点亮台灯', 'near': 'lantern'}, {'say': 'Make the schoolbag red!', 'zh': '把书包变成红色', 'near': 'bag'},
    {'say': 'Make Mike fly!', 'zh': '让 Mike 飞起来', 'near': 'mike'}, {'say': 'Make the globe spin!', 'zh': '让地球仪转起来', 'near': 'globe'}, {'say': 'Make the clock glow!', 'zh': '让挂钟发光', 'near': 'clock'},
    {'say': 'Make three chairs!', 'zh': '变出三把椅子', 'near': 'chair1'}, {'say': 'Make the blackboard pink!', 'zh': '把黑板变成粉色', 'near': 'board'}, {'say': 'Make the football big!', 'zh': '把足球变大', 'near': 'ball'},
    {'say': 'Make Professor Hoot dance!', 'zh': '让猫头鹰教授跳舞', 'near': 'hoot'}, {'say': 'Turn the cat into a tiger!', 'zh': '把小猫变成老虎', 'near': 'cat'}, {'say': 'Make it night!', 'zh': '让天黑下来'}],
)
