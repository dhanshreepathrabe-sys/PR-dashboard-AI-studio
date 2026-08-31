import fs from "fs";
import https from "https";
import http from "http";
import { INITIAL_MENTIONS } from "../src/data";
import { INITIAL_GOOGLE_ALERTS } from "../src/data/alertsData";
import { ALL_1202_PICKUPS } from "../src/data/pickupsData";

interface AuditResult {
  source: string;
  id?: number | string;
  headline?: string;
  publication?: string;
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
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          timeout: 4000,
        },
        (res) => {
          const statusCode = res.statusCode || 0;
          const location = res.headers.location;

          if (statusCode >= 300 && statusCode < 400 && location) {
            try {
              const redirectUrl = new URL(location, rawUrl).toString();
              resolve({ status: statusCode, finalUrl: redirectUrl });
            } catch {
              resolve({ status: statusCode, finalUrl: location });
            }
          } else {
            resolve({ status: statusCode, finalUrl: rawUrl });
          }
          res.resume(); // consume response data to free up memory
        }
      );

      req.on("error", (err) => {
        resolve({ status: 0, error: err.message });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({ status: 408, error: "Request Timeout" });
      });

      req.end();
    } catch (e: any) {
      resolve({ status: 0, error: e.message });
    }
  });
}

async function runFastAudit() {
  const allUrls: { source: string; id?: any; headline?: string; url: string; publication?: string }[] = [];

  INITIAL_MENTIONS.forEach((m) => {
    if (m.url) allUrls.push({ source: "Mentions", id: m.id, headline: m.headline, url: m.url, publication: m.publication });
  });

  INITIAL_GOOGLE_ALERTS.forEach((a) => {
    if (a.url) allUrls.push({ source: "GoogleAlerts", id: a.id, headline: a.headline, url: a.url, publication: a.sourceName });
  });

  const pickupUrlsSeen = new Set<string>();
  ALL_1202_PICKUPS.forEach((p) => {
    if (p.url && !pickupUrlsSeen.has(p.url)) {
      pickupUrlsSeen.add(p.url);
      allUrls.push({ source: "RegionalPickups", id: p.id, headline: p.headline, url: p.url, publication: p.outletName });
    }
  });

  const results: AuditResult[] = [];
  const batchSize = 15;

  for (let i = 0; i < allUrls.length; i += batchSize) {
    const batch = allUrls.slice(i, i + batchSize);
    const batchRes = await Promise.all(
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
        return {
          source: item.source,
          id: item.id,
          headline: item.headline,
          publication: item.publication,
          originalUrl: item.url,
          status: check.status,
          finalUrl: check.finalUrl,
          classification,
          error: check.error,
        };
      })
    );
    results.push(...batchRes);
  }

  fs.writeFileSync("audit_results.json", JSON.stringify(results, null, 2));
  console.log("AUDIT_COMPLETE_SAVED_TO_FILE");
}

runFastAudit();
