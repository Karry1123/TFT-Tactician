import { evaluationStateSchema, type Comp, type Evaluation, type EvaluationState, type ItemPriority, type MetaDatabase, type OwnedUnit, type PivotPlan } from "../types/tft";

export function stageValue(stage: string): number {
  if (!/^[2-7]-[1-7]$/.test(stage)) throw new Error("Invalid stage");
  const [a, b] = stage.split("-").map(Number);
  return a * 10 + b;
}
function assertState(db: MetaDatabase, state: EvaluationState): void {
  evaluationStateSchema.parse(state);
  const has = (list: { id: string }[], id: string) => list.some(x => x.id === id);
  if (state.augmentIds.some(id => !has(db.augments, id)) || Object.keys(state.components).some(id => !has(db.components, id)) ||
    state.inventory.some(x => !has(db.units, x.unitId) || x.itemIds.some(id => !has(db.items, id))) ||
    (state.currentCompId && !has(db.comps, state.currentCompId)) || (state.unexpectedUnitId && !has(db.units, state.unexpectedUnitId))) throw new Error("State references unknown catalog IDs");
}
function targets(c: Comp, state: EvaluationState): string[] {
  return stageValue(state.stage) < 32 && c.transition.earlyUnitIds.length ? c.transition.earlyUnitIds : c.units;
}
function selectedCopy(state: EvaluationState, unitId: string): OwnedUnit | undefined {
  return state.inventory.filter(x => x.unitId === unitId).sort((a,b) => b.stars-a.stars || Number(b.location === 'board')-Number(a.location === 'board') || a.instanceId.localeCompare(b.instanceId))[0];
}
function itemQueue(db: MetaDatabase, c: Comp, state: EvaluationState): ItemPriority[] {
  const remaining = { ...state.components };
  const equipped = state.inventory.flatMap(u => u.itemIds.map((itemId, index) => ({ itemId, u, key: `${u.instanceId}:${index}` })));
  const used = new Set<string>();
  return [...c.keyItems].sort((a, b) => a.priority - b.priority || a.itemId.localeCompare(b.itemId)).map(key => {
    const item = db.items.find(x => x.id === key.itemId)!;
    const owned = equipped.filter(x => x.itemId === key.itemId && !used.has(x.key));
    const direct = owned.find(x => x.u.instanceId === selectedCopy(state, key.holderId)?.instanceId);
    // Completed items on retained units cannot be transferred without a remover. Items on future sale units can.
    const transfer = owned.find(x => !c.units.includes(x.u.unitId));
    const found = direct ?? transfer;
    if (found) {
      used.add(found.key);
      return { itemId: item.id, holderId: key.holderId, missingComponents: [], status: direct ? "equipped" : "transfer", fromInstanceId: found.u.instanceId };
    }
    const missing: string[] = [];
    for (const component of item.components) {
      if ((remaining[component] ?? 0) > 0) remaining[component]--;
      else missing.push(component);
    }
    return { itemId: item.id, holderId: key.holderId, missingComponents: missing, status: missing.length ? "missing" : "craft" };
  });
}
export function evaluateComps(db: MetaDatabase, state: EvaluationState): Evaluation[] {
  assertState(db, state);
  return db.comps.map(comp => {
    const queue = itemQueue(db, comp, state);
    const keys = [...comp.keyItems].sort((a,b) => a.priority-b.priority || a.itemId.localeCompare(b.itemId));
    const totalWeight = keys.reduce((n, x) => n + 1 / x.priority, 0);
    const missingWeight = queue.reduce((n, x, i) => n + x.missingComponents.length / 2 / keys[i].priority, 0);
    const itemDeficit = totalWeight ? missingWeight / totalWeight : 0;
    const tierWeight = { silver: 1, gold: 1.4, prismatic: 1.8 };
    const augmentWeight = state.augmentIds.reduce((n, id) => n + tierWeight[db.augments.find(x => x.id === id)!.tier], 0);
    const augmentFit = augmentWeight ? state.augmentIds.reduce((n, id) => n + (comp.augmentCompatibility.find(x => x.augmentId === id)?.rating ?? 0) * tierWeight[db.augments.find(x => x.id === id)!.tier], 0) / augmentWeight : 0;
    const wanted = targets(comp, state);
    const missingUnits = wanted.filter(id => !state.inventory.some(x => x.unitId === id)).length;
    const extraBoard = state.inventory.filter(x => x.location === "board" && !wanted.includes(x.unitId)).length;
    const transitionDistance = Math.min(1, (missingUnits + extraBoard * 0.5) / wanted.length);
    const score = Math.round((100 - 45 * itemDeficit - 30 * transitionDistance + 15 * augmentFit + ({ S: 5, A: 2, B: 0 }[comp.tier])) * 10) / 10;
    const reached = comp.milestones.filter(m => stageValue(m.stage) <= stageValue(state.stage));
    const latestReached = Math.max(0, ...reached.map(m => stageValue(m.stage)));
    const milestones = comp.milestones.filter(m => stageValue(m.stage) >= latestReached).map(m => ({ stage: m.stage, advice: m.advice, due: stageValue(state.stage) >= stageValue(m.stage), unitIds: m.unitIds.filter(id => !state.inventory.some(x => x.unitId === id && x.stars >= m.stars)) })).filter(m => m.unitIds.length);
    return { comp, score, breakdown: { itemDeficit, augmentFit, transitionDistance }, milestones, itemQueue: queue };
  }).sort((a, b) => b.score - a.score || a.comp.id.localeCompare(b.comp.id));
}

export function evaluatePivots(db: MetaDatabase, state: EvaluationState, rankings = evaluateComps(db, state)): PivotPlan[] {
  assertState(db, state);
  const lowHp = state.hp <= 35;
  const unexpected = db.units.find(x => x.id === state.unexpectedUnitId);
  const offComp = unexpected?.cost === 5 && state.inventory.some(u => u.unitId === unexpected.id) && !db.comps.find(c => c.id === state.currentCompId)?.units.includes(unexpected.id);
  if (!lowHp && !offComp) return [];
  const name = (id: string) => db.units.find(x => x.id === id)!.name;
  const itemName = (id: string) => db.items.find(x => x.id === id)!.name;
  return rankings.filter(r => r.comp.id !== state.currentCompId).map(r => {
    const c = r.comp;
    const reasons: string[] = [];
    if (lowHp) reasons.push("生命值 ≤ 35：优先当前战力，避免出售后空窗。");
    if (offComp && c.units.includes(unexpected!.id)) reasons.push(`意外获得五费 ${unexpected!.name}，适合此阵容。`);
    const required = targets(c, state);
    const missing = required.filter(id => !state.inventory.some(x => x.unitId === id));
    const blockers: string[] = [];
    if (state.level < c.transition.minimumLevel) blockers.push(`等级需达到 ${c.transition.minimumLevel}（当前 ${state.level}）。`);
    if (state.gold < c.transition.minimumGold) blockers.push(`需保留 ${c.transition.minimumGold} 金币（当前 ${state.gold}）。`);
    if (missing.length) blockers.push(`先购入替换单位：${missing.map(name).join("、")}；不要提前卖牌。`);
    const requiredSlots = required.reduce((sum, id) => sum + (db.units.find(u => u.id === id)?.boardSlots ?? 1), 0);
    if (requiredSlots > state.level) blockers.push("当前人口不足以部署过渡阵容。");
    const due = r.milestones.filter(x => x.due);
    if (lowHp && due.length) blockers.push(`低血量下先满足二星节点：${[...new Set(due.flatMap(x => x.unitIds))].map(name).join("、")}。`);
    const recipients = r.itemQueue.filter(x => x.status === "transfer" || x.status === "craft");
    for (const q of recipients) {
      if (!state.inventory.some(x => x.unitId === q.holderId)) blockers.push(`先获得装备接收者 ${name(q.holderId)}。`);
    }
    // Include all retained items and planned deliveries in a three-slot capacity check.
    for (const holderId of [...new Set(recipients.map(q => q.holderId))]) {
      const recipient = selectedCopy(state, holderId);
      if (recipient && recipient.itemIds.length + recipients.filter(q => q.holderId === holderId).length > 3) blockers.push(`${name(holderId)} 装备槽不足：先使用已有拆卸器；不可直接覆盖装备。`);
    }
    const sales = state.inventory.filter(x => !required.includes(x.unitId) && !c.units.includes(x.unitId));
    const stranded = sales.flatMap(x => x.itemIds).filter(id => !r.itemQueue.some(q => q.itemId === id && q.status === "transfer"));
    const steps = [`确认所需单位已在板凳、人口与装备槽足够，再执行下列步骤。`];
    const outgoing = state.inventory.filter(x => x.location === "board" && !required.includes(x.unitId));
    const incoming = required.map(id => selectedCopy(state, id)).filter((x): x is OwnedUnit => !!x && x.location === "bench");
    steps.push(...incoming.map((x, i) => outgoing[i]
      ? `将板凳上的 ${x.stars} 星 ${name(x.unitId)} 放到 ${name(outgoing[i].unitId)} 的场上位置；先将后者移至板凳。`
      : `将板凳上的 ${x.stars} 星 ${name(x.unitId)} 放入空余场上位置。`));
    for (const q of r.itemQueue.filter(x => x.status === "transfer")) {
      const from = state.inventory.find(x => x.instanceId === q.fromInstanceId)!;
      steps.push(`替换 ${name(from.unitId)} 后，出售该持装单位以回收完整 ${itemName(q.itemId)}；交给 ${name(q.holderId)}。成装无法自动拆回散件。`);
    }
    steps.push(...sales.filter(x => !r.itemQueue.some(q => q.fromInstanceId === x.instanceId)).map(x => `确认替换完成后出售 ${name(x.unitId)}（${x.stars} 星）。`));
    if (stranded.length) steps.push(`保留回收的 ${stranded.map(itemName).join("、")}，不要假设能够拆解；按实际装备效果选择持有者。`);
    for (const q of r.itemQueue.filter(x => x.status === "craft")) steps.push(`用现有散件合成 ${itemName(q.itemId)}，交给 ${name(q.holderId)}。`);
    for (const q of r.itemQueue.filter(x => x.status === "missing")) steps.push(`后续优先获取 ${q.missingComponents.map(id => db.components.find(x => x.id === id)!.name).join(" + ")}，制作 ${itemName(q.itemId)}。`);
    steps.push("检查羁绊、站位与二星节点后再继续花钱；商店命中概率无法保证。");
    return { compId: c.id, score: r.score + (offComp && c.units.includes(unexpected!.id) ? 12 : 0) - blockers.length * 8, available: blockers.length === 0, reasons, blockers: [...new Set(blockers)], steps };
  }).filter(p => p.reasons.length).sort((a,b) => Number(b.available) - Number(a.available) || b.score-a.score || a.compId.localeCompare(b.compId));
}
