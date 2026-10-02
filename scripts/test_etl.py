"""Offline tests: python -m unittest discover -s scripts -p test_*.py"""
import json
from pathlib import Path
import tempfile
import unittest
import contextlib
import io
from unittest.mock import MagicMock, patch
from types import ModuleType
import httpx
from pydantic import ValidationError
from crawler_and_extractor import Catalog, Database, Extraction, Manifest, SourceConfig, atomic_save, stable_payload, load_configuration, collect_sources, extract, main


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
        self.assertTrue(any(s.purpose in ("guide", "sample") for s in manifest.sources))
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

    def test_each_source_failure_is_skipped_and_transcript_survives(self):
        _, configured = load_configuration()
        sample = next(s for s in configured.sources if s.purpose == "sample")
        url = "https://example.com/guide"
        request = httpx.Request("GET", url)
        failures = [
            httpx.HTTPStatusError("Forbidden", request=request, response=httpx.Response(403, request=request)),
            httpx.HTTPStatusError("Not found", request=request, response=httpx.Response(404, request=request)),
            httpx.ReadTimeout("Timeout", request=request),
            ValueError("robots.txt disallows crawling"),
            FileNotFoundError("Missing transcript"),
            "too short",
        ]
        remote = SourceConfig(id="remote", url=url, title="Remote", kind="html")
        manifest = Manifest(patch=configured.patch, sources=[remote, sample])
        for failure in failures:
            with self.subTest(failure=type(failure).__name__), httpx.Client() as client:
                with patch("crawler_and_extractor.crawl", side_effect=[failure, "Authorized Chinese guide. " * 10]):
                    with self.assertLogs("crawler_and_extractor", level="WARNING") as logs:
                        documents, metadata, demo = collect_sources(manifest, client, "2026-10-01T00:00:00Z")
                self.assertIn(url, logs.output[0])
                self.assertEqual([d["sourceId"] for d in documents], [sample.id])
                self.assertEqual([s.id for s in metadata], [sample.id])
                self.assertTrue(demo)

    def test_all_failed_sources_raise_descriptive_error(self):
        _, manifest = load_configuration()
        with httpx.Client() as client, patch("crawler_and_extractor.crawl", side_effect=ValueError("robots exclusion")):
            with self.assertLogs("crawler_and_extractor", level="WARNING"):
                with self.assertRaisesRegex(RuntimeError, "No content could be retrieved.*database unchanged"):
                    collect_sources(manifest, client, "2026-10-01T00:00:00Z")

    def test_successful_html_source_proceeds_without_demo_flag(self):
        source = SourceConfig(id="html", url="https://example.com/guide", title="Guide", kind="html")
        manifest = Manifest(patch="18.3 B", sources=[source])
        with httpx.Client() as client, patch("crawler_and_extractor.crawl", return_value="Guide text " * 20):
            documents, metadata, demo = collect_sources(manifest, client, "2026-10-01T00:00:00Z")
        self.assertEqual(documents[0]["sourceId"], source.id)
        self.assertEqual(metadata[0].url, source.url)
        self.assertFalse(demo)

    def test_real_local_transcript_reaches_extraction_and_publishes_demo(self):
        catalog, manifest = load_configuration()
        sample = next(s for s in manifest.sources if s.purpose == "sample")
        unit = catalog.units[0].id
        comp = self.raw["comps"][0].copy()
        comp.update(units=[unit], carryId=unit, keyItems=[], augmentCompatibility=[], milestones=[],
                    sourceIds=[sample.id], transition={"earlyUnitIds": [], "itemHolderIds": [], "minimumLevel": 2, "minimumGold": 0})
        extracted = Extraction.model_validate({"patch": catalog.patch, "comps": [comp]})
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "meta_comps.json"
            output.write_text(json.dumps(self.raw), encoding="utf-8")
            with patch("sys.argv", ["etl", "--output", str(output)]), patch.dict("os.environ", {"GEMINI_API_KEY": "test-placeholder"}):
                with patch("crawler_and_extractor.extract", return_value=extracted) as llm:
                    with contextlib.redirect_stdout(io.StringIO()), self.assertLogs("crawler_and_extractor", level="WARNING"):
                        main()
            llm.assert_called_once()
            self.assertEqual(llm.call_args.args[1][0]["sourceId"], sample.id)
            published = Database.model_validate_json(output.read_text(encoding="utf-8"))
            self.assertTrue(published.demo)
            self.assertEqual(published.sources[0].url, sample.url)
            self.assertEqual(published.revision, self.raw["revision"] + 1)

    def test_extraction_uses_default_or_environment_model_in_sdk_request(self):
        # Exercise the actual request construction without installing/calling an API.
        catalog, _ = load_configuration()
        google = ModuleType("google")
        sdk = ModuleType("google.genai")
        sdk_types = ModuleType("google.genai.types")
        google.genai = sdk
        sdk.types = sdk_types
        sdk.Client = MagicMock()
        for name in ("HttpOptions", "HttpRetryOptions", "GenerateContentConfig"):
            setattr(sdk_types, name, lambda **kwargs: kwargs)
        generate = sdk.Client.return_value.__enter__.return_value.models.generate_content
        generate.return_value.text = json.dumps({"patch": catalog.patch, "comps": self.raw["comps"]})
        for value, expected in ((None, "gemini-3.8-flash"), ("", "gemini-3.8-flash"),
                                ("   ", "gemini-3.8-flash"), ("custom-model", "custom-model")):
            with self.subTest(model=value), patch.dict("sys.modules", {
                "google": google, "google.genai": sdk, "google.genai.types": sdk_types,
            }), patch.dict("os.environ", {}, clear=True):
                if value is not None:
                    with patch.dict("os.environ", {"GEMINI_MODEL": value}):
                        extract(catalog, [], "test-placeholder")
                else:
                    extract(catalog, [], "test-placeholder")
                self.assertEqual(generate.call_args.kwargs["model"], expected)
                self.assertNotIn("thinking_config", generate.call_args.kwargs["config"])
                self.assertEqual(generate.call_args.kwargs["config"]["response_json_schema"], Extraction.model_json_schema())
                generate.assert_called_once()
                generate.reset_mock()


if __name__ == "__main__":
    unittest.main()
