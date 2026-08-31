import https from "https";
import http from "http";
import { INITIAL_MENTIONS } from "../src/data";
import { INITIAL_GOOGLE_ALERTS } from "../src/data/alertsData";
import { ALL_1202_PICKUPS } from "../src/data/pickupsData";

interface AuditResult {
  source: string;
  id?: number | string;
  headline?: string;
  originalUrl: string;
  status: number | string;
  finalUrl?: string;
  classification: "VALID" | "REDIRECTED" | "BROKEN" | "INVALID URL" | "PAGE NOT FOUND" | "UNVERIFIED";
  error?: string;
}

async function checkUrl(rawUrl: string): Promise<{ status: number | string; finalUrl?: string; error?: string }> {
  if (!rawUrl || !rawUrl.startsWith("http")) {
    return { status: 0, error: "Invalid URL structure" };
  }

  return new Promise((resolve) => {
    try {
      const parsed = new URL(rawUrl);
      const client = parsed.protocol === "https:" ? https : http;

      const req = client.request(
        parsed,
        {
          method: "HEAD",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          timeout: 7000,
        },
        (res) => {
          const statusCode = res.statusCode || 0;
          const location = res.headers.location;

          if (statusCode >= 300 && statusCode < 400 && location) {
            const redirectUrl = new URL(location, rawUrl).toString();
            resolve({ status: statusCode, finalUrl: redirectUrl });
          } else {
            resolve({ status: statusCode, finalUrl: rawUrl });
          }
        }
      );

      req.on("error", (err) => {
        // Retry with GET if HEAD fails
        const getReq = client.request(
          parsed,
          {
            method: "GET",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Range: "bytes=0-1024",
            },
            timeout: 7000,
          },
          (getRes) => {
            const statusCode = getRes.statusCode || 0;
            const location = getRes.headers.location;
            if (statusCode >= 300 && statusCode < 400 && location) {
              const redirectUrl = new URL(location, rawUrl).toString();
              resolve({ status: statusCode, finalUrl: redirectUrl });
            } else {
              resolve({ status: statusCode, finalUrl: rawUrl });
            }
          }
        );

        getReq.on("error", (getErr) => {
          resolve({ status: 0, error: getErr.message });
        });
        getReq.on("timeout", () => {
          getReq.destroy();
          resolve({ status: 408, error: "GET Timeout" });
        });
        getReq.end();
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({ status: 408, error: "HEAD Timeout" });
      });

      req.end();
    } catch (e: any) {
      resolve({ status: 0, error: e.message });
    }
  });
}

async function runAudit() {
  console.log("=== STARTING FULL URL AUDIT ===");

  const allUrlsToCheck: { source: string; id?: any; headline?: string; url: string; publication?: string }[] = [];

  INITIAL_MENTIONS.forEach((m) => {
    if (m.url) {
      allUrlsToCheck.push({ source: "Mentions", id: m.id, headline: m.headline, url: m.url, publication: m.publication });
    }
  });

  INITIAL_GOOGLE_ALERTS.forEach((a) => {
    if (a.url) {
      allUrlsToCheck.push({ source: "GoogleAlerts", id: a.id, headline: a.headline, url: a.url, publication: a.sourceName });
    }
  });

  // Check unique pickup URLs rather than 1202 duplicates
  const pickupUrlsSeen = new Set<string>();
  ALL_1202_PICKUPS.forEach((p) => {
    if (p.url && !pickupUrlsSeen.has(p.url)) {
      pickupUrlsSeen.add(p.url);
      allUrlsToCheck.push({ source: "RegionalPickups", id: p.id, headline: p.headline, url: p.url, publication: p.outletName });
    }
  });

  console.log(`Total URLs to audit: ${allUrlsToCheck.length}`);

  const results: AuditResult[] = [];
  const brokenOrRedirected: AuditResult[] = [];

  // Batch process
  const batchSize = 10;
  for (let i = 0; i < allUrlsToCheck.length; i += batchSize) {
    const batch = allUrlsToCheck.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const check = await checkUrl(item.url);
        let classification: AuditResult["classification"] = "VALID";

        if (typeof check.status === "number") {
          if (check.status >= 200 && check.status < 300) {
            classification = "VALID";
          } else if (check.status >= 300 && check.status < 400) {
            classification = "REDIRECTED";
          } else if (check.status === 404) {
            classification = "PAGE NOT FOUND";
          } else if (check.status >= 400) {
            classification = "BROKEN";
          }
        } else {
          classification = "UNVERIFIED";
        }

        const res: AuditResult = {
          source: item.source,
          id: item.id,
          headline: item.headline,
          originalUrl: item.url,
          status: check.status,
          finalUrl: check.finalUrl,
          classification,
          error: check.error,
        };

        if (classification !== "VALID") {
          brokenOrRedirected.push(res);
        }
        return res;
      })
    );
    results.push(...batchResults);
    console.log(`Audited ${results.length}/${allUrlsToCheck.length}...`);
  }

  console.log("\n=== AUDIT SUMMARY ===");
  console.log(`Total URLs: ${results.length}`);
  console.log(`Valid: ${results.filter((r) => r.classification === "VALID").length}`);
  console.log(`Redirected: ${results.filter((r) => r.classification === "REDIRECTED").length}`);
  console.log(`Broken/404/Error: ${results.filter((r) => r.classification === "BROKEN" || r.classification === "PAGE NOT FOUND" || r.classification === "UNVERIFIED").length}`);

  console.log("\n=== BROKEN / REDIRECTED LIST ===");
  brokenOrRedirected.forEach((r) => {
    console.log(`[${r.classification}] (${r.status}) [${r.source} #${r.id}] ${r.originalUrl} | Error: ${r.error || "none"}`);
  });
}

runAudit();
