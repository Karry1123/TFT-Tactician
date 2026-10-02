"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRightLeft, Check, ClipboardList, Download, RefreshCw, Shield, Swords, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluateComps, evaluatePivots } from "@/engine/evaluator";
import { databaseSchema, evaluationStateSchema, type DecisionLog, type EvaluationState, type MetaDatabase, type OwnedUnit } from "@/types/tft";
import { z } from "zod";

const initial: EvaluationState = { stage: "2-1", hp: 100, gold: 20, level: 4, augmentIds: [], components: {}, inventory: [], currentCompId: null, unexpectedUnitId: null };
const STORAGE = "tft-tactician-session-v1";
const savedSchema = z.object({ patch: z.string(), state: evaluationStateSchema, logs: z.array(z.object({ id: z.string(), at: z.string(), revision: z.number(), state: evaluationStateSchema, compId: z.string(), score: z.number() })).max(100) });
const stages = Array.from({ length: 6 }, (_, i) => Array.from({ length: 7 }, (_, j) => `${i + 2}-${j + 1}`)).flat();

export default function Page() {
  const [db, setDb] = useState<MetaDatabase | null>(null);
  const [state, setState] = useState<EvaluationState>(initial);
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [restored, setRestored] = useState(false);
  const [query, setQuery] = useState("");

  async function loadData(signal?: AbortSignal) {
    setLoading(true); setError("");
    try {
      const response = await fetch("/data/meta_comps.json", { cache: "no-store", signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = databaseSchema.parse(await response.json());
      setRestored(false); setDb(parsed);
    } catch (e) {
      if (signal?.aborted) return;
      setError(`静态阵容库加载失败：${e instanceof Error ? e.message : "未知错误"}`);
    } finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { const controller = new AbortController(); void loadData(controller.signal); return () => controller.abort(); }, []);
  useEffect(() => {
    if (!db) return;
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const saved = savedSchema.parse(JSON.parse(raw));
        if (saved.patch === db.patch) {
          evaluateComps(db, saved.state); // Reject old IDs even if the patch label is unchanged.
          setState(saved.state); setLogs(saved.logs);
        } else {
          setState(initial); setLogs([]);
          setNotice("版本已更新，已重置对局记录以避免混用不同赛季数据。");
        }
      }
    } catch { setState(initial); setLogs([]); setNotice("已忽略无效或不兼容的本地记录。"); }
    setRestored(true);
  }, [db]);
  useEffect(() => {
    if (!db || !restored) return;
    try { localStorage.setItem(STORAGE, JSON.stringify({ patch: db.patch, state, logs })); }
    catch { setNotice("浏览器存储不可用；请导出记录以保存。"); }
  }, [state, logs, db, restored]);
  const computed = useMemo(() => {
    if (!db) return { rankings: [], pivots: [] };
    try { const rankings = evaluateComps(db, state); return { rankings, pivots: evaluatePivots(db, state, rankings) }; }
    catch { return { rankings: [], pivots: [] }; }
  }, [db, state]);
  const patchState = (patch: Partial<EvaluationState>) => setState(s => ({ ...s, ...patch }));
  const unitName = (id: string) => db?.units.find(x => x.id === id)?.name ?? id;
  const itemName = (id: string) => db?.items.find(x => x.id === id)?.name ?? id;
  const componentName = (id: string) => db?.components.find(x => x.id === id)?.name ?? id;
  function editUnit(instanceId: string, patch: Partial<OwnedUnit>) {
    setState(s => ({ ...s, inventory: s.inventory.map(x => x.instanceId === instanceId ? { ...x, ...patch } : x) }));
  }
  function addUnit(unitId: string) {
    if (state.inventory.length >= 30) return;
    const owned: OwnedUnit = { instanceId: crypto.randomUUID(), unitId, stars: 1, location: "bench", itemIds: [] };
    const cost = db?.units.find(x => x.id === unitId)?.cost;
    setState(s => ({ ...s, inventory: [...s.inventory, owned], unexpectedUnitId: cost === 5 ? unitId : s.unexpectedUnitId }));
  }
  function toggleAugment(id: string) {
    setState(s => ({ ...s, augmentIds: s.augmentIds.includes(id) ? s.augmentIds.filter(x => x !== id) : s.augmentIds.length < 3 ? [...s.augmentIds, id] : s.augmentIds }));
  }
  function logDecision(compId: string, score: number) {
    if (!db) return;
    const snapshot = { ...state, currentCompId: compId };
    setLogs(old => [{ id: crypto.randomUUID(), at: new Date().toISOString(), revision: db.revision, state: snapshot, compId, score }, ...old].slice(0, 100));
    patchState({ currentCompId: compId }); setNotice(`已记录 ${state.stage} 阶段决策。`);
  }
  function exportLogs() {
    const blob = new Blob([JSON.stringify({ patch: db?.patch, logs }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "tft-decisions.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main className="mx-auto min-h-screen max-w-[2400px] p-3 md:p-6">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><p className="mb-1 text-xs uppercase tracking-[0.25em] text-cyan-300">CHINA · LOCAL ENGINE</p><h1 className="text-2xl font-bold md:text-3xl">TFT-Tactician <span className="font-normal text-slate-400">战术台</span></h1><p className="mt-2 text-sm text-slate-400">阶段决策 · 装备规划 · 实时转型</p></div>
      <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-slate-400">{db ? `${db.patch} / v${db.revision}` : "等待阵容库"}</span><Button variant="outline" disabled={loading} onClick={() => void loadData()}><RefreshCw size={16} />刷新数据</Button></div>
    </header>
    {loading && <p role="status" className="panel mb-4">正在加载静态阵容库…</p>}
    {error && <p role="alert" className="panel mb-4 border-red-800 text-red-300">{error}</p>}
    {notice && <p role="status" className="mb-4 text-sm text-cyan-200">{notice}</p>}
    {db?.demo && <p className="panel mb-5 border-amber-700 text-sm text-amber-200">演示阵容库：单位与攻略为示例，不代表当前国服强度。请配置真实版本目录与来源后启用每日同步。</p>}
    {db && <>
      <section className="panel mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6" aria-label="对局状态">
        <label><span className="label">当前阶段</span><select className="w-full" value={state.stage} onChange={e => patchState({ stage: e.target.value })}>{stages.map(s => <option key={s}>{s}</option>)}</select></label>
        {([['hp', '生命值', 1, 100], ['gold', '金币', 0, 999], ['level', '等级', 2, 10]] as const).map(([key, label, min, max]) => <label key={key}><span className="label">{label}</span><input className="w-full" type="number" min={min} max={max} value={state[key]} onChange={e => patchState({ [key]: Math.min(max, Math.max(min, Math.round(Number(e.target.value)))) })} /></label>)}
        <label><span className="label">当前目标</span><select className="w-full" value={state.currentCompId ?? ""} onChange={e => patchState({ currentCompId: e.target.value || null })}><option value="">未锁定</option>{db.comps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label><span className="label">意外五费</span><select className="w-full" value={state.unexpectedUnitId ?? ""} onChange={e => patchState({ unexpectedUnitId: e.target.value || null })}><option value="">无</option>{db.units.filter(x => x.cost === 5 && state.inventory.some(u => u.unitId === x.id)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(400px,1.3fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <section className="panel"><h2 className="mb-3 flex items-center gap-2 font-semibold"><Shield size={18} />海克斯 <span className="text-xs text-slate-400">最多 3 个</span></h2><div className="flex flex-wrap gap-2">{db.augments.map(a => <Button key={a.id} variant={state.augmentIds.includes(a.id) ? "default" : "outline"} aria-pressed={state.augmentIds.includes(a.id)} disabled={!state.augmentIds.includes(a.id) && state.augmentIds.length === 3} onClick={() => toggleAugment(a.id)}>{a.name}<span className="text-xs opacity-70">{a.tier === "silver" ? "银" : a.tier === "gold" ? "金" : "彩"}</span></Button>)}</div></section>
          <section className="panel"><h2 className="mb-3 font-semibold">未合成散件</h2><p className="mb-3 text-xs text-slate-400">只填写装备栏中的散件；已装备成装在单位卡中录入。</p><div className="grid grid-cols-2 gap-2">{db.components.map(c => <div key={c.id} className="rounded-xl bg-slate-800 p-2"><p className="mb-2 text-sm">{c.name}</p><div className="flex items-center justify-between"><Button variant="outline" aria-label={`减少${c.name}`} disabled={!state.components[c.id]} onClick={() => patchState({ components: { ...state.components, [c.id]: Math.max(0, (state.components[c.id] ?? 0) - 1) } })}>−</Button><span className="tabular-nums">{state.components[c.id] ?? 0}</span><Button variant="outline" aria-label={`增加${c.name}`} disabled={(state.components[c.id] ?? 0) >= 99} onClick={() => patchState({ components: { ...state.components, [c.id]: (state.components[c.id] ?? 0) + 1 } })}>+</Button></div></div>)}</div></section>
          <section className="panel"><h2 className="mb-3 flex items-center gap-2 font-semibold"><Swords size={18} />场上 / 板凳</h2><input className="mb-3 w-full" aria-label="搜索单位" placeholder="搜索单位或羁绊" value={query} onChange={e => setQuery(e.target.value)} /><div className="mb-4 flex max-h-48 flex-wrap gap-2 overflow-y-auto">{db.units.filter(u => `${u.name} ${u.traits.join(' ')}`.includes(query)).map(u => <Button key={u.id} variant="outline" disabled={state.inventory.length >= 30} onClick={() => addUnit(u.id)}>{u.name}<span className="text-xs text-amber-300">{u.cost}G</span></Button>)}</div>
            <div className="space-y-3">{state.inventory.map(u => <div key={u.instanceId} className="rounded-xl border border-slate-700 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">{unitName(u.unitId)}</span><Button variant="outline" aria-label={`移除${unitName(u.unitId)}`} onClick={() => setState(s => ({ ...s, inventory: s.inventory.filter(x => x.instanceId !== u.instanceId), unexpectedUnitId: s.unexpectedUnitId === u.unitId && !s.inventory.some(x => x.instanceId !== u.instanceId && x.unitId === u.unitId) ? null : s.unexpectedUnitId }))}><Trash2 size={14} /></Button></div><div className="mb-2 flex gap-2"><select aria-label={`${unitName(u.unitId)}星级`} value={u.stars} onChange={e => editUnit(u.instanceId, { stars: Number(e.target.value) as OwnedUnit['stars'] })}>{[1,2,3].map(n => <option key={n} value={n}>{n} 星</option>)}</select><select aria-label={`${unitName(u.unitId)}位置`} value={u.location} onChange={e => editUnit(u.instanceId, { location: e.target.value as OwnedUnit['location'] })}><option value="board">场上</option><option value="bench">板凳</option></select></div>
              {[0,1,2].map(slot => <select key={slot} className="mt-1 w-full text-sm" aria-label={`${unitName(u.unitId)}装备${slot+1}`} value={u.itemIds[slot] ?? ""} disabled={slot > u.itemIds.length} onChange={e => { const items = [...u.itemIds]; if (e.target.value) items[slot] = e.target.value; else items.splice(slot, 1); editUnit(u.instanceId, { itemIds: items }); }}><option value="">装备槽 {slot + 1} · 空</option>{db.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>)}
            </div>)}</div>{state.inventory.length === 0 && <p className="text-sm text-slate-400">点击单位加入板凳，再设置星级与位置。</p>}
          </section>
        </div>
        <section className="space-y-4" aria-label="实时阵容推荐"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Activity size={18} />实时推荐</h2><span className="text-xs text-slate-400">确定性评分 · 非胜率</span></div>{computed.rankings.map((r, index) => <article className="panel" key={r.comp.id}><div className="flex items-start justify-between gap-3"><div><span className="text-xs text-cyan-300">#{index+1} · {r.comp.tier} 档</span><h3 className="mt-1 text-xl font-semibold">{r.comp.name}</h3></div><span className="text-3xl font-bold tabular-nums text-cyan-300">{r.score}</span></div><p className="mt-2 text-xs text-slate-400">散件缺口 {(r.breakdown.itemDeficit * 100).toFixed(0)}% · 海克斯适配 {r.breakdown.augmentFit.toFixed(2)} · 过渡距离 {r.breakdown.transitionDistance.toFixed(2)}</p><p className="my-3 text-sm text-slate-300">{r.comp.units.map(unitName).join(" · ")}</p>
            <div className="mb-3 space-y-2">{r.milestones.map((m,i) => <div key={i} className={`rounded-lg p-3 text-sm ${m.due ? 'bg-amber-950 text-amber-200' : 'bg-slate-800 text-slate-300'}`}><strong>{m.stage} 前必须二星：{m.unitIds.map(unitName).join("、")}</strong><p className="mt-1 text-xs">{m.due ? "节点已到 / 未满足。" : "下一阶段准备。"}{m.advice}</p></div>)}</div>
            <h4 className="mb-2 text-sm font-semibold">装备优先队列</h4><ol className="space-y-2 text-sm">{r.itemQueue.map((q,i) => <li key={i} className="flex items-start gap-2"><span className="text-cyan-300">{i+1}.</span><div>{itemName(q.itemId)} → {unitName(q.holderId)}<p className="text-xs text-slate-400">{q.status === 'equipped' ? '已装备' : q.status === 'transfer' ? '出售现持有者后可转移；先检查转型条件' : q.status === 'craft' ? '现有散件可合成' : `缺：${q.missingComponents.map(componentName).join(' + ')}`}</p></div></li>)}</ol>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div className="text-xs text-slate-400">{r.comp.sourceIds.map(id => { const s = db.sources.find(x => x.id === id)!; return <a key={id} className="mr-2 underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>; })}</div><Button onClick={() => logDecision(r.comp.id, r.score)}><Check size={15} />记录此决策</Button></div>
          </article>)}</section>
        <div className="space-y-5">
          <section className="panel"><h2 className="mb-3 flex items-center gap-2 font-semibold"><ArrowRightLeft size={18} />实时转型助手</h2><p className="mb-4 text-xs text-slate-400">血量 ≤ 35 或获得阵外五费时触发。输入状态只影响建议，不自动执行游戏操作。</p>{computed.pivots.length === 0 && <p className="text-sm text-slate-300">暂无紧急转型事件。继续记录阶段、装备与单位。</p>}<div className="space-y-4">{computed.pivots.map(p => <div key={p.compId} className="rounded-xl border border-slate-700 p-3"><h3 className="font-semibold">{db.comps.find(x => x.id === p.compId)?.name}</h3><p className={`my-2 text-sm ${p.available ? 'text-emerald-300' : 'text-amber-300'}`}>{p.available ? '当前条件满足，可按步骤转型' : '准备方案：条件尚未满足'}</p>{p.reasons.map(x => <p className="mb-2 text-xs text-slate-300" key={x}>{x}</p>)}{p.blockers.map(x => <p key={x} className="mb-2 text-xs text-amber-200">• {x}</p>)}<details open={p.available}><summary className="cursor-pointer py-2 text-sm text-cyan-300">{p.available ? '执行步骤' : '条件满足后的执行步骤'}</summary><ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed text-slate-300">{p.steps.map((x,i) => <li key={i}>{x}</li>)}</ol></details></div>)}</div></section>
          <section className="panel"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><ClipboardList size={18} />阶段日志</h2><Button variant="outline" disabled={!logs.length} onClick={exportLogs} aria-label="导出日志"><Download size={16} /></Button></div><p className="mb-3 text-xs text-slate-400">仅存本浏览器，最多 100 条。</p><div className="max-h-[600px] space-y-3 overflow-y-auto">{logs.map(log => <div key={log.id} className="rounded-lg bg-slate-800 p-3 text-sm"><p><strong>{log.state.stage}</strong> · {db.comps.find(c => c.id === log.compId)?.name ?? log.compId}</p><p className="mt-1 text-xs text-slate-400">{log.state.hp} HP / {log.state.gold}G / Lv{log.state.level} · {log.score} 分 · 数据 v{log.revision}</p><time className="text-xs text-slate-500" dateTime={log.at}>{new Date(log.at).toLocaleString('zh-CN')}</time></div>)}</div>{!logs.length && <p className="text-sm text-slate-400">在推荐阵容卡点击「记录此决策」。</p>}<Button className="mt-4 w-full" variant="outline" onClick={() => { setState(initial); setLogs([]); setNotice('已开始新对局。'); }}>开始新对局</Button></section>
        </div>
      </div>
      <footer className="mt-8 text-xs text-slate-500">更新时间：{new Date(db.updatedAt).toLocaleString('zh-CN')} · 国服人工输入 · 所有评估在本浏览器内完成</footer>
    </>}
  </main>;
}
