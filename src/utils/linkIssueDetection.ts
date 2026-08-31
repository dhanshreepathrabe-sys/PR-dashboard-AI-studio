/**
 * Pure detection helpers used by scripts/detect_link_issues.ts to flag data-quality
 * problems that a raw HTTP status check can't see on its own:
 * - the same URL cited as the source for several genuinely different headlines
 * - a URL that resolves but is just a bare publisher homepage, not a permalink
 * - a URL present in the app's data that hasn't been through manual audit review yet
 *
 * Kept separate from linkHelper.ts (which only ever looks at one record at a time)
 * because these checks need the full dataset to compare records against each other.
 */

export interface LinkRecord {
  source: string;
  id: string | number;
  headline: string;
  publication: string;
  url: string;
}

export interface DuplicateUrlIssue {
  url: string;
  records: LinkRecord[];
}

/** Finds every URL that's attached to more than one distinct headline. */
export function findDuplicateUrlIssues(records: LinkRecord[]): DuplicateUrlIssue[] {
  const byUrl = new Map<string, LinkRecord[]>();
  for (const r of records) {
    if (!r.url) continue;
    const list = byUrl.get(r.url) ?? [];
    list.push(r);
    byUrl.set(r.url, list);
  }

  const issues: DuplicateUrlIssue[] = [];
  for (const [url, list] of byUrl) {
    const distinctHeadlines = new Set(list.map((r) => r.headline));
    if (distinctHeadlines.size > 1) {
      issues.push({ url, records: list });
    }
  }
  return issues;
}

/** True when a URL's path is empty or trivially short - i.e. it's a homepage, not a permalink. */
export function isBareHomepageUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  if (rawUrl.includes("news.google.com/search")) return false;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    return false;
  }
  return url.pathname.replace(/\/+$/, "").length < 2;
}

/** URLs present in the dataset that the reviewed audit map doesn't know about yet. */
export function findUnreviewedUrls(records: LinkRecord[], reviewedUrls: ReadonlySet<string>): LinkRecord[] {
  const seen = new Set<string>();
  const unreviewed: LinkRecord[] = [];
  for (const r of records) {
    if (!r.url || seen.has(r.url) || r.url.includes("news.google.com/search")) continue;
    seen.add(r.url);
    if (!reviewedUrls.has(r.url)) {
      unreviewed.push(r);
    }
  }
  return unreviewed;
}

/**
 * Builds the "search and recover" query for a broken or unverifiable link: a Google
 * News search scoped to the item's own heading and publisher, so a human can find and
 * confirm the real source rather than an automated match silently replacing it with
 * a guess (this dataset already has plenty of examples of guessed/mismatched links).
 */
export function buildRecoverySearchQuery(headline: string, publication: string): string {
  const parts = [headline, publication].filter(Boolean).map((s) => `"${s.replace(/"/g, "'")}"`);
  return parts.join(" ");
}
