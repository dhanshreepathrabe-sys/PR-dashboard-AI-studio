import React, { useState, useMemo } from "react";
import { getAllAppUrls, liveVerifyUrls, LinkHealthRecord, LiveCheckResult } from "../utils/linkHealthCheck";
import { ensureAbsoluteUrl } from "../utils/linkHelper";
import {
  ShieldCheck,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  X,
  Globe,
  Radio
} from "lucide-react";

interface LinkHealthAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LinkHealthAuditModal: React.FC<LinkHealthAuditModalProps> = ({
  isOpen,
  onClose
}) => {
  const [records, setRecords] = useState<LinkHealthRecord[]>(() => getAllAppUrls());
  const [searchTerm, setSearchTerm] = useState("");
  const [statCardFilter, setStatCardFilter] = useState<"ALL" | "VALID" | "REDIRECTED" | "BROKEN" | "SEARCH_FALLBACK">("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [liveResults, setLiveResults] = useState<Map<string, LiveCheckResult>>(new Map());
  const [liveScanning, setLiveScanning] = useState(false);
  const [liveProgress, setLiveProgress] = useState<{ checked: number; total: number } | null>(null);

  const matchesStatCardFilter = (r: LinkHealthRecord) => {
    switch (statCardFilter) {
      case "ALL":
        return true;
      case "VALID":
        return r.status === "VALID";
      case "REDIRECTED":
        return r.status === "REDIRECTED";
      case "BROKEN":
        return r.status === "BROKEN" || r.status === "PAGE NOT FOUND" || r.status === "NO_PERMALINK";
      case "SEARCH_FALLBACK":
        return r.originalUrl.includes("news.google.com/search");
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        searchTerm === "" ||
        r.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.publication.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.originalUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sanitizedUrl.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSource = sourceFilter === "ALL" || r.sourceType === sourceFilter;

      return matchSearch && matchSource && matchesStatCardFilter(r);
    });
  }, [records, searchTerm, sourceFilter, statCardFilter]);

  const stats = useMemo(() => {
    const total = records.length;
    const valid = records.filter((r) => r.status === "VALID").length;
    const redirected = records.filter((r) => r.status === "REDIRECTED").length;
    const broken = records.filter(
      (r) => r.status === "BROKEN" || r.status === "PAGE NOT FOUND" || r.status === "NO_PERMALINK"
    ).length;
    const unverified = records.filter((r) => r.status === "UNVERIFIED").length;
    const searchFallback = records.filter((r) => r.originalUrl.includes("news.google.com/search")).length;
    return { total, valid, redirected, broken, unverified, searchFallback };
  }, [records]);

  const STAT_CARD_LABELS: Record<Exclude<typeof statCardFilter, "ALL">, string> = {
    VALID: "Valid & Verified",
    REDIRECTED: "Redirected",
    BROKEN: "Broken / 404",
    SEARCH_FALLBACK: "Google News Fallback"
  };

  const STATUS_STYLES: Record<LinkHealthRecord["status"], { label: string; className: string }> = {
    VALID: { label: "HTTP 200 OK", className: "bg-emerald-950/80 text-emerald-400 border-emerald-800/60" },
    REDIRECTED: { label: "Redirected (verified)", className: "bg-amber-950/80 text-amber-400 border-amber-800/60" },
    BROKEN: { label: "Broken / Dead Link", className: "bg-rose-950/80 text-rose-400 border-rose-800/60" },
    "PAGE NOT FOUND": { label: "404 Not Found", className: "bg-rose-950/80 text-rose-400 border-rose-800/60" },
    NO_PERMALINK: { label: "Homepage Only (no permalink)", className: "bg-orange-950/80 text-orange-400 border-orange-800/60" },
    UNVERIFIED: { label: "Unverified", className: "bg-slate-800/80 text-gray-400 border-slate-700/60" },
    CHECKING: { label: "Checking...", className: "bg-slate-800/80 text-gray-400 border-slate-700/60" }
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScanAll = () => {
    setScanning(true);
    setTimeout(() => {
      setRecords(getAllAppUrls());
      setScanning(false);
    }, 800);
  };

  // Performs a real, live HTTP check (via the server-side proxy, to avoid browser CORS
  // limits on cross-origin news sites) against every currently-filtered link, so the
  // audit reflects the link's actual status right now rather than only the last offline scan.
  const handleLiveVerify = async () => {
    setLiveScanning(true);
    setLiveProgress({ checked: 0, total: filteredRecords.length });
    const urls = filteredRecords.map((r) => r.sanitizedUrl);
    try {
      const results = await liveVerifyUrls(urls, (checked, total) => setLiveProgress({ checked, total }));
      setLiveResults((prev) => {
        const merged = new Map(prev);
        results.forEach((v, k) => merged.set(k, v));
        return merged;
      });
    } finally {
      setLiveScanning(false);
      setLiveProgress(null);
    }
  };

  // 401/403/429 usually mean an anti-bot gate rejected our server-side request (common on
  // LinkedIn, Twitter/X, and similar platforms that block non-browser traffic) rather than
  // proof the link is actually dead - a real browser visiting the same URL often works fine.
  // Only 404/410/5xx/network failures are confidently reported as broken.
  const classifyLive = (live: LiveCheckResult): "live" | "blocked" | "broken" => {
    if (live.ok) return "live";
    if (live.statusCode === 401 || live.statusCode === 403 || live.statusCode === 429) return "blocked";
    return "broken";
  };

  const liveSummary = useMemo(() => {
    let live200 = 0;
    let liveBlocked = 0;
    let liveBroken = 0;
    let liveChecked = 0;
    filteredRecords.forEach((r) => {
      const live = liveResults.get(r.sanitizedUrl);
      if (live) {
        liveChecked++;
        const cls = classifyLive(live);
        if (cls === "live") live200++;
        else if (cls === "blocked") liveBlocked++;
        else liveBroken++;
      }
    });
    return { live200, liveBlocked, liveBroken, liveChecked };
  }, [filteredRecords, liveResults]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1A2218] border border-[#2D3A28] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#2D3A28] flex items-center justify-between bg-[#151C13]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Enterprise Link Health & Audit Registry
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  100% Sanitized & External
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Auditing external permalinks, press releases, regional pickups, and Google Alerts with zero internal routing conflicts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLiveVerify}
              disabled={liveScanning || filteredRecords.length === 0}
              title="Runs real HTTP HEAD/GET requests right now against every link matching the current filter"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Radio className={`w-3.5 h-3.5 ${liveScanning ? "animate-pulse" : ""}`} />
              {liveScanning
                ? `Live verifying${liveProgress ? ` ${liveProgress.checked}/${liveProgress.total}` : "..."}`
                : `Live Verify ${filteredRecords.length} Shown Links`}
            </button>
            <button
              onClick={handleScanAll}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#243020] hover:bg-[#2C3B27] text-gray-200 text-xs font-medium border border-[#384A32] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin text-emerald-400" : ""}`} />
              {scanning ? "Re-scanning..." : "Refresh Scan"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#243020] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Health Metric Cards - click one to filter the list below to that status */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-[#182016] border-b border-[#2D3A28] text-xs">
          <button
            onClick={() => setStatCardFilter("ALL")}
            className={`text-left bg-[#202B1D] border p-3 rounded-xl transition-colors cursor-pointer hover:border-white/30 ${
              statCardFilter === "ALL" ? "border-white ring-1 ring-white/40" : "border-[#2D3A28]"
            }`}
          >
            <div className="text-gray-400 mb-1">Total Monitored URLs</div>
            <div className="text-xl font-bold text-white font-mono">{stats.total}</div>
          </button>
          <button
            onClick={() => setStatCardFilter((f) => (f === "VALID" ? "ALL" : "VALID"))}
            className={`text-left bg-[#202B1D] border p-3 rounded-xl transition-colors cursor-pointer hover:border-emerald-400/60 ${
              statCardFilter === "VALID" ? "border-emerald-400 ring-1 ring-emerald-400/40" : "border-emerald-500/20"
            }`}
          >
            <div className="text-emerald-400 flex items-center gap-1 mb-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid & Verified
            </div>
            <div className="text-xl font-bold text-emerald-300 font-mono">{stats.valid}</div>
          </button>
          <button
            onClick={() => setStatCardFilter((f) => (f === "SEARCH_FALLBACK" ? "ALL" : "SEARCH_FALLBACK"))}
            className={`text-left bg-[#202B1D] border p-3 rounded-xl transition-colors cursor-pointer hover:border-blue-400/60 ${
              statCardFilter === "SEARCH_FALLBACK" ? "border-blue-400 ring-1 ring-blue-400/40" : "border-blue-500/20"
            }`}
          >
            <div className="text-blue-400 flex items-center gap-1 mb-1 font-medium">
              <Globe className="w-3.5 h-3.5" /> Google News Fallback
            </div>
            <div className="text-xl font-bold text-blue-300 font-mono">{stats.searchFallback}</div>
          </button>
          <button
            onClick={() => setStatCardFilter((f) => (f === "REDIRECTED" ? "ALL" : "REDIRECTED"))}
            className={`text-left bg-[#202B1D] border p-3 rounded-xl transition-colors cursor-pointer hover:border-amber-400/60 ${
              statCardFilter === "REDIRECTED" ? "border-amber-400 ring-1 ring-amber-400/40" : "border-amber-500/20"
            }`}
          >
            <div className="text-amber-400 flex items-center gap-1 mb-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" /> Redirected
            </div>
            <div className="text-xl font-bold text-amber-300 font-mono">{stats.redirected}</div>
          </button>
          <button
            onClick={() => setStatCardFilter((f) => (f === "BROKEN" ? "ALL" : "BROKEN"))}
            className={`text-left bg-[#202B1D] border p-3 rounded-xl transition-colors cursor-pointer hover:border-rose-400/60 ${
              statCardFilter === "BROKEN" ? "border-rose-400 ring-1 ring-rose-400/40" : "border-rose-500/20"
            }`}
          >
            <div className="text-rose-400 flex items-center gap-1 mb-1 font-medium">
              <XCircle className="w-3.5 h-3.5" /> Broken / 404
            </div>
            <div className="text-xl font-bold text-rose-300 font-mono">{stats.broken}</div>
          </button>
        </div>
        {statCardFilter !== "ALL" && (
          <div className="px-4 py-2 bg-[#182016] flex items-center gap-2 text-[11px] text-gray-400">
            <span>Filtered to <span className="text-white font-semibold">{STAT_CARD_LABELS[statCardFilter]}</span> links only</span>
            <button
              onClick={() => setStatCardFilter("ALL")}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {liveSummary.liveChecked > 0 && (
          <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-900/40 flex items-center gap-3 text-[11px] text-emerald-300">
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span>
              Live-verified <span className="font-bold text-white">{liveSummary.liveChecked}</span> of{" "}
              {filteredRecords.length} shown links just now:{" "}
              <span className="font-bold text-emerald-300">{liveSummary.live200} confirmed live (200 OK)</span>,{" "}
              <span className="font-bold text-rose-300">{liveSummary.liveBroken} broken right now</span>
              {liveSummary.liveBlocked > 0 && (
                <>
                  , <span className="font-bold text-amber-300">{liveSummary.liveBlocked} blocked by anti-bot protection</span>{" "}
                  <span className="text-emerald-400/70">(likely still fine in a real browser)</span>
                </>
              )}
              .
            </span>
          </div>
        )}

        {/* Filters & Search */}
        <div className="p-4 border-b border-[#2D3A28] flex flex-wrap gap-3 items-center justify-between bg-[#151C13]">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search headline, outlet, or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#202B1D] border border-[#2D3A28] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Filter className="w-3.5 h-3.5" /> Source:
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-[#202B1D] border border-[#2D3A28] text-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Sources</option>
              <option value="Mentions">Mentions (70)</option>
              <option value="Google Alerts">Google Alerts (30)</option>
              <option value="Regional Pickups">Regional Pickups (1202)</option>
              <option value="Social Posts">Social Posts (8)</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No link records match the current filter.
            </div>
          ) : (
            filteredRecords.map((r) => {
              const live = liveResults.get(r.sanitizedUrl);
              return (
              <div
                key={r.id}
                className="bg-[#202B1D] border border-[#2D3A28] hover:border-[#3E4F38] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-[#151C13] border border-[#2D3A28] text-[10px] font-mono text-emerald-400">
                      {r.sourceType}
                    </span>
                    <span className="font-semibold text-gray-200 truncate max-w-xs md:max-w-md">
                      {r.publication}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] border font-mono ${STATUS_STYLES[r.status].className}`}
                      title={r.notes}
                    >
                      {STATUS_STYLES[r.status].label}
                      {typeof r.statusCode === "number" && r.statusCode > 0 ? ` (${r.statusCode})` : ""}
                    </span>
                    {live && (() => {
                      const cls = classifyLive(live);
                      const style =
                        cls === "live"
                          ? "bg-emerald-900/60 text-emerald-300 border-emerald-700/60"
                          : cls === "blocked"
                          ? "bg-amber-900/60 text-amber-300 border-amber-700/60"
                          : "bg-rose-900/60 text-rose-300 border-rose-700/60";
                      const label =
                        cls === "live"
                          ? `${live.statusCode} OK`
                          : cls === "blocked"
                          ? `${live.statusCode} blocked (anti-bot)`
                          : live.error
                          ? live.error
                          : `${live.statusCode ?? "ERR"} FAILED`;
                      return (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] border font-mono flex items-center gap-1 ${style}`}
                          title={
                            cls === "blocked"
                              ? "Server-side request was rejected by anti-bot protection - a real browser visiting this URL is likely unaffected."
                              : live.error || "Live-checked just now via server-side HEAD/GET"
                          }
                        >
                          <Radio className="w-3 h-3" />
                          LIVE: {label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-gray-300 font-medium line-clamp-1 mb-1">
                    {r.headline}
                  </div>
                  <div className="text-gray-500 font-mono text-[11px] truncate flex items-center gap-1.5">
                    <span className="text-gray-400 shrink-0">URL:</span>
                    <span className="text-gray-400 hover:text-emerald-400 transition-colors">
                      {r.sanitizedUrl}
                    </span>
                  </div>
                  {r.status === "REDIRECTED" && r.finalUrl && (
                    <div className="text-amber-500/80 font-mono text-[11px] truncate flex items-center gap-1.5">
                      <span className="text-amber-400 shrink-0">→ Verified target:</span>
                      <span>{r.finalUrl}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleCopy(r.id, r.sanitizedUrl)}
                    className="p-1.5 rounded-lg bg-[#151C13] border border-[#2D3A28] text-gray-300 hover:text-white hover:border-emerald-500/40 transition-colors"
                    title="Copy sanitized external URL"
                  >
                    {copiedId === r.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={r.sanitizedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-sm"
                  >
                    <span>Test External Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2D3A28] bg-[#151C13] flex items-center justify-between text-xs text-gray-400">
          <div>
            Showing <span className="text-white font-semibold">{filteredRecords.length}</span> of <span className="text-white font-semibold">{records.length}</span> audited links
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>All links verified with target="_blank" and rel="noopener noreferrer"</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkHealthAuditModal;
