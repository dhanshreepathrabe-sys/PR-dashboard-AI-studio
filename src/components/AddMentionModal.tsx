import React, { useState, useEffect } from "react";
import { Plus, X, Sparkles, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { MediaMention } from "../types";
import { CANONICAL_CAMPAIGNS, detectCampaignWithExplanation, CanonicalCampaign } from "../utils/campaignHelper";

interface AddMentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMention: (newMention: MediaMention) => void;
}

export const AddMentionModal: React.FC<AddMentionModalProps> = ({
  isOpen,
  onClose,
  onAddMention,
}) => {
  const [headline, setHeadline] = useState("");
  const [publication, setPublication] = useState("");
  const [mediaType, setMediaType] = useState("Online");
  const [country, setCountry] = useState("India");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>(CANONICAL_CAMPAIGNS[0]);
  const [isCampaignConfirmed, setIsCampaignConfirmed] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Live auto-detection feedback
  const detected = detectCampaignWithExplanation(headline, publication, content);

  // Auto update default selected campaign when user types headline if not manually overridden
  useEffect(() => {
    if (headline.trim()) {
      setSelectedCampaign(detected.campaign);
      setIsCampaignConfirmed(true);
    }
  }, [headline, publication, content]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim() || !publication.trim()) return;

    setAnalyzing(true);

    try {
      // Analyze with Gemini
      const res = await fetch("/api/analyze-mention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          publication,
          mediaType,
          country,
          content,
          campaign: selectedCampaign
        }),
      });

      const aiResult = await res.json();

      const created: MediaMention = {
        id: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        publication,
        mediaType,
        country,
        region: country === "India" ? "South Asia" : (country === "UAE" || selectedCampaign.includes("Middle East")) ? "Middle East" : "International",
        headline,
        url: url || `https://news.google.com/search?q=${encodeURIComponent(`"Mintoak" "${publication}"`)}`,
        categoryTier: aiResult.categoryTier || "B",
        sentiment: aiResult.sentiment || "positive",
        theme: (aiResult.keyThemes && aiResult.keyThemes[0]) || "Fintech Expansion",
        campaign: selectedCampaign,
        prValueINR: aiResult.estimatedPRValueINR || 450000,
        reach: aiResult.estimatedReach || 120000,
        quote: aiResult.hasQuote || false,
        summary: aiResult.summary || "Newly logged media mention for Mintoak.",
      };

      onAddMention(created);
      onClose();
      // Reset form
      setHeadline("");
      setPublication("");
      setUrl("");
      setContent("");
      setSelectedCampaign(CANONICAL_CAMPAIGNS[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E4E9DD] animate-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E9DD] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EDF6E2] text-[#48821C] flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1E241B]">Log New Press Mention</h3>
              <p className="text-xs text-[#6B7566]">AI will evaluate sentiment &amp; PR Value (AVE)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#6B7566] hover:text-[#1E241B] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#1E241B] mb-1">Headline *</label>
            <input
              type="text"
              required
              placeholder="e.g., Mintoak acquires Dubai-based fintech ICC Loyalty"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full bg-[#F7F9F4] p-2.5 rounded-xl border border-[#E4E9DD] focus:outline-none focus:ring-1 focus:ring-[#80C341]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1E241B] mb-1">Publication Name *</label>
              <input
                type="text"
                required
                placeholder="e.g., Financial Times / Reuters / ZAWYA"
                value={publication}
                onChange={(e) => setPublication(e.target.value)}
                className="w-full bg-[#F7F9F4] p-2.5 rounded-xl border border-[#E4E9DD] focus:outline-none focus:ring-1 focus:ring-[#80C341]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1E241B] mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-[#F7F9F4] p-2.5 rounded-xl border border-[#E4E9DD] focus:outline-none focus:ring-1 focus:ring-[#80C341]"
              >
                <option value="India">India</option>
                <option value="UAE">UAE</option>
                <option value="UK">United Kingdom</option>
                <option value="Singapore">Singapore</option>
                <option value="Kenya">Kenya</option>
                <option value="Nigeria">Nigeria</option>
                <option value="USA">United States</option>
              </select>
            </div>
          </div>

          {/* Campaign Selection & Verification Box */}
          <div className="p-3 bg-[#F7F9F4] border border-[#E4E9DD] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#1E241B] flex items-center gap-1.5">
                <span>Assigned Campaign</span>
                <span className="text-[10px] font-semibold text-[#48821C] bg-[#EDF6E2] px-1.5 py-0.5 rounded-md">
                  Confirm before finalising
                </span>
              </label>
            </div>

            <select
              value={selectedCampaign}
              onChange={(e) => {
                setSelectedCampaign(e.target.value);
                setIsCampaignConfirmed(true);
              }}
              className="w-full bg-white p-2.5 rounded-lg border border-[#E4E9DD] font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#80C341]"
            >
              {CANONICAL_CAMPAIGNS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {headline.trim() && (
              <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                {detected.isIccOrMiddleEast ? (
                  <CheckCircle2 className="w-4 h-4 text-[#48821C] shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-slate-800">Auto-Detection: </span>
                  {detected.reason}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-[#1E241B] mb-1">Article URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-[#F7F9F4] p-2.5 rounded-xl border border-[#E4E9DD] focus:outline-none focus:ring-1 focus:ring-[#80C341]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#1E241B] mb-1">Excerpt / Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Paste article snippet for AI sentiment extraction..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-[#F7F9F4] p-2.5 rounded-xl border border-[#E4E9DD] focus:outline-none focus:ring-1 focus:ring-[#80C341]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-[#E4E9DD] text-[#6B7566] font-semibold hover:bg-[#F7F9F4] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={analyzing}
              className="px-4 py-2 rounded-xl bg-[#48821C] hover:bg-[#2A4D1F] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#87BD28]" />
              <span>{analyzing ? "AI Evaluating..." : "Confirm & Save Mention"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
