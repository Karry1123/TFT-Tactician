import { z } from "zod";

export const stageSchema = z.string().regex(/^[2-7]-[1-7]$/);
const id = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
const ids = z.array(id).max(32);
export const componentSchema = z.object({ id, name: z.string().min(1).max(80) }).strict();
export const itemSchema = z.object({ id, name: z.string().min(1).max(80), components: z.array(id).length(2) }).strict();
export const unitSchema = z.object({ id, name: z.string().min(1).max(80), cost: z.number().int().min(1).max(5), traits: z.array(z.string()).max(8), boardSlots: z.union([z.literal(1), z.literal(2)]).default(1) }).strict();
export const augmentSchema = z.object({ id, name: z.string().min(1).max(80), tier: z.enum(["silver", "gold", "prismatic"]) }).strict();
export const compSchema = z.object({
  id, name: z.string().min(1).max(80), tier: z.enum(["S", "A", "B"]),
  units: ids.min(1), carryId: id,
  keyItems: z.array(z.object({ itemId: id, holderId: id, priority: z.number().int().min(1).max(10) }).strict()).max(10),
  augmentCompatibility: z.array(z.object({ augmentId: id, rating: z.number().min(-1).max(1) }).strict()).max(100),
  milestones: z.array(z.object({ stage: stageSchema, unitIds: ids.min(1), stars: z.literal(2), advice: z.string().min(1).max(500) }).strict()).max(12),
  // Early holders are retained until their replacement is owned; never equip a new item on a unit to be sold.
  transition: z.object({ earlyUnitIds: ids, itemHolderIds: ids, minimumLevel: z.number().int().min(2).max(10), minimumGold: z.number().int().min(0).max(100) }).strict(),
  sourceIds: ids.min(1),
}).strict();
export const databaseSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().min(1),
  patch: z.string().min(1).max(40), region: z.literal("CN"), demo: z.boolean(),
  updatedAt: z.string().datetime(),
  components: z.array(componentSchema).min(1).max(20), items: z.array(itemSchema).min(1).max(100),
  units: z.array(unitSchema).min(1).max(150), augments: z.array(augmentSchema).max(500),
  traits: z.array(componentSchema).max(80).default([]),
  augmentTiers: z.array(componentSchema).max(3).default([]),
  sources: z.array(z.object({ id, url: z.string().url(), title: z.string().min(1).max(200), retrievedAt: z.string().datetime() }).strict()).max(12),
  comps: z.array(compSchema).min(1).max(30),
}).strict().superRefine((db, ctx) => {
  const collections = [db.components, db.items, db.units, db.augments, db.traits, db.augmentTiers, db.sources, db.comps];
  collections.forEach((list) => { if (new Set(list.map(x => x.id)).size !== list.length) ctx.addIssue({ code: "custom", message: "Duplicate IDs" }); });
  const check = (refs: string[], list: { id: string }[], label: string) => {
    if (refs.some(x => !list.some(y => y.id === x))) ctx.addIssue({ code: "custom", message: `Unknown ${label} reference` });
  };
  db.items.forEach(x => check(x.components, db.components, "component"));
  if (!db.demo) {
    if (db.augmentTiers.length !== 3 || ["silver", "gold", "prismatic"].some(tier => !db.augmentTiers.some(x => x.id === tier)))
      ctx.addIssue({ code: "custom", message: "Live catalog requires all augment tiers" });
    const names = new Set(db.traits.map(x => x.name));
    if (!names.size || names.size !== db.traits.length || db.units.some(x => !x.traits.length || new Set(x.traits).size !== x.traits.length || x.traits.some(t => !names.has(t))))
      ctx.addIssue({ code: "custom", message: "Invalid live trait references" });
  }
  db.comps.forEach(c => {
    if (new Set(c.units).size !== c.units.length) ctx.addIssue({ code: "custom", message: "Duplicate comp unit" });
    check([...c.units, c.carryId, ...c.transition.earlyUnitIds, ...c.transition.itemHolderIds], db.units, "unit");
    check([c.carryId, ...c.keyItems.map(x => x.holderId)], c.units.map(id => ({ id })), "comp unit");
    check(c.milestones.flatMap(x => x.unitIds), [...c.units, ...c.transition.earlyUnitIds].map(id => ({ id })), "milestone unit");
    check(c.keyItems.map(x => x.itemId), db.items, "item");
    check(c.augmentCompatibility.map(x => x.augmentId), db.augments, "augment");
    check(c.sourceIds, db.sources, "source");
    if (new Set(c.augmentCompatibility.map(x => x.augmentId)).size !== c.augmentCompatibility.length) ctx.addIssue({ code: "custom", message: "Duplicate augment rating" });
    if (c.keyItems.some(x => !c.transition.itemHolderIds.includes(x.holderId))) ctx.addIssue({ code: "custom", message: "Target item holder must be allowed" });
  });
});
export type MetaDatabase = z.infer<typeof databaseSchema>;
export type Comp = z.infer<typeof compSchema>;
export type Augment = z.infer<typeof augmentSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Unit = z.infer<typeof unitSchema>;
export const evaluationStateSchema = z.object({
  stage: stageSchema, hp: z.number().int().min(1).max(100), gold: z.number().int().min(0).max(999), level: z.number().int().min(2).max(10),
  augmentIds: z.array(id).max(3), components: z.record(id, z.number().int().min(0).max(99)),
  inventory: z.array(z.object({ instanceId: z.string().min(1).max(80), unitId: id, stars: z.union([z.literal(1), z.literal(2), z.literal(3)]), location: z.enum(["board", "bench"]), itemIds: z.array(id).max(3) }).strict()).max(30),
  currentCompId: id.nullable(), unexpectedUnitId: id.nullable(),
}).strict().superRefine((s, ctx) => {
  if (new Set(s.inventory.map(x => x.instanceId)).size !== s.inventory.length) ctx.addIssue({ code: "custom", message: "Duplicate inventory instance" });
  if (new Set(s.augmentIds).size !== s.augmentIds.length) ctx.addIssue({ code: "custom", message: "Duplicate augment" });
});
export type EvaluationState = z.infer<typeof evaluationStateSchema>;
export type OwnedUnit = EvaluationState["inventory"][number];
export interface ItemPriority { itemId: string; holderId: string; missingComponents: string[]; status: "equipped" | "transfer" | "craft" | "missing"; fromInstanceId?: string }
export interface Evaluation {
  comp: Comp; score: number;
  breakdown: { itemDeficit: number; augmentFit: number; transitionDistance: number };
  milestones: { stage: string; unitIds: string[]; due: boolean; advice: string }[];
  itemQueue: ItemPriority[];
}
export interface PivotPlan { compId: string; score: number; available: boolean; reasons: string[]; blockers: string[]; steps: string[] }
export interface DecisionLog { id: string; at: string; revision: number; state: EvaluationState; compId: string; score: number }
