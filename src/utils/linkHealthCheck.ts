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
  status: "VALID" | "REDIRECTED" | "BROKEN" | "PAGE NOT FOUND" | "NO_PERMALINK" | "UNVERIFIED" | "CHECKING";
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
        : audit.status === "NO_PERMALINK"
        ? "Only the publisher's homepage is available, not the specific article - falls back to Google News search."
        : audit.status === "REDIRECTED"
        ? "Redirects to a confirmed canonical URL for the same article."
        : undefined
  };
}

export interface LiveCheckResult {
  url: string;
  ok: boolean;
  statusCode: number | null;
  finalUrl: string | null;
  error: string | null;
  checkedAt: string;
}

/**
 * Calls the server-side /api/verify-links proxy to run real HEAD/GET requests against
 * a batch of external URLs (avoids browser CORS restrictions on cross-origin news sites).
 * Sends requests in chunks so a large link set doesn't exceed the server's per-call cap,
 * and reports progress after each chunk resolves.
 */
export async function liveVerifyUrls(
  urls: string[],
  onProgress?: (checked: number, total: number) => void
): Promise<Map<string, LiveCheckResult>> {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  const results = new Map<string, LiveCheckResult>();
  const CHUNK_SIZE = 100;

  for (let i = 0; i < uniqueUrls.length; i += CHUNK_SIZE) {
    const chunk = uniqueUrls.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch("/api/verify-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: chunk }),
      });
      if (res.ok) {
        const data = await res.json();
        for (const r of data.results || []) {
          results.set(r.url, r);
        }
      } else {
        for (const u of chunk) {
          results.set(u, { url: u, ok: false, statusCode: null, finalUrl: null, error: `Server responded ${res.status}`, checkedAt: new Date().toISOString() });
        }
      }
    } catch (err: any) {
      for (const u of chunk) {
        results.set(u, { url: u, ok: false, statusCode: null, finalUrl: null, error: err?.message || "Network error", checkedAt: new Date().toISOString() });
      }
    }
    onProgress?.(Math.min(i + CHUNK_SIZE, uniqueUrls.length), uniqueUrls.length);
  }

  return results;
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
