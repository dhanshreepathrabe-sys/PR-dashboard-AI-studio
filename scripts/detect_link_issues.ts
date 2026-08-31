/**
 * Verification step for PR dashboard links, run with: bunx tsx scripts/detect_link_issues.ts
 *
 * Cross-checks every URL in the app's data sources against src/data/linkAuditResults.ts
 * (the manually-reviewed audit) and flags exactly what a raw HTTP status check can't see:
 * duplicate URLs shared by unrelated headlines, bare-homepage links, and any URL that's
 * been added to the data but never been through review. It does NOT auto-replace
 * anything - broken/unverifiable links already fall back to a Google News search at
 * runtime (see linkHelper.ts), and this script prints that same recovery query for a
 * human to check, rather than trusting an automated match. See ../src/data/linkAuditResults.ts
 * for why: several links in this dataset already turned out to be confident-looking
 * guesses that pointed at the wrong article.
 */
import { INITIAL_MENTIONS } from "../src/data";
import { INITIAL_GOOGLE_ALERTS } from "../src/data/alertsData";
import { ALL_1202_PICKUPS } from "../src/data/pickupsData";
import { LINK_AUDIT_RESULTS } from "../src/data/linkAuditResults";
import {
  LinkRecord,
  findDuplicateUrlIssues,
  isBareHomepageUrl,
  findUnreviewedUrls,
  buildRecoverySearchQuery
} from "../src/utils/linkIssueDetection";
import fs from "fs";

function collectRecords(): LinkRecord[] {
  const records: LinkRecord[] = [];

  INITIAL_MENTIONS.forEach((m) => {
    if (m.url) records.push({ source: "Mentions", id: m.id, headline: m.headline, publication: m.publication, url: m.url });
  });
  INITIAL_GOOGLE_ALERTS.forEach((a) => {
    if (a.url) records.push({ source: "GoogleAlerts", id: a.id, headline: a.headline, publication: a.sourceName, url: a.url });
  });
  const seenPickupUrls = new Set<string>();
  ALL_1202_PICKUPS.forEach((p) => {
    if (p.url && !seenPickupUrls.has(p.url)) {
      seenPickupUrls.add(p.url);
      records.push({ source: "RegionalPickups", id: p.id, headline: p.headline, publication: p.outletName, url: p.url });
    }
  });

  return records;
}

function main() {
  const records = collectRecords();
  const reviewedUrls = new Set(Object.keys(LINK_AUDIT_RESULTS));

  const allDuplicates = findDuplicateUrlIssues(records);
  // Only surface ones not already resolved - a duplicate URL already marked BROKEN or
  // NO_PERMALINK has already had every record sharing it routed to a search fallback.
  const duplicates = allDuplicates.filter((d) => {
    const status = LINK_AUDIT_RESULTS[d.url]?.status;
    return status !== "BROKEN" && status !== "NO_PERMALINK";
  });
  const bareHomepages = records.filter((r) => {
    if (!isBareHomepageUrl(r.url)) return false;
    const status = LINK_AUDIT_RESULTS[r.url]?.status;
    return status !== "BROKEN" && status !== "NO_PERMALINK";
  });
  const unreviewed = findUnreviewedUrls(records, reviewedUrls);

  const report = {
    generatedAt: new Date().toISOString(),
    totalRecords: records.length,
    duplicateUrlIssues: duplicates.map((d) => ({
      url: d.url,
      distinctHeadlines: [...new Set(d.records.map((r) => r.headline))],
      affectedRecords: d.records.map((r) => `${r.source}#${r.id}`),
      recommendation: "At most one headline can genuinely be this article - mark all as NO_PERMALINK unless verified."
    })),
    bareHomepageUrls: bareHomepages.map((r) => ({
      source: r.source,
      id: r.id,
      headline: r.headline,
      publication: r.publication,
      url: r.url
    })),
    unreviewedUrls: unreviewed.map((r) => ({
      source: r.source,
      id: r.id,
      headline: r.headline,
      publication: r.publication,
      url: r.url,
      recoverySearchQuery: buildRecoverySearchQuery(r.headline, r.publication)
    }))
  };

  fs.writeFileSync("link_issues_report.json", JSON.stringify(report, null, 2));

  console.log(`Checked ${records.length} unique links.`);
  console.log(`- ${duplicates.length} URL(s) shared by genuinely different headlines`);
  console.log(`- ${bareHomepages.length} bare-homepage URL(s) not yet flagged BROKEN`);
  console.log(`- ${unreviewed.length} URL(s) never reviewed - see link_issues_report.json for each one's recovery search query`);

  if (duplicates.length === 0 && bareHomepages.length === 0 && unreviewed.length === 0) {
    console.log("Nothing new to review.");
  }
}

main();
