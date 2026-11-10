"""The spell book (咒语表) of every world: extra spells added to each world's spellIdeas.
Each spell practises the lesson's own words and sentence patterns, so reading the book out loud is
practising the textbook. make_worlds.py appends these after the world's own ideas (duplicates dropped);
tools/validate-worlds.ts checks every line is understood by the rule brain and hits a real thing."""

BOOK = {
  'island': [
    ('Move the tower to the left!', '把魔法塔移到左边'), ('Move the tower to the right!', '把魔法塔移到右边'),
    ('Put the pig on a cloud!', '让小猪坐上一朵云'), ('Make a cloud!', '召唤一朵云，坐上去飞'),
    ('Make it rain stars!', '下一场星星雨'), ('Make butterflies!', '变出一群蝴蝶'), ('Everybody, dance!', '让大家一起跳舞'),
    ('Make the rabbit invisible!', '让兔子隐身'), ('Make the tower gold!', '把魔法塔变成金色'), ('Make me big!', '把 Milo 变成巨人'),
    ('Make it foggy!', '让岛上起雾'), ('Shooting stars!', '召唤流星'),
  ],
  'rainbow-zoo': [  # animals & colours
    ('Put the panda on a cloud!', '让熊猫坐上云朵'), ('Turn the dog into a panda!', '把小狗变成熊猫'), ('Turn the duck into a tiger!', '把鸭子变成老虎'),
    ('Make the tiger rainbow!', '把老虎变成彩虹色'), ('Make the bear white!', '把熊变成白色'), ('Make the lion gold!', '把狮子变成金色'),
    ('Move the elephant to the left!', '把大象移到左边'), ('Make the rabbit invisible!', '让兔子隐身'),
    ('Everybody, dance!', '让所有动物一起跳舞'), ('Make butterflies!', '变出一群蝴蝶'),
  ],
  'fruit-market': [  # fruits, I like …
    ('Make it rain pears!', '让天上掉梨'), ('Make it rain grapes!', '让天上掉葡萄'), ('Turn the parrot into a banana!', '把鹦鹉变成香蕉'),
    ('Make the watermelon gold!', '把西瓜变成金色'), ('Put the watermelon on a cloud!', '让西瓜坐上云朵'), ('Make three watermelons!', '变出三个西瓜'),
    ('Make the pear pink!', '把梨变成粉色'), ('Make the scarecrow invisible!', '让稻草人隐身'), ('Move the fruit stall to the left!', '把水果摊移到左边'),
    ('Everybody, sing!', '让大家一起唱歌'),
  ],
  'flying-classroom': [  # classroom things, in / on / under
    ('Move the desk to the left!', '把课桌移到左边'), ('Move the chair to the right!', '把椅子移到右边'), ('Put the schoolbag on a cloud!', '让书包坐上云朵'),
    ('Make the chair invisible!', '让椅子隐身'), ('Make the globe gold!', '把地球仪变成金色'), ('Make the clock big!', '把钟变大'),
    ('Make the door blue!', '把门变成蓝色'), ('Turn the cat into a rabbit!', '把小猫变成兔子'), ('Make it rain stars!', '教室里下星星雨'),
    ('Everybody, jump!', '让大家一起跳'),
  ],
  'weather-town': [  # weather
    ('Make it foggy!', '让小镇起雾'), ('Make it stormy!', '打雷下暴雨'), ('Make it windy!', '刮大风'), ('Make it sunny!', '变成晴天'),
    ('Make a whirlwind!', '刮起一阵旋风'), ('Make a cloud!', '召唤一朵云，坐上去飞'), ('Put the snowman on a cloud!', '让雪人坐上云朵'),
    ('Make it snow flowers!', '让天上飘花瓣'), ('Make the umbrella rainbow!', '把雨伞变成彩虹色'), ('Make the kite gold!', '把风筝变成金色'),
  ],
  'nature-park': [  # there is / there are: river, lake, forest, flowers…
    ('Make butterflies!', '变出一群蝴蝶'), ('Make it rain flowers!', '下一场花瓣雨'), ('Put the deer on a cloud!', '让小鹿坐上云朵'),
    ('Move the boat to the left!', '把小船移到左边'), ('Move the tent to the right!', '把帐篷移到右边'), ('Make it foggy!', '让森林起雾'),
    ('Turn the fish into a duck!', '把鱼变成鸭子'), ('Make the windmill spin!', '让风车转起来'), ('Shooting stars!', '召唤流星'),
    ('Everybody, sing!', '让大家一起唱歌'),
  ],
  'season-valley': [  # seasons
    ('Make it spring!', '变成春天'), ('Make it summer!', '变成夏天'), ('Make it rain leaves!', '下一场落叶雨'), ('Make it rain snowflakes!', '飘雪花'),
    ('Make a whirlwind!', '刮起一阵旋风'), ('Make butterflies!', '春天的蝴蝶飞来啦'), ('Put the pumpkin on a cloud!', '让南瓜坐上云朵'),
    ('Move the swing to the left!', '把秋千移到左边'), ('Make the leaves gold!', '把树叶变成金色'), ('Everybody, jump!', '让大家一起跳'),
  ],
  'lost-town': [  # directions & ways to go
    ('Move the bus to the left!', '把公交车移到左边'), ('Move the taxi to the right!', '把出租车移到右边'), ('Move the bike forward!', '把自行车往前推'),
    ('Make the traffic light red!', '把红绿灯变成红色'), ('Put the cat on a cloud!', '让小猫坐上云朵'), ('Make a cloud!', '坐云朵出行'),
    ('Make the cinema invisible!', '让电影院隐身'), ('Make the post office gold!', '把邮局变成金色'), ('Make it foggy!', '让小镇起雾'),
    ('Everybody, dance!', '让大家一起跳舞'),
  ],
  'talent-club': [  # can sing / dance / play
    ('Everybody, sing!', '让大家一起唱歌'), ('Everybody, dance!', '让大家一起跳舞'), ('Make the piano sing!', '让钢琴唱歌'),
    ('Make the violin dance!', '让小提琴跳舞'), ('Make it rain notes!', '下一场音符雨'), ('Make the microphone gold!', '把麦克风变成金色'),
    ('Put the drums on a cloud!', '让鼓坐上云朵'), ('Fireworks!', '为表演放烟花'), ('Shooting stars!', '召唤流星'), ('Make me big!', '把 Milo 变成巨人'),
  ],
  'herb-hut': [  # what's the matter / you should rest
    ('Make Bruno sleep!', '让 Bruno 好好休息'), ('Everybody, sleep!', '让大家都去休息'), ('Make it rain hearts!', '下一场爱心雨，祝大家早日康复'),
    ('Make the frog happy!', '让青蛙开心起来'), ('Make the teapot dance!', '让茶壶跳舞'), ('Put the honey jar on a cloud!', '让蜂蜜罐坐上云朵'),
    ('Make the candy cart invisible!', '让糖果车隐身（少吃糖！）'), ('Make the cauldron rainbow!', '把魔药锅变成彩虹色'), ('Shooting stars!', '召唤流星'),
    ('Make butterflies!', '变出一群蝴蝶'),
  ],
  'castle-museum': [  # polite requests: Could you please …?
    ('Could you please open the gate?', '请打开城门（礼貌地说）'), ('Could you please move the cannon to the left?', '请把大炮移到左边'),
    ('Make the crown gold!', '把王冠变成金色'), ('Put the crown on a cloud!', '让王冠坐上云朵'), ('Make the knight armor invisible!', '让骑士盔甲隐身'),
    ('Turn the horse into a dragon!', '把马变成小龙'), ('Move the vase to the right!', '把花瓶移到右边'), ('Everybody, freeze!', '让大家都冻住'),
    ('Shooting stars!', '召唤流星'), ('Fireworks!', '放烟花'),
  ],
}
