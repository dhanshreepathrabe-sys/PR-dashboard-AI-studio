import React, { useState } from "react";
import { BookOpen, MessageSquare, ChevronRight, MapPin, Award, CheckCircle2, UserCheck, Eye, DollarSign, FileText, Download, ExternalLink, Link2, Search, Link2Off } from "lucide-react";
import { MediaMention } from "../types";
import { ensureAbsoluteUrl, isValidArticleUrl, getGoogleNewsSearchUrl } from "../utils/linkHelper";

interface CoverageFeedProps {
  mentions: MediaMention[];
  onSelectMention: (mention: MediaMention) => void;
  selectedPublicationFilter: string | null;
  onClearPublicationFilter: () => void;
  onDownloadCSV?: () => void;
}

export const CoverageFeed: React.FC<CoverageFeedProps> = ({
  mentions,
  onSelectMention,
  selectedPublicationFilter,
  onClearPublicationFilter,
  onDownloadCSV,
}) => {

  const [sortOrder, setSortOrder] = useState<"date_desc" | "date_asc" | "prValue" | "reach">("date_desc");

  const sortedMentions = [...mentions].sort((a, b) => {
    if (sortOrder === "prValue") return b.prValueINR - a.prValueINR;
    if (sortOrder === "reach") return b.reach - a.reach;
    if (sortOrder === "date_asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <span className="bg-[#EDF6E2] text-[#48821C] font-bold px-2 py-0.5 rounded-full text-[10px] border border-[#80C341]/30">Positive</span>;
      case "neutral":
        return <span className="bg-[#EEF0EA] text-[#6B7566] font-bold px-2 py-0.5 rounded-full text-[10px]">Neutral</span>;
      case "negative":
        return <span className="bg-[#FBE7E2] text-[#C1462F] font-bold px-2 py-0.5 rounded-full text-[10px]">Negative</span>;
      default:
        return <span className="bg-[#FBEFD8] text-[#9A6A18] font-bold px-2 py-0.5 rounded-full text-[10px]">Mixed</span>;
    }
  };

  const getTierBadge = (tier: string) => {
    if (tier === "A") {
      return <span className="bg-[#48821C] text-white font-extrabold px-2 py-0.5 rounded-full text-[10px]">Tier A</span>;
    }
    if (tier === "B") {
      return <span className="bg-[#EDF6E2] text-[#48821C] font-bold px-2 py-0.5 rounded-full text-[10px] border border-[#80C341]/30">Tier B</span>;
    }
    if (tier === "Wire") {
      return <span className="bg-gray-800 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">Wire Release</span>;
    }
    return <span className="bg-[#EEF0EA] text-[#6B7566] font-bold px-2 py-0.5 rounded-full text-[10px]">Tier C</span>;
  };

  const formatINR = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-4">
      {/* Feed Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E4E9DD]">
        <div className="flex items-center gap-2">
          <h2 className="font-black text-base text-[#1E241B]">Media Mentions Feed</h2>
          <span className="text-xs text-[#6B7566] font-medium">({mentions.length} articles)</span>
          {selectedPublicationFilter && (
            <span className="bg-[#EDF6E2] text-[#48821C] text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-[#80C341]/30">
              Filter: {selectedPublicationFilter}
              <button
                onClick={onClearPublicationFilter}
                className="hover:text-red-600 font-black ml-1 cursor-pointer"
              >
                ✕
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#6B7566] font-medium">Sort by:</span>
          <button
            onClick={() => setSortOrder(sortOrder === "date_desc" ? "date_asc" : "date_desc")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              sortOrder.startsWith("date") ? "bg-[#48821C] text-white" : "bg-[#F7F9F4] text-[#6B7566] hover:bg-[#EDF6E2]"
            }`}
            title="Click to toggle Ascending (Oldest First) vs Descending (Newest First)"
          >
            <span>{sortOrder === "date_asc" ? "Oldest First ↑" : "Newest First ↓"}</span>
          </button>
          <button
            onClick={() => setSortOrder("prValue")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              sortOrder === "prValue" ? "bg-[#48821C] text-white" : "bg-[#F7F9F4] text-[#6B7566] hover:bg-[#EDF6E2]"
            }`}
          >
            Highest PR Value
          </button>
          <button
            onClick={() => setSortOrder("reach")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              sortOrder === "reach" ? "bg-[#48821C] text-white" : "bg-[#F7F9F4] text-[#6B7566] hover:bg-[#EDF6E2]"
            }`}
          >
            Top Reach
          </button>

          {onDownloadCSV && (
            <button
              onClick={onDownloadCSV}
              className="flex items-center gap-1.5 bg-[#EDF6E2] hover:bg-[#80C341]/20 text-[#48821C] border border-[#80C341]/40 font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ml-1"
              title="Download CSV report (Publication, Country, Headline, URL, Reach, PR Value)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Mention Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sortedMentions.map((mention) => {
          const isLinkValid = isValidArticleUrl(mention.url, {
            id: mention.id,
            headline: mention.headline,
            publication: mention.publication,
          });

          const borderClass =
            mention.sentiment === "positive"
              ? "border-l-4 border-l-[#48821C]"
              : mention.sentiment === "negative"
              ? "border-l-4 border-l-[#C1462F]"
              : "border-l-4 border-l-[#9A6A18]";

          return (
            <div
              key={mention.id}
              onClick={() => onSelectMention(mention)}
              className={`bg-white rounded-xl border border-[#E4E9DD] ${borderClass} p-4 shadow-xs hover:shadow-md hover:border-[#48821C]/50 transition-all flex flex-col justify-between group cursor-pointer`}
            >
              <div>
                {/* Outlets & Badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-extrabold text-xs text-[#48821C] uppercase tracking-wider block">
                      {mention.publication}
                    </span>
                    <span className="text-[11px] text-[#6B7566] font-medium">
                      {mention.country} • {mention.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {!isLinkValid && (
                      <span
                        className="bg-amber-50 text-amber-800 border border-amber-200/90 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                        title="Direct source permalink is unavailable for this article"
                      >
                        <Link2Off className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        <span>Link Unavailable</span>
                      </span>
                    )}
                    {getTierBadge(mention.categoryTier)}
                    {getSentimentBadge(mention.sentiment)}
                  </div>
                </div>

                {/* Headline */}
                <h3 className="font-bold text-sm text-[#1E241B] leading-snug group-hover:text-[#48821C] transition-colors mb-2.5 line-clamp-3 flex items-start justify-between gap-1">
                  {isLinkValid ? (
                    <a
                      href={ensureAbsoluteUrl(mention.url, mention.headline, mention.publication)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline flex items-start justify-between gap-1.5 w-full text-inherit cursor-pointer"
                      title="Open live article from publisher in a new tab"
                    >
                      <span>{mention.headline}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#48821C] shrink-0 mt-0.5" />
                    </a>
                  ) : (
                    <span
                      className="text-[#1E241B] flex items-start justify-between gap-1.5 w-full cursor-pointer"
                      title="Direct publisher link is unavailable - Click card for details or use Google News search below"
                    >
                      <span>{mention.headline}</span>
                      <Link2Off className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    </span>
                  )}
                </h3>

                {/* Summary / Excerpt */}
                {mention.summary && (
                  <p className="text-xs text-[#6B7566] line-clamp-2 mb-3 italic">
                    "{mention.summary}"
                  </p>
                )}

                {/* Metadata Tags */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="bg-[#F7F9F4] text-[#1E241B] text-[10px] font-semibold px-2 py-0.5 rounded-md border border-[#E4E9DD]">
                    {mention.theme}
                  </span>
                  {mention.mediaType && (
                    <span className="bg-[#F7F9F4] text-[#6B7566] text-[10px] font-medium px-2 py-0.5 rounded-md">
                      {mention.mediaType}
                    </span>
                  )}
                  {mention.quote && (
                    <span className="bg-[#EDF6E2] text-[#48821C] text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <UserCheck className="w-2.5 h-2.5" /> Quoted
                    </span>
                  )}
                  {mention.exclusive && (
                    <span className="bg-[#9A6A18]/10 text-[#9A6A18] text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      Exclusive
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Metrics & Actions */}
              <div className="pt-2.5 border-t border-[#E4E9DD] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3 text-[#6B7566]">
                  <span title="Advertising Value Equivalency">
                    <strong className="text-[#1E241B]">{formatINR(mention.prValueINR)}</strong> PR
                  </span>
                  <span title="Est. Audience Impressions">
                    <strong className="text-[#1E241B]">{(mention.reach / 1000).toFixed(0)}k</strong> Reach
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isLinkValid ? (
                    <a
                      href={ensureAbsoluteUrl(mention.url, mention.headline, mention.publication)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1 bg-[#48821C] hover:bg-[#386616] text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                      title="Open original source coverage from publisher"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Source</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span
                        className="px-2 py-1 bg-slate-100 text-slate-400 font-semibold rounded-lg text-[10px] cursor-not-allowed border border-slate-200 flex items-center gap-1"
                        title="Direct source permalink is unavailable"
                      >
                        <Link2Off className="w-2.5 h-2.5 text-slate-400" />
                        <span>Link Unavailable</span>
                      </span>
                      <a
                        href={ensureAbsoluteUrl(getGoogleNewsSearchUrl(mention.headline, mention.publication))}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 bg-[#EDF6E2] hover:bg-[#80C341]/20 text-[#48821C] font-bold rounded-lg text-[10px] flex items-center gap-1 border border-[#80C341]/30 transition-colors cursor-pointer"
                        title="Search live indexed coverage on Google News"
                      >
                        <Search className="w-2.5 h-2.5" />
                        <span>Google News</span>
                      </a>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMention(mention);
                    }}
                    className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="View PR metrics and narrative details"
                  >
                    <BookOpen className="w-3 h-3 text-slate-500" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
