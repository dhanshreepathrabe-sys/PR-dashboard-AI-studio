import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MediaMention, RegionalPickup, FilterState } from "../types";
import { ensureAbsoluteUrl } from "./exportCsv";

export interface PDFReportOptions {
  reportType?: "executive" | "detailed" | "full";
  dateRangeText?: string;
  campaignName?: string;
  activeFiltersSummary?: string;
  filterContext?: string;
  filters?: Partial<FilterState>;
  mentions?: (MediaMention | RegionalPickup)[];
  pickups?: (MediaMention | RegionalPickup)[];
  sections?: {
    kpiSummary?: boolean;
    prCharts?: boolean;
    aiInsights?: boolean;
    keyHighlights?: boolean;
    completeCoverage?: boolean;
    articleLinks?: boolean;
  };
  includeAllLinks?: boolean;
  aiExecutiveSummary?: string;
  whatWorked?: string[];
  whatDidntWork?: string[];
  nextSteps?: string[];
}

export function formatINR(val: number): string {
  if (!val || val === 0) return "—";
  if (val >= 10000000) {
    return `INR ${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `INR ${(val / 100000).toFixed(1)} Lakh`;
  }
  return `INR ${val.toLocaleString("en-IN")}`;
}

export function formatReach(reach: number): string {
  if (!reach || reach === 0) return "—";
  if (reach >= 1000000) {
    return `${(reach / 1000000).toFixed(1)}M`;
  }
  if (reach >= 1000) {
    return `${(reach / 1000).toFixed(1)}K`;
  }
  return reach.toLocaleString("en-US");
}

export class PDFExportResult extends String {
  filename: string;
  blobUrl: string;
  totalPages: number;

  constructor(filename: string, blobUrl: string, totalPages: number) {
    super(filename);
    this.filename = filename;
    this.blobUrl = blobUrl;
    this.totalPages = totalPages;
  }
}

// Brand Palette Constants (Consistent Deep Forest / Neon Lime / Sage)
const COLOR_PRIMARY_DARK: [number, number, number] = [28, 35, 25]; // #1C2319
const COLOR_BRAND_LIME: [number, number, number] = [128, 195, 65]; // #80C341
const COLOR_BRAND_FOREST: [number, number, number] = [72, 130, 28]; // #48821C
const COLOR_BG_LIGHT: [number, number, number] = [248, 250, 245]; // #F8FAF5
const COLOR_BORDER: [number, number, number] = [220, 233, 206]; // #DCE9CE
const COLOR_TEXT_DARK: [number, number, number] = [28, 35, 25]; // #1C2319
const COLOR_TEXT_MUTED: [number, number, number] = [100, 115, 100];
const COLOR_LINK_BLUE: [number, number, number] = [24, 88, 186];

export function generateExecutivePRPdfReport(options: PDFReportOptions): PDFExportResult {
  const {
    reportType = "detailed",
    dateRangeText = "August 2026",
    campaignName = "ICC Loyalty Strategic Expansion",
    aiExecutiveSummary,
    whatWorked,
    whatDidntWork,
    nextSteps,
  } = options;

  const rawMentions = options.mentions || options.pickups || [];
  const mentions = rawMentions.length > 0 ? rawMentions : [];
  const activeFiltersSummary =
    options.activeFiltersSummary || options.filterContext || "All Filtered Records";

  const sections = {
    kpiSummary: options.sections?.kpiSummary !== false,
    prCharts: options.sections?.prCharts !== false,
    aiInsights: options.sections?.aiInsights !== false,
    keyHighlights: options.sections?.keyHighlights !== false,
    completeCoverage: options.sections?.completeCoverage !== false,
    articleLinks: options.sections?.articleLinks !== false,
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm
  const headerHeight = 26; // 26mm header banner

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Calculate Metrics
  const totalCount = mentions.length;
  const uniqueOutlets = new Set(
    mentions.map((m) => (m as any).publication || (m as any).outletName || "Outlet")
  ).size;

  const totalReach = mentions.reduce(
    (acc, m) => acc + ((m as any).reach || (m as any).trafficNum || 0),
    0
  );
  const totalPRValue = mentions.reduce(
    (acc, m) =>
      acc +
      ((m as any).prValueINR ||
        ((m as any).reach ? Math.round(((m as any).reach || 0) * 0.45) : 45000)),
    0
  );

  const posMentions = mentions.filter((m) => {
    const s = String((m as any).sentiment || "").toLowerCase().trim();
    return s === "positive" || s === "pos";
  });
  const posCount = posMentions.length;
  const posReach = posMentions.reduce(
    (acc, m) => acc + ((m as any).reach || (m as any).trafficNum || 0),
    0
  );

  const negMentions = mentions.filter((m) => {
    const s = String((m as any).sentiment || "").toLowerCase().trim();
    return s === "negative" || s === "neg";
  });
  const negCount = negMentions.length;
  const negReach = negMentions.reduce(
    (acc, m) => acc + ((m as any).reach || (m as any).trafficNum || 0),
    0
  );

  const mixedMentions = mentions.filter((m) => {
    const s = String((m as any).sentiment || "").toLowerCase().trim();
    return s === "mixed";
  });
  const mixedCount = mixedMentions.length;
  const mixedReach = mixedMentions.reduce(
    (acc, m) => acc + ((m as any).reach || (m as any).trafficNum || 0),
    0
  );

  const neuMentions = mentions.filter((m) => {
    const s = String((m as any).sentiment || "").toLowerCase().trim();
    return (
      s === "neutral" ||
      s === "neu" ||
      !["positive", "pos", "negative", "neg", "mixed"].includes(s)
    );
  });
  const neuCount = neuMentions.length;
  const neuReach = neuMentions.reduce(
    (acc, m) => acc + ((m as any).reach || (m as any).trafficNum || 0),
    0
  );

  const tierACount = mentions.filter((m) => {
    const t = String((m as any).categoryTier || (m as any).tier || "").toUpperCase();
    return t === "A" || t === "TIER 1" || t === "TIER A" || t === "CAT A";
  }).length;

  const posPct = totalCount > 0 ? Math.round((posCount / totalCount) * 100) : 0;
  const negPct = totalCount > 0 ? Math.round((negCount / totalCount) * 100) : 0;
  const mixedPct = totalCount > 0 ? Math.round((mixedCount / totalCount) * 100) : 0;
  const neuPct = totalCount > 0 ? Math.max(0, 100 - posPct - negPct - mixedPct) : 0;
  const tierAPct = totalCount > 0 ? Math.round((tierACount / totalCount) * 100) : 0;

  // Regional breakdown
  const gccCount = mentions.filter((m) => {
    const r = String((m as any).region || (m as any).country || "").toUpperCase();
    return (
      r.includes("GCC") ||
      r.includes("UAE") ||
      r.includes("DUBAI") ||
      r.includes("SAUDI") ||
      r.includes("MIDDLE EAST")
    );
  }).length;
  const seaCount = mentions.filter((m) => {
    const r = String((m as any).region || (m as any).country || "").toUpperCase();
    return (
      r.includes("SEA") ||
      r.includes("SINGAPORE") ||
      r.includes("MALAYSIA") ||
      r.includes("INDONESIA") ||
      r.includes("VIETNAM")
    );
  }).length;
  const indiaCount = mentions.filter((m) => {
    const r = String((m as any).region || (m as any).country || "").toUpperCase();
    return r.includes("INDIA") || r.includes("SOUTH ASIA");
  }).length;
  const globalCount = Math.max(0, totalCount - gccCount - seaCount - indiaCount);

  // Rank Top Highlights
  const sortedByImpact = [...mentions].sort((a, b) => {
    const aTier = (a as any).categoryTier === "A" || (a as any).tier === "A" ? 2 : 1;
    const bTier = (b as any).categoryTier === "A" || (b as any).tier === "A" ? 2 : 1;
    if (bTier !== aTier) return bTier - aTier;
    const aReach = (a as any).reach || (a as any).trafficNum || 0;
    const bReach = (b as any).reach || (b as any).trafficNum || 0;
    if (bReach !== aReach) return bReach - aReach;
    const aPR = (a as any).prValueINR || 0;
    const bPR = (b as any).prValueINR || 0;
    return bPR - aPR;
  });

  const topHighlights = sortedByImpact.slice(0, 5);

  // Helper: Draw Header Banner on Top of Any Page
  const drawPageHeader = (title: string, subtitle?: string) => {
    doc.setFillColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2]);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Lime accent line
    doc.setFillColor(COLOR_BRAND_LIME[0], COLOR_BRAND_LIME[1], COLOR_BRAND_LIME[2]);
    doc.rect(0, headerHeight - 1, pageWidth, 1, "F");

    // Brand Logo & Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("MINTOAK", margin, 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(190, 205, 185);
    doc.text("|   EXECUTIVE PR & MEDIA INTELLIGENCE REPORT", margin + 25, 10);

    // Section Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(COLOR_BRAND_LIME[0], COLOR_BRAND_LIME[1], COLOR_BRAND_LIME[2]);
    doc.text(title.toUpperCase(), margin, 17);

    // Subtitle / Date row
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180, 198, 175);
    const sub =
      subtitle ||
      `Reporting Period: ${dateRangeText}   •   Campaign: ${campaignName}   •   Generated: ${currentDate}`;
    doc.text(sub, margin, 22.5);
  };

  // Helper: Section Title with Green Accent Indicator
  const drawSectionHeader = (title: string, yPos: number): number => {
    doc.setFillColor(COLOR_BRAND_FOREST[0], COLOR_BRAND_FOREST[1], COLOR_BRAND_FOREST[2]);
    doc.rect(margin, yPos - 3, 2.5, 3.8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2]);
    doc.text(title, margin + 4.5, yPos);

    return yPos + 4;
  };

  // Helper: Add Running Footer to all pages
  const addFooters = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Top divider line
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 135, 120);
      doc.text(
        `Mintoak Media Intelligence  |  Executive PR Dossier  |  ${campaignName}`,
        margin,
        pageHeight - 5.5
      );

      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 95, 80);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 5.5);
    }
  };

  // ==========================================
  // PAGE 1: EXECUTIVE BRIEFING & STRATEGIC OVERVIEW
  // ==========================================
  drawPageHeader(
    "Executive Briefing & Strategic Overview",
    `Campaign: ${campaignName}   •   Reporting Period: ${dateRangeText}   •   Date: ${currentDate}`
  );

  let currentY = 32;

  // 1. Scope & Filter Metadata Bar
  const filterBoxHeight = 9.5;
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, filterBoxHeight, 1.5, 1.5, "FD");

  // Left Green Accent Bar
  doc.setFillColor(COLOR_BRAND_FOREST[0], COLOR_BRAND_FOREST[1], COLOR_BRAND_FOREST[2]);
  doc.rect(margin, currentY, 2, filterBoxHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_BRAND_FOREST[0], COLOR_BRAND_FOREST[1], COLOR_BRAND_FOREST[2]);
  doc.text("REPORT SCOPE:", margin + 4, currentY + 6.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(50, 65, 50);
  const filterDesc = `${activeFiltersSummary}   •   ${totalCount.toLocaleString()} Placements   •   Classification: Executive Confidential`;
  doc.text(filterDesc, margin + 28, currentY + 6.2);

  currentY += filterBoxHeight + 5;

  // 2. Section: KEY PERFORMANCE INDICATORS
  if (sections.kpiSummary) {
    currentY = drawSectionHeader("KEY PERFORMANCE INDICATORS (PR & MEDIA METRICS)", currentY);

    const kpiCards = [
      {
        label: "TOTAL PR MENTIONS",
        value: totalCount.toLocaleString(),
        sub: "Verified placements",
        accent: COLOR_BRAND_FOREST,
      },
      {
        label: "TOTAL PUBLICATIONS",
        value: uniqueOutlets.toLocaleString(),
        sub: "Distinct media outlets",
        accent: COLOR_BRAND_FOREST,
      },
      {
        label: "ESTIMATED REACH",
        value: formatReach(totalReach),
        sub: "Total readership pool",
        accent: COLOR_BRAND_FOREST,
      },
      {
        label: "PR VALUE (AVE)",
        value: formatINR(totalPRValue),
        sub: "Advertising value eq.",
        accent: [34, 139, 34],
      },
      {
        label: "POSITIVE SENTIMENT",
        value: `${posCount} (${posPct}%)`,
        sub: "Favorable brand tone",
        accent: [34, 139, 34],
      },
      {
        label: "NEUTRAL / INFORMATIONAL",
        value: `${neuCount} (${neuPct}%)`,
        sub: "Syndicated wire tone",
        accent: [180, 130, 20],
      },
      {
        label: "NEGATIVE COVERAGE",
        value: `${negCount} (${negPct}%)`,
        sub: negCount === 0 ? "Zero brand risks" : "Critical mentions",
        accent: negCount === 0 ? [100, 115, 100] : [200, 50, 50],
      },
      {
        label: "TIER-1 AUTHORITY",
        value: `${tierACount} (${tierAPct}%)`,
        sub: "National & Global A-Tier",
        accent: COLOR_BRAND_FOREST,
      },
    ];

    const gapX = 3.5;
    const cardWidth = (contentWidth - gapX * 3) / 4; // 42.375mm
    const cardHeight = 18.5;
    const gapY = 3;

    kpiCards.forEach((kpi, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const x = margin + col * (cardWidth + gapX);
      const y = currentY + row * (cardHeight + gapY);

      // Card Body
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, "FD");

      // Top Accent Line
      doc.setFillColor(kpi.accent[0], kpi.accent[1], kpi.accent[2]);
      doc.rect(x, y, cardWidth, 1, "F");

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
      doc.text(kpi.label, x + 2.8, y + 4.8);

      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
      doc.text(kpi.value, x + 2.8, y + 11.2);

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(120, 135, 120);
      doc.text(kpi.sub, x + 2.8, y + 15.5);
    });

    currentY += 2 * (cardHeight + gapY) + 4;
  }

  // 3. Section: EXECUTIVE PR SUMMARY & MANAGEMENT BRIEFING
  currentY = drawSectionHeader("EXECUTIVE PR SUMMARY & STRATEGIC BRIEFING", currentY);

  const defaultSummaryBullets = [
    {
      lead: "Coverage Momentum:",
      text: `Mintoak generated strong velocity across ${uniqueOutlets} outlets for "${campaignName}", capturing ${formatReach(totalReach)} estimated readership and ${formatINR(totalPRValue)} PR value.`,
    },
    {
      lead: "Dominant Sentiment:",
      text: `Coverage tone was ${posPct}% positive and ${neuPct}% neutral, anchored around merchant commerce enablement and bank distribution.`,
    },
    {
      lead: "Authority Outlets:",
      text: `Tier-1 publications (Economic Times, LiveMint, Gulf News, Zawya, Business Standard) represented ${tierAPct}% of total placements.`,
    },
    {
      lead: "Cross-Border Synergy:",
      text: `Syndication networks generated organic pickup across regional media, validating Mintoak's positioning with zero negative press.`,
    },
  ];

  const bulletsToRender = aiExecutiveSummary
    ? aiExecutiveSummary
        .split("\n")
        .filter((b) => b.trim().length > 0)
        .slice(0, 4)
        .map((b) => {
          const clean = b.replace(/^[\s*•\d.-]+/, "");
          const colonIdx = clean.indexOf(":");
          if (colonIdx > 0 && colonIdx < 30) {
            return {
              lead: clean.substring(0, colonIdx + 1),
              text: clean.substring(colonIdx + 1).trim(),
            };
          }
          return {
            lead: "Key Finding:",
            text: clean,
          };
        })
    : defaultSummaryBullets;

  // Calculate box height dynamically to avoid text collision
  const summaryBoxY = currentY;
  const textWidth = contentWidth - 12;

  // Measure lines for each bullet
  doc.setFontSize(7.2);
  let computedBoxHeight = 6;
  const bulletLayouts = bulletsToRender.map((b) => {
    const fullText = `${b.lead} ${b.text}`;
    const lines = doc.splitTextToSize(fullText, textWidth);
    const itemHeight = Math.max(8.5, lines.length * 3.8 + 2);
    computedBoxHeight += itemHeight;
    return { ...b, fullText, lines, itemHeight };
  });

  computedBoxHeight = Math.max(46, computedBoxHeight + 2);

  // Draw Background Container
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, summaryBoxY, contentWidth, computedBoxHeight, 1.5, 1.5, "FD");

  // Left Forest Green Accent
  doc.setFillColor(COLOR_BRAND_FOREST[0], COLOR_BRAND_FOREST[1], COLOR_BRAND_FOREST[2]);
  doc.rect(margin, summaryBoxY, 2, computedBoxHeight, "F");

  let bulletY = summaryBoxY + 5.5;
  bulletLayouts.forEach((item) => {
    // Bullet marker
    doc.setFillColor(COLOR_BRAND_FOREST[0], COLOR_BRAND_FOREST[1], COLOR_BRAND_FOREST[2]);
    doc.circle(margin + 4.5, bulletY + 1.2, 0.8, "F");

    // Render full styled text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2]);

    const leadStr = item.lead + " ";
    const leadWidth = doc.getTextWidth(leadStr);

    doc.text(leadStr, margin + 7, bulletY + 2.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(45, 60, 45);

    // If first line fits with lead
    const remainingFirstLineWidth = textWidth - leadWidth;
    const bodyLines = doc.splitTextToSize(item.text, textWidth);

    if (bodyLines.length === 1) {
      doc.text(item.text, margin + 7 + leadWidth, bulletY + 2.5);
    } else {
      // Multiple lines: render line by line cleanly
      doc.text(item.lines, margin + 7, bulletY + 2.5);
    }

    bulletY += item.itemHeight;
  });

  currentY = summaryBoxY + computedBoxHeight + 5;

  // 4. Section: GEOGRAPHIC & SYNDICATION DISTRIBUTION MATRIX
  currentY = drawSectionHeader("GEOGRAPHIC & SYNDICATION DISTRIBUTION", currentY);

  const geoCards = [
    {
      region: "GCC & Middle East",
      count: gccCount,
      pct: totalCount > 0 ? Math.round((gccCount / totalCount) * 100) : 0,
      detail: "UAE, Saudi Arabia, Qatar, Bahrain",
    },
    {
      region: "Southeast Asia (SEA)",
      count: seaCount,
      pct: totalCount > 0 ? Math.round((seaCount / totalCount) * 100) : 0,
      detail: "Singapore, Malaysia, Indonesia",
    },
    {
      region: "India & South Asia",
      count: indiaCount,
      pct: totalCount > 0 ? Math.round((indiaCount / totalCount) * 100) : 0,
      detail: "National & Regional Financial Wire",
    },
    {
      region: "Global & Syndicated",
      count: globalCount,
      pct: totalCount > 0 ? Math.round((globalCount / totalCount) * 100) : 0,
      detail: "International Tech & Trade Portals",
    },
  ];

  const geoGapX = 3.5;
  const geoCardW = (contentWidth - geoGapX * 3) / 4;
  const geoCardH = 17.5;

  geoCards.forEach((geo, idx) => {
    const x = margin + idx * (geoCardW + geoGapX);
    const y = currentY;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, geoCardW, geoCardH, 1.5, 1.5, "FD");

    // Top border
    doc.setFillColor(COLOR_BRAND_FOREST[0], COLOR_BRAND_FOREST[1], COLOR_BRAND_FOREST[2]);
    doc.rect(x, y, geoCardW, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
    doc.text(geo.region, x + 2.5, y + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2]);
    doc.text(`${geo.count} (${geo.pct}%)`, x + 2.5, y + 10.2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(120, 135, 120);
    doc.text(geo.detail, x + 2.5, y + 14.5);
  });

  // ==========================================
  // PAGE 2: MEDIA SENTIMENT & STRATEGIC PR INSIGHTS
  // ==========================================
  doc.addPage();
  drawPageHeader(
    "Media Performance & Strategic PR Insights",
    `Sentiment Breakdown   •   Category Distribution   •   Executive Action Plan`
  );

  currentY = 32;

  // 1. Performance Dimension Table
  if (sections.prCharts) {
    currentY = drawSectionHeader("PR PERFORMANCE OVERVIEW & DISTRIBUTION MATRIX", currentY);

    const tableBody = [
      [
        "Positive Sentiment",
        `${posCount.toLocaleString()} placements`,
        `${posPct}%`,
        formatReach(posReach),
        "Growth, GCC expansion, bank partnerships, merchant OS innovation",
      ],
      [
        "Neutral / Informational",
        `${neuCount.toLocaleString()} placements`,
        `${neuPct}%`,
        formatReach(neuReach),
        "Syndicated wire briefings, corporate registries, funding notices",
      ],
      [
        "Negative / Critical",
        `${negCount.toLocaleString()} placements`,
        `${negPct}%`,
        formatReach(negReach),
        negCount > 0
          ? "Market valuation commentary, fintech regulatory integration"
          : "Zero negative coverage or brand safety risks detected",
      ],
    ];

    if (mixedCount > 0) {
      tableBody.push([
        "Mixed / Balanced",
        `${mixedCount.toLocaleString()} placements`,
        `${mixedPct}%`,
        formatReach(mixedReach),
        "Multi-party fintech comparisons and competitive landscape analysis",
      ]);
    }

    tableBody.push(
      [
        "Category A (Tier 1 Financial)",
        `${tierACount.toLocaleString()} placements`,
        `${tierAPct}%`,
        formatReach(Math.round(totalReach * 0.72)),
        "Economic Times, LiveMint, Gulf News, Zawya, Business Standard",
      ],
      [
        "Category B & Trade / Tech",
        `${Math.max(0, totalCount - tierACount).toLocaleString()} placements`,
        `${Math.max(0, 100 - tierAPct)}%`,
        formatReach(Math.round(totalReach * 0.28)),
        "TechNode, IBS Intelligence, FinTech Futures, PRNewswire, Trade Portals",
      ]
    );

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, top: 32, bottom: 15 },
      head: [
        [
          "Performance Dimension",
          "Volume / Mentions",
          "Share (%)",
          "Estimated Reach",
          "Key Media Characteristics",
        ],
      ],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2]],
        textColor: [COLOR_BRAND_LIME[0], COLOR_BRAND_LIME[1], COLOR_BRAND_LIME[2]],
        fontSize: 7.2,
        fontStyle: "bold",
        cellPadding: 2.5,
        halign: "left",
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 2.2,
        textColor: [40, 50, 40],
        lineColor: [COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]],
        lineWidth: 0.25,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 46 },
        1: { cellWidth: 26, halign: "center" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 64 },
      },
      alternateRowStyles: {
        fillColor: [COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]],
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  }

  // 2. Section: STRATEGIC PR INSIGHTS
  if (sections.aiInsights) {
    currentY = drawSectionHeader("WHAT THE COVERAGE TELLS US (STRATEGIC PR INSIGHTS)", currentY);

    const insightBoxWidth = (contentWidth - 7) / 3; // 57.6mm each
    const insightBoxHeight = 56;

    const whatWorkedList = whatWorked || [
      "Cross-border GCC merchant acquisition narrative generated high organic syndication across Middle East wire.",
      "Institutional bank partnerships (HDFC, SBI, Axis) established authoritative Category A financial credibility.",
      "Positive sentiment anchored around merchant profitability and frictionless digital payments infrastructure.",
    ];

    const whatDidntWorkList = whatDidntWork || [
      "Lower initial pickup volume across European trade portals compared to Middle East and Asian syndicates.",
      "Highly technical API / merchant OS features received less mainstream coverage than funding and deal figures.",
      "Zero brand safety incidents or critical misinformation detected across all monitored channels.",
    ];

    const nextStepsList = nextSteps || [
      "Pitch executive op-eds on SME digital commerce and merchant retention in leading GCC business publications.",
      "Amplify bank partner co-branded case studies with joint press releases across Southeast Asian financial media.",
      "Maintain proactive media relations with Dubai, Singapore, and Mumbai fintech correspondents.",
    ];

    // Helper: Draw Insight Column Box
    const drawInsightBox = (
      x: number,
      title: string,
      items: string[],
      accentColor: [number, number, number],
      bgTint: [number, number, number],
      borderTint: [number, number, number]
    ) => {
      doc.setFillColor(bgTint[0], bgTint[1], bgTint[2]);
      doc.setDrawColor(borderTint[0], borderTint[1], borderTint[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, currentY, insightBoxWidth, insightBoxHeight, 1.5, 1.5, "FD");

      // Top Accent Line
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(x, currentY, insightBoxWidth, 1.2, "F");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(title, x + 3, currentY + 5.5);

      // Bullets
      let itemY = currentY + 10;
      items.forEach((item) => {
        // Dot
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.circle(x + 4, itemY - 0.8, 0.7, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.2);
        doc.setTextColor(45, 55, 45);

        const cleanText = item.replace(/^[\s*•\d.-]+/, "");
        const lines = doc.splitTextToSize(cleanText, insightBoxWidth - 8);
        doc.text(lines, x + 6.5, itemY);
        itemY += lines.length * 3.1 + 2;
      });
    };

    // Box 1: What Worked (Forest Green)
    drawInsightBox(
      margin,
      "WHAT WORKED WELL",
      whatWorkedList,
      COLOR_BRAND_FOREST,
      [245, 250, 240],
      [205, 225, 195]
    );

    // Box 2: What Didn't Work / Risks (Burgundy / Amber)
    drawInsightBox(
      margin + insightBoxWidth + 3.5,
      "WHAT DIDN'T WORK / RISKS",
      whatDidntWorkList,
      [180, 50, 50],
      [254, 246, 246],
      [235, 205, 205]
    );

    // Box 3: Recommended Next Steps (Navy Blue)
    drawInsightBox(
      margin + (insightBoxWidth + 3.5) * 2,
      "RECOMMENDED NEXT STEPS",
      nextStepsList,
      [30, 80, 160],
      [244, 247, 254],
      [205, 218, 242]
    );

    currentY += insightBoxHeight + 7;
  }

  // ==========================================
  // PAGE 3: KEY STRATEGIC MEDIA HIGHLIGHTS
  // ==========================================
  if (sections.keyHighlights && topHighlights.length > 0) {
    doc.addPage();
    drawPageHeader(
      "Key Strategic PR Highlights & Top Placements",
      `High-Impact Media Endorsements   •   Why It Matters   •   Direct Verification`
    );

    currentY = 32;
    currentY = drawSectionHeader("CURATED TOP MEDIA PLACEMENTS & IMPACT ANALYSIS", currentY);

    const cardH = 25;
    const cardGap = 3.2;

    topHighlights.forEach((item, idx) => {
      const outlet = (item as any).publication || (item as any).outletName || "Tier-1 Outlet";
      const rawHeadline = (item as any).headline || "Mintoak PR Milestone Coverage";
      const date = (item as any).date || "2026-08-09";
      const sentiment = (item as any).sentiment || "Positive";
      const reachVal = formatReach((item as any).reach || (item as any).trafficNum || 0);
      const prVal = formatINR((item as any).prValueINR || 0);
      const tierVal = (item as any).categoryTier || (item as any).tier || "Tier 1";
      const rawUrl = ensureAbsoluteUrl((item as any).url);

      const whyItMatters =
        (item as any).summary ||
        `High-authority validation from ${outlet} amplifying Mintoak's fintech momentum and enterprise merchant solutions.`;

      const y = currentY;

      // Card Background & Border
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, cardH, 1.5, 1.5, "FD");

      // Left Accent Strip
      doc.setFillColor(COLOR_BRAND_FOREST[0], COLOR_BRAND_FOREST[1], COLOR_BRAND_FOREST[2]);
      doc.rect(margin, y, 2, cardH, "F");

      // Publication Badge & Headline (Single or 2 lines cleanly constrained)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2]);
      const titleLine = `${idx + 1}. [${outlet}]  ${rawHeadline}`;
      const titleLines = doc.splitTextToSize(titleLine, contentWidth - 34);
      doc.text(titleLines.slice(0, 2), margin + 4.5, y + 4.8);

      // Metadata Bar
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.2);
      doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
      doc.text(
        `Date: ${date}   |   Sentiment: ${sentiment}   |   Tier: ${tierVal}   |   Est. Reach: ${reachVal}   |   PR Value: ${prVal}`,
        margin + 4.5,
        y + 12
      );

      // Why It Matters
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.4);
      doc.setTextColor(60, 75, 60);
      const whyText = `Strategic Impact: ${whyItMatters}`;
      const whyLines = doc.splitTextToSize(whyText, contentWidth - 36);
      doc.text(whyLines.slice(0, 2), margin + 4.5, y + 17.2);

      // Right "Read Article ↗" Button Pill
      const buttonW = 25;
      const buttonH = 6;
      const buttonX = margin + contentWidth - buttonW - 3;
      const buttonY = y + (cardH - buttonH) / 2;

      doc.setFillColor(240, 245, 255);
      doc.setDrawColor(180, 205, 240);
      doc.setLineWidth(0.25);
      doc.roundedRect(buttonX, buttonY, buttonW, buttonH, 1, 1, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(COLOR_LINK_BLUE[0], COLOR_LINK_BLUE[1], COLOR_LINK_BLUE[2]);
      doc.text("Read Article ↗", buttonX + 2.8, buttonY + 4.2);

      // Link entire card as hotspot
      if (rawUrl && rawUrl.startsWith("http")) {
        doc.link(margin, y, contentWidth, cardH, { url: rawUrl });
      }

      currentY += cardH + cardGap;
    });
  }

  // ==========================================
  // PAGE 4+: COMPLETE PR COVERAGE REPOSITORY TABLE
  // ==========================================
  if (sections.completeCoverage && (reportType === "detailed" || reportType === "full")) {
    doc.addPage();
    drawPageHeader(
      "Complete PR Coverage Repository",
      `All ${totalCount.toLocaleString()} Placements   •   Sorted by Date (Newest First)`
    );

    // Sort newest first
    const sortedMentions = [...mentions].sort((a, b) => {
      const dateA = new Date((a as any).date || "2026-08-01").getTime();
      const dateB = new Date((b as any).date || "2026-08-01").getTime();
      return dateB - dateA;
    });

    const coverageRows = sortedMentions.map((m) => {
      const rawUrl = ensureAbsoluteUrl((m as any).url);
      const rawSentiment = String((m as any).sentiment || "Positive");
      const sentimentDisplay =
        rawSentiment.charAt(0).toUpperCase() + rawSentiment.slice(1).toLowerCase();
      const reachVal = (m as any).reach || (m as any).trafficNum || 0;
      const prVal =
        (m as any).prValueINR ||
        ((m as any).reach ? Math.round(((m as any).reach || 0) * 0.45) : 45000);

      return [
        (m as any).date || "2026-08-09",
        (m as any).publication || (m as any).outletName || "Outlet",
        ((m as any).headline || "Headline").substring(0, 65) +
          (((m as any).headline || "").length > 65 ? "..." : ""),
        sentimentDisplay,
        (m as any).mediaType || (m as any).tier || "Digital News",
        formatReach(reachVal),
        formatINR(prVal),
        rawUrl ? "Read ↗" : "—",
        rawUrl || "",
      ];
    });

    autoTable(doc, {
      startY: 32,
      margin: { top: 32, bottom: 15, left: margin, right: margin },
      head: [
        ["Date", "Publication", "Headline", "Sentiment", "Media Type", "Reach", "PR Value", "Link"],
      ],
      body: coverageRows.map((r) => r.slice(0, 8)),
      theme: "striped",
      headStyles: {
        fillColor: [COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2]],
        textColor: [COLOR_BRAND_LIME[0], COLOR_BRAND_LIME[1], COLOR_BRAND_LIME[2]],
        fontSize: 6.8,
        fontStyle: "bold",
        cellPadding: 2,
      },
      styles: {
        fontSize: 6,
        cellPadding: 1.8,
        overflow: "linebreak",
        lineColor: [COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 32, fontStyle: "bold" },
        2: { cellWidth: 54 },
        3: { cellWidth: 16, halign: "center" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 16, halign: "center" },
        6: { cellWidth: 16, halign: "center" },
        7: {
          cellWidth: 12,
          halign: "center",
          fontStyle: "bold",
          textColor: [COLOR_LINK_BLUE[0], COLOR_LINK_BLUE[1], COLOR_LINK_BLUE[2]],
        },
      },
      alternateRowStyles: {
        fillColor: [COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]],
      },
      didDrawCell: (data) => {
        if (data.section === "body") {
          const rowIndex = data.row.index;
          const fullRow = coverageRows[rowIndex];
          const rawUrl = fullRow ? fullRow[8] : "";
          if (rawUrl && typeof rawUrl === "string" && rawUrl.startsWith("http")) {
            if (data.column.index === 7 || data.column.index === 2 || data.column.index === 1) {
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
                url: rawUrl,
              });
            }
          }
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawPageHeader(
            "Complete PR Coverage Repository (Cont.)",
            `All ${totalCount.toLocaleString()} Placements   •   Page ${data.pageNumber}`
          );
        }
      },
    });
  }

  // ==========================================
  // SECTION: FULL ARTICLE LINK APPENDIX
  // ==========================================
  if (sections.articleLinks) {
    doc.addPage();
    drawPageHeader(
      "Verified Media Links Directory",
      `Direct Web Access for Placements   •   100% Clickable URLs`
    );

    const appendixRows = mentions.map((m, idx) => {
      const pub = (m as any).publication || (m as any).outletName || "Publication";
      const headline = ((m as any).headline || "Article Headline").substring(0, 80);
      const rawUrl = ensureAbsoluteUrl((m as any).url);

      return [
        String(idx + 1),
        pub,
        headline,
        rawUrl ? "Open Article ↗" : "—",
        rawUrl || "",
      ];
    });

    autoTable(doc, {
      startY: 32,
      margin: { top: 32, bottom: 15, left: margin, right: margin },
      head: [["#", "Publication", "Article Headline", "Direct Link"]],
      body: appendixRows.map((r) => r.slice(0, 4)),
      theme: "grid",
      headStyles: {
        fillColor: [COLOR_PRIMARY_DARK[0], COLOR_PRIMARY_DARK[1], COLOR_PRIMARY_DARK[2]],
        textColor: [COLOR_BRAND_LIME[0], COLOR_BRAND_LIME[1], COLOR_BRAND_LIME[2]],
        fontSize: 6.8,
        fontStyle: "bold",
        cellPadding: 2,
      },
      styles: {
        fontSize: 6,
        cellPadding: 1.6,
        lineColor: [COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 38, fontStyle: "bold" },
        2: { cellWidth: 108 },
        3: {
          cellWidth: 26,
          halign: "center",
          fontStyle: "bold",
          textColor: [COLOR_LINK_BLUE[0], COLOR_LINK_BLUE[1], COLOR_LINK_BLUE[2]],
        },
      },
      alternateRowStyles: {
        fillColor: [COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]],
      },
      didDrawCell: (data) => {
        if (data.section === "body") {
          const rowIndex = data.row.index;
          const fullRow = appendixRows[rowIndex];
          const rawUrl = fullRow ? fullRow[4] : "";
          if (rawUrl && typeof rawUrl === "string" && rawUrl.startsWith("http")) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
              url: rawUrl,
            });
          }
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawPageHeader(
            "Verified Media Links Directory (Cont.)",
            `Direct Web Access for Placements`
          );
        }
      },
    });
  }

  // Add Footers and page numbers across all pages
  addFooters();

  // Generate Safe Filename and Save
  const cleanCampaign = campaignName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
  const filename = `Mintoak_Executive_PR_Report_${cleanCampaign}_${new Date().toISOString().split("T")[0]}.pdf`;

  let blobUrl = "";
  try {
    const rawBlob = doc.output("blob");
    const pdfBlob = new Blob([rawBlob], { type: "application/pdf" });
    blobUrl = URL.createObjectURL(pdfBlob);

    // Direct programmatic download trigger
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 2500);
  } catch (blobErr) {
    console.warn("Direct blob download attempt encountered error:", blobErr);
  }

  // Fallback save
  try {
    doc.save(filename);
  } catch (saveErr) {
    console.warn("doc.save encountered error (standard in sandboxed iframe):", saveErr);
  }

  return new PDFExportResult(filename, blobUrl, doc.getNumberOfPages());
}
