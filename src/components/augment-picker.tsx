"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { filterAugments } from "@/engine/evaluator";
import type { Augment, AugmentTier } from "@/types/tft";

const labels = { silver: "银色", gold: "金色", prismatic: "彩色" };
const colors = { silver: "border-slate-400 text-slate-200", gold: "border-amber-500 text-amber-200", prismatic: "border-fuchsia-400 text-fuchsia-200" };
export function TierBadge({ tier }: { tier: AugmentTier }) {
  return <span className={`rounded border px-1.5 py-0.5 text-xs ${colors[tier]}`}>{labels[tier]}</span>;
}

export function AugmentPicker({ augments, selected, disabledIds = [], onPick }: {
  augments: Augment[]; selected: string[]; disabledIds?: string[]; onPick: (id: string) => void;
}) {
  const [tier, setTier] = useState<AugmentTier | "all">("all");
  const [query, setQuery] = useState("");
  const id = useId();
  const filtered = useMemo(() => filterAugments(augments, tier, query), [augments, tier, query]);
  return <div>
    <div role="group" aria-label="海克斯档位筛选" className="mb-3 flex flex-wrap gap-2">
      {(["all", "silver", "gold", "prismatic"] as const).map(t => <Button key={t} variant={tier === t ? "default" : "outline"} aria-pressed={tier === t} onClick={() => setTier(t)}>{t === "all" ? "全部" : `${labels[t]}海克斯`}</Button>)}
    </div>
    <label htmlFor={id} className="label">搜索中文名称、羁绊或关键词</label>
    <input id={id} className="mb-2 w-full" value={query} onChange={e => setQuery(e.target.value)} placeholder="例如：经济、纹章、装备" />
    <p className="mb-2 text-xs text-slate-400">匹配 {filtered.length} / {augments.length} 个</p>
    <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto pr-1">
      {filtered.map(a => <Button key={a.id} variant={selected.includes(a.id) ? "default" : "outline"} aria-pressed={selected.includes(a.id)} disabled={disabledIds.includes(a.id)} onClick={() => onPick(a.id)} title={a.description || a.name}>{a.name}<TierBadge tier={a.tier} /></Button>)}
    </div>
    {!filtered.length && <p role="status" className="text-sm text-slate-400">没有匹配结果，请切换档位或搜索词。</p>}
  </div>;
}
