import React, { useState } from "react";
import { Sparkles, X, Send, Bot, User, FileText, Download } from "lucide-react";
import { MediaMention } from "../types";
import { generateExecutivePRPdfReport } from "../utils/generateExecutivePdfReport";
import { ALL_1202_PICKUPS } from "../data/pickupsData";

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mentions: MediaMention[];
  onOpenCampaignPdfReport?: (campaign?: string) => void;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  isPdfAction?: boolean;
  campaignTarget?: string;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  mentions,
  onOpenCampaignPdfReport,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Hello! I am Mintoak's AI Media Intelligence Assistant. You can ask me anything about PR metrics, top tier publications, sentiment trends, or ask me to generate and share an Executive PR PDF Report with key metrics and all verified links for any particular campaign!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    if (!textToSend) setInput("");
    setLoading(true);

    const isAskingForPdf =
      query.toLowerCase().includes("pdf") ||
      query.toLowerCase().includes("report") ||
      query.toLowerCase().includes("share") ||
      query.toLowerCase().includes("export");

    let detectedCampaign = "GCC & Middle East Expansion (ICC Loyalty)";
    if (query.toLowerCase().includes("series a") || query.toLowerCase().includes("funding")) {
      detectedCampaign = "Series A Funding ($20M Lead by PayPal & British International)";
    } else if (query.toLowerCase().includes("hdfc") || query.toLowerCase().includes("vyapar")) {
      detectedCampaign = "HDFC Bank SmartHub Vyapar Partnership";
    } else if (query.toLowerCase().includes("axis")) {
      detectedCampaign = "Axis Bank & White-label Merchant OS Expansion";
    } else if (query.toLowerCase().includes("master") || query.toLowerCase().includes("all")) {
      detectedCampaign = "All Campaigns";
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          contextData: {
            totalMentions: mentions.length,
            sampleTitles: mentions.slice(0, 10).map((m) => m.headline),
          },
        }),
      });

      const data = await res.json();
      const cleanReply = (data.reply || "I have prepared the executive intelligence summary.").replace(/\*\*/g, "");

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: cleanReply,
          isPdfAction: isAskingForPdf,
          campaignTarget: detectedCampaign,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Here is the summary of the campaign. You can download the complete Executive PDF Report with all metrics and links below.",
          isPdfAction: isAskingForPdf,
          campaignTarget: detectedCampaign,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDirectPdf = (campaign: string) => {
    try {
      const pickups = ALL_1202_PICKUPS;
      generateExecutivePRPdfReport({
        campaignName: campaign,
        pickups: pickups,
        filterContext: `Executive PR Dossier: ${campaign} (Verified Links & Key Metrics)`,
        includeAllLinks: true,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const samplePrompts = [
    "📄 Share Executive PDF Report for GCC & Middle East Expansion",
    "What is the total estimated PR Value of the ICC Loyalty acquisition?",
    "Give me an executive summary and links for leadership",
    "Which Tier A financial outlets covered Mintoak in India & GCC?",
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#E4E9DD] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 bg-[#2A4D1F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#87BD28] flex items-center justify-center text-white font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-none">Mintoak AI PR Assistant</h3>
              <p className="text-[11px] text-[#DCE9CE] mt-1">Powered by Gemini 3.7 Flash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F7F9F4] text-xs">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${
                msg.sender === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  msg.sender === "user" ? "bg-[#48821C] text-white" : "bg-white text-[#2A4D1F] border border-[#E4E9DD]"
                }`}
              >
                {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#48821C] text-white rounded-tr-none"
                    : "bg-white text-[#1E241B] border border-[#E4E9DD] rounded-tl-none shadow-xs space-y-2"
                }`}
              >
                <div>{msg.text.replace(/\*\*/g, "")}</div>

                {msg.isPdfAction && (
                  <div className="mt-2 p-2.5 bg-[#F8FAF5] rounded-xl border border-[#DCE9CE] space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                      <FileText className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Executive PR PDF Report: {msg.campaignTarget || "GCC & Middle East Expansion"}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Includes complete executive KPI briefing, region distribution matrix, and all verified clickable media links.
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleDownloadDirectPdf(msg.campaignTarget || "GCC & Middle East Expansion (ICC Loyalty)")}
                        className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download PDF Report</span>
                      </button>
                      {onOpenCampaignPdfReport && (
                        <button
                          onClick={() => onOpenCampaignPdfReport(msg.campaignTarget)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-slate-200"
                        >
                          <span>Customize &amp; Share</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-[#6B7566] text-xs p-2">
              <Sparkles className="w-4 h-4 animate-spin text-[#48821C]" />
              <span>Analyzing PR corpus...</span>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="p-3 bg-white border-t border-[#E4E9DD]">
          <p className="text-[10px] font-bold uppercase text-[#6B7566] mb-1.5">Suggested Questions:</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="text-[11px] bg-[#F7F9F4] hover:bg-[#EDF6E2] text-[#48821C] font-semibold border border-[#E4E9DD] px-2.5 py-1 rounded-lg text-left transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask a PR or sentiment question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-[#F7F9F4] text-xs px-3 py-2 rounded-xl border border-[#E4E9DD] focus:outline-none focus:ring-1 focus:ring-[#80C341] text-[#1E241B]"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-[#48821C] hover:bg-[#2A4D1F] text-white p-2 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
