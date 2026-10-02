import assert from "node:assert/strict";
import { test } from "node:test";
import fixture from "./fixtures/meta_comps.json";
import liveCatalog from "../scripts/catalog.json";
import published from "../public/data/meta_comps.json";
import { databaseSchema, type EvaluationState, type OwnedUnit } from "../src/types/tft";
import { evaluateAugmentChoices, evaluateComps, evaluatePivots, filterAugments } from "../src/engine/evaluator";

const db = databaseSchema.parse(fixture);
const base: EvaluationState = { stage: "2-1", hp: 100, level: 8, gold: 40, augmentIds: [], components: {}, inventory: [], currentCompId: "ranger-line", unexpectedUnitId: null };
const owned = (unitId: string, patch: Partial<OwnedUnit> = {}): OwnedUnit => ({ instanceId: unitId, unitId, stars: 2, location: "board", itemIds: [], ...patch });
const find = (state: EvaluationState, compId = "ranger-line") => evaluateComps(db, state).find(x => x.comp.id === compId)!;

const offers = ["attack", "mana", "legend"].map(augmentId => ({ augmentId, canReroll: true }));
test("deployed JSON loads through the browser schema with the complete live augment catalog", () => {
  const data = databaseSchema.parse(published);
  assert.equal(data.patch, liveCatalog.patch);
  assert.equal(data.augments.length, 251);
  assert.deepEqual(data.augments, liveCatalog.augments);
  assert.ok(evaluateComps(data, { ...base, currentCompId: null }).length);
});
test("three counterfactual picks use components and board, validate, and leave inputs unchanged", () => {
  const state = { ...base, components: { bow: 2, rod: 1, sword: 1, glove: 2, belt: 2 }, inventory: [owned("scout"), owned("guard")] };
  const before = JSON.stringify({ db, state, offers });
  const advice = evaluateAugmentChoices(db, state, offers);
  assert.equal(advice.length, 3);
  assert.equal(advice[0].augment.id, "attack");
  assert.equal(advice[0].comp.id, "ranger-line");
  assert.equal(advice[0].action, "keep");
  assert.ok(advice.some(a => a.action === "reroll"));
  for (const a of advice) {
    assert.deepEqual(a.hypotheticalState.augmentIds, [a.augment.id]);
    assert.equal(a.score, evaluateComps(db, a.hypotheticalState)[0].score);
    assert.ok(a.highestTierScore >= a.score - 5);
  }
  assert.equal(JSON.stringify({ db, state, offers }), before);
  assert.deepEqual(advice, evaluateAugmentChoices(db, state, offers));
  const apState = { ...base, stage: "3-2", components: { sword: 1, tear: 2, rod: 2, glove: 1, belt: 2 }, inventory: [owned("sage"), owned("warden"), owned("guard")] };
  const apAdvice = evaluateAugmentChoices(db, apState, offers);
  assert.equal(apAdvice[0].comp.id, "sage-line");
  assert.equal(apAdvice[0].augment.id, "mana");
  const noRerolls = evaluateAugmentChoices(db, state, offers.map(o => ({ ...o, canReroll: false })));
  assert.ok(noRerolls.every(a => a.action !== "reroll"));
});
test("offers reject invalid stages, duplicates, owned IDs and unavailable stages", () => {
  assert.throws(() => evaluateAugmentChoices(db, { ...base, stage: "4-1" }, offers));
  assert.throws(() => evaluateAugmentChoices(db, base, offers.slice(0, 2)));
  assert.throws(() => evaluateAugmentChoices(db, base, [offers[0], offers[0], offers[2]]));
  assert.throws(() => evaluateAugmentChoices(db, { ...base, augmentIds: ["attack"] }, offers));
  assert.throws(() => evaluateAugmentChoices(db, base, [...offers.slice(0, 2), { augmentId: "unknown", canReroll: true }]));
  const copy = structuredClone(db);
  copy.augments[0].stages = ["3-2"];
  assert.throws(() => evaluateAugmentChoices(copy, base, offers));
});
test("existing picks are retained, and unknown augment compatibility does not justify reroll", () => {
  const copy = structuredClone(db);
  copy.augments.push({ ...copy.augments[0], id: "unknown-fit", name: "未知适配", stages: [] });
  const state = { ...base, stage: "3-2", augmentIds: ["legend"] };
  const advice = evaluateAugmentChoices(copy, state, [offers[0], offers[1], { augmentId: "unknown-fit", canReroll: true }]);
  for (const a of advice) assert.deepEqual(a.hypotheticalState.augmentIds, ["legend", a.augment.id]);
  const unknown = advice.find(a => a.augment.id === "unknown-fit")!;
  assert.equal(unknown.confidence, "unknown");
  assert.equal(unknown.action, "alternative");
});
test("catalog search supports Chinese keywords, tier filters, case and normalized spaces", () => {
  const copy = structuredClone(db.augments);
  copy[0].name = "精准经济"; copy[0].keywords = ["经济", "Fast 8"];
  assert.deepEqual(filterAugments(copy, "gold", "  经济 FAST  ").map(a => a.id), ["attack"]);
  assert.equal(filterAugments(copy, "silver", "经济").length, 0);
  assert.equal(filterAugments(copy, "all", "").length, copy.length);
  assert.equal(filterAugments(copy, "all", "不存在").length, 0);
});

test("component deficit uses counts, consumes shared components once, and preserves input", () => {
  const state = { ...base, components: { bow: 1, rod: 1, sword: 1, glove: 1, belt: 1 } };
  const before = JSON.stringify(state);
  const ranked = find(state);
  assert.equal(ranked.itemQueue[0].status, "craft");
  assert.deepEqual(ranked.itemQueue[2].missingComponents, ["belt"]);
  assert.equal(JSON.stringify(state), before);
  const copy = structuredClone(db);
  copy.comps[0].keyItems.push({ itemId: "shojin", holderId: "ranger", priority: 4 });
  const queue = evaluateComps(copy, state).find(x => x.comp.id === "ranger-line")!.itemQueue;
  assert.deepEqual(queue[3].missingComponents, ["sword", "tear"]);
});
test("completed items are credited once; retained unit items require a remover", () => {
  const queue = find({ ...base, inventory: [owned("warden", { itemIds: ["rageblade"] })] }).itemQueue;
  assert.equal(queue[0].status, "missing");
  const transfer = find({ ...base, inventory: [owned("scout", { itemIds: ["rageblade"] })] }).itemQueue[0];
  assert.equal(transfer.status, "transfer");
  assert.equal(transfer.fromInstanceId, "scout");
  const copy = structuredClone(db);
  copy.comps[0].keyItems.push({ itemId: "rageblade", holderId: "ranger", priority: 4 });
  const result = evaluateComps(copy, { ...base, inventory: [owned("ranger", { itemIds: ["rageblade"] })] }).find(x => x.comp.id === 'ranger-line')!;
  assert.equal(result.itemQueue.filter(x => x.status === 'equipped').length, 1);
});
test("augment tiers weight compatibility and inventory reduces transition distance", () => {
  const result = find({ ...base, augmentIds: ["attack", "mana"] });
  assert.ok(Math.abs(result.breakdown.augmentFit - 0.9 / 2.4) < 1e-9);
  assert.ok(find({ ...base, inventory: [owned("scout"), owned("guard")] }).score > find(base).score);
});
test("milestones enforce stars, retire earlier deadlines, and sort deterministically", () => {
  const missing = find({ ...base, stage: "3-2", inventory: [owned("guard"), owned("scout", { stars: 1 })] });
  assert.deepEqual(missing.milestones.find(x => x.due)!.unitIds, ["scout"]);
  const later = find({ ...base, stage: "4-1", inventory: [owned("ranger")] });
  assert.equal(later.milestones.length, 0);
  assert.deepEqual(evaluateComps(db, base), evaluateComps(db, base));
});
test("low HP blocks missing replacements and equipment overflow", () => {
  const state = { ...base, stage: "4-1", hp: 30, currentCompId: "sage-line" };
  const plan = evaluatePivots(db, state).find(x => x.compId === "ranger-line")!;
  assert.equal(plan.available, false);
  assert.ok(plan.blockers.some(x => x.includes("替换单位")));
  const full = { ...state, inventory: [owned("ranger", { itemIds: ["shojin", "shojin", "shojin"] }), owned("warden"), owned("guard"), owned("scout", { itemIds: ["rageblade"] })] };
  assert.ok(evaluatePivots(db, full).find(x => x.compId === "ranger-line")!.blockers.some(x => x.includes("装备槽不足")));
});
test("owned off-comp five-cost triggers actionable pivot with transfer steps", () => {
  const state = { ...base, stage: "4-1", unexpectedUnitId: "dragon", inventory: [owned("dragon"), owned("sage"), owned("warden"), owned("guard"), owned("scout", { itemIds: ["rageblade"] })] };
  const plan = evaluatePivots(db, state).find(x => x.compId === "dragon-line")!;
  assert.equal(plan.available, true);
  assert.ok(plan.steps.some(x => x.includes("出售") && x.includes("完整")));
  assert.equal(evaluatePivots(db, { ...state, level: 5 })[0].available, false);
  assert.equal(evaluatePivots(db, { ...base, unexpectedUnitId: "dragon" }).length, 0);
});
test("unknown catalog IDs, duplicate instances and malformed data are rejected", () => {
  assert.throws(() => evaluateComps(db, { ...base, augmentIds: ["unknown"] }));
  assert.throws(() => evaluateComps(db, { ...base, inventory: [owned("scout"), owned("scout")] }));
  const bad = structuredClone(fixture);
  bad.comps[0].carryId = "unknown";
  assert.equal(databaseSchema.safeParse(bad).success, false);
});

test("new live catalog passes the browser contract including strict trait references", () => {
  const unitId = liveCatalog.units[0].id;
  const raw = { ...fixture, ...liveCatalog, comps: [{ ...fixture.comps[0], units: [unitId], carryId: unitId,
    keyItems: [], augmentCompatibility: [], milestones: [],
    transition: { earlyUnitIds: [], itemHolderIds: [], minimumLevel: 2, minimumGold: 0 } }] };
  const parsed = databaseSchema.parse(raw);
  assert.equal(parsed.units.length, liveCatalog.units.length);
  assert.equal(parsed.units.find(x => x.id === "elder_dragon")!.boardSlots, 2);
  const samplePublished = { ...raw, demo: true,
    sources: [{ id: "sample_guide", url: "repo://scripts/transcripts/sample_guide.txt", title: "Original sample", retrievedAt: fixture.updatedAt }],
    comps: raw.comps.map(c => ({ ...c, sourceIds: ["sample_guide"] })) };
  assert.equal(databaseSchema.safeParse(samplePublished).success, true);
  const invalid = structuredClone(raw);
  invalid.units[0].traits.push("unknown-trait");
  assert.equal(databaseSchema.safeParse(invalid).success, false);
});

test("two-slot units block pivots that exceed available population", () => {
  const copy = structuredClone(db);
  copy.units.find(x => x.id === "dragon")!.boardSlots = 2;
  const state = { ...base, stage: "4-1", level: 4, hp: 30,
    inventory: [owned("dragon"), owned("sage"), owned("warden"), owned("guard")] };
  const plan = evaluatePivots(copy, state).find(x => x.compId === "dragon-line")!;
  assert.ok(plan.blockers.some(x => x.includes("人口不足")));
});
