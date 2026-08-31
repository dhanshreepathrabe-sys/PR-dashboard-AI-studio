import { describe, expect, test } from "bun:test";
import {
  LinkRecord,
  findDuplicateUrlIssues,
  isBareHomepageUrl,
  findUnreviewedUrls,
  buildRecoverySearchQuery
} from "./linkIssueDetection";

function record(overrides: Partial<LinkRecord>): LinkRecord {
  return { source: "Mentions", id: 1, headline: "Some headline", publication: "Some Publisher", url: "https://example.com/a", ...overrides };
}

describe("findDuplicateUrlIssues", () => {
  test("returns nothing for an empty list", () => {
    expect(findDuplicateUrlIssues([])).toEqual([]);
  });

  test("returns nothing when every URL maps to a single headline, even if reused by several records", () => {
    const records = [
      record({ id: 1, headline: "Same story", url: "https://example.com/a" }),
      record({ id: 2, headline: "Same story", url: "https://example.com/a" })
    ];
    expect(findDuplicateUrlIssues(records)).toEqual([]);
  });

  test("flags a URL attached to two genuinely different headlines", () => {
    const records = [
      record({ id: 1, headline: "Funding round announced", url: "https://example.com/a" }),
      record({ id: 2, headline: "Completely unrelated leadership interview", url: "https://example.com/a" })
    ];
    const issues = findDuplicateUrlIssues(records);
    expect(issues.length).toBe(1);
    expect(issues[0].url).toBe("https://example.com/a");
    expect(issues[0].records.length).toBe(2);
  });

  test("ignores records with no URL", () => {
    const records = [record({ url: "" }), record({ url: undefined as unknown as string })];
    expect(findDuplicateUrlIssues(records)).toEqual([]);
  });
});

describe("isBareHomepageUrl", () => {
  test("flags a bare domain with no path as a homepage", () => {
    expect(isBareHomepageUrl("https://www.example.com")).toBe(true);
    expect(isBareHomepageUrl("https://www.example.com/")).toBe(true);
  });

  test("does not flag a URL with a real article path", () => {
    expect(isBareHomepageUrl("https://www.example.com/news/some-article-slug")).toBe(false);
  });

  test("never flags a Google News search fallback, even with no query path", () => {
    expect(isBareHomepageUrl("https://news.google.com/search?q=Mintoak")).toBe(false);
  });

  test("handles empty and malformed input without throwing", () => {
    expect(isBareHomepageUrl("")).toBe(false);
    expect(() => isBareHomepageUrl("not a url at all")).not.toThrow();
    expect(() => isBareHomepageUrl("https://")).not.toThrow();
  });
});

describe("findUnreviewedUrls", () => {
  test("returns nothing when every URL has been reviewed", () => {
    const records = [record({ url: "https://example.com/a" })];
    const reviewed = new Set(["https://example.com/a"]);
    expect(findUnreviewedUrls(records, reviewed)).toEqual([]);
  });

  test("flags a URL that isn't in the reviewed set", () => {
    const records = [record({ url: "https://example.com/new" })];
    expect(findUnreviewedUrls(records, new Set())).toHaveLength(1);
  });

  test("de-duplicates repeated URLs to one flagged entry", () => {
    const records = [
      record({ id: 1, url: "https://example.com/new" }),
      record({ id: 2, url: "https://example.com/new" })
    ];
    expect(findUnreviewedUrls(records, new Set())).toHaveLength(1);
  });

  test("never flags Google News search fallback URLs as needing review", () => {
    const records = [record({ url: "https://news.google.com/search?q=Mintoak" })];
    expect(findUnreviewedUrls(records, new Set())).toEqual([]);
  });
});

describe("buildRecoverySearchQuery", () => {
  test("combines headline and publisher into a quoted query", () => {
    const query = buildRecoverySearchQuery("Mintoak raises funding", "TechCrunch");
    expect(query).toBe('"Mintoak raises funding" "TechCrunch"');
  });

  test("handles a headline containing double quotes without breaking the query", () => {
    const query = buildRecoverySearchQuery('Mintoak "raises" funding', "TechCrunch");
    expect(query).not.toContain('""');
    expect(() => query).not.toThrow();
  });

  test("handles non-Latin scripts without throwing", () => {
    expect(() => buildRecoverySearchQuery("Mintoak เข้าซื้อกิจการ ICC Loyalty", "VietnamPlus")).not.toThrow();
  });

  test("omits an empty publisher rather than leaving a dangling quote pair", () => {
    const query = buildRecoverySearchQuery("Headline only", "");
    expect(query).toBe('"Headline only"');
  });
});
