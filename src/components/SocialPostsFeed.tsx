import React, { useState } from "react";
import { ExternalSocialPost, FilterState } from "../types";
import { ExternalLink, ThumbsUp, MessageSquare, Repeat, Filter, Search, BookOpen, X, Copy, Check, Calendar, ArrowUpDown } from "lucide-react";
import { ensureAbsoluteUrl, isValidArticleUrl } from "../utils/linkHelper";

interface SocialPostsFeedProps {
  posts: ExternalSocialPost[];
  globalFilters?: FilterState;
}

export const SocialPostsFeed: React.FC<SocialPostsFeedProps> = ({ posts, globalFilters }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [localDateRange, setLocalDateRange] = useState<string>("all");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<ExternalSocialPost | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<number | null>(null);

  // Active date filter uses local selection if specified, otherwise syncs with global dateRange filter
  const activeDateRange = localDateRange !== "all" ? localDateRange : (globalFilters?.dateRange || "all");

  const filteredPosts = posts.filter((post) => {
    // 1. Platform filter
    if (selectedPlatform !== "all" && post.platform !== selectedPlatform) return false;

    // 2. Date filter (supports relative days e.g. 7, 30, 90 or exact year e.g. 2026, 2025, 2024, 2023)
    if (activeDateRange !== "all") {
      if (["7", "30", "90"].includes(activeDateRange)) {
        const days = parseInt(activeDateRange, 10);
        const postDateMs = new Date(`${post.date}T00:00:00Z`).getTime();
        const nowMs = new Date().getTime();
        const diffDays = (nowMs - postDateMs) / (1000 * 3600 * 24);
        if (diffDays > days && post.date < "2026-08-01") return false;
      } else if (activeDateRange.length === 4) {
        if (!post.date.startsWith(activeDateRange)) return false;
      }
    }

    // 3. Campaign filter (if set in global filters)
    if (globalFilters?.campaign && globalFilters.campaign !== "all") {
      const camp = globalFilters.campaign.toLowerCase();
      const combined = `${post.content} ${post.topic}`.toLowerCase();
      
      if (camp.includes("icc") || camp.includes("middle east") || camp.includes("gcc") || camp.includes("dubai") || camp.includes("mintoak x icc")) {
        const isMatch = combined.includes("icc") || combined.includes("loyalty") || combined.includes("middle east") || combined.includes("dubai") || combined.includes("gcc") || combined.includes("uae") || combined.includes("blacksoil");
        if (!isMatch) return false;
      } else if (camp.includes("strategic") || camp.includes("series a") || camp.includes("capital") || camp.includes("funding")) {
        const isMatch = combined.includes("series a") || combined.includes("paypal") || combined.includes("funding") || combined.includes("pravega") || combined.includes("investment");
        if (!isMatch) return false;
      } else if (camp.includes("enterprise") || camp.includes("hdfc") || camp.includes("banking")) {
        const isMatch = combined.includes("hdfc") || combined.includes("axis") || combined.includes("sbi") || combined.includes("smarthub") || combined.includes("saas") || combined.includes("merchant");
        if (!isMatch) return false;
      } else if (camp.includes("global") || camp.includes("visa")) {
        const isMatch = combined.includes("visa") || combined.includes("apac") || combined.includes("absa") || combined.includes("africa") || combined.includes("global");
        if (!isMatch) return false;
      }
    }

    // 4. Search query with intelligent Middle East / ICC detection
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const postText = `${post.authorName} ${post.content} ${post.topic} ${post.platform}`.toLowerCase();
      const isIccSearch = q.includes("icc") || q.includes("middle east") || q.includes("mintoak x icc") || q.includes("dubai") || q.includes("gcc");
      if (isIccSearch) {
        const isMatch = postText.includes("icc") || postText.includes("loyalty") || postText.includes("middle east") || postText.includes("dubai") || postText.includes("gcc") || postText.includes("uae") || postText.includes("blacksoil");
        if (!isMatch) return false;
      } else {
        if (!postText.includes(q)) return false;
      }
    }

    return true;
  });

  // Sort filtered posts by Date (Ascending vs Descending)
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const timeA = new Date(`${a.date}T00:00:00Z`).getTime();
    const timeB = new Date(`${b.date}T00:00:00Z`).getTime();
    if (sortDirection === "asc") {
      return timeA - timeB; // Oldest first
    }
    return timeB - timeA; // Newest first (descending)
  });

  const getPlatformBadge = (platform: ExternalSocialPost["platform"]) => {
    switch (platform) {
      case "LinkedIn":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "Twitter / X":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "Substack":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Medium":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Fintech Blog":
        return "bg-purple-50 text-purple-800 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 tracking-tight">
              Posts &amp; External Blogs Mentioning Mintoak
            </h3>
            <p className="text-xs text-slate-500">
              Third-party social media posts, VC updates, Substack essays, and fintech blog discussions mentioning Mintoak
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#48821C]" /> Date:
              </span>
              <select
                value={localDateRange}
                onChange={(e) => setLocalDateRange(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#48821C]"
              >
                <option value="all">All Dates / Years</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="2026">Year 2026</option>
                <option value="2024">Year 2024</option>
                <option value="2023">Year 2023</option>
              </select>
            </div>

            {/* Date Sort Order Dropdown (Ascending / Descending) */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#48821C]" /> Sort Order:
              </span>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as "desc" | "asc")}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#48821C]"
              >
                <option value="desc">Newest First (Descending ↓)</option>
                <option value="asc">Oldest First (Ascending ↑)</option>
              </select>
            </div>

            {/* Platform Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Platform:
              </span>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#48821C]"
              >
                <option value="all">All Platforms ({posts.length})</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter / X">Twitter / X</option>
                <option value="Substack">Substack</option>
                <option value="Medium">Medium</option>
                <option value="Fintech Blog">Fintech Blog</option>
              </select>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search posts by author, keyword, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#48821C]"
          />
        </div>
      </div>

      {sortedPosts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">No posts matched the selected date/platform filter</h4>
          <p className="text-xs text-slate-500">Try changing the date horizon or platform dropdown options.</p>
          <button
            onClick={() => {
              setLocalDateRange("all");
              setSelectedPlatform("all");
              setSortDirection("desc");
              setSearchQuery("");
            }}
            className="text-xs font-bold text-[#48821C] underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedPosts.map((post) => {
            const validPostUrl = ensureAbsoluteUrl(post.postUrl);

            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-[#48821C]/50 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EDF6E2] border border-[#80C341]/30 flex items-center justify-center text-xs font-black text-[#48821C]">
                        {post.authorName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#48821C] transition-colors">
                          {post.authorName}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {post.authorTitle} • <span className="text-slate-400">{post.authorHandle}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${getPlatformBadge(
                        post.platform
                      )}`}
                    >
                      {post.platform}
                    </span>
                  </div>

                  <div className="mb-3">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#48821C] bg-[#EDF6E2] px-2 py-0.5 rounded-md mb-2">
                      Topic: {post.topic}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line line-clamp-4">
                      {post.content}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="flex items-center gap-1 hover:text-slate-900">
                      <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                      {post.engagement.likes.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 hover:text-slate-900">
                      <Repeat className="w-3.5 h-3.5 text-slate-400" />
                      {post.engagement.reposts.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 hover:text-slate-900">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      {post.engagement.comments.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">{post.date}</span>

                    {validPostUrl && (
                      <a
                        href={validPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-[#48821C] hover:bg-[#EDF6E2] rounded-lg transition-colors border border-[#80C341]/30"
                        title={`Open original post on ${post.platform}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPost(post);
                      }}
                      className="text-xs font-bold text-[#48821C] hover:text-[#2A4D1F] flex items-center gap-1 bg-[#EDF6E2] hover:bg-[#80C341]/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Read Post</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Social Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#EDF6E2] border border-[#80C341]/40 flex items-center justify-center text-sm font-black text-[#48821C]">
                  {selectedPost.authorName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#222A1E]">
                    {selectedPost.authorName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedPost.authorTitle} • <span className="text-slate-400">{selectedPost.authorHandle}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${getPlatformBadge(
                    selectedPost.platform
                  )}`}
                >
                  {selectedPost.platform}
                </span>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-slate-400 hover:text-slate-800 cursor-pointer font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-xs font-bold text-[#48821C] bg-[#EDF6E2] px-2.5 py-1 rounded-md border border-[#80C341]/30">
                  Topic: {selectedPost.topic}
                </span>
                <span className="text-slate-400 font-mono text-xs">{selectedPost.date}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                {selectedPost.content}
              </div>

              {/* Engagement Stats Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Likes / Reacts</span>
                  <p className="font-mono font-bold text-slate-800 text-sm mt-0.5 flex items-center justify-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-[#48821C]" />
                    {selectedPost.engagement.likes.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Reposts / Shares</span>
                  <p className="font-mono font-bold text-slate-800 text-sm mt-0.5 flex items-center justify-center gap-1">
                    <Repeat className="w-3.5 h-3.5 text-blue-600" />
                    {selectedPost.engagement.reposts.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Comments</span>
                  <p className="font-mono font-bold text-slate-800 text-sm mt-0.5 flex items-center justify-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                    {selectedPost.engagement.comments.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const textToCopy = `${selectedPost.authorName} (${selectedPost.platform}):\n"${selectedPost.content}"`;
                  navigator.clipboard.writeText(textToCopy);
                  setCopiedPostId(selectedPost.id);
                  setTimeout(() => setCopiedPostId(null), 2500);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedPostId === selectedPost.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied Post!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Post Text</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {isValidArticleUrl(selectedPost.postUrl, { id: selectedPost.id, headline: selectedPost.content, publication: selectedPost.platform }) ? (
                  <a
                    href={ensureAbsoluteUrl(selectedPost.postUrl, selectedPost.content, selectedPost.platform)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#48821C] hover:bg-[#386616] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    title={`Open post on ${selectedPost.platform}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Original Post</span>
                  </a>
                ) : (
                  <span
                    className="px-3 py-2 bg-slate-100 text-slate-400 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-not-allowed border border-slate-200"
                  >
                    <span>Link unavailable</span>
                  </span>
                )}

                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs hover:bg-slate-300 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


