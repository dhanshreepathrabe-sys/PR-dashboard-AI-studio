export type SentimentType = "positive" | "neutral" | "negative" | "mixed";
export type TierCategory = "A" | "B" | "C" | "Wire";
export type MediaType = "Wire" | "Financial" | "Magazine" | "Online" | "Broadcast";

export interface MediaMention {
  id: number;
  date: string; // YYYY-MM-DD
  publication: string;
  mediaType: MediaType | string;
  country: string;
  region: string;
  headline: string;
  url: string;
  categoryTier: TierCategory; // A = Top Tier / Financial, B = Mid / Trade, C = Regional/Niche, Wire = Press Release Wires
  sentiment: SentimentType;
  theme: string;
  campaign: string;
  prValueINR: number; // Advertising Value Equivalency in INR
  reach: number; // Audience impression count
  journalist?: string;
  quote?: boolean;
  exclusive?: boolean;
  summary?: string;
}

export interface FilterState {
  campaign: string;
  dateRange: "7" | "30" | "90" | "all";
  country: string;
  categoryTier: string; // "all", "A", "B", "C", "Wire"
  sentiment: string; // "all", "positive", "neutral", "negative", "mixed"
  mediaType: string;
  searchQuery: string;
}

export interface ExternalSocialPost {
  id: number;
  platform: "LinkedIn" | "Twitter / X" | "Substack" | "Medium" | "Fintech Blog";
  authorName: string;
  authorTitle: string;
  authorHandle: string;
  date: string;
  content: string;
  postUrl: string;
  engagement: {
    likes: number;
    reposts: number;
    comments: number;
  };
  sentiment: SentimentType;
  topic: string;
}

export interface PRMetrics {
  totalMentions: number;
  totalPRValueINR: number;
  totalPRValueUSD: number;
  totalReach: number;
  catASharePct: number;
  positiveSentimentPct: number;
  uniquePublications: number;
  countriesCount: number;
  quotedCount: number;
  exclusiveCount: number;
  wireCount: number;
}

export interface PublicationStat {
  name: string;
  category: string;
  country: string;
  tier: TierCategory;
  storiesCount: number;
  prValueINR: number;
  reach: number;
  positivePct: number;
  latestDate: string;
}

export interface AIBriefingData {
  summary: string;
  wins: string[];
  watch: string[];
  topStory: string;
}

export interface CompetitorSOV {
  name: string;
  mentions: number;
  sharePct: number;
  positivePct: number;
  isTarget: boolean;
}

export interface RegionalPickup {
  id: string;
  region: "GCC" | "SEA" | "Africa" | "Wires & Global";
  country: string;
  outletName: string;
  wireNetwork: string;
  headline: string;
  url: string;
  date: string;
  trafficFormatted: string;
  trafficNum: number;
  audienceFormatted: string;
  tier: TierCategory;
  sentiment: SentimentType;
  language: string;
  campaign: string;
  reach?: number;
  prValueINR?: number;
}
