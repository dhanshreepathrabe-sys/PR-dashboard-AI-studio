import { describe, expect, test } from "bun:test";
import { isValidArticleUrl, ensureAbsoluteUrl, getGoogleNewsSearchUrl } from "./linkHelper";
import { LINK_AUDIT_RESULTS } from "../data/linkAuditResults";

describe("isValidArticleUrl", () => {
  test("rejects empty, null, and undefined input", () => {
    expect(isValidArticleUrl("")).toBe(false);
    expect(isValidArticleUrl(null)).toBe(false);
    expect(isValidArticleUrl(undefined)).toBe(false);
  });

  test("rejects placeholder strings", () => {
    expect(isValidArticleUrl("#")).toBe(false);
    expect(isValidArticleUrl("javascript:void(0)")).toBe(false);
    expect(isValidArticleUrl("null")).toBe(false);
    expect(isValidArticleUrl("undefined")).toBe(false);
    expect(isValidArticleUrl("about:blank")).toBe(false);
  });

  test("rejects a URL whose scheme leaves no valid hostname once https:// is prepended", () => {
    expect(isValidArticleUrl("ftp://example.com/file")).toBe(false);
  });

  test("rejects malformed hostnames", () => {
    expect(isValidArticleUrl("https://")).toBe(false);
    expect(isValidArticleUrl("https://localhost-but-not-quite")).toBe(false);
  });

  test("accepts a well-formed https URL", () => {
    expect(isValidArticleUrl("https://www.example.com/news/article-123")).toBe(true);
  });

  test("accepts a domain missing its protocol and adds https://", () => {
    expect(isValidArticleUrl("www.example.com/news/article-123")).toBe(true);
  });

  test("does not crash on headings with special characters or non-Latin scripts", () => {
    const weirdHeadlines = [
      'Mintoak "raises" $20M — a 20% jump!',
      "شركة Mintoak الهندية تستحوذ على ICC Loyalty",
      "Mintoak เข้าซื้อกิจการ ICC Loyalty",
      "Q&A: What's next for Mintoak?",
      ""
    ];
    for (const headline of weirdHeadlines) {
      expect(() => isValidArticleUrl("https://example.com/story", { headline })).not.toThrow();
    }
  });

  test("rejects a URL the audit has confirmed is dead", () => {
    const [brokenUrl] = Object.entries(LINK_AUDIT_RESULTS).find(([, v]) => v.status === "BROKEN")!;
    expect(isValidArticleUrl(brokenUrl)).toBe(false);
  });

  test("rejects a URL the audit found has no confirmed permalink", () => {
    const [noPermalinkUrl] = Object.entries(LINK_AUDIT_RESULTS).find(([, v]) => v.status === "NO_PERMALINK")!;
    expect(isValidArticleUrl(noPermalinkUrl)).toBe(false);
  });

  test("accepts a URL the audit marked valid", () => {
    const [validUrl] = Object.entries(LINK_AUDIT_RESULTS).find(([, v]) => v.status === "VALID")!;
    expect(isValidArticleUrl(validUrl)).toBe(true);
  });
});

describe("ensureAbsoluteUrl", () => {
  test("preserves a valid, unaudited URL exactly", () => {
    const url = "https://www.example.com/news/exact-path?query=1";
    expect(ensureAbsoluteUrl(url)).toBe(url);
  });

  test("falls back to a Google News search for a confirmed-dead link", () => {
    const [brokenUrl] = Object.entries(LINK_AUDIT_RESULTS).find(([, v]) => v.status === "BROKEN")!;
    const result = ensureAbsoluteUrl(brokenUrl, "Some Headline", "Some Publisher");
    expect(result).toContain("news.google.com/search");
    expect(result).not.toBe(brokenUrl);
  });

  test("follows a verified redirect to its confirmed final URL", () => {
    const entry = Object.entries(LINK_AUDIT_RESULTS).find(([, v]) => v.status === "REDIRECTED" && v.finalUrl);
    if (!entry) return; // no redirected entries left to check against
    const [redirectedUrl, data] = entry;
    expect(ensureAbsoluteUrl(redirectedUrl)).toBe(data.finalUrl);
  });

  test("falls back to search for empty or placeholder input", () => {
    expect(ensureAbsoluteUrl("", "Headline", "Publisher")).toContain("news.google.com/search");
    expect(ensureAbsoluteUrl(null, "Headline", "Publisher")).toContain("news.google.com/search");
    expect(ensureAbsoluteUrl("#", "Headline", "Publisher")).toContain("news.google.com/search");
  });
});

describe("getGoogleNewsSearchUrl", () => {
  test("builds a valid, parseable URL", () => {
    const url = getGoogleNewsSearchUrl("Mintoak raises funding", "TechCrunch");
    expect(() => new URL(url)).not.toThrow();
    expect(url.startsWith("https://news.google.com/search?q=")).toBe(true);
  });

  test("always includes the brand term even with no headline or publication", () => {
    const url = getGoogleNewsSearchUrl();
    expect(decodeURIComponent(url)).toContain("Mintoak");
  });

  test("does not throw on headlines with quotes, punctuation, or non-Latin scripts", () => {
    const tricky = [
      'Mintoak "raises" $20M — a 20% jump!',
      "شركة Mintoak الهندية تستحوذ على ICC Loyalty",
      "Mintoak เข้าซื้อกิจการ ICC Loyalty บริษัทฟินเทค",
      "C++ & Rust: Mintoak's stack, explained",
      "a".repeat(500)
    ];
    for (const headline of tricky) {
      expect(() => getGoogleNewsSearchUrl(headline, "Some Publisher")).not.toThrow();
      const url = getGoogleNewsSearchUrl(headline, "Some Publisher");
      expect(() => new URL(url)).not.toThrow();
    }
  });

  test("prefers an explicit person/query over the headline", () => {
    const url = getGoogleNewsSearchUrl("Unrelated headline text here", "Publisher", "Raman Khanduja");
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("Raman Khanduja");
  });
});
