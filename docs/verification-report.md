# 国服资料更新与本地验证

核对日期：2026-10-01。`patch` 为公告原样 `18.3 B`，`demo=false`。完整 JSON 内容在下方。字段来源与边界见 [版本说明](current-patch-notes.md) 和 [来源记录](../scripts/catalog_provenance.json)。

## 实际运行输出

以下命令均退出码 0。Windows 使用 `npm.cmd` 执行同名 npm 脚本。

### python scripts/crawler_and_extractor.py --validate-only

```text
Catalog: patch=18.3 B, demo=False, components=10, items=36, units=74, traits=36, augments=24
Manifest: 6 sources; 4 live guides; transcript paths validated
Validated revision 1, 3 comps; demo=True
Published database remains a demo until a successful live extraction.
```

### python -m unittest discover -s scripts -p "test_*.py"

```text
........
----------------------------------------------------------------------
Ran 8 tests in 0.194s

OK
```

### npm.cmd run typecheck

```text
> tft-tactician@1.0.0 typecheck
> tsc --noEmit
```

### npm.cmd test

```text
> tft-tactician@1.0.0 test
> node scripts/run-tests.mjs

✔ component deficit uses counts, consumes shared components once, and preserves input (2.6929ms)
✔ completed items are credited once; retained unit items require a remover (8.964ms)
✔ augment tiers weight compatibility and inventory reduces transition distance (0.6506ms)
✔ milestones enforce stars, retire earlier deadlines, and sort deterministically (0.6479ms)
✔ low HP blocks missing replacements and equipment overflow (1.6438ms)
✔ owned off-comp five-cost triggers actionable pivot with transfer steps (1.3967ms)
✔ unknown catalog IDs, duplicate instances and malformed data are rejected (1.1052ms)
✔ new live catalog passes the browser contract including strict trait references (3.144ms)
✔ two-slot units block pivots that exceed available population (0.6298ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 160.6532
```

### npm.cmd run build

```text
> tft-tactician@1.0.0 build
> next build

   ▲ Next.js 15.5.27

   Creating an optimized production build ...
 ✓ Compiled successfully in 1228ms
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/4) ...
   Generating static pages (1/4)
   Generating static pages (2/4)
   Generating static pages (3/4)
 ✓ Generating static pages (4/4)
   Finalizing page optimization ...
   Collecting build traces ...
   Exporting (0/2) ...
 ✓ Exporting (2/2)

Route (app)                                 Size  First Load JS
┌ ○ /                                      32 kB         135 kB
└ ○ /_not-found                            996 B         104 kB
+ First Load JS shared by all             103 kB
  ├ chunks/255-9acdc15b78d766e6.js       46.6 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)          1.96 kB

○  (Static)  prerendered as static content
```

## 发布状态

离线校验成功不代表在线抓取和 Gemini 提取已经成功。本次未调用在线 ETL；已发布 `public/data/meta_comps.json` 保持 revision 1、3个演示阵容和 demo=true。4篇攻略候选标注基础18.3，需复核国服B热更新适配；公告参考和原创样例不参与自动实盘提取。海克斯为24个常用项的已核对子集，三个档位定义完整。



## 完整 catalog.json

```json
{
  "patch": "18.3 B",
  "region": "CN",
  "demo": false,
  "components": [
    {
      "id": "sword",
      "name": "暴风大剑"
    },
    {
      "id": "bow",
      "name": "反曲之弓"
    },
    {
      "id": "rod",
      "name": "无用大棒"
    },
    {
      "id": "tear",
      "name": "女神之泪"
    },
    {
      "id": "vest",
      "name": "锁子甲"
    },
    {
      "id": "cloak",
      "name": "负极斗篷"
    },
    {
      "id": "belt",
      "name": "巨人腰带"
    },
    {
      "id": "glove",
      "name": "拳套"
    },
    {
      "id": "spatula",
      "name": "金铲铲"
    },
    {
      "id": "frying_pan",
      "name": "金锅锅"
    }
  ],
  "items": [
    {
      "id": "adaptive_helm",
      "name": "适应性头盔",
      "components": [
        "tear",
        "cloak"
      ]
    },
    {
      "id": "archangel",
      "name": "大天使之杖",
      "components": [
        "rod",
        "tear"
      ]
    },
    {
      "id": "bloodthirster",
      "name": "饮血剑",
      "components": [
        "sword",
        "cloak"
      ]
    },
    {
      "id": "blue_buff",
      "name": "蓝霸符",
      "components": [
        "tear",
        "tear"
      ]
    },
    {
      "id": "bramble_vest",
      "name": "棘刺背心",
      "components": [
        "vest",
        "vest"
      ]
    },
    {
      "id": "crownguard",
      "name": "冕卫",
      "components": [
        "rod",
        "vest"
      ]
    },
    {
      "id": "deathblade",
      "name": "死亡之刃",
      "components": [
        "sword",
        "sword"
      ]
    },
    {
      "id": "dragons_claw",
      "name": "巨龙之爪",
      "components": [
        "cloak",
        "cloak"
      ]
    },
    {
      "id": "edge_of_night",
      "name": "夜之锋刃",
      "components": [
        "sword",
        "vest"
      ]
    },
    {
      "id": "evenshroud",
      "name": "薄暮法袍",
      "components": [
        "cloak",
        "belt"
      ]
    },
    {
      "id": "gargoyle",
      "name": "石像鬼石板甲",
      "components": [
        "vest",
        "cloak"
      ]
    },
    {
      "id": "giant_slayer",
      "name": "巨人杀手",
      "components": [
        "bow",
        "sword"
      ]
    },
    {
      "id": "gunblade",
      "name": "海克斯科技枪刃",
      "components": [
        "sword",
        "rod"
      ]
    },
    {
      "id": "hand_of_justice",
      "name": "正义之手",
      "components": [
        "tear",
        "glove"
      ]
    },
    {
      "id": "infinity",
      "name": "无尽之刃",
      "components": [
        "sword",
        "glove"
      ]
    },
    {
      "id": "ionic_spark",
      "name": "离子火花",
      "components": [
        "rod",
        "cloak"
      ]
    },
    {
      "id": "jeweled_gauntlet",
      "name": "珠光护手",
      "components": [
        "glove",
        "rod"
      ]
    },
    {
      "id": "krakens_fury",
      "name": "海妖之怒",
      "components": [
        "bow",
        "cloak"
      ]
    },
    {
      "id": "last_whisper",
      "name": "最后的轻语",
      "components": [
        "bow",
        "glove"
      ]
    },
    {
      "id": "morellonomicon",
      "name": "莫雷洛秘典",
      "components": [
        "belt",
        "rod"
      ]
    },
    {
      "id": "nashors_tooth",
      "name": "纳什之牙",
      "components": [
        "bow",
        "belt"
      ]
    },
    {
      "id": "protectors_vow",
      "name": "圣盾使的誓约",
      "components": [
        "vest",
        "tear"
      ]
    },
    {
      "id": "quicksilver",
      "name": "水银",
      "components": [
        "cloak",
        "glove"
      ]
    },
    {
      "id": "rabadon",
      "name": "灭世者的死亡之帽",
      "components": [
        "rod",
        "rod"
      ]
    },
    {
      "id": "rageblade",
      "name": "鬼索的狂暴之刃",
      "components": [
        "bow",
        "rod"
      ]
    },
    {
      "id": "red_buff",
      "name": "红霸符",
      "components": [
        "bow",
        "bow"
      ]
    },
    {
      "id": "shojin",
      "name": "朔极之矛",
      "components": [
        "tear",
        "sword"
      ]
    },
    {
      "id": "spirit_visage",
      "name": "振奋盔甲",
      "components": [
        "belt",
        "tear"
      ]
    },
    {
      "id": "steadfast_heart",
      "name": "坚定之心",
      "components": [
        "vest",
        "glove"
      ]
    },
    {
      "id": "steraks_gage",
      "name": "斯特拉克的挑战护手",
      "components": [
        "sword",
        "belt"
      ]
    },
    {
      "id": "strikers_flail",
      "name": "强袭者的链枷",
      "components": [
        "belt",
        "glove"
      ]
    },
    {
      "id": "sunfire",
      "name": "日炎斗篷",
      "components": [
        "vest",
        "belt"
      ]
    },
    {
      "id": "thiefs_gloves",
      "name": "窃贼手套",
      "components": [
        "glove",
        "glove"
      ]
    },
    {
      "id": "titans_resolve",
      "name": "泰坦的坚决",
      "components": [
        "bow",
        "vest"
      ]
    },
    {
      "id": "void_staff",
      "name": "虚空之杖",
      "components": [
        "bow",
        "tear"
      ]
    },
    {
      "id": "warmog",
      "name": "狂徒铠甲",
      "components": [
        "belt",
        "belt"
      ]
    }
  ],
  "units": [
    {
      "id": "akali",
      "name": "阿卡丽",
      "cost": 1,
      "traits": [
        "魔战士",
        "地狱火",
        "狂战士"
      ]
    },
    {
      "id": "camille",
      "name": "卡蜜尔",
      "cost": 1,
      "traits": [
        "魔女",
        "狂战士"
      ]
    },
    {
      "id": "cinderling",
      "name": "绯红树怪",
      "cost": 1,
      "traits": [
        "猎人",
        "峡谷野怪"
      ]
    },
    {
      "id": "karma",
      "name": "卡尔玛",
      "cost": 1,
      "traits": [
        "灵魂莲华",
        "法师"
      ]
    },
    {
      "id": "kobuko",
      "name": "可酷伯",
      "cost": 1,
      "traits": [
        "斗士",
        "约德尔人和朋友"
      ]
    },
    {
      "id": "leona",
      "name": "蕾欧娜",
      "cost": 1,
      "traits": [
        "护卫",
        "日蚀骑士"
      ]
    },
    {
      "id": "ornn",
      "name": "奥恩",
      "cost": 1,
      "traits": [
        "护卫",
        "永恒之森"
      ]
    },
    {
      "id": "pebbles",
      "name": "苍蓝哨戒",
      "cost": 1,
      "traits": [
        "神谕",
        "峡谷野怪"
      ]
    },
    {
      "id": "rakan",
      "name": "洛",
      "cost": 1,
      "traits": [
        "花仙子",
        "主宰",
        "重装战士"
      ]
    },
    {
      "id": "reksai",
      "name": "雷克塞",
      "cost": 1,
      "traits": [
        "斗士",
        "黑荆棘"
      ]
    },
    {
      "id": "varus",
      "name": "韦鲁斯",
      "cost": 1,
      "traits": [
        "地狱火",
        "迅捷射手"
      ]
    },
    {
      "id": "veigar",
      "name": "维迦",
      "cost": 1,
      "traits": [
        "黑荆棘",
        "法师",
        "约德尔人和朋友"
      ]
    },
    {
      "id": "xayah",
      "name": "霞",
      "cost": 1,
      "traits": [
        "永恒之森",
        "花仙子",
        "迅捷射手"
      ]
    },
    {
      "id": "yorick",
      "name": "约里克",
      "cost": 1,
      "traits": [
        "灵魂莲华",
        "主宰",
        "召唤师"
      ]
    },
    {
      "id": "alistar",
      "name": "阿利斯塔",
      "cost": 2,
      "traits": [
        "斗士",
        "永恒之森"
      ]
    },
    {
      "id": "caitlyn",
      "name": "凯特琳",
      "cost": 2,
      "traits": [
        "魔女",
        "猎人"
      ]
    },
    {
      "id": "elise",
      "name": "伊莉丝",
      "cost": 2,
      "traits": [
        "魔女",
        "重装战士"
      ]
    },
    {
      "id": "gromp",
      "name": "魔沼蛙",
      "cost": 2,
      "traits": [
        "魔战士",
        "峡谷野怪"
      ]
    },
    {
      "id": "kayle",
      "name": "凯尔",
      "cost": 2,
      "traits": [
        "迅捷射手",
        "日蚀骑士"
      ]
    },
    {
      "id": "leblanc",
      "name": "乐芙兰",
      "cost": 2,
      "traits": [
        "永恒之森",
        "法师"
      ]
    },
    {
      "id": "murkwolf",
      "name": "暗影狼",
      "cost": 2,
      "traits": [
        "狂战士",
        "峡谷野怪"
      ]
    },
    {
      "id": "scuttlecrab",
      "name": "峡谷迅捷蟹",
      "cost": 2,
      "traits": [
        "主宰",
        "峡谷野怪"
      ]
    },
    {
      "id": "sejuani",
      "name": "瑟庄妮",
      "cost": 2,
      "traits": [
        "主宰",
        "日蚀骑士"
      ]
    },
    {
      "id": "shen",
      "name": "慎",
      "cost": 2,
      "traits": [
        "护卫",
        "地狱火"
      ]
    },
    {
      "id": "teemo",
      "name": "提莫",
      "cost": 2,
      "traits": [
        "神谕",
        "约德尔人和朋友"
      ]
    },
    {
      "id": "warwick",
      "name": "沃里克",
      "cost": 2,
      "traits": [
        "黑荆棘",
        "狂战士"
      ]
    },
    {
      "id": "yunara",
      "name": "芸阿娜",
      "cost": 2,
      "traits": [
        "灵魂莲华",
        "裁决使"
      ]
    },
    {
      "id": "azir",
      "name": "阿兹尔",
      "cost": 3,
      "traits": [
        "黑荆棘",
        "裁决使",
        "召唤师"
      ]
    },
    {
      "id": "cassiopeia",
      "name": "卡西奥佩娅",
      "cost": 3,
      "traits": [
        "魔女",
        "法师"
      ]
    },
    {
      "id": "diana",
      "name": "黛安娜",
      "cost": 3,
      "traits": [
        "月蚀骑士",
        "狂战士",
        "重装战士"
      ]
    },
    {
      "id": "fiddlesticks",
      "name": "费德提克",
      "cost": 3,
      "traits": [
        "护卫",
        "绝命花妖",
        "法师"
      ]
    },
    {
      "id": "hecarim",
      "name": "赫卡里姆",
      "cost": 3,
      "traits": [
        "永恒之森",
        "重装战士"
      ]
    },
    {
      "id": "khazix",
      "name": "卡兹克",
      "cost": 3,
      "traits": [
        "宿敌"
      ]
    },
    {
      "id": "kogmaw",
      "name": "克格莫",
      "cost": 3,
      "traits": [
        "魔战士",
        "帝王斑蝶",
        "神谕"
      ]
    },
    {
      "id": "krug",
      "name": "远古石甲虫",
      "cost": 3,
      "traits": [
        "斗士",
        "峡谷野怪"
      ]
    },
    {
      "id": "mama_beak",
      "name": "深红锋喙鸟",
      "cost": 3,
      "traits": [
        "迅捷射手",
        "峡谷野怪",
        "召唤师"
      ]
    },
    {
      "id": "master_yi",
      "name": "易",
      "cost": 3,
      "traits": [
        "魔战士",
        "灵魂莲华"
      ]
    },
    {
      "id": "rammus",
      "name": "拉莫斯",
      "cost": 3,
      "traits": [
        "护卫",
        "约德尔人和朋友"
      ]
    },
    {
      "id": "rengar",
      "name": "雷恩加尔",
      "cost": 3,
      "traits": [
        "宿敌"
      ]
    },
    {
      "id": "tristana",
      "name": "崔丝塔娜",
      "cost": 3,
      "traits": [
        "花仙子",
        "猎人",
        "约德尔人和朋友"
      ]
    },
    {
      "id": "vi",
      "name": "蔚",
      "cost": 3,
      "traits": [
        "主宰",
        "野兽之灵"
      ]
    },
    {
      "id": "ahri",
      "name": "阿狸",
      "cost": 4,
      "traits": [
        "灵魂莲华",
        "法师"
      ]
    },
    {
      "id": "amumu",
      "name": "阿木木",
      "cost": 4,
      "traits": [
        "地狱火",
        "主宰"
      ]
    },
    {
      "id": "aphelios",
      "name": "厄斐琉斯",
      "cost": 4,
      "traits": [
        "月蚀骑士",
        "迅捷射手"
      ]
    },
    {
      "id": "brambleback",
      "name": "绯红印记树怪",
      "cost": 4,
      "traits": [
        "狂战士",
        "峡谷野怪"
      ]
    },
    {
      "id": "ezreal",
      "name": "伊泽瑞尔",
      "cost": 4,
      "traits": [
        "永恒之森",
        "裁决使"
      ]
    },
    {
      "id": "lillia",
      "name": "莉莉娅",
      "cost": 4,
      "traits": [
        "护卫",
        "花仙子"
      ]
    },
    {
      "id": "malphite",
      "name": "墨菲特",
      "cost": 4,
      "traits": [
        "黑荆棘",
        "魔岩巨兽"
      ]
    },
    {
      "id": "morgana",
      "name": "莫甘娜",
      "cost": 4,
      "traits": [
        "魔女",
        "神谕"
      ]
    },
    {
      "id": "nidalee",
      "name": "奈德丽",
      "cost": 4,
      "traits": [
        "魔战士",
        "野兽之灵"
      ]
    },
    {
      "id": "sentinel",
      "name": "苍蓝雕纹魔像",
      "cost": 4,
      "traits": [
        "神谕",
        "峡谷野怪",
        "重装战士"
      ]
    },
    {
      "id": "sett",
      "name": "瑟提",
      "cost": 4,
      "traits": [
        "灵魂莲华",
        "斗士"
      ]
    },
    {
      "id": "sivir",
      "name": "希维尔",
      "cost": 4,
      "traits": [
        "猎人",
        "野兽之灵"
      ]
    },
    {
      "id": "soraka",
      "name": "索拉卡",
      "cost": 4,
      "traits": [
        "裁决使",
        "绝命花妖"
      ]
    },
    {
      "id": "zyra",
      "name": "婕拉",
      "cost": 4,
      "traits": [
        "召唤师",
        "荆棘之兴"
      ]
    },
    {
      "id": "alune",
      "name": "拉露恩",
      "cost": 5,
      "traits": [
        "月华神女",
        "月蚀骑士",
        "法师"
      ]
    },
    {
      "id": "ashe",
      "name": "艾希",
      "cost": 5,
      "traits": [
        "灵魂莲华",
        "猎人"
      ]
    },
    {
      "id": "draven",
      "name": "德莱文",
      "cost": 5,
      "traits": [
        "赏金猎人"
      ]
    },
    {
      "id": "elder_dragon",
      "name": "远古巨龙",
      "cost": 5,
      "boardSlots": 2,
      "traits": [
        "顶级掠食者",
        "峡谷野怪"
      ]
    },
    {
      "id": "gnar",
      "name": "纳尔",
      "cost": 5,
      "traits": [
        "斗士",
        "永恒之森",
        "约德尔人和朋友"
      ]
    },
    {
      "id": "ivern",
      "name": "艾翁",
      "cost": 5,
      "traits": [
        "翠神"
      ]
    },
    {
      "id": "kennen",
      "name": "凯南",
      "cost": 5,
      "traits": [
        "裁决使",
        "地狱火"
      ]
    },
    {
      "id": "lux",
      "name": "拉克丝",
      "cost": 5,
      "traits": [
        "大元素使"
      ]
    },
    {
      "id": "lux_blackthorn",
      "name": "拉克丝 (黑荆棘)",
      "cost": 5,
      "traits": [
        "黑荆棘",
        "大元素使"
      ]
    },
    {
      "id": "lux_blossom",
      "name": "拉克丝 (灵魂莲华)",
      "cost": 5,
      "traits": [
        "灵魂莲华",
        "大元素使"
      ]
    },
    {
      "id": "lux_coven",
      "name": "拉克丝 (魔女)",
      "cost": 5,
      "traits": [
        "魔女",
        "大元素使"
      ]
    },
    {
      "id": "lux_elderwood",
      "name": "拉克丝 (永恒之森)",
      "cost": 5,
      "traits": [
        "永恒之森",
        "大元素使"
      ]
    },
    {
      "id": "lux_fae",
      "name": "拉克丝 (花仙子)",
      "cost": 5,
      "traits": [
        "花仙子",
        "大元素使"
      ]
    },
    {
      "id": "lux_infernal",
      "name": "拉克丝 (地狱火)",
      "cost": 5,
      "traits": [
        "地狱火",
        "大元素使"
      ]
    },
    {
      "id": "lux_lunar",
      "name": "拉克丝 (月蚀骑士)",
      "cost": 5,
      "traits": [
        "月蚀骑士",
        "大元素使"
      ]
    },
    {
      "id": "lux_primal",
      "name": "拉克丝 (野兽之灵)",
      "cost": 5,
      "traits": [
        "野兽之灵",
        "大元素使"
      ]
    },
    {
      "id": "lux_solar",
      "name": "拉克丝 (日蚀骑士)",
      "cost": 5,
      "traits": [
        "日蚀骑士",
        "大元素使"
      ]
    },
    {
      "id": "maokai",
      "name": "茂凯",
      "cost": 5,
      "traits": [
        "主宰",
        "远古树精"
      ]
    },
    {
      "id": "taric",
      "name": "塔里克",
      "cost": 5,
      "traits": [
        "宝石骑士",
        "重装战士"
      ]
    }
  ],
  "traits": [
    {
      "id": "solar",
      "name": "日蚀骑士"
    },
    {
      "id": "coven",
      "name": "魔女"
    },
    {
      "id": "elderwood",
      "name": "永恒之森"
    },
    {
      "id": "fae",
      "name": "花仙子"
    },
    {
      "id": "blossom",
      "name": "灵魂莲华"
    },
    {
      "id": "infernal",
      "name": "地狱火"
    },
    {
      "id": "lunar",
      "name": "月蚀骑士"
    },
    {
      "id": "primal",
      "name": "野兽之灵"
    },
    {
      "id": "blackthorn",
      "name": "黑荆棘"
    },
    {
      "id": "elementalist",
      "name": "大元素使"
    },
    {
      "id": "grovekeeper",
      "name": "翠神"
    },
    {
      "id": "gemknight",
      "name": "宝石骑士"
    },
    {
      "id": "vanguard",
      "name": "重装战士"
    },
    {
      "id": "executioner",
      "name": "裁决使"
    },
    {
      "id": "juggernaut",
      "name": "主宰"
    },
    {
      "id": "ancient",
      "name": "远古树精"
    },
    {
      "id": "apex_predator",
      "name": "顶级掠食者"
    },
    {
      "id": "riftbeast",
      "name": "峡谷野怪"
    },
    {
      "id": "hunter",
      "name": "猎人"
    },
    {
      "id": "mooncaller",
      "name": "月华神女"
    },
    {
      "id": "mage",
      "name": "法师"
    },
    {
      "id": "bounty_hunter",
      "name": "赏金猎人"
    },
    {
      "id": "brawler",
      "name": "斗士"
    },
    {
      "id": "sprykin",
      "name": "约德尔人和朋友"
    },
    {
      "id": "summoner",
      "name": "召唤师"
    },
    {
      "id": "bramble",
      "name": "荆棘之兴"
    },
    {
      "id": "flora_fatalis",
      "name": "绝命花妖"
    },
    {
      "id": "invoker",
      "name": "神谕"
    },
    {
      "id": "marksman",
      "name": "迅捷射手"
    },
    {
      "id": "warden",
      "name": "护卫"
    },
    {
      "id": "berserker",
      "name": "狂战士"
    },
    {
      "id": "rival",
      "name": "宿敌"
    },
    {
      "id": "monarch",
      "name": "帝王斑蝶"
    },
    {
      "id": "spellblade",
      "name": "魔战士"
    },
    {
      "id": "monolith",
      "name": "魔岩巨兽"
    },
    {
      "id": "eclipse",
      "name": "日月双蚀"
    }
  ],
  "augmentTiers": [
    {
      "id": "silver",
      "name": "白银"
    },
    {
      "id": "gold",
      "name": "黄金"
    },
    {
      "id": "prismatic",
      "name": "棱彩"
    }
  ],
  "augments": [
    {
      "id": "pandoras_items_1",
      "name": "潘朵拉的装备 I",
      "tier": "silver"
    },
    {
      "id": "electrocharge_1",
      "name": "电火花 I",
      "tier": "silver"
    },
    {
      "id": "partial_ascension",
      "name": "部分飞升",
      "tier": "silver"
    },
    {
      "id": "focused_fire",
      "name": "集中火力",
      "tier": "silver"
    },
    {
      "id": "makeshift_armor_1",
      "name": "应急护甲 I",
      "tier": "silver"
    },
    {
      "id": "celestial_blessing_1",
      "name": "星界赐福 I",
      "tier": "silver"
    },
    {
      "id": "healing_orbs_1",
      "name": "治疗法球 I",
      "tier": "silver"
    },
    {
      "id": "caretakers_ally",
      "name": "游神的盟友",
      "tier": "silver"
    },
    {
      "id": "pandoras_bench",
      "name": "潘朵拉的备战席",
      "tier": "silver"
    },
    {
      "id": "branching_out",
      "name": "节外生枝",
      "tier": "silver"
    },
    {
      "id": "pandoras_items_2",
      "name": "潘朵拉的装备 II",
      "tier": "gold"
    },
    {
      "id": "ascension",
      "name": "飞升",
      "tier": "gold"
    },
    {
      "id": "big_grab_bag",
      "name": "大百宝袋",
      "tier": "gold"
    },
    {
      "id": "celestial_blessing_2",
      "name": "星界赐福 II",
      "tier": "gold"
    },
    {
      "id": "caretakers_favor",
      "name": "游神的眷顾",
      "tier": "gold"
    },
    {
      "id": "electrocharge_2",
      "name": "电火花 II",
      "tier": "gold"
    },
    {
      "id": "epic_rolldown",
      "name": "8级D干的传说",
      "tier": "gold"
    },
    {
      "id": "explosive_growth",
      "name": "爆炸式增长",
      "tier": "gold"
    },
    {
      "id": "pandoras_items_3",
      "name": "潘朵拉的装备 III",
      "tier": "prismatic"
    },
    {
      "id": "radiant_relics",
      "name": "光明圣物",
      "tier": "prismatic"
    },
    {
      "id": "lucky_gloves",
      "name": "幸运手套",
      "tier": "prismatic"
    },
    {
      "id": "living_forge",
      "name": "活体锻炉",
      "tier": "prismatic"
    },
    {
      "id": "shopping_spree",
      "name": "大买特买",
      "tier": "prismatic"
    },
    {
      "id": "golden_egg",
      "name": "金蛋",
      "tier": "prismatic"
    }
  ]
}

```

## 完整 sources.json

```json
{
  "patch": "18.3 B",
  "sources": [
    {
      "id": "cn_18_3b_patch",
      "url": "https://lol.qq.com/news/detail.shtml?docid=11325082533985858669",
      "title": "国服云顶之弈9月28日不停机更新公告（18.3 B）",
      "kind": "html",
      "purpose": "reference"
    },
    {
      "id": "ashe_fast9",
      "url": "https://mobalytics.gg/tft/comps-guide/ashe-to-ashes-3J9V7i6GFrOujQPGxcWbr4cqwKC",
      "title": "Ashe to Ashes · Fast 9 · Set 18 / 18.3",
      "kind": "html",
      "purpose": "guide"
    },
    {
      "id": "moonlit_fast8",
      "url": "https://mobalytics.gg/tft/comps-guide/moonlit-hunt-3JBJHbLQQVkdfm6vFl6EPiJcEKw",
      "title": "Moonlit Hunt · Fast 8 · Set 18 / 18.3",
      "kind": "html",
      "purpose": "guide"
    },
    {
      "id": "veigar_reroll",
      "url": "https://mobalytics.gg/tft/comps-guide/veigar-reroll-3GRav9EJC9f18s1Fsh4A1709SmK",
      "title": "Kill Stack Repeat · Veigar reroll · Set 18 / 18.3",
      "kind": "html",
      "purpose": "guide"
    },
    {
      "id": "ahri_fast8",
      "url": "https://mobalytics.gg/tft/comps-guide/bloom-and-doom-3IYZrgrxpycIWCeI7z4uJ44MTMA",
      "title": "Bloom and Doom · Fast 8 · Set 18 / 18.3",
      "kind": "html",
      "purpose": "guide"
    },
    {
      "id": "sample_guide",
      "url": "repo://scripts/transcripts/sample_guide.txt",
      "title": "原创中文教学攻略样例（非实盘统计来源）",
      "kind": "transcript",
      "path": "scripts/transcripts/sample_guide.txt",
      "purpose": "sample"
    }
  ]
}

```
