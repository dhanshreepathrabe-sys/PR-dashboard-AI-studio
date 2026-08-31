import React, { useState, useMemo } from "react";
import {
  Bell,
  Radio,
  Search,
  ExternalLink,
  User,
  Users,
  Building2,
  Newspaper,
  Sparkles,
  TrendingUp,
  Globe,
  Share2,
  Copy,
  Check,
  Filter,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  History,
  Calendar,
  Layers,
  ArrowUpDown,
  Download
} from "lucide-react";
import { GoogleAlertItem, INITIAL_GOOGLE_ALERTS, GOOGLE_ALERTS_QUERIES } from "../data/alertsData";
import { MediaMention } from "../types";
import { ensureAbsoluteUrl, isValidArticleUrl } from "../utils/linkHelper";

interface GoogleAlertsLiveFeedProps {
  onSelectMention?: (mention: MediaMention) => void;
}

type TimeHorizonType = "lifetime" | "recent_5days" | "older_5days" | "30days" | "2026" | "2025" | "2024_earlier";
type SortOption = "newest" | "oldest" | "reach";

export const GoogleAlertsLiveFeed: React.FC<GoogleAlertsLiveFeedProps> = ({ onSelectMention }) => {
  const [alerts, setAlerts] = useState<GoogleAlertItem[]>(INITIAL_GOOGLE_ALERTS);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedPerson, setSelectedPerson] = useState<string>("all");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizonType>("lifetime");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"stream" | "people">("stream");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showAddQueryModal, setShowAddQueryModal] = useState<boolean>(false);
  const [selectedAlertModal, setSelectedAlertModal] = useState<GoogleAlertItem | null>(null);
  const [newQueryInput, setNewQueryInput] = useState<string>("");
  const [customQueries, setCustomQueries] = useState<string[]>([]);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>("Just now");

  // Filter logic
  const filteredAlerts = useMemo(() => {
    let result = alerts.filter((alert) => {
      // 1. Time Horizon / Lifetime filter
      if (timeHorizon === "recent_5days") {
        if (alert.era && alert.era !== "recent") return false;
        if (alert.timestamp.includes("days ago")) {
          const numDays = parseInt(alert.timestamp);
          if (!isNaN(numDays) && numDays >= 5) return false;
        } else if (alert.timestamp.includes("Oct") || alert.timestamp.includes("Aug") || alert.timestamp.includes("May") || alert.timestamp.includes("Feb") || alert.timestamp.includes("Dec") || alert.timestamp.includes("Jun") || alert.timestamp.includes("Jan") || alert.timestamp.includes("Mar")) {
          return false;
        }
      } else if (timeHorizon === "older_5days") {
        // More than 5 days ago or older historical
        const isRecent = alert.era === "recent" && (
          alert.timestamp.includes("mins") ||
          alert.timestamp.includes("hr") ||
          alert.timestamp.includes("Just now") ||
          alert.timestamp === "1 day ago" ||
          alert.timestamp === "2 days ago" ||
          alert.timestamp === "3 days ago" ||
          alert.timestamp === "4 days ago"
        );
        if (isRecent) return false;
      } else if (timeHorizon === "30days") {
        if (alert.year && alert.year < 2026) return false;
      } else if (timeHorizon === "2026") {
        if (alert.year !== 2026) return false;
      } else if (timeHorizon === "2025") {
        if (alert.year !== 2025) return false;
      } else if (timeHorizon === "2024_earlier") {
        if (!alert.year || alert.year >= 2025) return false;
      }

      // 2. Category pill
      if (selectedFilter === "leadership" && alert.category !== "leadership") return false;
      if (selectedFilter === "brand" && alert.category !== "brand" && alert.category !== "financial") return false;
      if (selectedFilter === "icc" && !alert.personOrTopic.includes("ICC Loyalty")) return false;
      if (selectedFilter === "news" && alert.sourceType !== "Google News" && alert.sourceType !== "Financial Press") return false;
      if (selectedFilter === "funding" && alert.category !== "financial" && !alert.personOrTopic.includes("Funding")) return false;

      // 3. Filter by specific leadership person
      if (selectedPerson !== "all" && !alert.personOrTopic.toLowerCase().includes(selectedPerson.toLowerCase())) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          alert.headline.toLowerCase().includes(q) ||
          alert.snippet.toLowerCase().includes(q) ||
          alert.sourceName.toLowerCase().includes(q) ||
          alert.matchedEntity.toLowerCase().includes(q) ||
          alert.query.toLowerCase().includes(q) ||
          (alert.year && alert.year.toString().includes(q));
        if (!matches) return false;
      }

      return true;
    });

    // Sort logic
    return result.sort((a, b) => {
      if (sortBy === "reach") {
        return (b.reach || 0) - (a.reach || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      // default: newest
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [alerts, selectedFilter, selectedPerson, timeHorizon, sortBy, searchQuery]);

  // Counts across entire dataset
  const ramanCount = alerts.filter((a) => a.personOrTopic.includes("Raman")).length;
  const sanjayCount = alerts.filter((a) => a.personOrTopic.includes("Sanjay")).length;
  const ramaCount = alerts.filter((a) => a.personOrTopic.includes("Rama")).length;
  const brandCount = alerts.filter((a) => a.category === "brand" || a.category === "financial" || a.personOrTopic.includes("Brand") || a.personOrTopic.includes("Banking")).length;

  const olderThan5DaysCount = alerts.filter((a) => {
    if (a.era && a.era !== "recent") return true;
    if (a.timestamp.includes("days ago")) {
      const days = parseInt(a.timestamp);
      return !isNaN(days) && days >= 5;
    }
    return a.year && a.year < 2026;
  }).length;

  const recent5DaysCount = alerts.length - olderThan5DaysCount;

  const handleRefreshAlerts = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const now = new Date();
      setLastCheckedTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }));
      // Prepend a fresh live ping alert simulation
      const newLiveAlert: GoogleAlertItem = {
        id: `ga-${Date.now()}`,
        query: '"Raman Khanduja" mintoak',
        personOrTopic: "Raman Khanduja (CEO)",
        category: "leadership",
        sourceName: "LiveMint Corporate Desk",
        sourceType: "Google News",
        headline: "Mintoak's Raman Khanduja discusses next-gen omnichannel banking technology stack",
        snippet: "...In an executive interview, <mark class='bg-yellow-200 font-semibold px-0.5 rounded'>Raman Khanduja</mark> outlined how <mark class='bg-yellow-200 font-semibold px-0.5 rounded'>Mintoak</mark> is empowering banks to retain merchant loyalty...",
        url: "https://news.google.com/search?q=Mintoak+Raman+Khanduja+LiveMint",
        timestamp: "Just now",
        date: new Date().toISOString().split("T")[0],
        year: 2026,
        era: "recent",
        reach: 4200000,
        matchedEntity: "Raman Khanduja, Co-founder & CEO",
        sentiment: "positive",
        isNew: true
      };
      setAlerts((prev) => [newLiveAlert, ...prev]);
    }, 800);
  };

  const handleCopyLink = (alert: GoogleAlertItem) => {
    navigator.clipboard.writeText(`${alert.headline} - ${alert.url}`);
    setCopiedId(alert.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAlertsCSV = () => {
    const headers = ["ID", "Date", "Year", "Person / Entity", "Source", "Source Type", "Headline", "Snippet", "URL", "Estimated Reach"];
    const rows = filteredAlerts.map((a) => [
      a.id,
      a.date,
      a.year || "2026",
      `"${(a.personOrTopic || "").replace(/"/g, '""')}"`,
      `"${(a.sourceName || "").replace(/"/g, '""')}"`,
      `"${(a.sourceType || "").replace(/"/g, '""')}"`,
      `"${(a.headline || "").replace(/"/g, '""')}"`,
      `"${(a.snippet || "").replace(/<[^>]+>/g, "").replace(/"/g, '""')}"`,
      `"${(a.url || "").replace(/"/g, '""')}"`,
      a.reach || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mintoak_Mentions_Archive_${timeHorizon}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddCustomQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueryInput.trim()) return;
    const clean = newQueryInput.trim();
    if (!customQueries.includes(clean)) {
      setCustomQueries([...customQueries, clean]);
      const generatedAlert: GoogleAlertItem = {
        id: `ga-custom-${Date.now()}`,
        query: `"${clean}"`,
        personOrTopic: clean.toLowerCase().includes("sanjay") ? "Sanjay Benny (CPTO)" : clean.toLowerCase().includes("rama") ? "Rama Tadepalli (Co-Founder)" : clean.toLowerCase().includes("raman") ? "Raman Khanduja (CEO)" : "Mintoak Brand & Platform",
        category: "leadership",
        sourceName: "Google Web Crawler",
        sourceType: "Web Alert",
        headline: `New web mention detected for tracked query: ${clean}`,
        snippet: `...Discovered recent online occurrence matching monitored keyword <mark class='bg-yellow-200 font-semibold px-0.5 rounded'>${clean}</mark> associated with <mark class='bg-yellow-200 font-semibold px-0.5 rounded'>Mintoak</mark> fintech operations...`,
        url: `https://news.google.com/search?q=${encodeURIComponent(`"Mintoak" "${clean}"`)}`,
        timestamp: "Just now",
        date: new Date().toISOString().split("T")[0],
        year: 2026,
        era: "recent",
        reach: 2500000,
        matchedEntity: `Monitored query: ${clean}`,
        sentiment: "positive",
        isNew: true
      };
      setAlerts((prev) => [generatedAlert, ...prev]);
    }
    setNewQueryInput("");
    setShowAddQueryModal(false);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all mb-6">
      {/* Top Banner Ribbon */}
      <div className="bg-[#1C2319] text-white p-4 sm:p-5 border-b border-[#2D3A28] relative overflow-hidden">
        {/* Subtle grid background glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#80C341]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#80C341]/20 text-[#80C341] border border-[#80C341]/40 text-[10px] font-black uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#80C341] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#80C341]"></span>
                </span>
                Google Alerts &amp; Lifetime Leadership Feed
              </span>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-[#80C341]" />
                Lifetime Horizon: <strong>2021 – 2026 ({alerts.length} Tracked Mentions)</strong>
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#80C341]" />
                Last Polled: {lastCheckedTime}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#80C341]" />
              Live &amp; Lifetime Mentions of Mintoak &amp; Leadership Team
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Comprehensive Google Alerts and historic archive covering all web, news, broadcast, and executive citations for <strong>Mintoak</strong>, <strong>Raman Khanduja (CEO)</strong>, <strong>Sanjay Benny (CPTO)</strong>, and <strong>Rama Tadepalli</strong> from inception (2021) to present (2026).
            </p>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              onClick={handleExportAlertsCSV}
              className="flex items-center gap-1.5 bg-[#2D3A28] hover:bg-[#3d4f37] text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all border border-[#80C341]/30 cursor-pointer"
              title="Download mentions as CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#80C341]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={handleRefreshAlerts}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 bg-[#2D3A28] hover:bg-[#3d4f37] text-[#80C341] font-bold px-3 py-1.5 rounded-xl text-xs transition-all border border-[#80C341]/30 cursor-pointer disabled:opacity-50"
              title="Refresh and poll for new Google alerts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Polling Alerts..." : "Poll Alerts"}</span>
            </button>

            <button
              onClick={() => setShowAddQueryModal(true)}
              className="flex items-center gap-1.5 bg-[#80C341] hover:bg-[#72b036] text-[#1C2319] font-black px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              title="Add a custom person or keyword query to track"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Track Keyword</span>
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg bg-[#2D3A28] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Feed" : "Collapse Feed"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Real-time Leadership Summary Bar */}
        {!isCollapsed && (
          <div className="mt-4 pt-3.5 border-t border-[#2D3A28] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              onClick={() => {
                setSelectedPerson(selectedPerson === "Raman" ? "all" : "Raman");
                setSelectedFilter("all");
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPerson === "Raman"
                  ? "bg-[#2D3A28] border-[#80C341] text-white ring-1 ring-[#80C341]"
                  : "bg-[#161C14] border-[#2D3A28] text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#80C341] tracking-wider">Co-Founder &amp; CEO</span>
                <span className="bg-[#80C341]/20 text-[#80C341] text-[10px] font-black px-1.5 py-0.2 rounded font-mono">{ramanCount}</span>
              </div>
              <p className="font-extrabold text-white text-xs mt-0.5 truncate">Raman Khanduja</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Forbes • CNBC • ET • BS</p>
            </button>

            <button
              onClick={() => {
                setSelectedPerson(selectedPerson === "Sanjay" ? "all" : "Sanjay");
                setSelectedFilter("all");
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPerson === "Sanjay"
                  ? "bg-[#2D3A28] border-[#80C341] text-white ring-1 ring-[#80C341]"
                  : "bg-[#161C14] border-[#2D3A28] text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#80C341] tracking-wider">Co-Founder &amp; CPTO</span>
                <span className="bg-[#80C341]/20 text-[#80C341] text-[10px] font-black px-1.5 py-0.2 rounded font-mono">{sanjayCount}</span>
              </div>
              <p className="font-extrabold text-white text-xs mt-0.5 truncate">Sanjay Benny</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Money20/20 • FinTech Futures</p>
            </button>

            <button
              onClick={() => {
                setSelectedPerson(selectedPerson === "Rama" ? "all" : "Rama");
                setSelectedFilter("all");
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPerson === "Rama"
                  ? "bg-[#2D3A28] border-[#80C341] text-white ring-1 ring-[#80C341]"
                  : "bg-[#161C14] border-[#2D3A28] text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#80C341] tracking-wider">Co-Founder</span>
                <span className="bg-[#80C341]/20 text-[#80C341] text-[10px] font-black px-1.5 py-0.2 rounded font-mono">{ramaCount}</span>
              </div>
              <p className="font-extrabold text-white text-xs mt-0.5 truncate">Rama Tadepalli</p>
              <p className="text-[9px] text-slate-400 mt-0.5">YourStory • Inc42 • LiveMint</p>
            </button>

            <button
              onClick={() => {
                setSelectedPerson("all");
                setSelectedFilter("brand");
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedFilter === "brand" && selectedPerson === "all"
                  ? "bg-[#2D3A28] border-[#80C341] text-white ring-1 ring-[#80C341]"
                  : "bg-[#161C14] border-[#2D3A28] text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#80C341] tracking-wider">Brand &amp; Stack</span>
                <span className="bg-[#80C341]/20 text-[#80C341] text-[10px] font-black px-1.5 py-0.2 rounded font-mono">{brandCount}</span>
              </div>
              <p className="font-extrabold text-white text-xs mt-0.5 truncate">Mintoak Platform</p>
              <p className="text-[9px] text-slate-400 mt-0.5">TechCrunch • PayPal • Zawya</p>
            </button>
          </div>
        )}
      </div>

      {/* Main Feed Content Area */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50">
          {/* PRIMARY TIME HORIZON SELECTOR (Lifetime vs Previous >5 Days vs Live <5 Days) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#48821C]" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Time Horizon &amp; Lifetime Range:
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Showing <strong>{filteredAlerts.length}</strong> mentions matching active criteria</span>
              </div>
            </div>

            {/* Time Horizon Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
              <button
                onClick={() => setTimeHorizon("lifetime")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  timeHorizon === "lifetime"
                    ? "bg-[#1C2319] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <History className="w-3.5 h-3.5 text-[#80C341]" />
                <span>All-Time Lifetime Mentions ({alerts.length})</span>
              </button>

              <button
                onClick={() => setTimeHorizon("older_5days")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  timeHorizon === "older_5days"
                    ? "bg-[#48821C] text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Previous Mentions (&gt;5 Days &amp; History) ({olderThan5DaysCount})</span>
              </button>

              <button
                onClick={() => setTimeHorizon("recent_5days")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  timeHorizon === "recent_5days"
                    ? "bg-red-600 text-white shadow-xs"
                    : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                <span>Live Recent (&lt;5 Days) ({recent5DaysCount})</span>
              </button>

              <button
                onClick={() => setTimeHorizon("2026")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  timeHorizon === "2026"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                2026 Mentions
              </button>

              <button
                onClick={() => setTimeHorizon("2025")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  timeHorizon === "2025"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                2025 Archive
              </button>

              <button
                onClick={() => setTimeHorizon("2024_earlier")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  timeHorizon === "2024_earlier"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                2021–2024 (Series A &amp; Founding)
              </button>
            </div>
          </div>

          {/* Controls Bar: Category Pills + Search Input + Sort + View Toggles */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 lg:pb-0">
              <button
                onClick={() => {
                  setSelectedFilter("all");
                  setSelectedPerson("all");
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedFilter === "all" && selectedPerson === "all"
                    ? "bg-[#222A1E] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Topics
              </button>

              <button
                onClick={() => {
                  setSelectedFilter("leadership");
                  setSelectedPerson("all");
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedFilter === "leadership" && selectedPerson === "all"
                    ? "bg-[#48821C] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Leadership ({ramanCount + sanjayCount + ramaCount})</span>
              </button>

              <button
                onClick={() => {
                  setSelectedFilter("brand");
                  setSelectedPerson("all");
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedFilter === "brand"
                    ? "bg-[#48821C] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Brand &amp; Product</span>
              </button>

              <button
                onClick={() => {
                  setSelectedFilter("funding");
                  setSelectedPerson("all");
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedFilter === "funding"
                    ? "bg-[#48821C] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Funding &amp; M&amp;A</span>
              </button>

              <button
                onClick={() => {
                  setSelectedFilter("news");
                  setSelectedPerson("all");
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedFilter === "news"
                    ? "bg-[#48821C] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>Financial Press</span>
              </button>

              {customQueries.map((q) => (
                <button
                  key={q}
                  onClick={() => setSearchQuery(q)}
                  className="px-2.5 py-1.5 rounded-lg font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer whitespace-nowrap text-[11px]"
                >
                  +{q}
                </button>
              ))}
            </div>

            {/* Search Input, Sort & View Mode Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter keywords, person, year..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#80C341] focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First (History)</option>
                  <option value="reach">Highest Reach</option>
                </select>
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                <button
                  onClick={() => setViewMode("stream")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "stream" ? "bg-white text-[#1C2319] shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Stream View
                </button>
                <button
                  onClick={() => setViewMode("people")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "people" ? "bg-white text-[#1C2319] shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Leadership View
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Indicator */}
          {(selectedFilter !== "all" || selectedPerson !== "all" || timeHorizon !== "lifetime" || searchQuery.trim()) && (
            <div className="flex items-center justify-between text-xs text-slate-600 px-1 bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-400">Active Filters:</span>
                {timeHorizon !== "lifetime" && (
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-bold">
                    Horizon: {timeHorizon === "older_5days" ? "Previous (>5 Days)" : timeHorizon === "recent_5days" ? "Live (<5 Days)" : timeHorizon}
                  </span>
                )}
                {selectedPerson !== "all" && (
                  <span className="bg-[#48821C]/10 text-[#48821C] border border-[#48821C]/20 px-2 py-0.5 rounded-md font-bold">
                    Person: {selectedPerson}
                  </span>
                )}
                {selectedFilter !== "all" && (
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold capitalize">
                    Category: {selectedFilter}
                  </span>
                )}
                {searchQuery && (
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold">
                    Query: "{searchQuery}"
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedFilter("all");
                    setSelectedPerson("all");
                    setTimeHorizon("lifetime");
                    setSearchQuery("");
                  }}
                  className="text-rose-600 hover:underline font-bold ml-1 cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
              <span className="font-mono text-slate-500 font-bold">
                Showing {filteredAlerts.length} of {alerts.length} mentions
              </span>
            </div>
          )}

          {/* VIEW MODE 1: Chronological Alert Stream */}
          {viewMode === "stream" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAlerts.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-[#80C341] hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    {/* Top Alert Metadata Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#EDF6E2] text-[#48821C] border border-[#80C341]/30 uppercase tracking-wider">
                          {item.sourceName}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.sourceType}
                        </span>
                        {item.year && item.year < 2026 && (
                          <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono">
                            {item.year} Archive
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 hidden sm:inline-block">
                          Query: <code className="text-slate-800">{item.query}</code>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.isNew && (
                          <span className="bg-[#80C341] text-[#1C2319] text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                            NEW
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {item.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Headline */}
                    <h3
                      onClick={() => setSelectedAlertModal(item)}
                      className="font-extrabold text-sm text-[#1C2319] leading-snug group-hover:text-[#48821C] transition-colors cursor-pointer"
                    >
                      {item.headline}
                    </h3>

                    {/* Snippet with keyword marks */}
                    <div
                      onClick={() => setSelectedAlertModal(item)}
                      className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 font-sans cursor-pointer hover:bg-slate-100/80 transition-colors"
                      dangerouslySetInnerHTML={{ __html: item.snippet }}
                    />
                  </div>

                  {/* Bottom Entity Tag & Action Links */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#48821C]" />
                        <span className="font-bold text-slate-700">{item.matchedEntity}</span>
                      </div>
                      {item.reach && (
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          • {(item.reach / 1000000).toFixed(1)}M Reach
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedAlertModal(item)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="View full briefing & executive quotes"
                      >
                        <span>Briefing</span>
                      </button>

                      <button
                        onClick={() => handleCopyLink(item)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Copy headline and link"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <a
                        href={ensureAbsoluteUrl(item.url, item.headline, item.sourceName, item.query)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-extrabold text-[11px] text-[#48821C] hover:text-[#1C2319] bg-[#EDF6E2] hover:bg-[#80C341]/30 px-2.5 py-1 rounded-lg border border-[#80C341]/40 transition-colors cursor-pointer"
                        title="Open live source coverage"
                      >
                        <span>Open Source</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW MODE 2: Leadership Entity Spotlight View with Lifetime Archives */}
          {viewMode === "people" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Raman Khanduja Spotlight Card */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs space-y-4 hover:border-[#80C341] transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#1C2319] text-[#80C341] flex items-center justify-center font-black text-sm border border-[#80C341]/40">
                      RK
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Raman Khanduja</h4>
                      <p className="text-[11px] font-bold text-[#48821C]">Co-Founder &amp; Chief Executive Officer</p>
                    </div>
                  </div>
                  <span className="bg-[#EDF6E2] text-[#48821C] text-xs font-black px-2 py-0.5 rounded-full font-mono">
                    {ramanCount} Lifetime Mentions
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Leading Mintoak's global merchant SaaS strategy, cross-border expansion in GCC, and partnerships with Tier-1 banking partners.
                </p>

                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Featured Lifetime Media &amp; Broadcasts
                  </span>
                  {alerts
                    .filter((a) => a.personOrTopic.includes("Raman"))
                    .slice(0, 4)
                    .map((a) => {
                      const isValid = isValidArticleUrl(a.url, { id: a.id, headline: a.headline, publication: a.sourceName });
                      if (!isValid) {
                        return (
                          <div
                            key={a.id}
                            className="block p-2.5 rounded-lg bg-slate-50 border border-slate-100 opacity-80"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                              <span>{a.sourceName}</span>
                              <span className="text-[10px] text-amber-600 font-medium">Link unavailable</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{a.headline}</p>
                          </div>
                        );
                      }
                      return (
                        <a
                          key={a.id}
                          href={ensureAbsoluteUrl(a.url, a.headline, a.sourceName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2.5 rounded-lg bg-slate-50 hover:bg-[#EDF6E2] border border-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                            <span>{a.sourceName}</span>
                            <span className="font-mono text-slate-400">{a.timestamp}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{a.headline}</p>
                        </a>
                      );
                    })}
                </div>
              </div>

              {/* Sanjay Benny Spotlight Card */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs space-y-4 hover:border-[#80C341] transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#1C2319] text-[#80C341] flex items-center justify-center font-black text-sm border border-[#80C341]/40">
                      SB
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Sanjay Benny</h4>
                      <p className="text-[11px] font-bold text-[#48821C]">Co-Founder &amp; CPTO</p>
                    </div>
                  </div>
                  <span className="bg-[#EDF6E2] text-[#48821C] text-xs font-black px-2 py-0.5 rounded-full font-mono">
                    {sanjayCount} Lifetime Mentions
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Spearheading Mintoak's cloud payments infrastructure, omnichannel QR engines, soundbox firmware, and microservices architecture.
                </p>

                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Featured Lifetime Media &amp; Broadcasts
                  </span>
                  {alerts
                    .filter((a) => a.personOrTopic.includes("Sanjay"))
                    .slice(0, 4)
                    .map((a) => {
                      const isValid = isValidArticleUrl(a.url, { id: a.id, headline: a.headline, publication: a.sourceName });
                      if (!isValid) {
                        return (
                          <div
                            key={a.id}
                            className="block p-2.5 rounded-lg bg-slate-50 border border-slate-100 opacity-80"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                              <span>{a.sourceName}</span>
                              <span className="text-[10px] text-amber-600 font-medium">Link unavailable</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{a.headline}</p>
                          </div>
                        );
                      }
                      return (
                        <a
                          key={a.id}
                          href={ensureAbsoluteUrl(a.url, a.headline, a.sourceName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2.5 rounded-lg bg-slate-50 hover:bg-[#EDF6E2] border border-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                            <span>{a.sourceName}</span>
                            <span className="font-mono text-slate-400">{a.timestamp}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{a.headline}</p>
                        </a>
                      );
                    })}
                </div>
              </div>

              {/* Rama Tadepalli Spotlight Card */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs space-y-4 hover:border-[#80C341] transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#1C2319] text-[#80C341] flex items-center justify-center font-black text-sm border border-[#80C341]/40">
                      RT
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Rama Tadepalli</h4>
                      <p className="text-[11px] font-bold text-[#48821C]">Co-Founder</p>
                    </div>
                  </div>
                  <span className="bg-[#EDF6E2] text-[#48821C] text-xs font-black px-2 py-0.5 rounded-full font-mono">
                    {ramaCount} Lifetime Mentions
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Driving merchant enablement ecosystems, tier-2/3 MSME working capital rails, and bank-led financial inclusion programs.
                </p>

                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Featured Lifetime Media &amp; Broadcasts
                  </span>
                  {alerts
                    .filter((a) => a.personOrTopic.includes("Rama"))
                    .slice(0, 4)
                    .map((a) => {
                      const isValid = isValidArticleUrl(a.url, { id: a.id, headline: a.headline, publication: a.sourceName });
                      if (!isValid) {
                        return (
                          <div
                            key={a.id}
                            className="block p-2.5 rounded-lg bg-slate-50 border border-slate-100 opacity-80"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                              <span>{a.sourceName}</span>
                              <span className="text-[10px] text-amber-600 font-medium">Link unavailable</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{a.headline}</p>
                          </div>
                        );
                      }
                      return (
                        <a
                          key={a.id}
                          href={ensureAbsoluteUrl(a.url, a.headline, a.sourceName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2.5 rounded-lg bg-slate-50 hover:bg-[#EDF6E2] border border-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                            <span>{a.sourceName}</span>
                            <span className="font-mono text-slate-400">{a.timestamp}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{a.headline}</p>
                        </a>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Custom Person / Keyword Modal */}
      {showAddQueryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowAddQueryModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#48821C]" />
                <h3 className="font-extrabold text-sm text-[#1C2319]">Track Person or Google Alert Query</h3>
              </div>
              <button
                onClick={() => setShowAddQueryModal(false)}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomQuery} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Person Name or Search Term
                </label>
                <input
                  type="text"
                  placeholder='e.g. "Raman Khanduja", "PayPal Ventures", "Axis Bank"'
                  value={newQueryInput}
                  onChange={(e) => setNewQueryInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#80C341] focus:bg-white"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Google Alert bot will index all web mentions, news releases, and executive quotes matching this query.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddQueryModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newQueryInput.trim()}
                  className="px-4 py-2 bg-[#80C341] hover:bg-[#6fae33] text-[#1C2319] text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Add to Alert Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Google Alert Briefing & Executive Intelligence Modal */}
      {selectedAlertModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setSelectedAlertModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-[#EDF6E2] text-[#48821C] border border-[#80C341]/40 uppercase tracking-wider">
                    {selectedAlertModal.sourceName}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedAlertModal.sourceType}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    Query: <code className="text-slate-800">{selectedAlertModal.query}</code>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-medium pt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedAlertModal.timestamp} ({selectedAlertModal.date})
                  </span>
                  {selectedAlertModal.reach && (
                    <span>• {(selectedAlertModal.reach / 1000000).toFixed(1)}M Audience Reach</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertModal(null)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Headline */}
            <h2 className="text-lg font-black text-[#1C2319] leading-snug">
              {selectedAlertModal.headline}
            </h2>

            {/* Matched Entity Box */}
            <div className="flex items-center gap-2 bg-[#EDF6E2]/60 p-3 rounded-xl border border-[#80C341]/30 text-xs">
              <User className="w-4 h-4 text-[#48821C] shrink-0" />
              <div>
                <span className="font-bold text-[#1C2319]">Matched Entity: </span>
                <span className="font-extrabold text-[#48821C]">{selectedAlertModal.matchedEntity}</span>
              </div>
            </div>

            {/* Alert Snippet with highlights */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Original Google Alert Snippet
              </h4>
              <div
                className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: selectedAlertModal.snippet }}
              />
            </div>

            {/* Full Briefing / Narrative if available */}
            {selectedAlertModal.fullBriefing && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Executive Briefing &amp; Background
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                  {selectedAlertModal.fullBriefing}
                </p>
              </div>
            )}

            {/* Executive Quote if available */}
            {selectedAlertModal.executiveQuote && (
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1 border-l-4 border-[#80C341]">
                <span className="text-[10px] font-black text-[#80C341] uppercase tracking-wider block">
                  Official Leadership Statement
                </span>
                <p className="text-xs font-medium italic text-slate-200 leading-relaxed">
                  "{selectedAlertModal.executiveQuote}"
                </p>
              </div>
            )}

            {/* Key Takeaways */}
            {selectedAlertModal.keyTakeaways && selectedAlertModal.keyTakeaways.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Key PR &amp; Platform Takeaways
                </h4>
                <div className="space-y-1.5">
                  {selectedAlertModal.keyTakeaways.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-[#48821C] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink(selectedAlertModal)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  {copiedId === selectedAlertModal.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Briefing</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://news.google.com/search?q=${encodeURIComponent(`Mintoak ${selectedAlertModal.matchedEntity || selectedAlertModal.query.replace(/"/g, "")}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#48821C] bg-[#EDF6E2] hover:bg-[#80C341]/30 px-3.5 py-2 rounded-xl border border-[#80C341]/40 transition-all cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Google News Results</span>
                </a>

                <a
                  href={ensureAbsoluteUrl(selectedAlertModal.url, selectedAlertModal.headline, selectedAlertModal.sourceName, selectedAlertModal.query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#1C2319] bg-[#80C341] hover:bg-[#6fae33] px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <span>Open Source</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

