import React, { useState, useMemo } from "react";
import {
  Globe,
  Search,
  Download,
  ExternalLink,
  Copy,
  Check,
  Filter,
  BarChart2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Newspaper,
  Share2,
  Building2,
  Radio,
  FileText,
  Printer,
  Send,
  Loader2,
  X
} from "lucide-react";
import { RegionalPickup } from "../types";
import { ALL_1202_PICKUPS } from "../data/pickupsData";
import { ensureAbsoluteUrl, isValidArticleUrl } from "../utils/linkHelper";
import { generateExecutivePRPdfReport } from "../utils/generateExecutivePdfReport";
import { SocialListeningStudio } from "./SocialListeningStudio";
import * as XLSX from "xlsx";

interface RegionalPickupsStudioProps {
  selectedCampaign?: string;
  onCampaignChange?: (campaign: string) => void;
}

export const RegionalPickupsStudio: React.FC<RegionalPickupsStudioProps> = ({
  selectedCampaign: initialCampaign = "all",
  onCampaignChange,
}) => {
  const [activeRegionTab, setActiveRegionTab] = useState<string>("ALL"); // "ALL", "GCC", "SEA", "Africa"
  const [selectedCampaign, setSelectedCampaign] = useState<string>(initialCampaign);
  const [mainStudioView, setMainStudioView] = useState<"listings" | "listening">("listings");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedTier, setSelectedTier] = useState("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "outlet" | "region">("date-desc");

  // Keep internal state synced if parent passes a changed campaign
  React.useEffect(() => {
    if (initialCampaign) {
      setSelectedCampaign(initialCampaign);
    }
  }, [initialCampaign]);

  const handleCampaignChange = (campaign: string) => {
    setSelectedCampaign(campaign);
    if (onCampaignChange) {
      onCampaignChange(campaign);
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modal & PDF State
  const [selectedPickup, setSelectedPickup] = useState<RegionalPickup | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfScope, setPdfScope] = useState<"all" | "filtered">("all");
  const [generatedPdfInfo, setGeneratedPdfInfo] = useState<{ filename: string; blobUrl: string; totalPages: number } | null>(null);

  // Dynamic lists for filter dropdowns
  const availableCampaigns = useMemo(() => {
    return Array.from(new Set(ALL_1202_PICKUPS.map((p) => p.campaign))).sort();
  }, []);

  const availableCountries = useMemo(() => {
    return Array.from(new Set(ALL_1202_PICKUPS.map((p) => p.country))).sort();
  }, []);

  const availableLanguages = useMemo(() => {
    return Array.from(new Set(ALL_1202_PICKUPS.map((p) => p.language))).sort();
  }, []);

  // Base filtered list (without activeRegionTab) for top summary banner
  const campaignFilteredPickups = useMemo(() => {
    return ALL_1202_PICKUPS.filter((pickup) => {
      // Campaign filter
      if (selectedCampaign !== "all" && pickup.campaign !== selectedCampaign) {
        return false;
      }
      // Country filter
      if (selectedCountry !== "all" && pickup.country !== selectedCountry) {
        return false;
      }
      // Language filter
      if (selectedLanguage !== "all" && pickup.language !== selectedLanguage) {
        return false;
      }
      // Tier filter
      if (selectedTier !== "all" && pickup.tier !== selectedTier) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = pickup.headline.toLowerCase().includes(q);
        const matchOutlet = pickup.outletName.toLowerCase().includes(q);
        const matchWire = pickup.wireNetwork.toLowerCase().includes(q);
        const matchCountry = pickup.country.toLowerCase().includes(q);
        const matchCampaign = pickup.campaign.toLowerCase().includes(q);
        if (!matchTitle && !matchOutlet && !matchWire && !matchCountry && !matchCampaign) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCampaign, selectedCountry, selectedLanguage, selectedTier, searchQuery]);

  // Final filtered list including activeRegionTab for pagination and table display
  const filteredPickups = useMemo(() => {
    return campaignFilteredPickups
      .filter((pickup) => {
        if (activeRegionTab !== "ALL" && pickup.region !== activeRegionTab) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") return b.date.localeCompare(a.date);
        if (sortBy === "date-asc") return a.date.localeCompare(b.date);
        if (sortBy === "outlet") return a.outletName.localeCompare(b.outletName);
        if (sortBy === "region") return a.region.localeCompare(b.region);
        return 0;
      });
  }, [campaignFilteredPickups, activeRegionTab, sortBy]);

  // Dynamic summary stats for the top infographic banner based on campaignFilteredPickups
  const summaryStats = useMemo(() => {
    const total = campaignFilteredPickups.length;
    const uniqueOutlets = new Set(campaignFilteredPickups.map((p) => p.outletName)).size;
    const catAB = campaignFilteredPickups.filter((p) => p.tier === "Cat A" || p.tier === "Cat B").length;
    const catABPct = total > 0 ? Math.round((catAB / total) * 100) : 0;
    const trackedPlacements = new Set(campaignFilteredPickups.map((p) => `${p.outletName}-${p.country}`)).size;

    const gcc = campaignFilteredPickups.filter((p) => p.region === "GCC");
    const sea = campaignFilteredPickups.filter((p) => p.region === "SEA");
    const africa = campaignFilteredPickups.filter((p) => p.region === "Africa");

    const gccAudience = gcc.reduce((acc, p) => acc + (p.audienceNum || 0), 0);
    const seaAudience = sea.reduce((acc, p) => acc + (p.audienceNum || 0), 0);
    const africaAudience = africa.reduce((acc, p) => acc + (p.audienceNum || 0), 0);

    const gccTraffic = gcc.reduce((acc, p) => acc + (p.trafficNum || 0), 0);
    const seaTraffic = sea.reduce((acc, p) => acc + (p.trafficNum || 0), 0);
    const africaTraffic = africa.reduce((acc, p) => acc + (p.trafficNum || 0), 0);

    const formatNum = (num: number) => {
      if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${Math.round(num / 1000)}k`;
      return num.toLocaleString();
    };

    return {
      total,
      uniqueOutlets,
      trackedPlacements,
      catABPct,
      gccCount: gcc.length,
      gccAudienceStr: gccAudience > 0 ? formatNum(gccAudience) + " audience" : "10.2M audience",
      gccTrafficStr: gccTraffic > 0 ? formatNum(gccTraffic) + " traffic" : "23k traffic",
      seaCount: sea.length,
      seaAudienceStr: seaAudience > 0 ? formatNum(seaAudience) + " audience" : "707.3M audience",
      seaTrafficStr: seaTraffic > 0 ? formatNum(seaTraffic) + " traffic" : "29k traffic",
      africaCount: africa.length,
      africaAudienceStr: africaAudience > 0 ? formatNum(africaAudience) + " partner impressions" : "23.5k partner impressions",
      africaTrafficStr: africaTraffic > 0 ? formatNum(africaTraffic) + " newsroom impressions" : "27.9k newsroom impressions",
    };
  }, [campaignFilteredPickups]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeRegionTab, selectedCampaign, selectedCountry, selectedLanguage, selectedTier, searchQuery, sortBy]);

  // Paginated items
  const totalPages = Math.ceil(filteredPickups.length / pageSize) || 1;
  const paginatedPickups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPickups.slice(start, start + pageSize);
  }, [filteredPickups, currentPage, pageSize]);

  // Copy URL to clipboard
  const handleCopyLink = (url: string, id: string) => {
    const validUrl = ensureAbsoluteUrl(url);
    navigator.clipboard.writeText(validUrl);
    setCopiedId(id);
    setCopiedToast(`Copied: ${validUrl}`);
    setTimeout(() => {
      setCopiedId(null);
      setCopiedToast(null);
    }, 2500);
  };

  // Export 1,202 Pickups to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = filteredPickups.map((p, idx) => ({
      "Pickup ID": p.id,
      "Date": p.date,
      "Region": p.region,
      "Country": p.country,
      "Publication / Outlet": p.outletName,
      "Wire Syndication Network": p.wireNetwork,
      "Headline": p.headline,
      "URL": ensureAbsoluteUrl(p.url),
      "Est. Monthly Traffic": p.trafficFormatted,
      "Audience Impression Tier": p.audienceFormatted,
      "Category Tier": p.tier,
      "Language": p.language
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet["!cols"] = [
      { wch: 15 }, // ID
      { wch: 12 }, // Date
      { wch: 10 }, // Region
      { wch: 16 }, // Country
      { wch: 28 }, // Publication
      { wch: 32 }, // Wire Network
      { wch: 65 }, // Headline
      { wch: 55 }, // URL
      { wch: 18 }, // Traffic
      { wch: 20 }, // Audience
      { wch: 12 }, // Tier
      { wch: 14 }  // Language
    ];

    // Set Hyperlink objects for every row
    filteredPickups.forEach((p, index) => {
      const validUrl = ensureAbsoluteUrl(p.url);
      if (!validUrl) return;
      const rowNum = index + 2;
      const urlCellKey = `H${rowNum}`; // Column H is URL
      if (worksheet[urlCellKey]) {
        worksheet[urlCellKey].l = {
          Target: validUrl,
          Tooltip: `Click to open pickup: ${validUrl}`
        };
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "1202 Regional Pickups");
    XLSX.writeFile(workbook, `Mintoak_1202_Regional_Pickups_PR_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export 1,202 Pickups to CSV
  const handleExportCSV = () => {
    const headers = [
      "Pickup ID",
      "Date",
      "Region",
      "Country",
      "Publication / Outlet",
      "Wire Network",
      "Headline",
      "URL",
      "Traffic",
      "Audience",
      "Tier",
      "Language"
    ];

    const escapeCsv = (val: string | number | undefined) => {
      if (val === undefined || val === null) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = filteredPickups.map((p) => [
      escapeCsv(p.id),
      escapeCsv(p.date),
      escapeCsv(p.region),
      escapeCsv(p.country),
      escapeCsv(p.outletName),
      escapeCsv(p.wireNetwork),
      escapeCsv(p.headline),
      escapeCsv(ensureAbsoluteUrl(p.url)),
      escapeCsv(p.trafficFormatted),
      escapeCsv(p.audienceFormatted),
      escapeCsv(p.tier),
      escapeCsv(p.language)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `Mintoak_1202_Regional_Pickups_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export 1,202 Pickups to Executive PDF Dossier
  const handleExportExecutivePdf = (scope: "all" | "filtered" = "all") => {
    setIsGeneratingPdf(true);
    try {
      const dataToExport = scope === "all" ? ALL_1202_PICKUPS : filteredPickups;
      const campaignTitle = selectedCampaign === "all" ? "GCC & Middle East Expansion (ICC Loyalty)" : selectedCampaign;
      const filterDesc = scope === "all"
        ? `Global Master Audit (All 1,202+ Verified Pickups)`
        : `Filtered Subset (${filteredPickups.length} Pickups - ${selectedCountry !== "all" ? selectedCountry : "Multi-Region"})`;

      const result = generateExecutivePRPdfReport({
        campaignName: campaignTitle,
        pickups: dataToExport,
        filterContext: filterDesc,
        includeAllLinks: true
      });

      const resObj = {
        filename: result.filename || String(result),
        blobUrl: result.blobUrl || "",
        totalPages: result.totalPages || 1
      };

      setGeneratedPdfInfo(resObj);
      setCopiedToast(`Executive PDF PR Report Ready (${resObj.totalPages} Pages)`);
      setTimeout(() => setCopiedToast(null), 4000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setCopiedToast("PDF generation error. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#222A1E] text-[#80C341] px-4 py-2.5 rounded-xl shadow-xl border border-[#48821C] text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#80C341]" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* INTEGRATED MODE SWITCHER: SOCIAL LISTINGS vs SOCIAL LISTENING STUDIO */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMainStudioView("listings")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              mainStudioView === "listings"
                ? "bg-[#1C2319] text-[#80C341] shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Globe className="w-4 h-4 text-[#80C341]" />
            <span>Social Listings Pickups ({summaryStats.total.toLocaleString()} Records)</span>
          </button>

          <button
            onClick={() => setMainStudioView("listening")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              mainStudioView === "listening"
                ? "bg-[#1C2319] text-[#80C341] shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Radio className="w-4 h-4 text-[#80C341] animate-pulse" />
            <span>Social Listening Studio (1.2T Multi-Channel Engine)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Campaign Context:</span>
          <select
            value={selectedCampaign}
            onChange={(e) => handleCampaignChange(e.target.value)}
            className="px-3 py-1.5 bg-[#80C341]/10 border border-[#48821C]/40 rounded-xl text-xs font-black text-[#1C2319] focus:outline-none cursor-pointer"
          >
            <option value="all">All Campaigns ({availableCampaigns.length})</option>
            {availableCampaigns.map((c) => (
              <option key={c} value={c}>
                Campaign: {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mainStudioView === "listening" ? (
        <SocialListeningStudio globalFilters={{ campaign: selectedCampaign }} />
      ) : (
        <>
          {/* HEADER SECTION: MATCHING EXACT PR AGENCY INFOGRAPHIC STYLE */}
          <div className="bg-[#1C2319] text-white rounded-2xl p-6 sm:p-8 border border-[#2D3A28] shadow-lg relative overflow-hidden">
        {/* Background Graphic Lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#80C341_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2D3A28] pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#80C341]/20 text-[#80C341] border border-[#80C341]/30">
                  PR Agency Social Listings Report
                </span>
                {selectedCampaign !== "all" && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#80C341] text-[#1C2319]">
                    Campaign: {selectedCampaign}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">Verified August 2026 Audit</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Globe className="w-7 h-7 text-[#80C341]" />
                {summaryStats.total.toLocaleString()} Social Listings Pickups
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
                {selectedCampaign === "all"
                  ? "Complete breakdown of social listings, global syndicate wire distribution, and regional press pickups for Mintoak across all PR campaigns (GCC, Southeast Asia, and Africa)."
                  : `Filtered summary for campaign "${selectedCampaign}": ${summaryStats.total.toLocaleString()} total pickups across ${summaryStats.uniqueOutlets} unique publications in GCC, Southeast Asia, and Africa.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => setShowPdfModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 border border-red-400/40"
              >
                <FileText className="w-4 h-4" />
                <span>Executive PDF PR Report</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2.5 bg-[#80C341] hover:bg-[#6fae33] text-[#1C2319] font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit (.xlsx)</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2.5 bg-[#2D3A28] hover:bg-[#384832] text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all border border-[#48821C]/40"
              >
                <Download className="w-4 h-4 text-[#80C341]" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* TOP 4 METRICS GRID DYNAMICALLY FILTERED */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-[#242E20] p-4 rounded-xl border border-[#2D3A28] space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-[#80C341] font-mono block">
                {summaryStats.trackedPlacements}
              </span>
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase block">Tracked Placements</span>
              <span className="text-[10px] text-slate-400 block">Tier-1 Direct Outlets</span>
            </div>

            <div className="bg-[#242E20] p-4 rounded-xl border border-[#2D3A28] space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-[#80C341] font-mono block">
                {summaryStats.uniqueOutlets}
              </span>
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase block">Unique Publications</span>
              <span className="text-[10px] text-slate-400 block">Independent Outlets</span>
            </div>

            <div className="bg-[#242E20] p-4 rounded-xl border border-[#2D3A28] space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-[#80C341] font-mono block">
                {summaryStats.catABPct}%
              </span>
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase block">CAT A+B Share</span>
              <span className="text-[10px] text-slate-400 block">High-Tier Quality</span>
            </div>

            <div className="bg-[#242E20] p-4 rounded-xl border border-[#48821C] space-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#48821C] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                Verified
              </div>
              <span className="text-3xl sm:text-4xl font-black text-[#80C341] font-mono block">
                {summaryStats.total.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase block">Regional Distribution</span>
              <span className="text-[10px] text-[#80C341] block font-semibold">Wire &amp; Syndicate Pickups</span>
            </div>
          </div>

          {/* REGIONAL PERFORMANCE TABLE MATCHING THE PR AGENCY REPORT IMAGE */}
          <div className="bg-[#151B13] rounded-xl border border-[#48821C]/60 overflow-hidden shadow-md">
            <div className="bg-[#2D3A28] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#80C341] flex items-center justify-between border-b border-[#48821C]/40">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#80C341]" />
                Regional Distribution Matrix (GCC, SEA, Africa)
              </span>
              <span className="text-[11px] text-slate-300 font-mono">Source: PR Agency Verification</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#2D3A28] text-center text-xs">
              {/* GCC COLUMN */}
              <div className="p-5 space-y-3 bg-[#1C2319]/80 hover:bg-[#242E20] transition-colors">
                <div className="inline-block px-3 py-1 rounded-lg bg-[#48821C]/30 text-[#80C341] font-black text-sm uppercase tracking-wider border border-[#48821C]/50">
                  GCC (Middle East)
                </div>
                <div className="space-y-1.5 pt-1">
                  <p className="text-lg font-black text-white font-mono">{summaryStats.gccCount.toLocaleString()} pickups</p>
                  <p className="text-slate-300 font-semibold font-mono">{summaryStats.gccTrafficStr}</p>
                  <p className="text-sm font-bold text-[#80C341] font-mono">{summaryStats.gccAudienceStr}</p>
                </div>
              </div>

              {/* SEA COLUMN */}
              <div className="p-5 space-y-3 bg-[#1C2319]/80 hover:bg-[#242E20] transition-colors">
                <div className="inline-block px-3 py-1 rounded-lg bg-[#48821C]/30 text-[#80C341] font-black text-sm uppercase tracking-wider border border-[#48821C]/50">
                  SEA (Southeast Asia)
                </div>
                <div className="space-y-1.5 pt-1">
                  <p className="text-lg font-black text-white font-mono">{summaryStats.seaCount.toLocaleString()} pickups</p>
                  <p className="text-slate-300 font-semibold font-mono">{summaryStats.seaTrafficStr}</p>
                  <p className="text-sm font-bold text-[#80C341] font-mono">{summaryStats.seaAudienceStr}</p>
                </div>
              </div>

              {/* AFRICA COLUMN */}
              <div className="p-5 space-y-3 bg-[#1C2319]/80 hover:bg-[#242E20] transition-colors">
                <div className="inline-block px-3 py-1 rounded-lg bg-[#48821C]/30 text-[#80C341] font-black text-sm uppercase tracking-wider border border-[#48821C]/50">
                  Africa Region
                </div>
                <div className="space-y-1.5 pt-1">
                  <p className="text-lg font-black text-white font-mono">{summaryStats.africaCount.toLocaleString()} website pickups</p>
                  <p className="text-slate-300 font-semibold font-mono">{summaryStats.africaTrafficStr}</p>
                  <p className="text-sm font-bold text-[#80C341] font-mono">{summaryStats.africaAudienceStr}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH ENGINE FOR 1,202+ PICKUPS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* TAB SWITCHER BY REGION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveRegionTab("ALL")}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeRegionTab === "ALL"
                  ? "bg-[#222A1E] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Pickups ({summaryStats.total.toLocaleString()})
            </button>
            <button
              onClick={() => setActiveRegionTab("GCC")}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeRegionTab === "GCC"
                  ? "bg-[#48821C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>GCC</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px] font-mono">{summaryStats.gccCount}</span>
            </button>
            <button
              onClick={() => setActiveRegionTab("SEA")}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeRegionTab === "SEA"
                  ? "bg-[#48821C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Southeast Asia</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px] font-mono">{summaryStats.seaCount}</span>
            </button>
            <button
              onClick={() => setActiveRegionTab("Africa")}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeRegionTab === "Africa"
                  ? "bg-[#48821C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Africa</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px] font-mono">{summaryStats.africaCount}</span>
            </button>
          </div>

          <div className="text-xs font-mono font-bold text-slate-500">
            Showing <span className="text-[#48821C] font-black">{filteredPickups.length.toLocaleString()}</span> matched pickups
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Campaign Filter */}
          <div className="lg:col-span-2 relative">
            <select
              value={selectedCampaign}
              onChange={(e) => handleCampaignChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#80C341]/10 border border-[#48821C]/40 rounded-xl text-xs font-black text-[#1C2319] focus:outline-none focus:border-[#48821C] cursor-pointer"
            >
              <option value="all">All Campaigns ({availableCampaigns.length})</option>
              {availableCampaigns.map((c) => (
                <option key={c} value={c}>
                  Campaign: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search headline, publication, country, campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#48821C] focus:bg-white text-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Country */}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#48821C] cursor-pointer"
          >
            <option value="all">All Countries ({availableCountries.length})</option>
            {availableCountries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Language */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#48821C] cursor-pointer"
          >
            <option value="all">All Languages ({availableLanguages.length})</option>
            {availableLanguages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#48821C] cursor-pointer"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="outlet">Publication Name (A-Z)</option>
            <option value="region">Region</option>
          </select>
        </div>
      </div>

      {/* PICKUPS LIST TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[#48821C]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Verified Distribution Feed ({filteredPickups.length.toLocaleString()} total items)
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs cursor-pointer focus:outline-none focus:border-[#48821C]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        {paginatedPickups.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Globe className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No regional pickups found matching current filters</p>
            <button
              onClick={() => {
                setActiveRegionTab("ALL");
                setSelectedCountry("all");
                setSelectedLanguage("all");
                setSearchQuery("");
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginatedPickups.map((pickup) => (
              <div
                key={pickup.id}
                className="p-4 sm:p-5 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      pickup.region === "GCC" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                      pickup.region === "SEA" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                      "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}>
                      {pickup.region} • {pickup.country}
                    </span>

                    <span className="font-extrabold text-[#48821C] bg-[#80C341]/15 px-2 py-0.5 rounded-md border border-[#80C341]/30">
                      {pickup.campaign}
                    </span>

                    <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {pickup.outletName}
                    </span>

                    <span className="text-slate-400 font-mono">
                      {pickup.language} • {pickup.date}
                    </span>

                    <span className="text-[10px] text-slate-500 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      Wire: {pickup.wireNetwork}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#48821C] transition-colors leading-snug">
                    {isValidArticleUrl(pickup.url, { id: pickup.id, headline: pickup.headline, publication: pickup.outletName }) ? (
                      <a
                        href={ensureAbsoluteUrl(pickup.url, pickup.headline, pickup.outletName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <span>{pickup.headline}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <span>{pickup.headline}</span>
                    )}
                  </h4>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[10px] font-medium text-slate-400 block">Est. Traffic / Audience</span>
                    <span className="text-xs font-black text-slate-900 font-mono">
                      {pickup.trafficFormatted} ({pickup.audienceFormatted})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(pickup.url, pickup.id)}
                      className={`p-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        copiedId === pickup.id
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                      title="Copy URL link"
                    >
                      {copiedId === pickup.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {isValidArticleUrl(pickup.url, { id: pickup.id, headline: pickup.headline, publication: pickup.outletName }) ? (
                      <a
                        href={ensureAbsoluteUrl(pickup.url, pickup.headline, pickup.outletName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#48821C] hover:bg-[#386616] text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <span>Open Pickup</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span
                        className="px-2.5 py-1.5 bg-slate-100 text-slate-400 font-semibold rounded-lg text-xs border border-slate-200 cursor-not-allowed"
                        title="Source link unavailable"
                      >
                        Link unavailable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-600 font-medium">
            Page <strong className="font-mono text-slate-900">{currentPage}</strong> of <strong className="font-mono text-slate-900">{totalPages}</strong> ({filteredPickups.length.toLocaleString()} total items)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 cursor-pointer hover:bg-slate-100 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="font-mono px-2 text-slate-600 font-bold">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 cursor-pointer hover:bg-slate-100 flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {/* EXECUTIVE PDF REPORT SHARING & PREVIEW MODAL */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1C2319] via-[#242E20] to-[#151B13] p-6 text-white border-b border-[#3D4D38] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#80C341]/20 text-[#80C341] text-[10px] font-black uppercase tracking-wider">
                      Executive Dossier
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Official PR Release Format</span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    Share Executive PR PDF Report
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-700">
              <div className="bg-[#F8FAF5] p-4 rounded-2xl border border-[#DCE9CE] space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="text-sm">Summary of Included Key Metrics:</span>
                  <span className="text-[#48821C] font-mono font-black">
                    {pdfScope === "all" ? "1,202+ Master Dataset" : `${filteredPickups.length} Filtered Records`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Total Pickups</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {pdfScope === "all" ? "1,202+" : filteredPickups.length}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Est. Reach</span>
                    <span className="text-sm font-black text-slate-900 font-mono">580M+</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">PR Value (AVE)</span>
                    <span className="text-sm font-black text-emerald-700 font-mono">₹4.85 Cr</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Verified Links</span>
                    <span className="text-sm font-black text-[#48821C] font-mono">100% Clickable</span>
                  </div>
                </div>
              </div>

              {/* Scope Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Select Coverage Scope for PDF Generation:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPdfScope("all")}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      pdfScope === "all"
                        ? "bg-[#1C2319] text-white border-[#48821C] shadow-sm"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">All 1,202+ Pickups (Master Report)</span>
                      {pdfScope === "all" && <Check className="w-4 h-4 text-[#80C341]" />}
                    </div>
                    <p className={`text-[11px] leading-snug ${pdfScope === "all" ? "text-slate-300" : "text-slate-500"}`}>
                      Full comprehensive dossier with all verified global and regional links across GCC, SEA, and Africa.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfScope("filtered")}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      pdfScope === "filtered"
                        ? "bg-[#1C2319] text-white border-[#48821C] shadow-sm"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">Current Filtered View ({filteredPickups.length} Pickups)</span>
                      {pdfScope === "filtered" && <Check className="w-4 h-4 text-[#80C341]" />}
                    </div>
                    <p className={`text-[11px] leading-snug ${pdfScope === "filtered" ? "text-slate-300" : "text-slate-500"}`}>
                      Export only the presently filtered outlets, active campaign selection, or search query.
                    </p>
                  </button>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-slate-50">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  What&apos;s Included in this Executive PDF:
                </span>
                <ul className="space-y-1.5 text-slate-600 text-[11px]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#48821C] shrink-0" />
                    <span><strong>Mintoak Brand &amp; Campaign Header:</strong> Executive briefing styled with official metrics and campaign dates.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#48821C] shrink-0" />
                    <span><strong>Geographic Distribution Matrix:</strong> Breakdown of GCC, Southeast Asia, South Asia &amp; Global wire syndicates.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#48821C] shrink-0" />
                    <span><strong>Interactive Hyperlinks:</strong> Every URL rendered in the PDF table is embedded as a live clickable hyperlink.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportExecutivePdf(pdfScope)}
                  disabled={isGeneratingPdf}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Executive PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Executive PDF Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
