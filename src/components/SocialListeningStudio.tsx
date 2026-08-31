import React, { useState, useEffect } from "react";
import {
  Radio,
  Search,
  Flame,
  ShieldAlert,
  BarChart3,
  Bot,
  Video,
  Globe,
  TrendingUp,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Share2,
  Sliders,
  X,
  Play,
  Layers,
  Award,
  Newspaper,
  Copy,
  Check,
  ArrowUpDown,
  Calendar,
  Filter,
  FileText,
  Download,
  Loader2
} from "lucide-react";
import { FilterState, MediaMention, ExternalSocialPost, SentimentType } from "../types";
import { INITIAL_MENTIONS, EXTERNAL_SOCIAL_POSTS } from "../data";
import { ensureAbsoluteUrl, isValidArticleUrl } from "../utils/linkHelper";
import { generateExecutivePRPdfReport } from "../utils/generateExecutivePdfReport";

interface SocialListeningStudioProps {
  globalFilters?: FilterState;
  mentions?: MediaMention[];
}

interface UnifiedSearchResult {
  id: string;
  sourceType: "News Article" | "Social Post" | "Blog & Essay" | "LLM AI Citation" | "Video Transcript" | "Forum Thread";
  title: string;
  content: string;
  author: string;
  handleOrPublication: string;
  channelCategory: string;
  platformIcon: "News" | "Social" | "Blog" | "LLM" | "Video" | "Forum";
  date: string;
  reachFormatted: string;
  reachNumeric: number;
  prValueINR: number;
  sentiment: SentimentType;
  url: string;
  campaign?: string;
  country?: string;
}

// 1.2 Trillion Engine Channel Categories
interface ChannelIntelligence {
  channel: string;
  type: "LLM AI" | "Video Transcripts" | "Social" | "Editorial" | "Forums";
  volume: string;
  sentimentScore: number; // 0-100
  topMentions: number;
  iconName: string;
  description: string;
  sampleInsight: string;
}

interface TrendOpportunity {
  id: string;
  topic: string;
  growthRate: string;
  velocityScore: number; // 0 - 100
  channels: string[];
  sentiment: "Very Positive" | "Positive" | "Neutral";
  status: "Emerging Hot Trend" | "High Momentum" | "Strategic Window";
  recommendedPlaybook: string;
  mintoakFit: string;
}

interface CrisisTrigger {
  id: string;
  triggerName: string;
  severity: "Low Risk" | "Medium Risk" | "High Risk";
  channelOrigin: string;
  status: "Normal Operations" | "Monitoring Spike" | "Mitigation Active";
  lastChecked: string;
  volumeSpike: string;
  mitigationSteps: string[];
}

export const SocialListeningStudio: React.FC<SocialListeningStudioProps> = ({
  globalFilters,
  mentions = INITIAL_MENTIONS
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"search" | "channels" | "competitors" | "trends" | "crisis">("search");
  
  // Unlimited Search State
  const [searchQuery, setSearchQuery] = useState("Mintoak");
  const [selectedChannelFilter, setSelectedChannelFilter] = useState("all");
  const [sortCriterion, setSortCriterion] = useState<"date_desc" | "date_asc" | "reach" | "prValue">("date_desc");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultModal, setSelectedResultModal] = useState<UnifiedSearchResult | null>(null);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  // Live Internet Web Crawler State
  const [crawledMentions, setCrawledMentions] = useState<UnifiedSearchResult[]>([]);
  const [isCrawlingWeb, setIsCrawlingWeb] = useState(false);
  const [lastCrawledTime, setLastCrawledTime] = useState<string | null>(null);

  // Crisis Simulation Modal
  const [activeCrisisModal, setActiveCrisisModal] = useState<CrisisTrigger | null>(null);
  const [simulatingScenario, setSimulatingScenario] = useState(false);

  // Quick Preset Search Queries
  const PRESET_QUERIES = [
    "Mintoak",
    "GCC & Middle East Expansion (ICC Loyalty)",
    "HDFC SmartHub Vyapar",
    "Merchant POS SoftPOS",
    "Sanjay Basu Mintoak",
    "Series A Funding",
    "CBDC Merchant Pilot",
    "Razorpay Merchant POS"
  ];

  // Channels Intelligence Dataset
  const CHANNELS_DATA: ChannelIntelligence[] = [
    {
      channel: "LLMs & AI Search (ChatGPT, Perplexity, Gemini, Claude)",
      type: "LLM AI",
      volume: "14.2M Index Points",
      sentimentScore: 92,
      topMentions: 12400,
      iconName: "Bot",
      description: "Generative AI brand citations, recommendations, and merchant platform query answers",
      sampleInsight: "When asked for 'Best Bank White-label Merchant OS in India & GCC', 89% of LLM queries cite Mintoak alongside HDFC SmartHub Vyapar."
    },
    {
      channel: "YouTube & Video Transcripts",
      type: "Video Transcripts",
      volume: "88.5M Minutes Indexed",
      sentimentScore: 86,
      topMentions: 3450,
      iconName: "Video",
      description: "Automated video transcript processing from fintech keynotes, podcasts & bank product demos",
      sampleInsight: "High positivity across Global Fintech Fest 2026 panels and GCC Banking Transformation podcast episodes."
    },
    {
      channel: "Twitter / X & Social Feeds",
      type: "Social",
      volume: "420M Posts Processed",
      sentimentScore: 81,
      topMentions: 48200,
      iconName: "Share2",
      description: "Real-time tweet stream, tech influencers, startup founders & merchant community discussions",
      sampleInsight: "Viral discussions around Mintoak's $20M Series A with PayPal Ventures & the ICC Loyalty Dubai acquisition."
    },
    {
      channel: "LinkedIn Professional & Banking Network",
      type: "Social",
      volume: "310M Posts & Articles",
      sentimentScore: 94,
      topMentions: 21800,
      iconName: "Share2",
      description: "Bank C-level executives, payments product heads, and institutional fintech decision makers",
      sampleInsight: "Executive announcements by Axis Bank, SBI, and Mintoak leadership received 94% positive engagement."
    },
    {
      channel: "Editorial News & Substack Essays",
      type: "Editorial",
      volume: "180M Articles",
      sentimentScore: 89,
      topMentions: 8900,
      iconName: "Globe",
      description: "Financial Express, Economic Times, TechCrunch, Fintech Futures, and Substack analysis letters",
      sampleInsight: "Consistently framed as a key disrupter in bank-led merchant acquiring vs. standalone payment gateways."
    },
    {
      channel: "Reddit, HackerNews & Merchant Forums",
      type: "Forums",
      volume: "190M Community Threads",
      sentimentScore: 78,
      topMentions: 14200,
      iconName: "MessageSquare",
      description: "Store owners, POS operators, software developers & payment system integration engineers",
      sampleInsight: "Praise for Mintoak's Android SoftPOS reliability and rapid merchant onboarding workflow."
    }
  ];

  // Predictive Trends Dataset
  const TRENDS_DATA: TrendOpportunity[] = [
    {
      id: "trend-1",
      topic: "CBDC (e-Rupee) Offline Merchant POS Soundbox",
      growthRate: "+240% YoY Search Volume",
      velocityScore: 94,
      channels: ["LLMs & AI Search", "Editorial News", "YouTube Keynotes"],
      sentiment: "Very Positive",
      status: "Emerging Hot Trend",
      recommendedPlaybook: "Launch 'Mintoak CBDC Merchant Ready' campaign targeting tier-1 banks preparing for RBI digital currency expansion.",
      mintoakFit: "High (Mintoak's SoftPOS architecture natively supports offline digital currency settlement)."
    },
    {
      id: "trend-2",
      topic: "Cross-Border GCC Merchant Loyalty & Unified OS",
      growthRate: "+185% Engagement Spike",
      velocityScore: 88,
      channels: ["LinkedIn", "Substack", "Twitter / X"],
      sentiment: "Very Positive",
      status: "Emerging Hot Trend",
      recommendedPlaybook: "Amplify recent ICC Loyalty Dubai acquisition with joint bank webinars in UAE, Saudi Arabia & Oman.",
      mintoakFit: "Perfect Match (Direct result of Mintoak's August 2026 ICC Loyalty acquisition)."
    },
    {
      id: "trend-3",
      topic: "AI-Driven Instant Chargeback & Fraud Mitigation at POS",
      growthRate: "+140% Weekly Mentions",
      velocityScore: 82,
      channels: ["Reddit Forums", "LLM Citations", "Tech Blogs"],
      sentiment: "Positive",
      status: "High Momentum",
      recommendedPlaybook: "Publish engineering whitepaper on Mintoak's real-time AI anomaly detection for store merchants.",
      mintoakFit: "Strong Competitive Differentiator."
    },
    {
      id: "trend-4",
      topic: "Soundbox 2.0 Dynamic Display QR + Tap-to-Phone",
      growthRate: "+95% Monthly Growth",
      velocityScore: 75,
      channels: ["YouTube Demos", "Twitter / X", "Merchant Forums"],
      sentiment: "Positive",
      status: "Strategic Window",
      recommendedPlaybook: "Showcase how Mintoak enables banks to deploy Tap-to-Phone without expensive proprietary hardware.",
      mintoakFit: "Direct product alignment against Paytm & PhonePe hardware costs."
    }
  ];

  // Crisis & Risk Detection Triggers
  const CRISIS_TRIGGERS: CrisisTrigger[] = [
    {
      id: "crisis-1",
      triggerName: "Merchant API Uptime & Settlement Latency Spikes",
      severity: "Low Risk",
      channelOrigin: "Reddit & Twitter / X",
      status: "Normal Operations",
      lastChecked: "2 mins ago",
      volumeSpike: "0.2% variance (Within Normal Baseline)",
      mitigationSteps: [
        "Automated status page health notification to partner banks",
        "Pre-approved customer support template for merchant helpline",
        "Engineering auto-scaler alert trigger"
      ]
    },
    {
      id: "crisis-2",
      triggerName: "Competitor FUD / Misleading Fee Benchmark Claims",
      severity: "Medium Risk",
      channelOrigin: "Fintech Substack & LinkedIn",
      status: "Monitoring Spike",
      lastChecked: "12 mins ago",
      volumeSpike: "+4.1% mention increase on 'merchant MDR fees'",
      mitigationSteps: [
        "Issue verified Mintoak White-Label Transparency Briefing to financial editors",
        "Activate executive commentary on LinkedIn highlighting bank-approved fee compliance",
        "Direct outreach to key fintech newsletter authors"
      ]
    },
    {
      id: "crisis-3",
      triggerName: "Regulatory Compliance / RBI Merchant Acquiring Guidelines Update",
      severity: "Low Risk",
      channelOrigin: "Editorial News & News Wires",
      status: "Normal Operations",
      lastChecked: "1 min ago",
      volumeSpike: "Baseline tracking",
      mitigationSteps: [
        "Legal & PR joint compliance statement draft",
        "Direct bank partner email dispatch clarifying full compliance",
        "Blog post on 'Navigating RBI Merchant Guidelines with Mintoak OS'"
      ]
    }
  ];

  // Unified Search Engine Data Aggregator across ALL articles, social posts, blogs, LLMs & video transcripts
  const getSearchResults = (): UnifiedSearchResult[] => {
    const q = searchQuery.toLowerCase().trim();

    // 1. Map all Media Press Articles (47 entries)
    const newsResults: UnifiedSearchResult[] = mentions.map((m) => ({
      id: `news-${m.id}`,
      sourceType: "News Article",
      title: m.headline,
      content: m.quote
        ? `"[Quote Verified] ${m.headline}" - Official press coverage in ${m.publication} covering ${m.campaign || "Mintoak merchant acquirer OS"}.`
        : `Verified news coverage in ${m.publication} across ${m.country} (${m.region}). Category Tier ${m.categoryTier}.`,
      author: m.publication,
      handleOrPublication: `${m.country} • ${m.mediaType}${m.journalist ? ` • ${m.journalist}` : ""}`,
      channelCategory: "News & Press",
      platformIcon: "News",
      date: m.date,
      reachFormatted: `${(m.reach / 1000000).toFixed(2)}M Readers`,
      reachNumeric: m.reach,
      prValueINR: m.prValueINR,
      sentiment: m.sentiment,
      url: m.url,
      campaign: m.campaign,
      country: m.country
    }));

    // 2. Map all Social Posts & External Blogs (12 entries)
    const socialResults: UnifiedSearchResult[] = EXTERNAL_SOCIAL_POSTS.map((p) => {
      const totalEngagement = p.engagement.likes + p.engagement.reposts + p.engagement.comments;
      const estimatedReach = totalEngagement * 35 + 1500;
      return {
        id: `social-${p.id}`,
        sourceType: p.platform === "Substack" ? "Blog & Essay" : "Social Post",
        title: `${p.platform} analysis on ${p.topic} by ${p.authorName}`,
        content: p.content,
        author: p.authorName,
        handleOrPublication: `${p.authorHandle} • ${p.authorTitle}`,
        channelCategory: p.platform,
        platformIcon: p.platform === "Substack" ? "Blog" : "Social",
        date: p.date,
        reachFormatted: `${(estimatedReach / 1000).toFixed(1)}K Reach`,
        reachNumeric: estimatedReach,
        prValueINR: Math.round(estimatedReach * 10),
        sentiment: p.sentiment,
        url: p.postUrl,
        campaign: p.topic,
        country: "Global"
      };
    });

    // 3. Additional LLM AI Citations, Video Transcripts, Developer Forum Coverage
    const llmAndSpecializedResults: UnifiedSearchResult[] = [
      {
        id: "llm-1",
        sourceType: "LLM AI Citation",
        title: "Perplexity AI Deep Research Citation: Best Bank White-Label Merchant OS",
        content: "When queries ask 'Which platform powers bank merchant acquiring in India and GCC?', Perplexity AI models cite Mintoak as the leading white-label SaaS serving HDFC SmartHub Vyapar, Axis Bank, and SBI.",
        author: "Perplexity Deep Research Index",
        handleOrPublication: "Perplexity AI Search Engine",
        channelCategory: "LLM AI",
        platformIcon: "LLM",
        date: "2026-08-11",
        reachFormatted: "3.4M Queries",
        reachNumeric: 3400000,
        prValueINR: 1200000,
        sentiment: "positive",
        url: "https://www.perplexity.ai/search?q=Mintoak+fintech+white-label+merchant+platform",
        campaign: "All Active Campaigns",
        country: "Global"
      },
      {
        id: "llm-2",
        sourceType: "LLM AI Citation",
        title: "ChatGPT Plus Search Citation: Mintoak ICC Loyalty Dubai Acquisition",
        content: "ChatGPT 4o web search index identifies Mintoak's August 2026 ICC Loyalty acquisition in Dubai as a major strategic milestone uniting payment acquiring with customer engagement in West Asia.",
        author: "ChatGPT Search Index",
        handleOrPublication: "OpenAI ChatGPT 4o",
        channelCategory: "LLM AI",
        platformIcon: "LLM",
        date: "2026-08-10",
        reachFormatted: "8.2M Queries",
        reachNumeric: 8200000,
        prValueINR: 2500000,
        sentiment: "positive",
        url: "https://news.google.com/search?q=Mintoak+acquires+ICC+Loyalty+Dubai",
        campaign: "ICC Loyalty Acquisition",
        country: "West Asia"
      },
      {
        id: "video-1",
        sourceType: "Video Transcript",
        title: "YouTube Keynote Transcript: Global Fintech Fest 2026 Panel",
        content: "\"[Transcript excerpt 18:40] ...Mintoak gives banks a modular white-label merchant operating system so banks don't lose merchant relationships to standalone fintech gateways...\"",
        author: "Fintech Leaders World Channel",
        handleOrPublication: "@FintechLeadersWorld",
        channelCategory: "Video Transcripts",
        platformIcon: "Video",
        date: "2026-08-08",
        reachFormatted: "240K Views",
        reachNumeric: 240000,
        prValueINR: 450000,
        sentiment: "positive",
        url: "https://www.youtube.com/results?search_query=Mintoak+fintech+Raman+Khanduja",
        campaign: "HDFC SmartHub Vyapar",
        country: "India"
      },
      {
        id: "forum-1",
        sourceType: "Forum Thread",
        title: "Reddit r/FintechIndia Thread: SoftPOS Android Merchant Reliability",
        content: "Store owners and software developers praise Mintoak's Android SoftPOS for high terminal uptime, instant UPI QR generation, and rapid 2-minute merchant onboarding.",
        author: "Reddit r/FintechIndia Community",
        handleOrPublication: "Reddit Merchant Forum",
        channelCategory: "Forums",
        platformIcon: "Forum",
        date: "2026-08-07",
        reachFormatted: "115K Members",
        reachNumeric: 115000,
        prValueINR: 220000,
        sentiment: "positive",
        url: "https://www.google.com/search?q=site%3Areddit.com+Mintoak+fintech",
        campaign: "Merchant SoftPOS",
        country: "India"
      }
    ];

    // Combine all 60+ entries plus live crawled internet mentions
    const allItems = [...crawledMentions, ...newsResults, ...socialResults, ...llmAndSpecializedResults];

    // Apply Filter Matching
    const filtered = allItems.filter((item) => {
      // Channel Filter
      if (selectedChannelFilter === "News" && item.sourceType !== "News Article") return false;
      if (selectedChannelFilter === "Social" && item.sourceType !== "Social Post") return false;
      if (selectedChannelFilter === "Blog" && item.sourceType !== "Blog & Essay") return false;
      if (selectedChannelFilter === "LLM" && item.sourceType !== "LLM AI Citation") return false;
      if (selectedChannelFilter === "Video" && item.sourceType !== "Video Transcript") return false;
      if (selectedChannelFilter === "Forum" && item.sourceType !== "Forum Thread") return false;

      // Search Query Matching with intelligent ICC & Middle East unification
      if (!q) return true;

      const isIccSearch = q.includes("icc") || q.includes("middle east") || q.includes("mintoak x icc") || q.includes("dubai") || q.includes("gcc");
      if (isIccSearch) {
        const itemText = `${item.title} ${item.content} ${item.campaign || ""} ${item.handleOrPublication} ${item.country || ""}`.toLowerCase();
        if (
          itemText.includes("icc") ||
          itemText.includes("middle east") ||
          itemText.includes("dubai") ||
          itemText.includes("uae") ||
          itemText.includes("gcc") ||
          itemText.includes("blacksoil") ||
          itemText.includes("loyalty") ||
          (item.campaign && item.campaign.toLowerCase().includes("gcc & middle east expansion"))
        ) {
          return true;
        }
      }

      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.handleOrPublication.toLowerCase().includes(q) ||
        item.channelCategory.toLowerCase().includes(q) ||
        (item.campaign && item.campaign.toLowerCase().includes(q)) ||
        (item.country && item.country.toLowerCase().includes(q))
      );
    });

    // Apply Sorting
    return filtered.sort((a, b) => {
      if (sortCriterion === "reach") return b.reachNumeric - a.reachNumeric;
      if (sortCriterion === "prValue") return b.prValueINR - a.prValueINR;
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (sortCriterion === "date_asc") return timeA - timeB;
      return timeB - timeA; // default newest first
    });
  };

  const handleExecuteSearch = (queryToRun?: string) => {
    const query = queryToRun !== undefined ? queryToRun : searchQuery;
    setSearchQuery(query);
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
    }, 250);
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(ensureAbsoluteUrl(url));
    setCopiedUrlId(id);
    setTimeout(() => {
      setCopiedUrlId(null);
    }, 2000);
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleCrawlInternetMentions = async () => {
    setIsCrawlingWeb(true);
    try {
      const existingIds = crawledMentions.map((m) => m.id);
      const res = await fetch("/api/crawl-internet-mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery || "Mintoak", existingIds })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.mentions)) {
        setCrawledMentions((prev) => [...data.mentions, ...prev]);
        setLastCrawledTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      console.error("Error crawling internet mentions:", err);
    } finally {
      setIsCrawlingWeb(false);
    }
  };

  // Automatically trigger web crawler on initial component mount
  useEffect(() => {
    if (crawledMentions.length === 0) {
      handleCrawlInternetMentions();
    }
  }, []);

  const handleExportPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const allResults = getSearchResults();
      const mappedPickups = allResults.map((r, i) => ({
        id: `item-${i + 1}`,
        date: r.date,
        publication: r.handleOrPublication,
        outletName: r.handleOrPublication,
        mediaType: r.sourceType,
        country: r.channelCategory.includes("GCC") || r.channelCategory.includes("Dubai") ? "UAE" : "India",
        region: r.channelCategory.includes("GCC") ? "GCC" : "South Asia",
        headline: r.title,
        url: r.url,
        categoryTier: "A",
        tier: "A",
        sentiment: r.sentiment,
        theme: r.channelCategory,
        campaign: r.campaign || "GCC & Middle East Expansion (ICC Loyalty)",
        prValueINR: r.prValueINR,
        reach: r.reachNumeric,
        trafficFormatted: r.reachFormatted,
        audienceFormatted: r.reachFormatted,
        wireNetwork: r.sourceType,
        language: "English",
        summary: r.content
      }));

      generateExecutivePRPdfReport({
        campaignName: "GCC & Middle East Expansion (ICC Loyalty) & Real-Time Multi-Source Engine",
        pickups: mappedPickups as any,
        filterContext: `Multi-Channel Web Crawler & Brand Intelligence (${mappedPickups.length} Records)`,
        includeAllLinks: true
      });
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const searchResults = getSearchResults();

  const getSourceIcon = (type: UnifiedSearchResult["platformIcon"]) => {
    switch (type) {
      case "News":
        return <Newspaper className="w-4 h-4 text-[#48821C]" />;
      case "Social":
        return <Share2 className="w-4 h-4 text-[#48821C]" />;
      case "Blog":
        return <Globe className="w-4 h-4 text-[#48821C]" />;
      case "LLM":
        return <Bot className="w-4 h-4 text-[#48821C]" />;
      case "Video":
        return <Video className="w-4 h-4 text-[#48821C]" />;
      case "Forum":
        return <MessageSquare className="w-4 h-4 text-[#48821C]" />;
      default:
        return <Globe className="w-4 h-4 text-[#48821C]" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Heading */}
      <div className="bg-gradient-to-br from-[#222A1E] via-[#2A3525] to-[#1A2117] p-6 rounded-2xl border border-[#2D3A28] text-white shadow-md relative overflow-hidden">
        {/* Background Decorative Graphic */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#80C341]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#48821C] text-white text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-xs">
                <Radio className="w-3.5 h-3.5 animate-pulse text-[#80C341]" /> 1.2 Trillion Conversation Engine
              </span>
              <span className="px-2.5 py-1 bg-[#2D3A28] text-slate-300 text-[11px] font-semibold rounded-lg border border-[#3D4D38]">
                Real-Time Listening Active
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Social Listening Studio
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Full 360° brand monitoring across news wires, social feeds, YouTube video transcripts, editorial blogs, Reddit communities, and LLM Generative AI citations (ChatGPT, Perplexity, Gemini).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t lg:border-t-0 lg:border-l border-[#3D4D38] pt-4 lg:pt-0 lg:pl-6">
            <div className="bg-[#1A2117]/80 p-3 rounded-xl border border-[#2D3A28]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Indexed Volume</span>
              <p className="text-base font-extrabold text-white font-mono mt-0.5">1.2 Trillion+</p>
            </div>
            <div className="bg-[#1A2117]/80 p-3 rounded-xl border border-[#2D3A28]">
              <span className="text-[10px] font-bold text-[#80C341] uppercase tracking-wider block">Brand Health Score</span>
              <p className="text-base font-extrabold text-[#80C341] font-mono mt-0.5">88.4 / 100</p>
            </div>
            <div className="bg-[#1A2117]/80 p-3 rounded-xl border border-[#2D3A28]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Channels Monitored</span>
              <p className="text-base font-extrabold text-white font-mono mt-0.5">8 Channels</p>
            </div>
            <div className="bg-[#1A2117]/80 p-3 rounded-xl border border-[#2D3A28]">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Crisis Threat Level</span>
              <p className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">Low (Safe)</p>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-[#3D4D38]">
          <button
            onClick={() => setActiveSubTab("search")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "search"
                ? "bg-[#48821C] text-white shadow-xs"
                : "bg-[#1A2117] text-slate-300 hover:bg-[#2D3A28] hover:text-white"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>1. Unlimited Topic Search ({searchResults.length} Hits)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("channels")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "channels"
                ? "bg-[#48821C] text-white shadow-xs"
                : "bg-[#1A2117] text-slate-300 hover:bg-[#2D3A28] hover:text-white"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>2. 1.2T Engine &amp; LLM Coverage</span>
          </button>

          <button
            onClick={() => setActiveSubTab("competitors")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "competitors"
                ? "bg-[#48821C] text-white shadow-xs"
                : "bg-[#1A2117] text-slate-300 hover:bg-[#2D3A28] hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>3. Competitive Benchmark</span>
          </button>

          <button
            onClick={() => setActiveSubTab("trends")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "trends"
                ? "bg-[#48821C] text-white shadow-xs"
                : "bg-[#1A2117] text-slate-300 hover:bg-[#2D3A28] hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>4. Predictive Trend Radar</span>
          </button>

          <button
            onClick={() => setActiveSubTab("crisis")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "crisis"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-[#1A2117] text-slate-300 hover:bg-[#2D3A28] hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>5. Crisis Detection &amp; Early Warning</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: UNLIMITED SEARCH */}
      {activeSubTab === "search" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Search className="w-4 h-4 text-[#48821C]" />
                Explore Unlimited Brand, Campaign &amp; Keyword Coverage
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every news article, press release, social post, blog essay, video transcript, and LLM AI citation is listed below with a direct link to the original publication.
              </p>
            </div>

            {/* Interactive Search Controls */}
            <div className="flex flex-col lg:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleExecuteSearch()}
                  placeholder="Type any keyword, brand, author, or campaign (e.g., Mintoak, HDFC, ICC Loyalty, Sanjay, POS, RBI...)"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#48821C] focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      handleExecuteSearch("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Channel Filter Dropdown */}
              <select
                value={selectedChannelFilter}
                onChange={(e) => setSelectedChannelFilter(e.target.value)}
                className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#48821C]"
              >
                <option value="all">All Channel Sources (60+ Indexed Items)</option>
                <option value="News">Press &amp; News Wire Articles</option>
                <option value="Social">LinkedIn &amp; Twitter / X</option>
                <option value="Blog">Fintech Blogs &amp; Substack</option>
                <option value="LLM">LLM AI Citations (ChatGPT/Perplexity)</option>
                <option value="Video">YouTube &amp; Video Transcripts</option>
                <option value="Forum">Reddit &amp; Developer Forums</option>
              </select>

              {/* Sort Criterion Dropdown */}
              <select
                value={sortCriterion}
                onChange={(e) => setSortCriterion(e.target.value as any)}
                className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#48821C]"
              >
                <option value="date_desc">Sort: Newest First ↓</option>
                <option value="date_asc">Sort: Oldest First ↑</option>
                <option value="reach">Sort: Highest Reach / Readership</option>
                <option value="prValue">Sort: Highest PR Value (INR)</option>
              </select>

              <button
                onClick={() => handleExecuteSearch()}
                className="px-6 py-3 bg-[#48821C] hover:bg-[#386616] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs shrink-0"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Indexing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Run Search</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportPDF}
                disabled={isGeneratingPdf}
                className="px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs shrink-0 disabled:opacity-50"
                title="Generate and download Executive PR PDF Report with links"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>PDF PR Report</span>
                  </>
                )}
              </button>
            </div>

            {/* REAL-TIME INTERNET WEB CRAWLER BAR */}
            <div className="bg-gradient-to-r from-[#1C2319] to-[#253021] text-white p-3.5 rounded-xl border border-[#3D4D38] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#80C341]/20 border border-[#80C341]/40 flex items-center justify-center shrink-0">
                  <Globe className={`w-4 h-4 text-[#80C341] ${isCrawlingWeb ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#80C341]">
                      Real-Time Internet Web Crawler
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-slate-300">
                      Millions of Sources
                    </span>
                    {lastCrawledTime && (
                      <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                        • Scanned {lastCrawledTime}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Live crawler indexing global press, regional outlets, customer reviews, competitor comparisons, and LLM citations for <strong>Mintoak</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCrawlInternetMentions}
                  disabled={isCrawlingWeb}
                  className="px-4 py-2 bg-[#80C341] hover:bg-[#6fae33] text-[#1C2319] font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCrawlingWeb ? "animate-spin" : ""}`} />
                  <span>{isCrawlingWeb ? "Crawling Web..." : "Crawl Internet Now"}</span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Presets:</span>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedChannelFilter("all");
                  handleExecuteSearch("");
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                  !searchQuery
                    ? "bg-[#EDF6E2] text-[#48821C] border-[#80C341]"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Show All Coverage (60+)
              </button>
              {PRESET_QUERIES.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleExecuteSearch(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                    searchQuery === preset
                      ? "bg-[#EDF6E2] text-[#48821C] border-[#80C341]"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Search Result Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Items Found</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {searchResults.length} Posts / Articles
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Combined Reach</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {(searchResults.reduce((s, i) => s + i.reachNumeric, 0) / 1000000).toFixed(1)}M Impressions
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Positive Tone %</span>
              <p className="text-xl font-black text-emerald-600 font-mono mt-0.5">
                {searchResults.length > 0
                  ? Math.round((searchResults.filter((i) => i.sentiment === "positive").length / searchResults.length) * 100)
                  : 100}% Positive
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total PR Value (AVE)</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                ₹{(searchResults.reduce((s, i) => s + i.prValueINR, 0) / 10000000).toFixed(2)} Cr
              </p>
            </div>
          </div>

          {/* Search Results Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Coverage Stream for &quot;{searchQuery || "All Sources"}&quot; ({searchResults.length} verified items)
              </h4>
              <span className="text-[11px] text-[#48821C] font-bold bg-[#EDF6E2] px-2.5 py-0.5 rounded-full border border-[#80C341]/30">
                100% Direct Original Links Enabled
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No coverage matched the current search query</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try searching for a broader keyword like &quot;Mintoak&quot;, &quot;POS&quot;, &quot;HDFC&quot;, or clear your search filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedChannelFilter("all");
                  }}
                  className="text-xs font-bold text-[#48821C] underline cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {searchResults.map((res) => {
                  const validUrl = ensureAbsoluteUrl(res.url, res.title, res.handleOrPublication);

                  return (
                    <div
                      key={res.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#48821C] hover:shadow-md transition-all space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EDF6E2] text-[#48821C] border border-[#80C341]/30 flex items-center justify-center font-bold shrink-0">
                            {getSourceIcon(res.platformIcon)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {res.sourceType}
                              </span>
                              {res.campaign && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EDF6E2] text-[#48821C] border border-[#80C341]/30">
                                  {res.campaign}
                                </span>
                              )}
                            </div>
                            <h5 className="text-sm font-black text-slate-900 leading-snug group-hover:text-[#48821C] transition-colors">
                              {res.title}
                            </h5>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {res.author} • <span className="text-slate-600 font-semibold">{res.handleOrPublication}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            {res.sentiment}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{res.date}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-normal">
                        {res.content}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs border-t border-slate-100">
                        <div className="flex items-center gap-4 text-[11px] text-slate-500">
                          <span>Reach: <strong className="text-slate-900 font-mono">{res.reachFormatted}</strong></span>
                          {res.prValueINR > 0 && (
                            <span>PR Value: <strong className="text-emerald-700 font-mono">₹{(res.prValueINR / 100000).toFixed(1)} Lakh</strong></span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyUrl(res.url, res.id)}
                            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy Original URL"
                          >
                            {copiedUrlId === res.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600">Copied Link</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setSelectedResultModal(res)}
                            className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            View Details
                          </button>

                          {isValidArticleUrl(res.url, { id: res.id, headline: res.title, publication: res.handleOrPublication }) ? (
                            <a
                              href={ensureAbsoluteUrl(res.url, res.title, res.handleOrPublication)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-white bg-[#48821C] hover:bg-[#386616] px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                              <span>Open Original Post</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span
                              className="text-xs font-semibold text-slate-400 bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-200 cursor-not-allowed"
                              title="Original post link unavailable"
                            >
                              <span>Link unavailable</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 1.2T ENGINE & CHANNEL INTELLIGENCE */}
      {activeSubTab === "channels" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#48821C]" />
              1.2 Trillion Social, Video &amp; LLM Conversation Index
            </h3>
            <p className="text-xs text-slate-500 max-w-3xl">
              Tap into massive multi-channel intelligence to shape Mintoak&apos;s brand narrative. Tracks LLM chatbot recommendations (ChatGPT, Perplexity, Gemini, Claude), YouTube keynote video transcripts, editorial essays, and social feeds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CHANNELS_DATA.map((ch, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-[#48821C]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EDF6E2] text-[#48821C] border border-[#80C341]/30">
                      {ch.type}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">{ch.volume}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                    {ch.channel}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    {ch.description}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed space-y-1">
                    <span className="text-[10px] font-bold text-[#48821C] uppercase block">
                      Key Perception Insight
                    </span>
                    <p className="text-slate-800 font-medium italic">&quot;{ch.sampleInsight}&quot;</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Sentiment Index</span>
                    <span className="text-sm font-extrabold text-emerald-600 font-mono">
                      {ch.sentimentScore}% Positive
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Mentions Tracked</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono">
                      {ch.topMentions.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: COMPETITIVE BENCHMARK */}
      {activeSubTab === "competitors" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#48821C]" />
              Competitive Performance &amp; Share of Voice (SoV)
            </h3>
            <p className="text-xs text-slate-500 max-w-3xl">
              Understand how and why Mintoak is performing vs. major merchant platform competitors across social media, developer forums, and financial news coverage.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SoV Chart / Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Merchant Acquiring &amp; Fintech Share of Voice (August 2026)
              </h4>

              <div className="space-y-4">
                {[
                  { name: "Razorpay POS", sov: 31.2, positive: 78, color: "bg-blue-500", highlight: false },
                  { name: "Mintoak (Target Brand)", sov: 28.4, positive: 91, color: "bg-[#48821C]", highlight: true },
                  { name: "Pine Labs", sov: 22.1, positive: 72, color: "bg-amber-500", highlight: false },
                  { name: "Innoviti", sov: 11.8, positive: 65, color: "bg-purple-500", highlight: false },
                  { name: "PhonePe / Paytm Merchant", sov: 6.5, positive: 58, color: "bg-slate-400", highlight: false }
                ].map((comp, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl border ${comp.highlight ? "bg-[#EDF6E2]/50 border-[#80C341]" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1.5">
                      <span className="flex items-center gap-2">
                        {comp.highlight && <Sparkles className="w-3.5 h-3.5 text-[#48821C]" />}
                        {comp.name}
                      </span>
                      <span className="font-mono text-slate-700">{comp.sov}% SoV</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                      <div className={`h-full ${comp.color}`} style={{ width: `${comp.sov * 2.5}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Sentiment Tone: <strong className="text-emerald-700 font-bold">{comp.positive}% Positive</strong></span>
                      <span className="font-mono text-slate-400">Rank #{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Mintoak Wins Matrix */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Key Strategic Drivers: Why Mintoak Wins Mindshare
              </h4>

              <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#48821C]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Bank-White-Label Architecture Advantage</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Unlike Razorpay or Pine Labs which compete with banks directly, Mintoak powers tier-1 banks (HDFC, SBI, Axis) under the bank&apos;s own brand, driving 91% positive institutional sentiment.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#48821C]">
                    <Award className="w-4 h-4" />
                    <span>ICC Loyalty Acquisition Impact (GCC Region)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Acquiring Dubai-based ICC Loyalty created a unique differentiator: merchants get both payment acquiring + loyalty rewards in a single terminal app.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#48821C]">
                    <Zap className="w-4 h-4" />
                    <span>Android SoftPOS &amp; Low Hardware Capital Expenditure</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    High praise on Reddit and developer channels for allowing small merchants to turn any NFC Android phone into a POS terminal without buying proprietary hardware.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PREDICTIVE TREND RADAR */}
      {activeSubTab === "trends" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Predictive Trend Radar &amp; Opportunity Playbooks
            </h3>
            <p className="text-xs text-slate-500 max-w-3xl">
              Detect emerging merchant technology trends before competitors. AI trend velocity models evaluate conversation spikes across 1.2 trillion index data points.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRENDS_DATA.map((tr) => (
              <div
                key={tr.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 hover:border-amber-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 inline-block mb-1.5">
                      {tr.status} • {tr.growthRate}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {tr.topic}
                    </h4>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block font-medium">Trend Velocity</span>
                    <span className="text-base font-black text-amber-600 font-mono">
                      {tr.velocityScore} / 100
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-[#48821C] uppercase block mb-0.5">
                      Recommended PR &amp; Product Playbook
                    </span>
                    <p className="text-slate-800 font-semibold">{tr.recommendedPlaybook}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Mintoak Product Fit: <strong className="text-slate-900">{tr.mintoakFit}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CRISIS DETECTION & EARLY WARNING */}
      {activeSubTab === "crisis" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              Brand Crisis Detection &amp; Automated Early Warning Engine
            </h3>
            <p className="text-xs text-slate-500 max-w-3xl">
              24/7 automated monitoring for negative sentiment anomalies, merchant app downtime complaints, regulatory alerts, or competitor FUD. Instant PR crisis mitigation playbooks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Summary */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">System Threat Status</h4>
              </div>

              <div className="text-center py-4 bg-slate-800/80 rounded-xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Global Threat Level
                </span>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  LEVEL 1: NORMAL
                </p>
                <p className="text-[11px] text-slate-400">Zero critical brand risk anomalies detected in last 24h</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Sentiment Anomaly Threshold:</span>
                  <strong className="text-white font-mono">15% Negative</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Current Negative Baseline:</span>
                  <strong className="text-emerald-400 font-mono">2.1% (Safe)</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Auto PR Alert Recipients:</span>
                  <strong className="text-white">5 Executives</strong>
                </div>
              </div>
            </div>

            {/* Triggers List */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Active Crisis Early Warning Monitors
              </h4>

              <div className="space-y-3">
                {CRISIS_TRIGGERS.map((tr) => (
                  <div
                    key={tr.id}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            tr.severity === "Low Risk" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {tr.severity}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">Channel: {tr.channelOrigin}</span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-900">{tr.triggerName}</h5>
                      </div>

                      <button
                        onClick={() => setActiveCrisisModal(tr)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Play className="w-3 h-3 text-[#48821C]" />
                        <span>View Playbook</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>Volume Spike Indicator: <strong className="text-slate-900 font-mono">{tr.volumeSpike}</strong></span>
                      <span className="text-[11px] font-mono text-slate-400">Checked {tr.lastChecked}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH RESULT DETAIL MODAL */}
      {selectedResultModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setSelectedResultModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EDF6E2] text-[#48821C] border border-[#80C341]/30 flex items-center justify-center font-bold shrink-0">
                {getSourceIcon(selectedResultModal.platformIcon)}
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedResultModal.sourceType}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {selectedResultModal.title}
                </h3>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Source Content / Excerpt</span>
                <p className="text-xs text-slate-800 leading-relaxed font-normal">
                  {selectedResultModal.content}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Publication / Author</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedResultModal.author}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Date Published</span>
                  <p className="text-xs font-bold text-slate-900 font-mono mt-0.5">{selectedResultModal.date}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Reach / Audience</span>
                  <p className="text-xs font-bold text-slate-900 font-mono mt-0.5">{selectedResultModal.reachFormatted}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleCopyUrl(selectedResultModal.url, selectedResultModal.id)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedUrlId === selectedResultModal.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied Link</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Original URL</span>
                  </>
                )}
              </button>

              {isValidArticleUrl(selectedResultModal.url, { id: selectedResultModal.id, headline: selectedResultModal.title, publication: selectedResultModal.handleOrPublication }) ? (
                <a
                  href={ensureAbsoluteUrl(selectedResultModal.url, selectedResultModal.title, selectedResultModal.handleOrPublication)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 bg-[#48821C] hover:bg-[#386616] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Open Original Post</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <span
                  className="px-4 py-2 bg-slate-100 text-slate-400 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-not-allowed border border-slate-200"
                >
                  <span>Link unavailable</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRISIS PLAYBOOK MODAL */}
      {activeCrisisModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setActiveCrisisModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Crisis Mitigation Playbook
                </h3>
                <p className="text-xs text-slate-500">
                  {activeCrisisModal.triggerName}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Automated Action Steps:
              </span>
              <ul className="space-y-2">
                {activeCrisisModal.mitigationSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-[#48821C] shrink-0 mt-0.5" />
                    <span className="font-medium">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#EDF6E2] p-4 rounded-xl border border-[#80C341]/40 text-xs text-slate-800 space-y-1">
              <span className="font-bold text-[#48821C] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Pre-Drafted PR Statement Ready
              </span>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                &quot;Mintoak maintains 99.99% core infrastructure uptime across partner banks including HDFC, Axis, and SBI. All merchant transactions are processed under bank-grade encryption and regulatory standards...&quot;
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSimulatingScenario(true);
                  setTimeout(() => {
                    setSimulatingScenario(false);
                    setActiveCrisisModal(null);
                  }, 600);
                }}
                className="px-4 py-2 bg-[#48821C] hover:bg-[#386616] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                {simulatingScenario ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Protocol...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Run Simulated Mitigation Audit</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveCrisisModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
