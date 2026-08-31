import React, { useMemo } from "react";
import { Tags } from "lucide-react";
import { MediaMention } from "../types";

interface TrendingKeywordsCloudProps {
  mentions: MediaMention[];
  onSelectKeyword?: (theme: string) => void;
}

const SIZE_STEPS = [
  "text-[11px] px-2.5 py-1 font-semibold",
  "text-xs px-3 py-1 font-bold",
  "text-sm px-3.5 py-1.5 font-bold",
  "text-base px-4 py-1.5 font-black",
  "text-lg px-4 py-2 font-black",
];

const COLOR_STEPS = [
  "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
  "bg-[#EDF6E2] text-[#48821C] border-[#80C341]/30 hover:bg-[#80C341]/20",
  "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
  "bg-[#DCEFC7] text-[#2A4D1F] border-[#80C341]/50 hover:bg-[#80C341]/30",
  "bg-[#222A1E] text-[#B8E986] border-[#48821C] hover:bg-[#2D3A28]",
];

/**
 * Top Trending Keywords / Topics - a tag-bar alternative to a literal word cloud,
 * sized and colored by how often each theme appears in the current filtered mentions.
 */
export const TrendingKeywordsCloud: React.FC<TrendingKeywordsCloudProps> = ({ mentions, onSelectKeyword }) => {
  const keywordCounts = useMemo(() => {
    const counts = new Map<string, number>();
    mentions.forEach((m) => {
      const theme = (m.theme || "").trim();
      if (!theme) return;
      counts.set(theme, (counts.get(theme) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16);
  }, [mentions]);

  if (keywordCounts.length === 0) {
    return null;
  }

  const maxCount = keywordCounts[0][1];
  const minCount = keywordCounts[keywordCounts.length - 1][1];
  const range = Math.max(1, maxCount - minCount);

  const bucketFor = (count: number) => {
    const ratio = (count - minCount) / range;
    return Math.min(SIZE_STEPS.length - 1, Math.round(ratio * (SIZE_STEPS.length - 1)));
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
      <div className="flex items-center gap-2 mb-3">
        <Tags className="w-4 h-4 text-[#48821C]" />
        <h3 className="font-extrabold text-sm text-slate-900">Top Trending Keywords &amp; Topics</h3>
        <span className="text-[10px] text-slate-400 font-mono ml-auto">
          {keywordCounts.length} topics across {mentions.length} mentions
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {keywordCounts.map(([theme, count]) => {
          const bucket = bucketFor(count);
          return (
            <button
              key={theme}
              onClick={() => onSelectKeyword?.(theme)}
              title={`${count} mention${count === 1 ? "" : "s"} tagged "${theme}"`}
              className={`rounded-full border transition-colors cursor-pointer ${SIZE_STEPS[bucket]} ${COLOR_STEPS[bucket]}`}
            >
              {theme}
              <span className="ml-1.5 opacity-70 font-mono">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TrendingKeywordsCloud;
