import { INITIAL_MENTIONS } from "../data";
import { INITIAL_GOOGLE_ALERTS } from "../data/alertsData";
import { ALL_1202_PICKUPS } from "../data/pickupsData";
import { EXTERNAL_SOCIAL_POSTS } from "../data";
import { ensureAbsoluteUrl } from "./linkHelper";
import { LINK_AUDIT_RESULTS } from "../data/linkAuditResults";

export interface LinkHealthRecord {
  id: string;
  sourceType: "Mentions" | "Google Alerts" | "Regional Pickups" | "Social Posts";
  recordId: string | number;
  headline: string;
  publication: string;
  originalUrl: string;
  sanitizedUrl: string;
  status: "VALID" | "REDIRECTED" | "BROKEN" | "PAGE NOT FOUND" | "UNVERIFIED" | "CHECKING";
  statusCode?: number;
  finalUrl?: string;
  lastChecked?: string;
  notes?: string;
}

const LAST_AUDIT_TIMESTAMP = new Date().toISOString();

/** Looks up the real, previously-audited HTTP status for a URL rather than assuming it works. */
function resolveHealth(url: string): Pick<LinkHealthRecord, "status" | "statusCode" | "finalUrl" | "notes"> {
  const audit = LINK_AUDIT_RESULTS[url.trim()];
  if (!audit) {
    return { status: "UNVERIFIED", notes: "Not yet included in the last link audit run." };
  }
  return {
    status: audit.status,
    statusCode: audit.statusCode,
    finalUrl: audit.finalUrl,
    notes:
      audit.status === "BROKEN"
        ? "Confirmed dead or redirects to an unrelated page - falls back to Google News search."
        : audit.status === "REDIRECTED"
        ? "Redirects to a confirmed canonical URL for the same article."
        : undefined
  };
}

export function getAllAppUrls(): LinkHealthRecord[] {
  const records: LinkHealthRecord[] = [];

  INITIAL_MENTIONS.forEach((m) => {
    if (m.url) {
      records.push({
        id: `mention-${m.id}`,
        sourceType: "Mentions",
        recordId: m.id,
        headline: m.headline,
        publication: m.publication,
        originalUrl: m.url,
        sanitizedUrl: ensureAbsoluteUrl(m.url, m.headline, m.publication),
        ...resolveHealth(m.url),
        lastChecked: LAST_AUDIT_TIMESTAMP
      });
    }
  });

  INITIAL_GOOGLE_ALERTS.forEach((a) => {
    if (a.url) {
      records.push({
        id: `alert-${a.id}`,
        sourceType: "Google Alerts",
        recordId: a.id,
        headline: a.headline,
        publication: a.sourceName,
        originalUrl: a.url,
        sanitizedUrl: ensureAbsoluteUrl(a.url, a.headline, a.sourceName),
        ...resolveHealth(a.url),
        lastChecked: LAST_AUDIT_TIMESTAMP
      });
    }
  });

  ALL_1202_PICKUPS.forEach((p) => {
    if (p.url) {
      records.push({
        id: `pickup-${p.id}`,
        sourceType: "Regional Pickups",
        recordId: p.id,
        headline: p.headline,
        publication: p.outletName,
        originalUrl: p.url,
        sanitizedUrl: ensureAbsoluteUrl(p.url, p.headline, p.outletName),
        ...resolveHealth(p.url),
        lastChecked: LAST_AUDIT_TIMESTAMP
      });
    }
  });

  EXTERNAL_SOCIAL_POSTS.forEach((s) => {
    if (s.postUrl) {
      records.push({
        id: `social-${s.id}`,
        sourceType: "Social Posts",
        recordId: s.id,
        headline: `${s.platform} post by ${s.authorName}`,
        publication: s.platform,
        originalUrl: s.postUrl,
        sanitizedUrl: ensureAbsoluteUrl(s.postUrl, s.content, s.platform),
        ...resolveHealth(s.postUrl),
        lastChecked: LAST_AUDIT_TIMESTAMP
      });
    }
  });

  return records;
}
