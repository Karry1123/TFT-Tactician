"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AugmentPicker, TierBadge } from "@/components/augment-picker";
import { evaluateAugmentChoices } from "@/engine/evaluator";
import type { AugmentAdvice, EvaluationState, MetaDatabase } from "@/types/tft";

export function AugmentAdvisor({ db, state, onCommit }: { db: MetaDatabase; state: EvaluationState; onCommit: (advice: AugmentAdvice) => void }) {
  const [offers, setOffers] = useState<string[]>(["", "", ""]);
  const [rerolls, setRerolls] = useState<boolean[]>([true, true, true]);
  const [slot, setSlot] = useState(0);
  const capacity: Record<string, number> = { "2-1": 1, "3-2": 2, "4-2": 3 };
  const available = Boolean(capacity[state.stage]) && state.augmentIds.length < capacity[state.stage];
  const result = useMemo(() => {
    if (!available || offers.some(id => !id)) return { advice: [], error: "" };
    try { return { advice: evaluateAugmentChoices(db, state, offers.map((augmentId, i) => ({ augmentId, canReroll: rerolls[i] }))), error: "" }; }
    catch (e) { return { advice: [], error: e instanceof Error ? e.message : "无法评估" }; }
  }, [db, state, offers, rerolls, available]);
  return <section className="panel mb-5" aria-label="海克斯三选一与刷新决策">
    <h2 className="mb-2 text-lg font-semibold">海克斯三选一 / 刷新助手</h2>
    <p className="mb-4 text-sm text-slate-400">在 2-1、3-2、4-2 输入三项。共享下方散件、场上与板凳状态；评分快照包含已选海克斯。评分是适配度，不是胜率或刷新概率。</p>
    {!available ? <p className="text-sm text-amber-200">当前不是开放的海克斯选择节点，或本阶段已经完成选择。可在下方修改已选海克斯。</p> : <>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {offers.map((id, i) => <div key={i} className={`rounded-xl border p-3 ${slot === i ? "border-cyan-400" : "border-slate-700"}`}>
          <Button className="mb-2 w-full" variant="outline" aria-pressed={slot === i} onClick={() => setSlot(i)}>选项 {i + 1}：{db.augments.find(a => a.id === id)?.name ?? "点击后从目录选择"}</Button>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rerolls[i]} onChange={e => setRerolls(old => old.map((v, j) => j === i ? e.target.checked : v))} />此项还有刷新次数</label>
          {id && <Button className="mt-2" variant="outline" onClick={() => setOffers(old => old.map((v, j) => j === i ? "" : v))}>清除选项</Button>}
        </div>)}
      </div>
      <details open={!offers.every(Boolean)} className="mb-4">
        <summary className="mb-3 cursor-pointer text-cyan-200">为选项 {slot + 1} 选择海克斯</summary>
        <AugmentPicker augments={db.augments} selected={offers.filter(Boolean)} disabledIds={db.augments.filter(a => state.augmentIds.includes(a.id) || (offers.includes(a.id) && offers[slot] !== a.id) || (a.stages.length > 0 && !a.stages.includes(state.stage as "2-1" | "3-2" | "4-2"))).map(a => a.id)} onPick={id => { setOffers(old => old.map((v, i) => i === slot ? id : v)); setSlot(Math.min(2, slot + 1)); }} />
      </details>
      {result.error && <p role="alert" className="text-amber-200">{result.error}</p>}
      {!offers.every(Boolean) && <p className="text-sm text-slate-400">选满三个不同海克斯后显示比较。</p>}
      <div className="grid gap-3 lg:grid-cols-3">{result.advice.map((a, i) => <article key={a.augment.id} className="rounded-xl border border-slate-700 p-4">
        <h3 className="mb-2 flex flex-wrap items-center gap-2 font-semibold">#{i + 1} {a.augment.name}<TierBadge tier={a.augment.tier} /></h3>
        <p className={`mb-2 font-medium ${a.action === "keep" ? "text-emerald-300" : a.action === "reroll" ? "text-amber-300" : "text-slate-200"}`}>{a.action === "keep" ? "保留 · Recommended to Keep" : a.action === "reroll" ? "建议刷新 · Recommended to Reroll" : "次选 / 待核对 · Acceptable Alternative"}</p>
        <p className="text-sm">{a.comp.name} · {a.score} 分（较未选 {a.delta >= 0 ? "+" : ""}{a.delta}）</p>
        <p className="mt-1 text-xs text-slate-400">接近最佳适配的最高档路线：{a.highestTierComp.name} / {a.highestTierComp.tier} / {a.highestTierScore} 分</p>
        <ul className="my-3 list-disc space-y-2 pl-4 text-xs text-slate-300">{a.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        <Button onClick={() => onCommit(a)}>选择此项并记录目标阵容</Button>
      </article>)}</div>
    </>}
  </section>;
}
