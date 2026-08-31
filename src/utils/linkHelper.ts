/**
 * Link Validation, Extraction & Sanitization Engine for Mintoak PR Portal
 *
 * Strict Guarantees:
 * 1. Preserves raw absolute URLs EXACTLY without rewriting paths, parameters, or domains.
 * 2. Never redirects valid absolute external URLs to search engines or synthetic endpoints,
 *    UNLESS a live audit (see ../data/linkAuditResults.ts) has confirmed the URL is dead or
 *    redirects to an unrelated page - accuracy takes priority over preserving a stale link.
 * 3. Prepends https:// only when a valid domain/path is supplied without protocol.
 * 4. Provides clear validation so UI can display a 'Link Unavailable' state when a valid URL is absent.
 * 5. Provides Google News search URL generator for real-time live coverage indexing.
 * 6. Extensively logs raw input vs output to the console for complete traceability.
 */

import { LINK_AUDIT_RESULTS } from "../data/linkAuditResults";

export interface ValidatedArticleLink {
  isValid: boolean;
  url: string | null;
  displayState: "available" | "unavailable";
  reason?: string;
  isDirectPermalink?: boolean;
  wasModified?: boolean;
}

/**
 * Builds a clean Google News search URL for any mention/alert/topic
 */
export function getGoogleNewsSearchUrl(
  headline?: string,
  publication?: string,
  personOrQuery?: string
): string {
  let cleanTerms = "Mintoak";

  if (personOrQuery && !personOrQuery.toLowerCase().includes("mintoak")) {
    cleanTerms += ` ${personOrQuery.replace(/[^\w\s]/g, " ").trim()}`;
  } else if (headline) {
    const cleanHeadline = headline
      .replace(/<[^>]*>/g, "")
      .replace(/[^\w\s]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .join(" ");
    cleanTerms += ` ${cleanHeadline}`;
  } else if (publication) {
    cleanTerms += ` ${publication.replace(/[^\w\s]/g, " ").trim()}`;
  }

  return `https://news.google.com/search?q=${encodeURIComponent(cleanTerms.trim())}`;
}

/**
 * Checks if a link is genuinely a valid, non-empty, well-formed external article URL.
 */
export function isValidArticleUrl(
  rawUrl?: string | null,
  _recordInfo?: { id?: string | number; headline?: string; publication?: string }
): boolean {
  if (!rawUrl || typeof rawUrl !== "string") {
    return false;
  }

  const trimmed = rawUrl.trim();
  if (
    trimmed === "" ||
    trimmed === "#" ||
    trimmed === "javascript:void(0)" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined" ||
    trimmed.toLowerCase() === "about:blank"
  ) {
    return false;
  }

  let fullUrl = trimmed;
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = `https://${fullUrl}`;
  }

  if (LINK_AUDIT_RESULTS[trimmed]?.status === "BROKEN") {
    return false;
  }

  try {
    const parsed = new URL(fullUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (!parsed.hostname || (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and preserves the exact complete URL without unwanted redirects or path truncation.
 */
export function validateAndPreserveUrl(
  rawUrl?: string | null,
  recordInfo?: { id?: string | number; headline?: string; publication?: string; personOrQuery?: string }
): ValidatedArticleLink {
  const headline = recordInfo?.headline || "";
  const pub = recordInfo?.publication || "";
  const person = recordInfo?.personOrQuery || "";

  console.groupCollapsed?.(`[LinkHelper] Validating URL: "${rawUrl || ""}" | "${headline.slice(0, 30)}..."`);
  console.log(`[LinkHelper] Raw Input:`, { rawUrl, recordInfo });

  // 1. Check for empty or non-string inputs
  if (!rawUrl || typeof rawUrl !== "string") {
    console.warn(`[LinkHelper] Empty or non-string URL received:`, { rawUrl, recordInfo });
    const fallbackUrl = getGoogleNewsSearchUrl(headline, pub, person);

    console.log(`[LinkHelper] Output (Fallback Google News Generated):`, fallbackUrl);
    console.groupEnd?.();
    return {
      isValid: false,
      url: fallbackUrl,
      displayState: "unavailable",
      isDirectPermalink: false,
      wasModified: true,
      reason: "Empty raw URL - direct link unavailable"
    };
  }

  const trimmed = rawUrl.trim();

  // 2. Filter out explicit placeholders
  if (
    trimmed === "" ||
    trimmed === "#" ||
    trimmed === "javascript:void(0)" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined" ||
    trimmed.toLowerCase() === "about:blank"
  ) {
    console.warn(`[LinkHelper] Placeholder URL detected: "${trimmed}"`);
    const fallbackUrl = getGoogleNewsSearchUrl(headline, pub, person);
    console.log(`[LinkHelper] Output (Placeholder Replacement with Google News):`, fallbackUrl);
    console.groupEnd?.();
    return {
      isValid: false,
      url: fallbackUrl,
      displayState: "unavailable",
      isDirectPermalink: false,
      wasModified: true,
      reason: `Placeholder string "${trimmed}" - direct link unavailable`
    };
  }

  // 3. Check if protocol exists or needs https://
  let fullUrl = trimmed;
  let addedProtocol = false;
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = `https://${fullUrl}`;
    addedProtocol = true;
    console.log(`[LinkHelper] Protocol missing - prepended https:// ->`, fullUrl);
  }

  // 4. Validate through standard URL constructor
  try {
    const parsed = new URL(fullUrl);

    // Validate protocol
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      console.warn(`[LinkHelper] Invalid protocol: ${parsed.protocol}`);
      const fallbackUrl = getGoogleNewsSearchUrl(headline, pub, person);
      console.log(`[LinkHelper] Output:`, fallbackUrl);
      console.groupEnd?.();
      return {
        isValid: false,
        url: fallbackUrl,
        displayState: "unavailable",
        isDirectPermalink: false,
        wasModified: true,
        reason: `Unsupported protocol ${parsed.protocol}`
      };
    }

    // Validate hostname
    if (!parsed.hostname || (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")) {
      console.warn(`[LinkHelper] Invalid hostname: "${parsed.hostname}"`);
      const fallbackUrl = getGoogleNewsSearchUrl(headline, pub, person);
      console.log(`[LinkHelper] Output:`, fallbackUrl);
      console.groupEnd?.();
      return {
        isValid: false,
        url: fallbackUrl,
        displayState: "unavailable",
        isDirectPermalink: false,
        wasModified: true,
        reason: `Invalid hostname "${parsed.hostname}"`
      };
    }

    // 5. Cross-check against the live link-health audit: a link that parses fine can
    // still be dead (404) or redirect to an unrelated page (a reused CMS slug).
    const audit = LINK_AUDIT_RESULTS[trimmed];
    if (audit?.status === "BROKEN") {
      console.warn(`[LinkHelper] Audit confirms dead/mismatched link: "${trimmed}" (HTTP ${audit.statusCode})`);
      const fallbackUrl = getGoogleNewsSearchUrl(headline, pub, person);
      console.log(`[LinkHelper] Output (Audit-Broken Fallback):`, fallbackUrl);
      console.groupEnd?.();
      return {
        isValid: false,
        url: fallbackUrl,
        displayState: "unavailable",
        isDirectPermalink: false,
        wasModified: true,
        reason: `Audit confirmed dead or mismatched link (HTTP ${audit.statusCode})`
      };
    }
    if (audit?.status === "REDIRECTED" && audit.finalUrl) {
      console.info(`[LinkHelper] Audit confirms redirect to same article: "${trimmed}" -> "${audit.finalUrl}"`);
      console.groupEnd?.();
      return {
        isValid: true,
        url: audit.finalUrl,
        displayState: "available",
        isDirectPermalink: true,
        wasModified: audit.finalUrl !== rawUrl,
        reason: "Redirected to verified canonical URL"
      };
    }

    // Exact direct preservation - DO NOT mutate path, search params, or hash!
    const isExactMatch = fullUrl === rawUrl;
    console.log(`[LinkHelper] Valid URL Verified & Preserved:`, {
      originalInput: rawUrl,
      finalOutput: fullUrl,
      wasModified: !isExactMatch,
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash
    });
    console.groupEnd?.();

    return {
      isValid: true,
      url: fullUrl,
      displayState: "available",
      isDirectPermalink: true,
      wasModified: !isExactMatch,
      reason: addedProtocol ? "Added https:// protocol" : "Exact original URL preserved"
    };
  } catch (err) {
    console.error(`[LinkHelper] URL constructor failed to parse "${fullUrl}":`, err);
    const fallbackUrl = getGoogleNewsSearchUrl(headline, pub, person);
    console.log(`[LinkHelper] Output (Parse Error Fallback):`, fallbackUrl);
    console.groupEnd?.();
    return {
      isValid: false,
      url: fallbackUrl,
      displayState: "unavailable",
      isDirectPermalink: false,
      wasModified: true,
      reason: "Parse error on raw URL - direct link unavailable"
    };
  }
}

/**
 * Standard getter to retrieve a validated external URL string with comprehensive logging.
 */
export function ensureAbsoluteUrl(
  rawUrl?: string | null,
  headline?: string,
  publication?: string,
  personOrQuery?: string
): string {
  const result = validateAndPreserveUrl(rawUrl, { headline, publication, personOrQuery });
  const finalUrl = result.url || getGoogleNewsSearchUrl(headline, publication, personOrQuery);
  
  // Log high-level navigation mapping for fast DevTools scanning
  if (result.wasModified) {
    console.info(`[LinkHelper:ensureAbsoluteUrl] (${result.reason}): "${rawUrl}" -> "${finalUrl}"`);
  } else {
    console.info(`[LinkHelper:ensureAbsoluteUrl] Preserved direct: "${finalUrl}"`);
  }

  return finalUrl;
}

/**
 * Clean helper function to retrieve full verified link
 */
export function getVerifiedWorkingLink(
  rawUrl?: string | null,
  headline?: string,
  publication?: string
): string {
  return ensureAbsoluteUrl(rawUrl, headline, publication);
}


