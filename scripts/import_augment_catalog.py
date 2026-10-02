"""Import a reviewed current-patch augment snapshot; never run in daily_sync.

Input: a JSON array of {apiName,name,tier,stages,desc} records exported from a
public current-set handbook. Optional CDragon supplies associated-trait metadata.
Existing project IDs are preserved by localized name; verified tier corrections
do not change a stable identity.
"""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from crawler_and_extractor import Catalog, ROOT

DISABLED = {"挑战者的优雅", "黑暗仪式", "三相庇护", "弈子套娃"}


def normalize(name: str) -> str:
    return unicodedata.normalize("NFKC", name).replace(" ", "")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--game-data", type=Path)
    args = parser.parse_args()
    path = ROOT / "scripts/catalog.json"
    catalog = json.loads(path.read_text(encoding="utf-8"))
    previous = {normalize(a["name"]): a["id"] for a in catalog["augments"]}
    items, traits = {}, {}
    if args.game_data:
        data = json.loads(args.game_data.read_text(encoding="utf-8"))
        items = {i["apiName"]: i for i in data["items"]}
        active = next(s for s in data["setData"] if s["mutator"] == "TFTSet18")
        traits = {t["apiName"]: t["name"] for t in active["traits"]}
    known_traits = {t["name"] for t in catalog["traits"]}
    imported, used = [], set()
    for row in json.loads(args.snapshot.read_text(encoding="utf-8")):
        if row["name"] in DISABLED:
            continue
        stable = previous.get(normalize(row["name"]))
        if not stable or stable in used:
            stable = row["apiName"].lower()
        if len(stable) > 64:
            stable = stable[:51] + "_" + hashlib.sha256(stable.encode()).hexdigest()[:12]
        if stable in used:
            raise ValueError(f"Duplicate imported identity: {stable}")
        used.add(stable)
        associated = items.get(row["apiName"], {}).get("associatedTraits", [])
        trait_names = [traits[t] for t in associated if t in traits and traits[t] in known_traits]
        desc = re.sub(r"<[^>]+>", " ", row.get("desc", ""))
        # Descriptions can contain game placeholders; omit incomplete numbers rather
        # than presenting them as exact mechanics or scoring them as real rewards.
        desc = re.sub(r"@[^@]+@", "（数值以游戏内为准）", desc)[:1200]
        emblem = "纹章" in desc or "Emblem" in desc
        category = "emblem" if emblem else "trait" if trait_names else "economy" if any(k in desc + row["name"] for k in ("金币", "利息", "经验", "刷新", "贷款")) else "combat" if any(k in desc for k in ("伤害", "护甲", "攻击", "治疗", "生命", "法强")) else "utility"
        keywords = {"combat": ["战力", "战斗"], "economy": ["经济", "运营", "搜牌"], "trait": ["羁绊", "专属"], "emblem": ["纹章", "转职", "Crest", "Crown", "之徽", "之冕"], "utility": ["功能", "装备"]}[category]
        imported.append({"id": stable, "name": row["name"], "tier": row["tier"],
                         "description": desc, "keywords": list(dict.fromkeys(keywords + trait_names)),
                         "stages": row.get("stages", []), "traitNames": trait_names,
                         "category": category, "apiName": row["apiName"]})
    # An import must not orphan any already-published comp compatibility IDs.
    published = json.loads((ROOT / "public/data/meta_comps.json").read_text(encoding="utf-8"))
    referenced = {a["augmentId"] for c in published["comps"] for a in c["augmentCompatibility"]}
    if referenced - used:
        raise ValueError(f"Import would orphan published augment IDs: {referenced - used}")
    catalog["augments"] = sorted(imported, key=lambda a: (a["tier"], a["id"]))
    Catalog.model_validate(catalog)
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(imported)} current-season augments; existing references preserved")


if __name__ == "__main__":
    main()
