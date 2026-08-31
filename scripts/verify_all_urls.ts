import fs from "fs";
import { INITIAL_MENTIONS } from "../src/data";
import { INITIAL_GOOGLE_ALERTS } from "../src/data/alertsData";
import { ALL_1202_PICKUPS } from "../src/data/pickupsData";

interface AuditEntry {
  source: string;
  id: any;
  headline: string;
  publication: string;
  originalUrl: string;
  status: number | string;
  finalUrl?: string;
  classification: "VALID" | "REDIRECTED" | "BROKEN" | "INVALID URL" | "PAGE NOT FOUND" | "UNVERIFIED";
  error?: string;
}

async function verifyUrl(url: string): Promise<{ status: number | string; finalUrl: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      redirect: "follow"
    });
    clearTimeout(timeout);
    return { status: res.status, finalUrl: res.url };
  } catch (e: any) {
    return { status: 0, finalUrl: url, error: e.message || "Fetch failed" };
  }
}

async function main() {
  const urlMap = new Map<string, { source: string; id: any; headline: string; publication: string }[]>();

  INITIAL_MENTIONS.forEach((m) => {
    if (m.url) {
      const arr = urlMap.get(m.url) || [];
      arr.push({ source: "INITIAL_MENTIONS", id: m.id, headline: m.headline, publication: m.publication });
      urlMap.set(m.url, arr);
    }
  });

  INITIAL_GOOGLE_ALERTS.forEach((a) => {
    if (a.url) {
      const arr = urlMap.get(a.url) || [];
      arr.push({ source: "INITIAL_GOOGLE_ALERTS", id: a.id, headline: a.headline, publication: a.sourceName });
      urlMap.set(a.url, arr);
    }
  });

  ALL_1202_PICKUPS.forEach((p) => {
    if (p.url) {
      const arr = urlMap.get(p.url) || [];
      arr.push({ source: "ALL_1202_PICKUPS", id: p.id, headline: p.headline, publication: p.outletName });
      urlMap.set(p.url, arr);
    }
  });

  const uniqueUrls = Array.from(urlMap.keys());
  console.log(`Total unique URLs to test: ${uniqueUrls.length}`);

  const results: AuditEntry[] = [];

  for (let i = 0; i < uniqueUrls.length; i += 8) {
    const chunk = uniqueUrls.slice(i, i + 8);
    await Promise.all(
      chunk.map(async (url) => {
        const meta = urlMap.get(url)![0];
        const res = await verifyUrl(url);

        let classification: AuditEntry["classification"] = "VALID";
        if (typeof res.status === "number") {
          if (res.status >= 200 && res.status < 400) {
            if (res.finalUrl && res.finalUrl !== url && !res.finalUrl.includes("google.com/search")) {
              classification = "REDIRECTED";
            } else {
              classification = "VALID";
            }
          } else if (res.status === 404) {
            classification = "PAGE NOT FOUND";
          } else if (res.status >= 400) {
            classification = "BROKEN";
          }
        } else {
          classification = "UNVERIFIED";
        }

        results.push({
          source: meta.source,
          id: meta.id,
          headline: meta.headline,
          publication: meta.publication,
          originalUrl: url,
          status: res.status,
          finalUrl: res.finalUrl,
          classification,
          error: res.error
        });
      })
    );
  }

  fs.writeFileSync("./audit_report.json", JSON.stringify(results, null, 2));
  console.log("SUCCESS_AUDIT_REPORT_WRITTEN");
}

main();
