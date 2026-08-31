import * as XLSX from "xlsx";
import { MediaMention } from "../types";
import { getVerifiedWorkingLink } from "./linkHelper";

/**
 * Ensures a URL starts with http:// or https://, eliminates ghost links, and is properly encoded
 */
export function ensureAbsoluteUrl(url: string | undefined | null, headline?: string, publication?: string): string {
  return getVerifiedWorkingLink(url, headline, publication);
}

/**
 * Downloads PR coverage mentions as a native Excel (.xlsx) file with working clickable hyperlinks
 */
export function downloadMentionsExcel(mentions: MediaMention[], filename = `Mintoak_PR_Coverage_${new Date().toISOString().split("T")[0]}.xlsx`) {
  const data = mentions.map((m) => {
    const validUrl = ensureAbsoluteUrl(m.url, m.headline, m.publication);
    return {
      "Publication": m.publication || "",
      "Country": m.country || "",
      "Headline": m.headline || "",
      "URL": validUrl,
      "Reach": m.reach ?? 0,
      "PR Value": m.prValueINR ? `₹${m.prValueINR.toLocaleString("en-IN")}` : "₹0"
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Configure optimal column widths for Excel
  worksheet["!cols"] = [
    { wch: 24 }, // Publication
    { wch: 16 }, // Country
    { wch: 65 }, // Headline
    { wch: 55 }, // URL
    { wch: 16 }, // Reach
    { wch: 20 }, // PR Value
  ];

  // Set Hyperlink objects for every row so links work directly when opened in Excel, Google Sheets, or Apple Numbers
  mentions.forEach((m, index) => {
    const validUrl = ensureAbsoluteUrl(m.url, m.headline, m.publication);
    if (!validUrl) return;

    const rowNum = index + 2; // Row index in Excel (1-based, row 1 is header)
    const urlCellKey = `D${rowNum}`; // Column D is URL

    // Attach SheetJS hyperlink property ONLY to the URL cell
    if (worksheet[urlCellKey]) {
      worksheet[urlCellKey].l = {
        Target: validUrl,
        Tooltip: `Click to open article: ${validUrl}`
      };
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "PR Coverage Data");

  XLSX.writeFile(workbook, filename);
}

/**
 * Downloads PR coverage mentions as a CSV file with exact headers and UTF-8 BOM for Excel/Google Sheets compatibility
 */
export function downloadMentionsCSV(mentions: MediaMention[], filename = `Mintoak_PR_Coverage_${new Date().toISOString().split("T")[0]}.csv`) {
  const headers = ["Publication", "Country", "Headline", "URL", "Reach", "PR Value"];

  const escapeCsvCell = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = mentions.map((m) => [
    escapeCsvCell(m.publication),
    escapeCsvCell(m.country),
    escapeCsvCell(m.headline),
    escapeCsvCell(ensureAbsoluteUrl(m.url)),
    m.reach ?? 0,
    escapeCsvCell(`₹${m.prValueINR ? m.prValueINR.toLocaleString("en-IN") : 0}`)
  ]);

  // UTF-8 BOM prefix \uFEFF ensures Excel & Sheets parse special characters (like ₹) and URLs correctly
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


