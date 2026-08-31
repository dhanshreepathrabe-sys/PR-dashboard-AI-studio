import React from "react";
import { Sparkles, RefreshCw, Trophy, AlertTriangle, Star, ShieldCheck, FileText, Download } from "lucide-react";
import { AIBriefingData } from "../types";

interface AIBriefingBannerProps {
  briefing: AIBriefingData | null;
  loading: boolean;
  onRefresh: () => void;
  campaignName: string;
  onShareCampaignPdf?: (campaign: string) => void;
}

export const AIBriefingBanner: React.FC<AIBriefingBannerProps> = ({
  briefing,
  loading,
  onRefresh,
  campaignName,
  onShareCampaignPdf,
}) => {
  const activeCampaign = campaignName || "GCC & Middle East Expansion (ICC Loyalty)";
  return (
    <div className="bg-gradient-to-br from-[#2A4D1F] via-[#222A1E] to-[#1E241B] rounded-2xl p-4 md:p-6 text-[#EAF2DF] shadow-md border border-[#48821C]/40 relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#80C341]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#87BD28]/20 flex items-center justify-center text-[#87BD28]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#87BD28]">
              AI Executive PR Intelligence Briefing
            </span>
            <h2 className="text-sm font-bold text-white">
              Campaign: <span className="text-[#80C341]">{activeCampaign}</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onShareCampaignPdf && (
            <button
              onClick={() => onShareCampaignPdf(activeCampaign)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-red-400/40 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Export Executive PR PDF Report with metrics and verified links"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Share Campaign PDF Report</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/15 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#87BD28] ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Analyzing..." : "Re-generate Insights"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <Sparkles className="w-6 h-6 text-[#87BD28] animate-spin mb-2" />
          <p className="text-xs text-[#DCE9CE]">Synthesizing PR value, reach distribution, and sentiment sentiment narrative...</p>
        </div>
      ) : briefing ? (
        <div className="mt-3.5 space-y-3 text-xs leading-relaxed text-[#DCE9CE]">
          <p className="text-sm font-medium text-white leading-normal">
            {briefing.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Media Wins */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex items-center gap-1.5 text-[#80C341] font-bold uppercase text-[10px] tracking-wider mb-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>Key PR Wins</span>
              </div>
              <ul className="space-y-1 list-disc list-inside text-white/90">
                {briefing.wins?.map((win, i) => (
                  <li key={i}>{win}</li>
                ))}
              </ul>
            </div>

            {/* Watch / Follow-ups */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex items-center gap-1.5 text-[#FBEFD8] font-bold uppercase text-[10px] tracking-wider mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#9A6A18]" />
                <span>Strategic Gaps &amp; Action</span>
              </div>
              <ul className="space-y-1 list-disc list-inside text-white/90">
                {briefing.watch?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Standout Story */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex items-center gap-1.5 text-[#87BD28] font-bold uppercase text-[10px] tracking-wider mb-1.5">
                <Star className="w-3.5 h-3.5" />
                <span>Highest Impact Coverage</span>
              </div>
              <p className="text-white/90 italic">
                "{briefing.topStory}"
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
