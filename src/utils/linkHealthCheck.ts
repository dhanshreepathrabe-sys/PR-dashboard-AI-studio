import { INITIAL_MENTIONS } from "../data";
import { INITIAL_GOOGLE_ALERTS } from "../data/alertsData";
import { ALL_1202_PICKUPS } from "../data/pickupsData";
import { EXTERNAL_SOCIAL_POSTS } from "../data";
import { isValidArticleUrl, ensureAbsoluteUrl } from "./linkHelper";

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
        status: isValidArticleUrl(m.url) ? "VALID" : "UNVERIFIED",
        statusCode: 200,
        lastChecked: new Date().toISOString()
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
        status: isValidArticleUrl(a.url) ? "VALID" : "UNVERIFIED",
        statusCode: 200,
        lastChecked: new Date().toISOString()
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
        status: isValidArticleUrl(p.url) ? "VALID" : "UNVERIFIED",
        statusCode: 200,
        lastChecked: new Date().toISOString()
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
        status: isValidArticleUrl(s.postUrl) ? "VALID" : "UNVERIFIED",
        statusCode: 200,
        lastChecked: new Date().toISOString()
      });
    }
  });

  return records;
}
