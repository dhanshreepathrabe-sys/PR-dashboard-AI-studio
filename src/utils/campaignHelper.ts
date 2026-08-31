export const CANONICAL_CAMPAIGNS = [
  "GCC & Middle East Expansion (ICC Loyalty)",
  "Enterprise Banking Platform",
  "Strategic Growth & Institutional Capital",
  "Global Banking Deployments",
  "Leadership & Executive Insights"
] as const;

export type CanonicalCampaign = typeof CANONICAL_CAMPAIGNS[number];

/**
 * Normalizes any campaign alias, variations, or raw text into a canonical campaign.
 * Specifically recognizes that "Mintoak x ICC", "ICC Loyalty", and "Middle East" are the same campaign.
 */
export function normalizeCampaign(
  campaignName?: string,
  headline?: string,
  content?: string
): CanonicalCampaign {
  const combined = `${campaignName || ""} ${headline || ""} ${content || ""}`.toLowerCase();

  // 1. Mintoak x ICC Loyalty / GCC / Middle East / Dubai Expansion (Primary match)
  if (
    combined.includes("icc") ||
    combined.includes("loyalty") ||
    combined.includes("middle east") ||
    combined.includes("dubai") ||
    combined.includes("uae") ||
    combined.includes("gcc") ||
    combined.includes("west asia") ||
    combined.includes("blacksoil") ||
    combined.includes("mintoak x icc")
  ) {
    return "GCC & Middle East Expansion (ICC Loyalty)";
  }

  // 2. Strategic Growth & Funding (Series A, PayPal, BII, Valuation)
  if (
    combined.includes("series a") ||
    combined.includes("paypal") ||
    combined.includes("funding") ||
    combined.includes("pravega") ||
    combined.includes("bii") ||
    combined.includes("british international") ||
    combined.includes("white whale") ||
    combined.includes("institutional capital") ||
    combined.includes("venture capital") ||
    combined.includes("financials") ||
    combined.includes("profitability")
  ) {
    return "Strategic Growth & Institutional Capital";
  }

  // 3. Enterprise Banking Platform (HDFC, Axis, SBI, SmartHub, Digiledge, MSME)
  if (
    combined.includes("hdfc") ||
    combined.includes("smarthub") ||
    combined.includes("vyapar") ||
    combined.includes("axis bank") ||
    combined.includes("sbi") ||
    combined.includes("digiledge") ||
    combined.includes("merchant saas") ||
    combined.includes("qr") ||
    combined.includes("soundbox") ||
    combined.includes("softpos") ||
    combined.includes("enterprise banking")
  ) {
    return "Enterprise Banking Platform";
  }

  // 4. Global Banking Deployments (Visa APAC, Absa Africa, Cross-Border)
  if (
    combined.includes("visa") ||
    combined.includes("apac") ||
    combined.includes("absa") ||
    combined.includes("africa") ||
    combined.includes("singapore") ||
    combined.includes("global banking") ||
    combined.includes("cross-border")
  ) {
    return "Global Banking Deployments";
  }

  // 5. Leadership & Executive Insights (Raman Khanduja, Sanjay Benny, Rama Tadepalli)
  if (
    combined.includes("raman") ||
    combined.includes("sanjay benny") ||
    combined.includes("rama tadepalli") ||
    combined.includes("thought leadership") ||
    combined.includes("interview") ||
    combined.includes("founder") ||
    combined.includes("cpto") ||
    combined.includes("ceo")
  ) {
    return "Leadership & Executive Insights";
  }

  // If already canonical, return it
  if (CANONICAL_CAMPAIGNS.includes(campaignName as CanonicalCampaign)) {
    return campaignName as CanonicalCampaign;
  }

  // Default fallback for Mintoak coverage
  return "GCC & Middle East Expansion (ICC Loyalty)";
}

/**
 * Intelligent detector returning campaign with clear explanation and confirmation helper
 */
export function detectCampaignWithExplanation(
  headline: string,
  publication: string = "",
  content: string = ""
): {
  campaign: CanonicalCampaign;
  confidence: number;
  reason: string;
  isIccOrMiddleEast: boolean;
} {
  const combined = `${headline} ${publication} ${content}`.toLowerCase();

  if (
    combined.includes("icc") ||
    combined.includes("loyalty") ||
    combined.includes("middle east") ||
    combined.includes("dubai") ||
    combined.includes("uae") ||
    combined.includes("gcc") ||
    combined.includes("west asia") ||
    combined.includes("blacksoil")
  ) {
    return {
      campaign: "GCC & Middle East Expansion (ICC Loyalty)",
      confidence: 98,
      reason: "Detected ICC Loyalty / Middle East deal. Mintoak x ICC is consolidated into 'GCC & Middle East Expansion (ICC Loyalty)'.",
      isIccOrMiddleEast: true
    };
  }

  if (combined.includes("paypal") || combined.includes("series a") || combined.includes("funding")) {
    return {
      campaign: "Strategic Growth & Institutional Capital",
      confidence: 95,
      reason: "Detected institutional investment and Series A funding milestones.",
      isIccOrMiddleEast: false
    };
  }

  if (combined.includes("hdfc") || combined.includes("smarthub") || combined.includes("axis") || combined.includes("sbi")) {
    return {
      campaign: "Enterprise Banking Platform",
      confidence: 94,
      reason: "Detected tier-1 bank merchant deployment (HDFC / Axis / SBI partnership).",
      isIccOrMiddleEast: false
    };
  }

  if (combined.includes("visa") || combined.includes("apac") || combined.includes("africa")) {
    return {
      campaign: "Global Banking Deployments",
      confidence: 90,
      reason: "Detected cross-border international acquiring deployment.",
      isIccOrMiddleEast: false
    };
  }

  if (combined.includes("raman") || combined.includes("sanjay") || combined.includes("rama") || combined.includes("interview")) {
    return {
      campaign: "Leadership & Executive Insights",
      confidence: 92,
      reason: "Detected executive thought leadership or founder interview.",
      isIccOrMiddleEast: false
    };
  }

  return {
    campaign: "GCC & Middle East Expansion (ICC Loyalty)",
    confidence: 85,
    reason: "Standard Mintoak acquisition & merchant growth campaign.",
    isIccOrMiddleEast: true
  };
}
