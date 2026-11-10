from common import T, N, Q, S, Z

# 7 ------------------------------------------------------------------ 六上 How can I get there? / Ways to go
# A grid town: Main Avenue runs north from the bus stop, crossed by First Street and Second Street. People keep
# getting lost, so the little wizard gives directions (go straight, turn left / right at the … crossing, next to…),
# walks them there, and talks about ways to go (by bus, by bike, on foot) and traffic lights.
WORLD = dict(id='lost-town', order=7, grade='六年级上册', gradeNum=6, unit='Unit · How can I get there? / Ways to go（问路与出行）', title='Lost & Found Town', titleZh='迷路小镇', scene='town',
  bounds=52,
  intro=['这是迷路小镇：一条大街往北走，有两个路口，路边有医院、电影院、书店、邮局、科学博物馆和学校。', '好多人迷路了！用 go straight、turn left、turn right 给他们指路。先和公交站的乔爷爷打个招呼：“Talk to Grandpa Joe!”'],
  vocab=['science museum', 'post office', 'hospital', 'cinema', 'bookstore', 'school', 'crossing', 'go straight', 'turn left', 'turn right', 'next to', 'near', 'behind', 'by bus', 'by bike', 'by taxi', 'on foot', 'traffic light', 'stop', 'wait'],
  patterns=['Excuse me, where is the cinema?', 'Turn right at the first crossing.', "It's next to the post office.", 'How do you come to school? I come on foot.', 'Stop and wait at a red light.'],
  spawn={'pos': [0, 0, 44], 'rot': 3.14159},
  zones=[
    Z('busstop', 'Bus Stop', '公交站', (2, 38), 6),
    Z('home', 'Maple Road', '枫叶路', (-24, 34), 9),
    Z('taxi', 'Taxi Corner', '出租车角', (18, 34), 8),
    Z('first', 'First Crossing', '第一个路口', (0, 24), 5),
    Z('shops', 'Cinema Street', '电影院街', (16, 11), 8),
    Z('second', 'Second Crossing', '第二个路口', (0, 0), 5),
    Z('museum', 'Museum Square', '博物馆广场', (-28, -7), 9),
    Z('school', 'Sunny School', '阳光小学', (18, -11), 8),
    Z('park', 'Town Park', '小镇公园', (0, -33), 10),
  ],
  decor=[
    # roads: Main Avenue (north-south) + First Street and Second Street (east-west)
    {'k': 'path', 'pts': [[0, 54], [0, -25]], 'w': 6, 'color': '#a3a19c'},
    {'k': 'path', 'pts': [[-44, 24], [42, 24]], 'w': 5, 'color': '#a3a19c'},
    {'k': 'path', 'pts': [[-46, 0], [42, 0]], 'w': 5, 'color': '#a3a19c'},
    {'k': 'path', 'pts': [[0, -25], [0, -30]], 'w': 3},
    {'k': 'plaza', 'at': [0, -34], 'r': 9, 'color': '#e8d6a8'},
    {'k': 'plaza', 'at': [-28, -4], 'r': 6, 'color': '#e2d8c4'},
    # Maple Road houses (Amy's home)
    {'k': 'house', 'at': [-21, 38], 'rot': 3.14159, 'w': 5, 'h': 3.6, 'wall': '#f6e0c2', 'roof': '#c8553d'},
    {'k': 'house', 'at': [-32, 37], 'rot': 3.14159, 'w': 5, 'h': 3.4, 'wall': '#d8ecd0', 'roof': '#5f9f4e'},
    {'k': 'house', 'at': [-40, 31], 'rot': 1.5708, 'w': 4.6, 'h': 3.4, 'wall': '#e8d0e8', 'roof': '#4f7fb8'},
    {'k': 'fence', 'from': [-26, 32], 'to': [-35, 32]},
    # other houses around town
    {'k': 'house', 'at': [-31, 15], 'rot': 0, 'w': 5, 'h': 3.6, 'wall': '#f4d8c8', 'roof': '#d9a23a'},
    {'k': 'house', 'at': [32, 7], 'rot': 3.14159, 'w': 5, 'h': 3.6, 'wall': '#f6e0c2', 'roof': '#7f6fa8'},
    {'k': 'house', 'at': [33, -12], 'rot': -1.5708, 'w': 4.6, 'h': 3.4, 'wall': '#d8e8f6', 'roof': '#c8553d'},
    {'k': 'house', 'at': [32, 17], 'rot': 0, 'w': 4.6, 'h': 3.4, 'wall': '#e8f0d0', 'roof': '#4f7fb8'},
    # traffic light at the First Crossing, street lamps, trees
    {'k': 'model', 'm': 'traffic_light', 'at': [-4, 28], 'rot': 0, 'solid': 0.4},
    {'k': 'lamp', 'at': [-4, 16]}, {'k': 'lamp', 'at': [4, 10]}, {'k': 'lamp', 'at': [-4, -12]}, {'k': 'lamp', 'at': [4, -18]},
    {'k': 'lamp', 'at': [-14, 28]}, {'k': 'lamp', 'at': [12, 28]}, {'k': 'lamp', 'at': [-36, 4]}, {'k': 'lamp', 'at': [26, 4]},
    {'k': 'tree', 'at': [-8, 12], 's': 1.1}, {'k': 'tree', 'at': [8, 13], 's': 1.1}, {'k': 'tree', 'at': [-8, -15], 's': 1.0},
    {'k': 'tree', 'at': [-16, -20], 's': 1.4}, {'k': 'tree', 'at': [9, -14], 's': 1.0}, {'k': 'tree', 'at': [-24, 21], 's': 1.0},
    {'k': 'tree', 'at': [26, 30], 's': 1.1}, {'k': 'tree', 'at': [-38, -16], 's': 1.2}, {'k': 'tree', 'at': [28, -24], 's': 1.2},
    {'k': 'model', 'm': 'bush', 'at': [-8, 34]}, {'k': 'model', 'm': 'bush', 'at': [8, 30]}, {'k': 'model', 'm': 'bush', 'at': [-20, -2]},
    # Town Park
    {'k': 'grove', 'at': [-19, -34], 'r': 4, 'n': 4, 'kind': 'tree', 's': 1.1}, {'k': 'grove', 'at': [19, -35], 'r': 4, 'n': 4, 'kind': 'tree', 's': 1.1},
    {'k': 'model', 'm': 'bench', 'at': [-7, -37], 'rot': 1.2, 'solid': 0.9}, {'k': 'model', 'm': 'bench', 'at': [7, -30], 'rot': -1.57, 'solid': 0.9},
    {'k': 'model', 'm': 'flower_bed', 'at': [-6, -27], 'rot': 0}, {'k': 'model', 'm': 'flower_bed', 'at': [0, -42], 'rot': 0},
    {'k': 'meadow', 'at': [0, -36], 'r': 8, 'n': 60},
    # edges of town
    {'k': 'grove', 'at': [0, 62], 'r': 10, 'n': 8, 'kind': 'mix', 's': 1.2},
    {'k': 'grove', 'at': [-2, -54], 'r': 12, 'n': 8, 'kind': 'pine', 's': 1.3},
    {'k': 'pine', 'at': [-48, 12], 's': 1.3}, {'k': 'pine', 'at': [-46, -22], 's': 1.3}, {'k': 'pine', 'at': [46, -6], 's': 1.3}, {'k': 'pine', 'at': [44, 26], 's': 1.2},
    {'k': 'pine', 'at': [-30, -38], 's': 1.2}, {'k': 'pine', 'at': [32, -34], 's': 1.2},
  ],
  things=[
    # Bus Stop
    T('bus_stop', 'bus stop', 'bus_stop', (6, 0, 34), '公交车站', aliases=['stop', 'station'], rot=-1.5708, radius=1.2),
    T('bus', 'bus', 'city_bus', (-7, 0, 39), '公交车', aliases=['city bus', 'yellow bus'], tags=['yellow', 'big'], color='yellow', rot=1.5708, radius=2.0, can=['fly', 'ride']),
    T('town_map', 'town map', 'signpost', (-4, 0, 36), '小镇地图', aliases=['map', 'board'], radius=0.4, can=['read'], text='TOWN MAP\nGo straight and turn left at the second crossing.\nThe science museum is next to the post office.'),
    # Maple Road
    T('cat', 'cat', 'cat', (-27, 0, 30), '猫', tags=['grey', 'small'], color='grey', radius=0.4, can=['fly', 'pick'], params={'voice': 'animal'}, chatter=['Meow! I live on Maple Road. Amy goes to school on foot. Meow!']),
    # Taxi Corner
    T('taxi', 'taxi', 'taxi', (20, 0, 31), '出租车', aliases=['car', 'cab'], tags=['yellow'], color='yellow', rot=0, radius=1.4, can=['fly', 'ride'], reveal=['ws_taxi'], revealOn='fly'),
    T('bike', 'bike', 'bicycle', (13, 0, 33), '自行车', aliases=['bicycle'], tags=['red'], color='red', radius=0.6, can=['fly', 'ride']),
    # First Crossing
    T('crossing', 'signpost', 'signpost', (4, 0, 28), '路口路牌', aliases=['sign', 'crossing sign', 'road sign'], radius=0.4, can=['read'], text='Hospital: turn left at the first crossing.\nCinema: turn right at the first crossing.\nMuseum and post office: go straight, then turn left at the second crossing.'),
    T('hospital', 'hospital', 'hospital', (-16, 0, 16), '医院', radius=3.4, can=['light']),
    T('cinema', 'cinema', 'cinema', (16, 0, 16), '电影院', aliases=['movie theatre', 'movies', 'film'], radius=3.4, can=['light']),
    T('supermarket', 'supermarket', 'supermarket', (16, 0, 6), '超市', aliases=['shop', 'market'], rot=3.14159, radius=3.4, can=['light']),
    T('bookstore', 'bookstore', 'bookstore', (-13, 0, 7), '书店', aliases=['book store', 'bookshop'], rot=3.14159, radius=3.2, can=['light']),
    # Second Crossing
    T('light', 'traffic light', 'traffic_light', (4, 0, -4), '红绿灯', aliases=['traffic lights', 'light'], tags=['red'], color='red', radius=0.4),
    T('post', 'post office', 'post_office', (-13, 0, -8), '邮局', aliases=['post'], radius=3.2, can=['light']),
    T('school', 'school', 'school_building', (18, 0, -11), '学校', aliases=['sunny school', 'primary school'], radius=4.2, can=['light']),
    T('lamp1', 'lamp', 'lamp_post', (-7, 0, -4), '路灯', aliases=['street light', 'lamp post'], radius=0.3, can=['light']),
    # Museum Square
    T('museum', 'science museum', 'museum', (-28, 0, -10), '科学博物馆', aliases=['museum'], radius=4.0, can=['light', 'open'], reveal=['ws_get'], revealOn='open'),
    T('museum_shop', 'museum shop', 'gift_shop', (-40, 0, -8), '博物馆商店', aliases=['gift shop', 'shop'], radius=2.2, can=['light']),
    T('museum_sign', 'museum sign', 'signpost', (-21, 0, -4), '博物馆告示牌', aliases=['sign', 'board'], radius=0.4, can=['read'], text='SCIENCE MUSEUM\nThe museum shop is next to the museum.\nThe post office is next to the museum, too.'),
    # Town Park
    T('fountain', 'fountain', 'fountain', (0, 0, -35), '喷泉', radius=1.8, can=['light']),
    T('cart', 'ice cream cart', 'ice_cream_cart', (10, 0, -36), '冰淇淋车', aliases=['cart'], radius=1.3, can=['fly']),
    T('lamp2', 'lamp', 'lamp_post', (-9, 0, -33), '路灯', aliases=['street light', 'lamp post'], radius=0.3, can=['light'], label=False),
    T('chest', 'treasure chest', 'treasure_chest', (6, 0, -42), '宝箱', aliases=['chest', 'box', 'treasure'], radius=0.6, can=['open', 'fly'], reveal=['ws_bike'], revealOn='open'),
    # Lucky the lost dog hides behind the post office, under a big tree
    T('dog', 'dog', 'dog', (-13, 0, -17), '小狗', aliases=['lucky', 'puppy'], tags=['brown', 'small'], color='brown', radius=0.5, can=['fly', 'pick'], params={'voice': 'animal'}, chatter=["Woof! I'm behind the post office. Where is Leo?", 'Woof woof! How can I get home?']),
  ],
  npcs=[
    N('joe', 'Grandpa Joe', 'tourist', (-2, 0, 32), 'oldman', 'Grandpa Joe, a friendly tourist who is a little lost in town; grade-6 English about places and directions', "Oh, hello! I'm Grandpa Joe. I'm a little lost.", '乔爷爷', aliases=['grandpa', 'joe', 'old man', 'tourist'],
      idle=['Turn left, turn right... This town is fun!', 'Excuse me, where is the cinema? Ah yes, turn right at the first crossing!'],
      chatter=['Excuse me, where is the cinema?', 'How can I get to the science museum?'],
      knows=['The cinema: turn right at the first crossing.', 'The hospital: turn left at the first crossing.', 'The museum is next to the post office: go straight, then turn left at the second crossing.']),
    N('amy', 'Amy', 'student', (-12, 0, 30), 'child', 'Amy, a girl who lives on Maple Road and walks to school; grade-6 English about ways to go', "Hi! I'm Amy. I live on Maple Road.", '艾米', aliases=['amy', 'girl'],
      idle=['I go to school on foot. It is good exercise!', 'How do you come to school?'],
      chatter=['How do you come to school? I come on foot.', 'My school is near the second crossing.']),
    N('officer', 'Officer Dan', 'police_officer', (6, 0, 4), 'man', 'Officer Dan, a friendly traffic police officer at the Second Crossing; grade-6 English about traffic rules and ways to go', "Hello! I'm Officer Dan. Be safe on the road!", '丹警官', aliases=['police', 'policeman', 'officer', 'police officer', 'dan'],
      idle=['Stop and wait at a red light. Go at a green light.', 'Slow down at a yellow light!'],
      chatter=['Stop and wait at a red light!', 'Go at a green light. Be careful!', 'I come to work by bike.']),
    N('lee', 'Miss Lee', 'guide', (-31, 0, -2), 'lady', 'Miss Lee, a friendly guide at the science museum; grade-6 English about places (next to, near, behind)', "Welcome! I'm Miss Lee, the museum guide.", '李老师', aliases=['miss lee', 'lee', 'guide', 'lady'],
      idle=['The museum shop is next to the museum.', 'The post office is next to the museum, too.'],
      chatter=["Where is the museum shop? It's next to the museum.", 'Welcome to the science museum!']),
    N('leo', 'Leo', 'guitar_boy', (-5, 0, -29), 'youngman', 'Leo, a boy who has lost his dog Lucky in the town; grade-6 English', "Hi, I'm Leo. Have you seen my dog?", '利奥', aliases=['leo', 'boy'],
      idle=['Lucky is my best friend.', 'Thank you for your help!'],
      chatter=['Where is my dog? Is he near the post office?', 'Lucky! Lucky! Where are you?']),
  ],
  quests=[
    # Grandpa Joe: a lost tourist (main line)
    Q('lt_cinema', 'guide', '说', 'joe', '给乔爷爷带路去电影院', 'Take Grandpa Joe to the cinema', ['Excuse me, I want to see a film. Where is the cinema?'], ['Go straight.', 'Turn right.', 'Go to the cinema.'], ['The cinema! Turn right at the first crossing. Thank you so much!'], prompt='Can you take me to the cinema? I will follow you.', to='cinema', tipZh='乔爷爷会跟着你。电影院在第一个路口右转。可以说“Go to the cinema!”，也可以一步步说“Go straight. Turn right.”'),
    Q('lt_dir', 'speak', '说', 'joe', '告诉乔爷爷去书店的路', 'How can I get to the bookstore?', ['What a good film! Now I want to buy a book.'], ['Go straight and turn left.', 'Turn left at the second crossing.'], ['Thank you! Now I know the way!'], prompt='How can I get to the bookstore?', accept=[['straight', 'left', 'right', 'next to', 'near', 'crossing']], judge='The child gives directions in English using phrases like go straight / turn left / turn right / at the … crossing / next to.', needs='lt_cinema', tipZh='书店在第二个路口的左边。可以说：“Go straight and turn left at the second crossing.”'),
    Q('lt_museum', 'guide', '说', 'joe', '带乔爷爷去科学博物馆', 'Take Grandpa Joe to the museum', ["Now I want to see the science museum. It's next to the post office, I think. How can I get there?"], ['Go to the museum.', 'Turn left at the second crossing.'], ['The science museum! It is next to the post office. Wonderful!'], prompt='Take me to the science museum, please!', to='museum', needs='lt_dir', tipZh='博物馆在第二个路口左转，邮局旁边。说“Go to the museum!”乔爷爷会跟着你。'),
    Q('lt_party', 'magic', '说', 'joe', '乔爷爷不再迷路了：放烟花庆祝', 'Fireworks!', ['Cinema, bookstore, museum... I am not lost any more! Thank you, little guide! Let\'s celebrate!'], ['Fireworks!'], ['Wow! What a wonderful town! Thank you, young wizard!'], prompt='Say: Fireworks!', goal='fireworks', needs='lt_museum'),
    # signs
    Q('lt_read', 'read', '读', 'crossing', '读路牌：怎么去电影院？', 'Read the signpost', [], [], ['Right! Turn right at the first crossing.'], passage='Hospital: turn left at the first crossing.\nCinema: turn right at the first crossing.\nMuseum and post office: go straight, then turn left at the second crossing.', prompt='How can you get to the cinema?', options=['Turn left at the first crossing', 'Go straight', 'Turn right at the first crossing'], answer=2),
    Q('map_read', 'read', '读', 'town_map', '大声读出小镇地图', 'Read the town map', [], ['Go straight and turn left at the second crossing.'], ['Great reading! Now you know the way to the museum.'], passage='Go straight and turn left at the second crossing. The science museum is next to the post office.', readAloud=True, prompt='Read the map aloud.'),
    Q('museum_read', 'read', '读', 'museum_sign', '读告示牌：博物馆商店在哪里？', 'Where is the museum shop?', [], [], ["Yes! The museum shop is next to the museum."], passage='SCIENCE MUSEUM\nThe museum shop is next to the museum.\nThe post office is next to the museum, too.', prompt='Where is the museum shop?', options=['Next to the museum', 'Behind the cinema', 'In the hospital'], answer=0),
    # Amy: ways to go to school
    Q('lt_way', 'speak', '说', 'amy', '回答 Amy：你怎么去上学？', 'How do you go to school?', ['I go to school on foot. What about you?'], ['I go to school by bus.', 'I go to school on foot.'], ['Cool! Have a nice trip to school!'], prompt='How do you go to school?', accept=[['by', 'on foot', 'walk', 'ride', 'drive', 'take']], tipZh='Amy 问你怎么上学。可以说：“I go to school by bus / by bike / on foot.”'),
    Q('lt_listen', 'listen', '听', 'amy', '听 Amy 指路，邮局在哪边？', 'Listen and choose', ['Listen! I will tell you the way to the post office.'], [], ['Yes! The post office is on your right.'], prompt='Where is the post office?', audio='Go straight. Turn left at the bookstore. Then go straight again. The post office is on your right, next to the museum.', options=['On your left', 'On your right', 'Behind the cinema'], answer=1, video='town.mp4', needs='lt_way'),
    Q('am_school', 'guide', '说', 'amy', '陪 Amy 走路去学校', 'Walk Amy to school', ["Oh no, it's eight o'clock! I go to school on foot. Can you walk with me?"], ['Follow me!', 'Go to the school.'], ['We are at school! Walking is fun. Thank you!'], prompt='Can you take me to school? I will follow you.', to='school', needs='lt_listen', tipZh='学校在第二个路口右边。说“Go to the school!”，或一步步说“Go straight. Turn right.”'),
    Q('lt_write', 'write', '写', 'amy', '写出地点：可以看电影的地方', 'Write the place', ['Write a place for me!'], ['cinema'], ['Yes! C-I-N-E-M-A!'], prompt='You can see a film there. Write the place.', accept=[['cinema', 'movie theater', 'movie theatre']], needs='am_school'),
    # Officer Dan: traffic lights and ways to go
    Q('of_red', 'speak', '说', 'officer', '回答警官：遇到红灯怎么办？', 'What do you do at a red light?', ["Let's learn the traffic rules! Look at the traffic light."], ['Stop and wait.'], ['Right! Stop and wait at a red light.'], prompt='What do you do at a red light?', accept=[['stop', 'wait']], tipZh='警官问遇到红灯怎么做。回答：“Stop and wait.”'),
    Q('of_green', 'magic', '说', 'officer', '红绿灯卡在红灯了：把它变成绿灯', 'Make the light green', ["Oh no! The traffic light is stuck on red. The cars and buses can't go!"], ['Make the traffic light green!'], ['Green light! Now the cars can go. Thank you!'], prompt='Say: Make the traffic light green!', goal='tint:light:green', needs='of_red', tipZh='念咒语：“Make the traffic light green!”'),
    Q('of_choose', 'choose', '说', 'officer', '选一选：黄灯是什么意思？', 'What does a yellow light mean?', ['One more question about the traffic lights.'], [], ['Yes! Slow down and wait at a yellow light.'], prompt='What does a yellow light mean?', options=['Go fast', 'Slow down and wait', 'Turn left'], answer=1, needs='of_green'),
    Q('of_write', 'write', '写', 'officer', '写一种出行方式：I go to school by ___.', 'Write a way to go', ['I come to work by bike. How do you go to school? Write it!'], ['bike'], ['Great! There are many ways to go!'], prompt='Write a word: I go to school by ___ .', accept=[['bus', 'bike', 'bicycle', 'car', 'taxi', 'subway', 'train', 'ship', 'plane']], needs='of_choose'),
    # Miss Lee: the science museum
    Q('ml_open', 'magic', '说', 'lee', '博物馆的门卡住了：把门打开', 'Open the museum', ['This is the science museum. Oh dear, the door is stuck! Can you help?'], ['Open the museum!'], ['Thank you! The museum is open. Look, a secret star!'], prompt='Say: Open the museum!', goal='open:museum', tipZh='念咒语：“Open the museum!”'),
    Q('ml_where', 'speak', '说', 'lee', '回答李老师：邮局在哪里？', 'Where is the post office?', ['A quiz about our town! Look around the museum.'], ["It's next to the museum."], ["That's right! The post office is next to the museum."], prompt='Where is the post office?', accept=[['next to', 'near', 'beside', 'museum']], needs='ml_open', tipZh='邮局就在博物馆旁边。回答：“It\'s next to the museum.”'),
    # Leo: the lost dog
    Q('lo_listen', 'listen', '听', 'leo', '听一听：小狗 Lucky 在哪里？', 'Where is Lucky?', ['My dog Lucky is lost! The postman saw a dog. Listen!'], [], ['Behind the post office! Let\'s go!'], prompt='Where is Lucky?', audio="I saw a little brown dog. It's behind the post office, under a big tree. I think it's your dog!", options=['Behind the post office', 'In the cinema', 'Next to the hospital'], answer=0),
    Q('lo_guide', 'guide', '说', 'leo', '带 Leo 去邮局后面找小狗', 'Take Leo to Lucky', ['Can you take me to Lucky? I will follow you.'], ['Go to the dog.', 'Follow me!'], ['Lucky! There you are! Thank you!'], prompt='Please take me to my dog!', to='dog', needs='lo_listen', tipZh='Lucky 在邮局后面的大树下。说“Go to the dog!”，Leo 会跟着你。'),
    Q('lo_happy', 'magic', '说', 'leo', 'Lucky 吓坏了：让它开心起来', 'Make the dog happy', ['Poor Lucky is scared. Can you make him happy?'], ['Make the dog happy!'], ['Woof woof! He is happy now! Lost and found!'], prompt='Say: Make the dog happy!', goal='happy:dog|dance:dog', needs='lo_guide'),
  ],
  words=[
    S('ws_museum', 'science museum', '科学博物馆', (-23, -15)), S('ws_post', 'post office', '邮局', (-8, -11)), S('ws_hospital', 'hospital', '医院', (-21, 21)),
    S('ws_cinema', 'cinema', '电影院', (22, 21)), S('ws_bookstore', 'bookstore', '书店', (-8, 4)),
    S('ws_left', 'turn left', '左转', (-7, 24)), S('ws_right', 'turn right', '右转', (8, 24)), S('ws_straight', 'go straight', '直走', (0, 12)),
    S('ws_bus', 'by bus', '坐公交车', (9, 38)), S('ws_foot', 'on foot', '步行', (-15, 35)),
    S('ws_where', 'Excuse me, where is the cinema?', '打扰一下，电影院在哪里？', (3, 19)),
    S('ws_turn', 'Turn left at the first crossing.', '在第一个路口左转。', (-10, 20)),
    S('ws_next', "It's next to the post office.", '它在邮局旁边。', (-20, -1)),
    S('ws_school', 'How do you come to school? I come on foot.', '你怎么来上学？我走路来。', (12, -4)),
    S('ws_red', 'Stop and wait at a red light.', '红灯停一停，等一等。', (8, -6)),
    S('ws_get', 'How can I get there?', '我怎么去那里？', (-27, -1), hidden=True),
    S('ws_taxi', 'I go by taxi.', '我坐出租车去。', (24, 27), hidden=True),
    S('ws_bike', 'I go to the park by bike.', '我骑自行车去公园。', (10, -42), hidden=True),
  ],
  spellIdeas=[{'say': 'Make the taxi fly!', 'zh': '让出租车飞起来（会发现秘密哦）', 'near': 'taxi'}, {'say': 'Open the chest!', 'zh': '打开公园里的宝箱', 'near': 'chest'}, {'say': 'Open the museum!', 'zh': '打开博物馆的门', 'near': 'museum'},
    {'say': 'Light the lamp!', 'zh': '点亮路灯', 'near': 'lamp1'}, {'say': 'Make the cinema purple!', 'zh': '把电影院变成紫色', 'near': 'cinema'}, {'say': 'Fly!', 'zh': '骑上扫帚飞过小镇'},
    {'say': 'Make the bookstore big!', 'zh': '把书店变大', 'near': 'bookstore'}, {'say': 'Make Grandpa Joe fly!', 'zh': '让乔爷爷飞起来（他会吓一跳！）', 'near': 'joe'}, {'say': 'Make the bus fly!', 'zh': '让公交车飞起来', 'near': 'bus'},
    {'say': 'Make the traffic light green!', 'zh': '把红绿灯变成绿灯', 'near': 'light'}, {'say': 'Make three bikes!', 'zh': '变出三辆自行车', 'near': 'bike'}, {'say': 'Make it night!', 'zh': '让天黑下来，再点亮医院'},
    {'say': 'Turn the cat into a dog!', 'zh': '把小猫变成小狗', 'near': 'cat'}, {'say': 'Make the dog dance!', 'zh': '让小狗跳舞', 'near': 'dog'}, {'say': 'Freeze the fountain!', 'zh': '把喷泉冻住', 'near': 'fountain'}],
)
