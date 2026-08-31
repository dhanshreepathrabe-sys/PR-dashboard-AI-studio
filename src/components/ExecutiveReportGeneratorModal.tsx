import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Calendar,
  Filter,
  Check,
  Loader2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  ListOrdered,
  BookOpen,
  Share2,
  Copy
} from "lucide-react";
import { FilterState, MediaMention, RegionalPickup } from "../types";
import { generateExecutivePRPdfReport, formatINR, formatReach } from "../utils/generateExecutivePdfReport";
import { ensureAbsoluteUrl } from "../utils/exportCsv";

interface ExecutiveReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  mentions: (MediaMention | RegionalPickup)[];
  availableCampaigns: string[];
}

export const ExecutiveReportGeneratorModal: React.FC<ExecutiveReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  filters,
  mentions,
  availableCampaigns,
}) => {
  const [reportType, setReportType] = useState<"executive" | "detailed" | "full">("detailed");

  const [sections, setSections] = useState({
    kpiSummary: true,
    prCharts: true,
    aiInsights: true,
    keyHighlights: true,
    completeCoverage: true,
    articleLinks: true,
  });

  const [generationState, setGenerationState] = useState<"idle" | "generating" | "ready">("idle");
  const [generatedFilename, setGeneratedFilename] = useState<string>("");
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState<string>("");
  const [generatedPages, setGeneratedPages] = useState<number>(1);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState(false);

  // Format date range text
  const dateRangeText = useMemo(() => {
    const today = new Date();
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (filters.dateRange === "today") return `Today (${fmt(today)})`;
    if (filters.dateRange === "7") return "Last 7 Days (12 Aug 2026 – 19 Aug 2026)";
    if (filters.dateRange === "30") return "Last 30 Days (20 Jul 2026 – 19 Aug 2026)";
    if (filters.dateRange === "90") return "Last 90 Days (20 May 2026 – 19 Aug 2026)";
    if (filters.dateRange === "ytd") return `Year-to-Date (1 Jan ${today.getFullYear()} – ${fmt(today)})`;
    return "1 Aug 2026 – 19 Aug 2026 (All Tracked Period)";
  }, [filters.dateRange]);

  // Format active campaign text
  const campaignText = useMemo(() => {
    if (filters.campaign && filters.campaign !== "all") {
      return filters.campaign;
    }
    return "All Active Campaigns (Mintoak Global Portfolio)";
  }, [filters.campaign]);

  // Active filters summary
  const activeFiltersSummary = useMemo(() => {
    const parts = [];
    if (filters.campaign !== "all") parts.push(`Campaign: ${filters.campaign}`);
    if (filters.sentiment !== "all") parts.push(`Sentiment: ${filters.sentiment}`);
    if (filters.categoryTier !== "all") parts.push(`Tier: ${filters.categoryTier}`);
    if (filters.country !== "all") parts.push(`Country: ${filters.country}`);
    if (filters.searchQuery) parts.push(`Search: "${filters.searchQuery}"`);
    return parts.length > 0 ? parts.join("  |  ") : "All Unfiltered Records";
  }, [filters]);

  // Total Reach & PR Value for preview
  const previewMetrics = useMemo(() => {
    const count = mentions.length;
    const totalReach = mentions.reduce((acc, m) => acc + ((m as any).reach || (m as any).trafficNum || 0), 0);
    const totalPRValue = mentions.reduce((acc, m) => acc + ((m as any).prValueINR || Math.round(((m as any).trafficNum || 50000) * 0.45)), 0);
    const uniqueOutlets = new Set(
      mentions.map((m) => (m as any).publication || (m as any).outletName || "Outlet")
    ).size;

    return {
      count,
      uniqueOutlets,
      reach: formatReach(totalReach),
      prValue: formatINR(totalPRValue),
    };
  }, [mentions]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (mentions.length === 0) return;

    setGenerationState("generating");

    setTimeout(() => {
      try {
        const result = generateExecutivePRPdfReport({
          reportType,
          dateRangeText,
          campaignName: campaignText,
          activeFiltersSummary,
          filters,
          mentions,
          sections,
        });

        setGeneratedFilename(result.filename || String(result));
        setGeneratedBlobUrl(result.blobUrl || "");
        setGeneratedPages(result.totalPages || 1);
        setGenerationState("ready");
      } catch (err) {
        console.error("PDF generation failed:", err);
        setGenerationState("idle");
      }
    }, 400);
  };

  const handleCopySummary = () => {
    const summaryText = `📊 EXECUTIVE PR DOSSIER: ${campaignText.toUpperCase()}
Mintoak Media Intelligence & PR Analytics

KEY REPORT METRICS:
• Scope: ${activeFiltersSummary}
• Total Tracked Placements: ${previewMetrics.count.toLocaleString()}
• Estimated Readership / Reach: ${previewMetrics.reach}
• Total PR Value (AVE): ${previewMetrics.prValue}
• Unique Publications: ${previewMetrics.uniqueOutlets}

TOP SAMPLE LINKS (${Math.min(10, mentions.length)} of ${mentions.length}):
${mentions
  .slice(0, 10)
  .map(
    (m, i) =>
      `${i + 1}. [${(m as any).publication || (m as any).outletName}] ${(m as any).headline}\n   Link: ${ensureAbsoluteUrl((m as any).url)}`
  )
  .join("\n\n")}

Generated via Mintoak AI PR Tracker • Official Executive Audit`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  const handleCopyAllLinks = () => {
    const linksOnly = mentions
      .map((m) => ensureAbsoluteUrl((m as any).url))
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(linksOnly);
    setCopiedLinks(true);
    setTimeout(() => setCopiedLinks(false), 3000);
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#1C2319] p-5 sm:p-6 text-white border-b border-[#2D3A28] flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#80C341]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center shadow-md border border-red-400/40">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#80C341]/20 text-[#80C341] text-[10px] font-black uppercase tracking-wider border border-[#80C341]/30">
                Official PDF Export
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Generate Executive PR Report
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs text-slate-700">
          {/* Empty Data Handling (Section 15) */}
          {mentions.length === 0 ? (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-900">
                  No PR coverage was found for the selected filters.
                </h3>
                <p className="text-xs text-amber-700 max-w-md mx-auto">
                  Please return to the dashboard and adjust or clear your filter criteria to include mentions in the report.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Return to Dashboard &amp; Adjust Filters
              </button>
            </div>
          ) : (
            <>
              {/* Context / Metadata Ribbon */}
              <div className="bg-[#F8FAF5] p-4 rounded-2xl border border-[#DCE9CE] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE9CE] pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Calendar className="w-3.5 h-3.5 text-[#48821C]" />
                    <span>Reporting Period:</span>
                    <span className="text-[#48821C] font-mono">{dateRangeText}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    {previewMetrics.count} matching mentions ({previewMetrics.uniqueOutlets} outlets)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block">Target Campaign / Brand:</span>
                    <strong className="text-slate-900">{campaignText}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Scope / Filters:</span>
                    <strong className="text-slate-800">{activeFiltersSummary}</strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-[11px] font-mono text-slate-600 border-t border-[#DCE9CE]/60">
                  <div className="flex items-center gap-3">
                    <span>Est. Reach: <strong className="text-[#48821C]">{previewMetrics.reach}</strong></span>
                    <span>•</span>
                    <span>PR Value (AVE): <strong className="text-emerald-700">{previewMetrics.prValue}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyAllLinks}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedLinks ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLinks ? "URLs Copied!" : "Copy URLs"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="px-2.5 py-1 bg-[#80C341]/15 hover:bg-[#80C341]/25 text-[#2D5A12] border border-[#80C341]/30 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedSummary ? <Check className="w-3 h-3 text-emerald-600" /> : <Share2 className="w-3 h-3" />}
                      <span>{copiedSummary ? "Briefing Copied!" : "Copy Briefing"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. Report Type Selection (Section 12) */}
              <div className="space-y-2">
                <label className="font-extrabold text-xs uppercase tracking-wider text-slate-900 block">
                  Report Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Executive Summary */}
                  <label
                    onClick={() => setReportType("executive")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      reportType === "executive"
                        ? "bg-emerald-50/70 border-[#48821C] ring-2 ring-[#48821C]/20 text-slate-900"
                        : "bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs">Executive Summary</span>
                      <input
                        type="radio"
                        name="reportType"
                        checked={reportType === "executive"}
                        onChange={() => setReportType("executive")}
                        className="text-[#48821C] focus:ring-[#48821C]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Concise 3–5 page briefing with KPIs, AI narrative, top 5 highlights &amp; key insights.
                    </p>
                  </label>

                  {/* Detailed PR Report */}
                  <label
                    onClick={() => setReportType("detailed")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      reportType === "detailed"
                        ? "bg-emerald-50/70 border-[#48821C] ring-2 ring-[#48821C]/20 text-slate-900"
                        : "bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs">Detailed PR Report</span>
                        <span className="bg-[#48821C] text-white text-[8px] font-black px-1.5 py-0.2 rounded-full">
                          RECOMMENDED
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="reportType"
                        checked={reportType === "detailed"}
                        onChange={() => setReportType("detailed")}
                        className="text-[#48821C] focus:ring-[#48821C]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Full executive briefing + charts + complete multi-page coverage table with clickable links.
                    </p>
                  </label>

                  {/* Full Coverage Report */}
                  <label
                    onClick={() => setReportType("full")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      reportType === "full"
                        ? "bg-emerald-50/70 border-[#48821C] ring-2 ring-[#48821C]/20 text-slate-900"
                        : "bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs">Full Coverage</span>
                      <input
                        type="radio"
                        name="reportType"
                        checked={reportType === "full"}
                        onChange={() => setReportType("full")}
                        className="text-[#48821C] focus:ring-[#48821C]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Focus on all {mentions.length} mentions, comprehensive metrics &amp; complete URL appendix.
                    </p>
                  </label>
                </div>
              </div>

              {/* 2. Sections to Include Checkboxes (Section 11) */}
              <div className="space-y-2">
                <label className="font-extrabold text-xs uppercase tracking-wider text-slate-900 block">
                  Sections to Include
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label
                    onClick={() => toggleSection("kpiSummary")}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sections.kpiSummary}
                      onChange={() => toggleSection("kpiSummary")}
                      className="rounded text-[#48821C] focus:ring-[#48821C]"
                    />
                    <span className="font-semibold text-slate-800 text-[11px]">KPI Summary</span>
                  </label>

                  <label
                    onClick={() => toggleSection("prCharts")}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sections.prCharts}
                      onChange={() => toggleSection("prCharts")}
                      className="rounded text-[#48821C] focus:ring-[#48821C]"
                    />
                    <span className="font-semibold text-slate-800 text-[11px]">PR Charts</span>
                  </label>

                  <label
                    onClick={() => toggleSection("aiInsights")}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sections.aiInsights}
                      onChange={() => toggleSection("aiInsights")}
                      className="rounded text-[#48821C] focus:ring-[#48821C]"
                    />
                    <span className="font-semibold text-slate-800 text-[11px]">AI Insights</span>
                  </label>

                  <label
                    onClick={() => toggleSection("keyHighlights")}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sections.keyHighlights}
                      onChange={() => toggleSection("keyHighlights")}
                      className="rounded text-[#48821C] focus:ring-[#48821C]"
                    />
                    <span className="font-semibold text-slate-800 text-[11px]">Key PR Highlights</span>
                  </label>

                  <label
                    onClick={() => toggleSection("completeCoverage")}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sections.completeCoverage}
                      onChange={() => toggleSection("completeCoverage")}
                      className="rounded text-[#48821C] focus:ring-[#48821C]"
                    />
                    <span className="font-semibold text-slate-800 text-[11px]">Complete Coverage</span>
                  </label>

                  <label
                    onClick={() => toggleSection("articleLinks")}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sections.articleLinks}
                      onChange={() => toggleSection("articleLinks")}
                      className="rounded text-[#48821C] focus:ring-[#48821C]"
                    />
                    <span className="font-semibold text-slate-800 text-[11px]">Article Links</span>
                  </label>
                </div>
              </div>

              {/* Status / State Display */}
              {generationState === "generating" && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 animate-in fade-in">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-blue-900">
                      Generating your executive PR report…
                    </p>
                    <p className="text-[10px] text-blue-700">
                      Synthesizing metrics, validating hyperlinks, and rendering multi-page tables...
                    </p>
                  </div>
                </div>
              )}

              {generationState === "ready" && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-[#F3F9EE] to-teal-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-emerald-950">
                          Executive PR PDF Report Ready
                        </p>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                          {generatedPages} Pages
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 font-mono truncate max-w-sm">
                        {generatedFilename}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    {generatedBlobUrl && (
                      <a
                        href={generatedBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in New Tab</span>
                      </a>
                    )}
                    <a
                      href={generatedBlobUrl}
                      download={generatedFilename}
                      className="flex-1 sm:flex-initial px-3 py-2 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Direct Download</span>
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#48821C]" />
            <span>Preserves exact URLs, Indian ₹ formatting, and leadership typography.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>

            {mentions.length > 0 && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generationState === "generating"}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {generationState === "generating" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF…</span>
                  </>
                ) : generationState === "ready" ? (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF Again</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Generate PDF</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
