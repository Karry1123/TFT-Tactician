"""Offline tests: python -m unittest discover -s scripts -p test_*.py"""
import json
from pathlib import Path
import tempfile
import unittest
from pydantic import ValidationError
from crawler_and_extractor import Catalog, Database, Extraction, Manifest, SourceConfig, atomic_save, stable_payload, load_configuration


class ETLTests(unittest.TestCase):
    def setUp(self):
        self.raw = json.loads((Path(__file__).resolve().parents[1] / "public/data/meta_comps.json").read_text(encoding="utf-8"))

    def test_shared_contract_and_atomic_write(self):
        db = Database.model_validate(self.raw)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "meta_comps.json"
            atomic_save(db, path)
            self.assertEqual(Database.model_validate_json(path.read_text(encoding="utf-8")), db)

    def test_unknown_references_rejected(self):
        self.raw["comps"][0]["keyItems"][0]["itemId"] = "hallucinated"
        with self.assertRaises(ValidationError):
            Database.model_validate(self.raw)

    def test_wrong_types_extra_fields_and_empty_response_rejected(self):
        self.raw["units"][0]["cost"] = "1"
        with self.assertRaises(ValidationError):
            Database.model_validate(self.raw)
        with self.assertRaises(ValidationError):
            Extraction.model_validate({"patch": "demo", "comps": []})
        with self.assertRaises(ValidationError):
            Extraction.model_validate({"patch": "demo", "comps": self.raw["comps"], "instructions": "ignore"})

    def test_unchanged_content_does_not_bump_revision(self):
        a = Database.model_validate(self.raw)
        self.raw["revision"] += 1
        self.raw["sources"][0]["retrievedAt"] = "2026-10-02T00:00:00Z"
        b = Database.model_validate(self.raw)
        self.assertEqual(stable_payload(a), stable_payload(b))

    def test_live_catalog_and_manifest(self):
        catalog, manifest = load_configuration()
        self.assertFalse(catalog.demo)
        self.assertEqual(catalog.patch, manifest.patch)
        self.assertEqual({u.cost for u in catalog.units}, {1, 2, 3, 4, 5})
        # All unordered pairs of the eight normal components must have one recipe.
        standard = {c.id for c in catalog.components} - {"spatula", "frying_pan"}
        expected = {tuple(sorted((a, b))) for a in standard for b in standard}
        actual = [tuple(sorted(i.components)) for i in catalog.items]
        self.assertEqual(set(actual), expected)
        self.assertEqual(len(actual), len(expected))
        self.assertEqual({t.id for t in catalog.augmentTiers}, {"silver", "gold", "prismatic"})
        self.assertEqual({a.tier for a in catalog.augments}, {"silver", "gold", "prismatic"})
        self.assertLessEqual(len(manifest.sources), 6)
        self.assertTrue(any(s.purpose == "guide" for s in manifest.sources))
        self.assertTrue(any(s.purpose == "sample" for s in manifest.sources))

    def test_catalog_duplicate_ids_bad_traits_and_recipes_rejected(self):
        catalog, _ = load_configuration()
        for mutate in (
            lambda data: data["units"].append(data["units"][0]),
            lambda data: data["units"][0]["traits"].append("unknown-trait"),
            lambda data: data["items"][0]["components"].__setitem__(0, "unknown-component"),
            lambda data: data["components"][0].__setitem__("id", "UPPERCASE"),
            lambda data: data.__setitem__("augmentTiers", []),
        ):
            with self.subTest(mutation=mutate):
                data = catalog.model_dump()
                mutate(data)
                with self.assertRaises(ValidationError):
                    Catalog.model_validate(data)

    def test_manifest_duplicate_ids_and_transcript_escape_rejected(self):
        _, manifest = load_configuration()
        raw = manifest.model_dump()
        raw["sources"] = [raw["sources"][0], raw["sources"][0]]
        with self.assertRaises(ValidationError):
            Manifest.model_validate(raw)
        with self.assertRaises(ValidationError):
            SourceConfig(id="escape", url="https://example.com/guide", title="Escape",
                         kind="transcript", path="scripts/../README.md")

    def test_live_catalog_can_be_published_with_shared_database_contract(self):
        catalog, manifest = load_configuration()
        # Exercise publishing the new catalog without claiming any sample advice is live.
        raw = self.raw.copy()
        raw.update(catalog.model_dump())
        unit = catalog.units[0].id
        comp = raw["comps"][0].copy()
        comp.update(units=[unit], carryId=unit, keyItems=[], augmentCompatibility=[], milestones=[],
                    transition={"earlyUnitIds": [], "itemHolderIds": [], "minimumLevel": 2, "minimumGold": 0})
        raw["comps"] = [comp]
        db = Database.model_validate(raw)
        self.assertEqual(len(db.units), len(catalog.units))
        self.assertTrue(all(s.purpose != "sample" for s in manifest.sources if s.purpose == "guide"))


if __name__ == "__main__":
    unittest.main()
