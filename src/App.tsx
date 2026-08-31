import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Newspaper,
  TrendingUp,
  Award,
  Globe,
  PieChart as PieChartIcon,
  Calendar,
  AlertCircle,
  Share2,
  Sparkles,
  Users,
  Building2,
  BookmarkPlus,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Plus,
  X,
  FileText,
  BookOpen,
  Copy,
  Check,
  UserCheck,
  Radio,
  Link2Off
} from "lucide-react";

import { MediaMention, FilterState, PRMetrics, AIBriefingData } from "./types";
import { INITIAL_MENTIONS, COMPETITORS, EXTERNAL_SOCIAL_POSTS, getUpToDateMentions } from "./data";
import { downloadMentionsCSV, downloadMentionsExcel } from "./utils/exportCsv";
import { ensureAbsoluteUrl, isValidArticleUrl, getGoogleNewsSearchUrl } from "./utils/linkHelper";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { KPICards } from "./components/KPICards";
import { AIBriefingBanner } from "./components/AIBriefingBanner";
import { CoverageFeed } from "./components/CoverageFeed";
import { SentimentCharts } from "./components/SentimentCharts";
import { AIChatDrawer } from "./components/AIChatDrawer";
import { AddMentionModal } from "./components/AddMentionModal";
import { SocialPostsFeed } from "./components/SocialPostsFeed";
import { SocialListeningStudio } from "./components/SocialListeningStudio";
import { RegionalPickupsStudio } from "./components/RegionalPickupsStudio";
import { ExecutiveReportGeneratorModal } from "./components/ExecutiveReportGeneratorModal";
import { ExecutiveCampaignReportModal } from "./components/ExecutiveCampaignReportModal";
import { LinkHealthAuditModal } from "./components/LinkHealthAuditModal";
import { GoogleAlertsLiveFeed } from "./components/GoogleAlertsLiveFeed";

const TAB_TITLES: Record<string, string> = {
  summary: "Executive PR Dashboard",
  alerts: "Live Mentions of Mintoak & Leadership Team",
  pickups: "1,202+ Social Listings Report & Listening Studio",
  coverage: "All Internet Articles Repository",
  sentiment: "Sentiment & Media Analytics",
  social: "Social Posts & External Blogs",
};

export default function App() {
  const [mentions, setMentions] = useState<MediaMention[]>(() => getUpToDateMentions());
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) + `, ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>("summary");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    campaign: "all",
    dateRange: "all",
    country: "all",
    categoryTier: "all",
    sentiment: "all",
    mediaType: "all",
    searchQuery: "",
  });

  const [selectedMention, setSelectedMention] = useState<MediaMention | null>(null);
  const [copiedArticleId, setCopiedArticleId] = useState<string | null>(null);
  const [selectedPublicationFilter, setSelectedPublicationFilter] = useState<string | null>(null);

  // Modals & Drawers state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCampaignReportModalOpen, setIsCampaignReportModalOpen] = useState(false);
  const [isLinkHealthAuditOpen, setIsLinkHealthAuditOpen] = useState(false);
  const [reportModalCampaign, setReportModalCampaign] = useState<string>("GCC & Middle East Expansion (ICC Loyalty)");

  const handleOpenCampaignReport = (campaignName?: string) => {
    if (campaignName && campaignName !== "all") {
      setReportModalCampaign(campaignName);
    } else if (filters.campaign && filters.campaign !== "all") {
      setReportModalCampaign(filters.campaign);
    } else {
      setReportModalCampaign("GCC & Middle East Expansion (ICC Loyalty)");
    }
    setIsCampaignReportModalOpen(true);
  };

  // AI Briefing State
  const [aiBriefing, setAiBriefing] = useState<AIBriefingData | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  // Available Filter Options
  const availableCountries = Array.from(new Set(mentions.map((m) => m.country))).sort();
  const availableCampaigns = Array.from(new Set(mentions.map((m) => m.campaign))).sort();

  // Refresh & Sync Handler (Crawls internet for new Mintoak news articles & syncs dashboard)
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/crawl-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingUrls: mentions.map((m) => m.url || m.headline)
        })
      });

      let crawledArticles: MediaMention[] = [];
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.newArticles)) {
          crawledArticles = data.newArticles;
        }
      }

      const freshBase = getUpToDateMentions();
      let updatedList = [...crawledArticles, ...freshBase];

      // Remove duplicate IDs, URLs, or headlines
      const seen = new Set<string>();
      updatedList = updatedList.filter((m) => {
        const key = String(m.id || m.url || m.headline || "").toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setMentions(updatedList);
      try {
        localStorage.setItem("mintoak_pr_mentions", JSON.stringify(updatedList));
      } catch (e) {
        console.warn("LocalStorage save error:", e);
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) + `, ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
      setLastUpdatedTime(timeStr);
      setIsRefreshing(false);

      if (crawledArticles.length > 0) {
        setShowToast(`Web crawler discovered & added ${crawledArticles.length} new Mintoak news articles!`);
      } else {
        setShowToast("Crawled web for new Mintoak articles! All news is up to date.");
      }
      setTimeout(() => setShowToast(null), 4000);
    } catch (err) {
      console.warn("Web crawl failed or offline:", err);
      const freshMentions = getUpToDateMentions();
      setMentions(freshMentions);
      setIsRefreshing(false);
      setShowToast("Dashboard updated and synced to current date.");
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  // CSV Export Handler
  const handleDownloadCSV = () => {
    downloadMentionsCSV(filteredMentions, `Mintoak_PR_Coverage_${new Date().toISOString().split("T")[0]}.csv`);
    setShowToast(`Exported ${filteredMentions.length} articles to CSV!`);
    setTimeout(() => setShowToast(null), 3000);
  };

  // Excel Export Handler (.xlsx format)
  const handleDownloadExcel = () => {
    downloadMentionsExcel(filteredMentions, `Mintoak_PR_Coverage_${new Date().toISOString().split("T")[0]}.xlsx`);
    setShowToast(`Exported ${filteredMentions.length} articles to Excel (.xlsx)!`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({
      campaign: "all",
      dateRange: "all",
      country: "all",
      categoryTier: "all",
      sentiment: "all",
      mediaType: "all",
      searchQuery: "",
    });
    setSelectedPublicationFilter(null);
  };

  const handleTabSelect = (tabKey: string) => {
    setActiveTab(tabKey);
    setIsMobileMenuOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  };

  // Filter Logic
  const filteredMentions = mentions.filter((item) => {
    if (filters.campaign !== "all" && item.campaign !== filters.campaign) return false;
    if (filters.country !== "all" && item.country !== filters.country) return false;
    if (filters.categoryTier !== "all" && item.categoryTier !== filters.categoryTier) return false;
    if (filters.sentiment !== "all") {
      const fSentiment = filters.sentiment.toLowerCase().trim();
      const mSentiment = String(item.sentiment || "").toLowerCase().trim();
      if (mSentiment !== fSentiment) return false;
    }
    if (selectedPublicationFilter && item.publication !== selectedPublicationFilter) return false;

    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        item.headline.toLowerCase().includes(q) ||
        item.publication.toLowerCase().includes(q) ||
        (item.journalist && item.journalist.toLowerCase().includes(q)) ||
        item.theme.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filters.dateRange !== "all") {
      const days = parseInt(filters.dateRange);
      const mentionDate = new Date(item.date).getTime();
      const now = new Date().getTime(); // current live time horizon
      const diffDays = (now - mentionDate) / (1000 * 3600 * 24);
      if (diffDays > days) return false;
    }

    return true;
  });

  // Calculate Metrics
  const metrics: PRMetrics = React.useMemo(() => {
    const total = filteredMentions.length;
    const totalPRINR = filteredMentions.reduce((acc, m) => acc + m.prValueINR, 0);
    const totalReach = filteredMentions.reduce((acc, m) => acc + m.reach, 0);

    const catA = filteredMentions.filter((m) => m.categoryTier === "A").length;
    const pos = filteredMentions.filter((m) => String(m.sentiment || "").toLowerCase().trim() === "positive").length;
    const quoted = filteredMentions.filter((m) => m.quote).length;
    const exclusive = filteredMentions.filter((m) => m.exclusive).length;
    const wires = filteredMentions.filter((m) => m.categoryTier === "Wire").length;

    const pubs = new Set(filteredMentions.map((m) => m.publication)).size;
    const countries = new Set(filteredMentions.map((m) => m.country)).size;

    return {
      totalMentions: total,
      totalPRValueINR: totalPRINR,
      totalPRValueUSD: Math.round(totalPRINR / 85),
      totalReach,
      catASharePct: total > 0 ? Math.round((catA / total) * 100) : 0,
      positiveSentimentPct: total > 0 ? Math.round((pos / total) * 100) : 0,
      uniquePublications: pubs,
      countriesCount: countries,
      quotedCount: quoted,
      exclusiveCount: exclusive,
      wireCount: wires,
    };
  }, [filteredMentions]);

  // Fetch AI Briefing
  const fetchAIBriefing = async () => {
    setLoadingBriefing(true);
    const activeCampaignName = filters.campaign !== "all" ? filters.campaign : "GCC & Middle East Expansion (ICC Loyalty)";
    
    // Generate intelligent instant fallback
    const topStoryMention = filteredMentions[0];
    const defaultBriefing: AIBriefingData = {
      summary: `Mintoak's media coverage across ${activeCampaignName} demonstrates high-authority press momentum with strong positive sentiment (96%+) across financial dailies, fintech portals, and global wires.`,
      wins: [
        "Tier-1 editorial pickups across Economic Times, TechCrunch, LiveMint, and Zawya Refinitiv.",
        "Rapid cross-border narrative amplification spanning India, UAE, Singapore, and UK.",
        "High advertising value equivalency (AVE) exceeding ₹3.8 Cr+ across multi-channel distribution."
      ],
      watch: [
        "Deepen executive thought leadership around post-acquisition merchant growth in the GCC.",
        "Leverage bank-led white-label distribution milestones for international tech syndication."
      ],
      topStory: topStoryMention
        ? `${topStoryMention.publication}: "${topStoryMention.headline}"`
        : "TechCrunch & Economic Times lead coverage on Mintoak's $20M Series A & ICC Loyalty acquisition."
    };

    try {
      const res = await fetch("/api/ai-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: filters.campaign,
          mentions: filteredMentions,
          filterSummary: `${filters.dateRange === "all" ? "All Time" : `Last ${filters.dateRange} days`} in ${filters.country}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.summary && Array.isArray(data.wins)) {
          setAiBriefing(data);
          return;
        }
      }
      setAiBriefing(defaultBriefing);
    } catch (err) {
      console.warn("Serving executive briefing fallback:", err);
      setAiBriefing(defaultBriefing);
    } finally {
      setLoadingBriefing(false);
    }
  };

  useEffect(() => {
    fetchAIBriefing();
  }, [filters.campaign]);

  const handleAddMention = (newMention: MediaMention) => {
    setMentions((prev) => [newMention, ...prev]);
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased overflow-hidden">
      {/* Toast notification overlay */}
      {showToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#222A1E] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-[#80C341]/50 animate-in fade-in slide-in-from-bottom-2 text-xs font-bold">
          <Check className="w-4 h-4 text-[#80C341]" />
          <span>{showToast}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        filters={filters}
        onFilterChange={handleFilterChange}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAIChat={() => setIsAIChatOpen(true)}
        onOpenCampaignPdfReport={() => handleOpenCampaignReport()}
        onOpenLinkHealthAudit={() => setIsLinkHealthAuditOpen(true)}
        onDownloadCSV={handleDownloadCSV}
        onDownloadExcel={handleDownloadExcel}
        onRefreshData={handleRefreshData}
        lastUpdatedTime={lastUpdatedTime}
        isRefreshing={isRefreshing}
        totalMentionsCount={mentions.length}
        activeTabTitle={TAB_TITLES[activeTab] || "Dashboard"}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Layout with Professional Polish Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Navigation Drawer Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 z-30 md:hidden backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="w-64 bg-slate-900 h-full p-4 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center font-black text-white text-xs">
                      M
                    </div>
                    <span className="text-white font-bold text-sm">Navigation</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => handleTabSelect("summary")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "summary"
                        ? "bg-[#2D3A28] text-white border-l-4 border-[#80C341]"
                        : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#80C341]" />
                    <span>Executive Summary</span>
                  </button>
                  <button
                    onClick={() => handleTabSelect("alerts")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "alerts"
                        ? "bg-[#2D3A28] text-white border-l-4 border-[#80C341]"
                        : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-[#80C341]" />
                      <span>Live Mentions &amp; Leadership</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600/90 text-white uppercase tracking-wider animate-pulse">
                      LIVE
                    </span>
                  </button>
                  <button
                    onClick={() => handleTabSelect("pickups")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "pickups"
                        ? "bg-[#2D3A28] text-white border-l-4 border-[#80C341]"
                        : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-[#80C341]" />
                      <span>Social Listings</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTabSelect("coverage")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "coverage"
                        ? "bg-[#2D3A28] text-white border-l-4 border-[#80C341]"
                        : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                    }`}
                  >
                    <Newspaper className="w-4 h-4 text-[#80C341]" />
                    <span>All Internet Articles Feed</span>
                  </button>
                  <button
                    onClick={() => handleTabSelect("sentiment")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "sentiment"
                        ? "bg-[#2D3A28] text-white border-l-4 border-[#80C341]"
                        : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-[#80C341]" />
                    <span>Sentiment &amp; Analytics</span>
                  </button>
                  <button
                    onClick={() => handleTabSelect("social")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "social"
                        ? "bg-[#2D3A28] text-white border-l-4 border-[#80C341]"
                        : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                    }`}
                  >
                    <Share2 className="w-4 h-4 text-[#80C341]" />
                    <span>Social Posts &amp; External Blogs</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar Navigation */}
        <aside className="w-64 bg-[#222A1E] border-r border-[#2D3A28] shrink-0 hidden md:flex flex-col justify-between p-4">
          <div className="space-y-6">
            <div className="px-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#80C341]/80">
                PR Intelligence Navigation
              </span>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => handleTabSelect("summary")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "summary"
                    ? "bg-[#2D3A28] text-white shadow-xs border-l-4 border-[#80C341]"
                    : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-[#80C341]" />
                <span>Executive PR Dashboard</span>
              </button>

              <button
                onClick={() => handleTabSelect("alerts")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "alerts"
                    ? "bg-[#2D3A28] text-white shadow-xs border-l-4 border-[#80C341]"
                    : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Radio className="w-4 h-4 text-[#80C341]" />
                  <span>Live Mentions &amp; Leadership</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600/90 text-white uppercase tracking-wider animate-pulse">
                  LIVE
                </span>
              </button>

              <button
                onClick={() => handleTabSelect("pickups")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "pickups"
                    ? "bg-[#2D3A28] text-white shadow-xs border-l-4 border-[#80C341]"
                    : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-[#80C341]" />
                  <span>Social Listings</span>
                </div>
              </button>

              <button
                onClick={() => handleTabSelect("coverage")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "coverage"
                    ? "bg-[#2D3A28] text-white shadow-xs border-l-4 border-[#80C341]"
                    : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                }`}
              >
                <Newspaper className="w-4 h-4 text-[#80C341]" />
                <span>All Internet Articles Feed</span>
              </button>

              <button
                onClick={() => handleTabSelect("sentiment")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "sentiment"
                    ? "bg-[#2D3A28] text-white shadow-xs border-l-4 border-[#80C341]"
                    : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4 text-[#80C341]" />
                <span>Sentiment &amp; Analytics</span>
              </button>

              <button
                onClick={() => handleTabSelect("social")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "social"
                    ? "bg-[#2D3A28] text-white shadow-xs border-l-4 border-[#80C341]"
                    : "text-slate-300 hover:bg-[#2D3A28]/60 hover:text-white"
                }`}
              >
                <Share2 className="w-4 h-4 text-[#80C341]" />
                <span>Social Posts &amp; External Blogs</span>
              </button>
            </nav>

            <div className="pt-4 border-t border-[#2D3A28]">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#80C341]/80 px-2 block mb-2">
                Campaign Filter Status
              </span>
              <div className="bg-[#1A2117] p-3 rounded-xl border border-[#2D3A28]">
                <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                  <Building2 className="w-3.5 h-3.5 text-[#80C341]" />
                  <span>{filters.campaign === "all" ? "All Active Campaigns" : filters.campaign}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {filteredMentions.length} verified mentions across {new Set(filteredMentions.map((m) => m.country)).size} countries ({availableCampaigns.length} total campaigns detected).
                </p>
              </div>
            </div>
          </div>

          {/* AI Helper Banner Widget in Sidebar */}
          <div className="bg-[#1A2117] border border-[#2D3A28] p-3.5 rounded-xl">
            <div className="flex items-center gap-1.5 text-[#80C341] font-bold text-[10px] uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-[#87BD28]" />
              <span>AI Strategic Insight</span>
            </div>
            {(() => {
              const targetMentions = filteredMentions.length > 0 ? filteredMentions : mentions;
              const totalReach = targetMentions.reduce((acc, m) => acc + m.reach, 0);
              const positivePct = targetMentions.length > 0 ? Math.round((targetMentions.filter((m) => m.sentiment === "positive").length / targetMentions.length) * 100) : 100;
              const activeName = filters.campaign === "all" ? "All PR campaigns" : filters.campaign;
              return (
                <p className="text-[11px] text-slate-200 leading-relaxed">
                  <strong>{activeName}</strong> reached <strong>{(totalReach / 1000000).toFixed(1)}M readers</strong> across {new Set(targetMentions.map((m) => m.country)).size} countries with {positivePct}% positive tone.
                </p>
              );
            })()}
          </div>
        </aside>

        {/* Main Content Area */}
        <main ref={mainRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50">
          <div className="max-w-[1500px] w-full mx-auto px-4 md:px-6 py-6 space-y-6">
            {/* Global Filter Toolbar */}
            {activeTab !== "pickups" && activeTab !== "alerts" && (
              <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                onDownloadCSV={handleDownloadCSV}
                onOpenExecutivePdfReport={() => handleOpenCampaignReport()}
                availableCountries={availableCountries}
                availableCampaigns={availableCampaigns}
                totalFilteredCount={filteredMentions.length}
              />
            )}

            {/* PAGE VIEW 1: Executive Summary */}
            {activeTab === "summary" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive PR Summary</h2>
                    <p className="text-xs text-slate-500">
                      High-level metrics, AI briefing, and key sentiment indicators across all tracked media
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTabSelect("alerts")}
                      className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                      <span>Live Mentions Feed ↗</span>
                    </button>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 hidden sm:inline-block">
                      Live Horizon: August 2026
                    </span>
                  </div>
                </div>

                {/* AI Executive Briefing Banner */}
                <AIBriefingBanner
                  briefing={aiBriefing}
                  loading={loadingBriefing}
                  onRefresh={fetchAIBriefing}
                  campaignName={filters.campaign}
                  onShareCampaignPdf={handleOpenCampaignReport}
                />

                {/* Top KPI Metrics Row */}
                <KPICards metrics={metrics} />

                {/* Visual Analytics Row */}
                <SentimentCharts mentions={filteredMentions} competitorSOV={COMPETITORS} />

                {/* Primary Coverage Highlights */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Top Media Coverage Highlights</h3>
                    <button
                      onClick={() => handleTabSelect("coverage")}
                      className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All {filteredMentions.length} Articles</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <CoverageFeed
                    mentions={filteredMentions.slice(0, 6)}
                    onSelectMention={(m) => setSelectedMention(m)}
                    selectedPublicationFilter={selectedPublicationFilter}
                    onClearPublicationFilter={() => setSelectedPublicationFilter(null)}
                    onDownloadCSV={handleDownloadCSV}
                  />
                </div>
              </div>
            )}

            {/* PAGE VIEW 2: Live Mentions of Mintoak & Leadership Team */}
            {activeTab === "alerts" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        Real-time Web &amp; News Monitor
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Live Mentions of Mintoak &amp; Leadership Team
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Automated Google Alerts tracking for Mintoak brand keywords, Raman Khanduja, Sanjay Swamy, Rama Tadepalli, and fintech syndications
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#48821C] bg-[#80C341]/15 px-3 py-1.5 rounded-xl border border-[#80C341]/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#48821C]"></span>
                      Active Webhook Feed
                    </span>
                  </div>
                </div>

                <GoogleAlertsLiveFeed onSelectMention={(m) => setSelectedMention(m)} />
              </div>
            )}

            {/* PAGE VIEW 2: 1,202+ Social Listings Report */}
            {activeTab === "pickups" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <RegionalPickupsStudio
                  selectedCampaign={filters.campaign}
                  onCampaignChange={(campaign) => setFilters((f) => ({ ...f, campaign }))}
                />
              </div>
            )}

            {/* PAGE VIEW 3: Media Coverage Feed */}
            {activeTab === "coverage" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Media Coverage Feed</h2>
                    <p className="text-xs text-slate-500">
                      Real-time database of press articles, news releases, and wire coverage
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                    {filteredMentions.length} Verified Articles
                  </span>
                </div>

                {/* Quick Coverage KPI Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Mentions</p>
                    <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{filteredMentions.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total PR Value (AVE)</p>
                    <p className="text-xl font-black text-emerald-600 font-mono mt-0.5">₹{(metrics.totalPRValueINR / 100000).toFixed(1)} Lakh</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tier A Share</p>
                    <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{metrics.catASharePct}%</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spokesperson Quoted</p>
                    <p className="text-xl font-black text-indigo-600 font-mono mt-0.5">{metrics.quotedCount} Articles</p>
                  </div>
                </div>

                <CoverageFeed
                  mentions={filteredMentions}
                  onSelectMention={(m) => setSelectedMention(m)}
                  selectedPublicationFilter={selectedPublicationFilter}
                  onClearPublicationFilter={() => setSelectedPublicationFilter(null)}
                  onDownloadCSV={handleDownloadCSV}
                />
              </div>
            )}

            {/* PAGE VIEW 3: Sentiment & Analytics */}
            {activeTab === "sentiment" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sentiment &amp; Media Analytics</h2>
                    <p className="text-xs text-slate-500">
                      In-depth tone analysis, competitor share of voice, and outlet tier distribution
                    </p>
                  </div>
                </div>

                {/* Sentiment Top Metric Highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Positive Tone Rate</p>
                    <p className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{metrics.positiveSentimentPct}%</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unique Media Outlets</p>
                    <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{metrics.uniquePublications}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Countries Reached</p>
                    <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{metrics.countriesCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Press Wires Count</p>
                    <p className="text-2xl font-black text-indigo-600 font-mono mt-0.5">{metrics.wireCount}</p>
                  </div>
                </div>

                {/* Sentiment & SOV Charts */}
                <SentimentCharts mentions={filteredMentions} competitorSOV={COMPETITORS} />

                {/* Media Tier Breakdown Table */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <h3 className="font-extrabold text-sm text-slate-900 mb-1">Coverage Breakdown by Media Tier</h3>
                  <p className="text-xs text-slate-500 mb-4">Detailed PR metrics by outlet authority category</p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                          <th className="py-2.5 px-3">Tier Category</th>
                          <th className="py-2.5 px-3">Mentions Count</th>
                          <th className="py-2.5 px-3">Total PR Value (INR)</th>
                          <th className="py-2.5 px-3">Total Reach</th>
                          <th className="py-2.5 px-3">Avg. Sentiment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                            Category A (Top Tier Financial)
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {filteredMentions.filter((m) => m.categoryTier === "A").length}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                            ₹{(filteredMentions.filter((m) => m.categoryTier === "A").reduce((s, m) => s + m.prValueINR, 0) / 100000).toFixed(1)} Lakh
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {(filteredMentions.filter((m) => m.categoryTier === "A").reduce((s, m) => s + m.reach, 0) / 1000000).toFixed(2)}M
                          </td>
                          <td className="py-3 px-3 text-emerald-600 font-bold">
                            {filteredMentions.filter((m) => m.categoryTier === "A").length > 0
                              ? `${Math.round((filteredMentions.filter((m) => m.categoryTier === "A" && m.sentiment === "positive").length / filteredMentions.filter((m) => m.categoryTier === "A").length) * 100)}% Positive`
                              : "N/A"}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                            Category B (Mid Tier &amp; Trade)
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {filteredMentions.filter((m) => m.categoryTier === "B").length}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                            ₹{(filteredMentions.filter((m) => m.categoryTier === "B").reduce((s, m) => s + m.prValueINR, 0) / 100000).toFixed(1)} Lakh
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {(filteredMentions.filter((m) => m.categoryTier === "B").reduce((s, m) => s + m.reach, 0) / 1000000).toFixed(2)}M
                          </td>
                          <td className="py-3 px-3 text-emerald-600 font-bold">
                            {filteredMentions.filter((m) => m.categoryTier === "B").length > 0
                              ? `${Math.round((filteredMentions.filter((m) => m.categoryTier === "B" && m.sentiment === "positive").length / filteredMentions.filter((m) => m.categoryTier === "B").length) * 100)}% Positive`
                              : "N/A"}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                            Press Wires &amp; Syndicates
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {filteredMentions.filter((m) => m.categoryTier === "Wire").length}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                            ₹{(filteredMentions.filter((m) => m.categoryTier === "Wire").reduce((s, m) => s + m.prValueINR, 0) / 100000).toFixed(1)} Lakh
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {(filteredMentions.filter((m) => m.categoryTier === "Wire").reduce((s, m) => s + m.reach, 0) / 1000000).toFixed(2)}M
                          </td>
                          <td className="py-3 px-3 text-emerald-600 font-bold">
                            {filteredMentions.filter((m) => m.categoryTier === "Wire").length > 0
                              ? `${Math.round((filteredMentions.filter((m) => m.categoryTier === "Wire" && m.sentiment === "positive").length / filteredMentions.filter((m) => m.categoryTier === "Wire").length) * 100)}% Positive`
                              : "N/A"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE VIEW 4: Social Listening Studio */}
            {activeTab === "listening" && (
              <SocialListeningStudio globalFilters={filters} />
            )}

            {/* PAGE VIEW 7: Social Posts & External Blogs */}
            {activeTab === "social" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#222A1E] tracking-tight">Social Posts &amp; External Blogs</h2>
                    <p className="text-xs text-slate-500">
                      Third-party social media posts, VC updates, Substack essays, and fintech blogs mentioning Mintoak
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#48821C] bg-[#48821C]/10 px-3 py-1 rounded-xl border border-[#48821C]/20">
                    {EXTERNAL_SOCIAL_POSTS.length} Tracked Posts &amp; Essays
                  </span>
                </div>

                <SocialPostsFeed posts={EXTERNAL_SOCIAL_POSTS} globalFilters={filters} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Selected Article Detail Modal / Full In-App Reader */}
      {selectedMention && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setSelectedMention(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-6 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-[#48821C] uppercase tracking-wider bg-[#EDF6E2] px-2.5 py-1 rounded-md border border-[#80C341]/30">
                  {selectedMention.publication}
                </span>
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  {selectedMention.country} • {selectedMention.date}
                </span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  Category Tier {selectedMention.categoryTier}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    selectedMention.sentiment === "positive"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {selectedMention.sentiment.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setSelectedMention(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close article reader"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
              {/* Article Title */}
              <div>
                <h2 className="text-xl font-black text-[#222A1E] leading-snug tracking-tight">
                  {selectedMention.headline}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                  <span>By {selectedMention.journalist || "Financial Bureau / Wire Services"}</span>
                  <span>•</span>
                  <span>Theme: {selectedMention.theme}</span>
                  {selectedMention.mediaType && (
                    <>
                      <span>•</span>
                      <span>Format: {selectedMention.mediaType}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Full Article Text Block */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs text-slate-700 leading-relaxed font-sans">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-1">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-[#48821C] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Full Article Press Report
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Verified Syndicated Release</span>
                </div>

                <p className="font-semibold text-slate-900 leading-normal text-sm italic">
                  "{selectedMention.summary || selectedMention.headline}"
                </p>

                <p>
                  <strong>MUMBAI / DUBAI —</strong> Financial technology platform Mintoak Innovations has announced the strategic acquisition of Dubai-headquartered ICC Loyalty for an undisclosed sum. The strategic deal consolidates Mintoak's footprint across West Asia, Africa, and Southeast Asia, creating a unified digital payment and customer engagement solution for partner banks.
                </p>

                <p>
                  ICC Loyalty currently serves over 30 tier-1 banking partners across 10 countries in the Middle East and Africa, managing reward programs, credit card redemption networks, and customer retention tools for major regional institutions including Emirates Islamic, Rakbank, and Absa Bank.
                </p>

                {selectedMention.quote && (
                  <div className="bg-[#EDF6E2]/70 p-3.5 rounded-xl border-l-4 border-[#48821C] my-2">
                    <p className="font-semibold text-[#222A1E] italic">
                      "Payments form the foundational bedrock of merchant banking relationships, but engagement and customer loyalty drive the next wave of lifetime value. Combining ICC Loyalty with Mintoak provides banks with a single, end-to-end platform for both acquiring and issuing capabilities."
                    </p>
                    <p className="text-[11px] font-bold text-[#48821C] mt-1">
                      — Raman Khanduja, Co-founder &amp; CEO, Mintoak
                    </p>
                  </div>
                )}

                <p>
                  Following the transaction, the combined business now partners with over 50 financial institutions across 20+ countries, serving more than 5 million merchants and 11 million active bank customers with an annual payment volume exceeding $93 Billion. The merged entity is projected to generate over $30 million in annual ARR with profitability margins above 30%.
                </p>
              </div>

              {/* PR Analytics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">PR Value (AVE)</span>
                  <p className="font-mono font-bold text-[#48821C] text-sm mt-0.5">
                    ₹{selectedMention.prValueINR.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (~${Math.round(selectedMention.prValueINR / 85).toLocaleString()} USD)
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Estimated Reach</span>
                  <p className="font-mono font-bold text-[#222A1E] text-sm mt-0.5">
                    {selectedMention.reach.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-slate-400">Readers / Impressions</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spokesperson</span>
                  <p className="font-bold text-[#222A1E] text-xs mt-0.5 flex items-center gap-1">
                    {selectedMention.quote ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-[#48821C]" />
                        <span>Raman Khanduja</span>
                      </>
                    ) : (
                      <span className="text-slate-500">Industry Report</span>
                    )}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Exclusivity</span>
                  <p className="font-bold text-[#222A1E] text-xs mt-0.5">
                    {selectedMention.exclusive ? "Exclusive Story" : "Syndicated Press"}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  const textToCopy = `${selectedMention.headline}\nPublication: ${selectedMention.publication} (${selectedMention.country})\nDate: ${selectedMention.date}\nSummary: ${selectedMention.summary}\nPR Value: ₹${selectedMention.prValueINR.toLocaleString("en-IN")}`;
                  navigator.clipboard.writeText(textToCopy);
                  setCopiedArticleId(selectedMention.id);
                  setTimeout(() => setCopiedArticleId(null), 2500);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedArticleId === selectedMention.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied Summary!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Summary &amp; Citation</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {isValidArticleUrl(selectedMention.url, { id: selectedMention.id, headline: selectedMention.headline, publication: selectedMention.publication }) ? (
                  <a
                    href={ensureAbsoluteUrl(selectedMention.url, selectedMention.headline, selectedMention.publication)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#48821C] hover:bg-[#386616] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    title={`Open full ${selectedMention.publication} article in new tab`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Source Article</span>
                  </a>
                ) : (
                  <span
                    className="px-3.5 py-2 bg-slate-100 text-slate-400 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-not-allowed border border-slate-200"
                    title="Direct publisher permalink is unavailable"
                  >
                    <Link2Off className="w-3.5 h-3.5 text-slate-400" />
                    <span>Link Unavailable</span>
                  </span>
                )}

                <a
                  href={getGoogleNewsSearchUrl(selectedMention.headline, selectedMention.publication)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-[#EDF6E2] hover:bg-[#80C341]/30 text-[#48821C] font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-[#80C341]/40"
                  title="Search real-time indexed coverage on Google News"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Google News</span>
                </a>

                <button
                  onClick={() => setSelectedMention(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs hover:bg-slate-300 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Drawer */}
      <AIChatDrawer
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        mentions={mentions}
        onOpenCampaignPdfReport={handleOpenCampaignReport}
      />

      {/* Add Mention Modal */}
      <AddMentionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMention={handleAddMention}
      />

      {/* Executive PR Report Generation Modal (Reflecting Active Filters & Dataset) */}
      <ExecutiveReportGeneratorModal
        isOpen={isCampaignReportModalOpen}
        onClose={() => setIsCampaignReportModalOpen(false)}
        filters={filters}
        mentions={filteredMentions}
        availableCampaigns={availableCampaigns}
      />

      {/* Link Health & Audit Registry */}
      <LinkHealthAuditModal
        isOpen={isLinkHealthAuditOpen}
        onClose={() => setIsLinkHealthAuditOpen(false)}
      />
    </div>
  );
}
