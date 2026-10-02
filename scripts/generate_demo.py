"""Explicitly regenerate the illustrative offline fixture. Never run in daily_sync."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
components = [{"id": i, "name": n} for i, n in [
    ("sword", "暴风大剑"), ("bow", "反曲之弓"), ("rod", "无用大棒"),
    ("tear", "女神之泪"), ("vest", "锁子甲"), ("cloak", "负极斗篷"),
    ("belt", "巨人腰带"), ("glove", "拳套")]]
items = [
    {"id": "rageblade", "name": "鬼索的狂暴之刃", "components": ["bow", "rod"]},
    {"id": "shojin", "name": "朔极之矛", "components": ["sword", "tear"]},
    {"id": "warmog", "name": "狂徒铠甲", "components": ["belt", "belt"]},
    {"id": "infinity", "name": "无尽之刃", "components": ["sword", "glove"]},
]
units = [{"id": i, "name": n, "cost": c, "traits": t} for i, n, c, t in [
    ("scout", "示例·斥候", 1, ["射手"]), ("guard", "示例·守卫", 1, ["堡垒"]),
    ("mage", "示例·法师", 2, ["法师"]), ("ranger", "示例·游侠", 4, ["射手"]),
    ("warden", "示例·铁卫", 4, ["堡垒"]), ("sage", "示例·贤者", 4, ["法师"]),
    ("dragon", "示例·龙王", 5, ["法师"])]]
augments = [{"id": i, "name": n, "tier": t} for i, n, t in [
    ("attack", "示例·攻击强化", "gold"), ("mana", "示例·法力强化", "silver"),
    ("legend", "示例·传奇之力", "prismatic")]]


def comp(id, name, tier, carry, unit_ids, keys, fit):
    early = "scout" if carry == "ranger" else "mage"
    return {
        "id": id, "name": name, "tier": tier, "units": unit_ids, "carryId": carry,
        "keyItems": [{"itemId": item, "holderId": holder, "priority": p}
                     for p, (item, holder) in enumerate(keys, 1)],
        "augmentCompatibility": [{"augmentId": a, "rating": v} for a, v in fit],
        "milestones": [
            {"stage": "3-2", "unitIds": ["guard", early], "stars": 2,
             "advice": "过渡核心必须二星；未达标时先稳住场面。"},
            {"stage": "4-1", "unitIds": [carry], "stars": 2,
             "advice": "主输出必须二星；先找到替换牌，再出售过渡持装者。"}],
        "transition": {"earlyUnitIds": ["guard", early],
                       "itemHolderIds": list(dict.fromkeys(unit_ids + [early])),
                       "minimumLevel": 8 if carry == "dragon" else 7, "minimumGold": 20},
        "sourceIds": ["demo"],
    }


comps = [
    comp("ranger-line", "示例·游侠堡垒", "A", "ranger", ["ranger", "warden", "guard"],
         [("rageblade", "ranger"), ("infinity", "ranger"), ("warmog", "warden")],
         [("attack", 1.0), ("mana", -0.5), ("legend", 0.3)]),
    comp("sage-line", "示例·法师铁卫", "S", "sage", ["sage", "warden", "guard"],
         [("shojin", "sage"), ("warmog", "warden")],
         [("attack", -0.5), ("mana", 1.0), ("legend", 0.4)]),
    comp("dragon-line", "示例·五费转型", "A", "dragon", ["dragon", "sage", "warden", "guard"],
         [("shojin", "dragon"), ("rageblade", "dragon"), ("warmog", "warden")],
         [("mana", 0.8), ("legend", 1.0)]),
]
catalog = {"patch": "DEMO-ONLY", "region": "CN", "demo": True,
           "components": components, "items": items, "units": units, "augments": augments}
db = {**catalog, "schemaVersion": 1, "revision": 1, "updatedAt": "2026-10-01T00:00:00Z",
      "sources": [{"id": "demo", "url": "https://example.com/tft-demo",
                   "title": "内置示例，不代表真实国服版本攻略", "retrievedAt": "2026-10-01T00:00:00Z"}],
      "comps": comps}
if __name__ == "__main__":
    (ROOT / "public/data").mkdir(parents=True, exist_ok=True)
    (ROOT / "public/data/meta_comps.json").write_text(json.dumps(db, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "scripts/catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
