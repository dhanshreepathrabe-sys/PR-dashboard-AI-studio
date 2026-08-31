import React, { useState } from "react";
import { DollarSign, Eye, Award, MessageSquareQuote, TrendingUp, Newspaper, Info, X, Calculator, CheckCircle2 } from "lucide-react";
import { PRMetrics } from "../types";

interface KPICardsProps {
  metrics: PRMetrics;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} Lakh`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const formatReach = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return val.toLocaleString("en-IN");
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Mentions */}
        <div className="bg-white border border-[#E4E9DD] rounded-xl p-3.5 shadow-xs hover:border-[#80C341] transition-all">
          <div className="flex items-center justify-between text-[#6B7566] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Mentions</span>
            <Newspaper className="w-4 h-4 text-[#48821C]" />
          </div>
          <div className="font-mono text-2xl font-black text-[#1E241B]">
            {metrics.totalMentions}
          </div>
          <div className="text-[11px] font-semibold text-[#48821C] mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Across {metrics.countriesCount} Countries</span>
          </div>
        </div>

        {/* PR Value (AVE) */}
        <div className="bg-white border border-[#E4E9DD] rounded-xl p-3.5 shadow-xs hover:border-[#80C341] transition-all relative group">
          <div className="flex items-center justify-between text-[#6B7566] mb-1">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Est. PR Value (AVE)</span>
              <button
                onClick={() => setShowFormulaModal(true)}
                className="text-slate-400 hover:text-[#48821C] transition-colors p-0.5 rounded cursor-pointer"
                title="View PR Value Calculation Methodology"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <DollarSign className="w-4 h-4 text-[#48821C]" />
          </div>
          <div className="font-mono text-2xl font-black text-[#1E241B]">
            {formatINR(metrics.totalPRValueINR)}
          </div>
          <div className="text-[11px] font-medium text-[#6B7566] mt-1 flex items-center justify-between">
            <span>~${(metrics.totalPRValueUSD / 1000).toFixed(1)}k USD Eqv.</span>
            <button
              onClick={() => setShowFormulaModal(true)}
              className="text-[10px] text-[#48821C] font-semibold hover:underline cursor-pointer"
            >
              How it's calculated &rarr;
            </button>
          </div>
        </div>

        {/* Total Reach */}
        <div className="bg-white border border-[#E4E9DD] rounded-xl p-3.5 shadow-xs hover:border-[#80C341] transition-all">
          <div className="flex items-center justify-between text-[#6B7566] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Est. Audience Reach</span>
            <Eye className="w-4 h-4 text-[#48821C]" />
          </div>
          <div className="font-mono text-2xl font-black text-[#1E241B]">
            {formatReach(metrics.totalReach)}
          </div>
          <div className="text-[11px] font-medium text-[#6B7566] mt-1">
            Potential Impressions
          </div>
        </div>

        {/* Tier A Share */}
        <div className="bg-white border border-[#E4E9DD] rounded-xl p-3.5 shadow-xs hover:border-[#80C341] transition-all">
          <div className="flex items-center justify-between text-[#6B7566] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tier A Share</span>
            <Award className="w-4 h-4 text-[#48821C]" />
          </div>
          <div className="font-mono text-2xl font-black text-[#48821C]">
            {metrics.catASharePct}%
          </div>
          <div className="text-[11px] font-medium text-[#6B7566] mt-1">
            Top-tier Financial Outlets
          </div>
        </div>

        {/* Positive Sentiment */}
        <div className="bg-white border border-[#E4E9DD] rounded-xl p-3.5 shadow-xs hover:border-[#80C341] transition-all">
          <div className="flex items-center justify-between text-[#6B7566] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Positive Sentiment</span>
            <TrendingUp className="w-4 h-4 text-[#48821C]" />
          </div>
          <div className="font-mono text-2xl font-black text-[#48821C]">
            {metrics.positiveSentimentPct}%
          </div>
          <div className="text-[11px] font-medium text-[#6B7566] mt-1">
            Favorable tone
          </div>
        </div>

        {/* Quoted Spokespersons */}
        <div className="bg-white border border-[#E4E9DD] rounded-xl p-3.5 shadow-xs hover:border-[#80C341] transition-all">
          <div className="flex items-center justify-between text-[#6B7566] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Spokesperson Quotes</span>
            <MessageSquareQuote className="w-4 h-4 text-[#48821C]" />
          </div>
          <div className="font-mono text-2xl font-black text-[#1E241B]">
            {metrics.quotedCount}
          </div>
          <div className="text-[11px] font-medium text-[#6B7566] mt-1">
            Articles with Mintoak Quotes
          </div>
        </div>
      </div>

      {/* PR Value Calculation Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#222A1E] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#48821C] rounded-xl text-white">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">PR Value (AVE) Calculation Methodology</h3>
                  <p className="text-xs text-slate-300">Standard Advertising Value Equivalency Framework</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Formula Card */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Formula</span>
                <p className="font-mono text-sm font-black text-emerald-950 mt-1">
                  PR Value (₹) = Base Ad Rate × Audience Reach × Prominence Weight × Sentiment Weight
                </p>
                <p className="text-xs text-emerald-700 mt-1.5 leading-snug">
                  Measures the equivalent cost of purchasing paid display or editorial ad space across the same publications.
                </p>
              </div>

              {/* Factors Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Key Valuation Drivers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-[#48821C]" />
                      <span>1. Publication Tier &amp; Ad Rate</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      <strong>Tier A (Top National/Financial):</strong> ₹0.28 per impression<br />
                      <strong>Tier B (Regional/Trade):</strong> ₹0.18 per impression<br />
                      <strong>Tier C (General Wire/Portals):</strong> ₹0.10 per impression
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-[#48821C]" />
                      <span>2. Readership / Audience Reach</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Verified monthly unique visitors (MUV) and daily circulation figures provided by press wire tracking tools.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-[#48821C]" />
                      <span>3. Prominence &amp; Placement</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      <strong>Founder Quote / Exclusive:</strong> 1.25× multiplier<br />
                      <strong>Dedicated Feature:</strong> 1.00× multiplier<br />
                      <strong>Brief Wire Mention:</strong> 0.85× multiplier
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-[#48821C]" />
                      <span>4. Sentiment Tone Weight</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      <strong>Positive Tone:</strong> 1.10× multiplier<br />
                      <strong>Neutral Tone:</strong> 0.80× multiplier<br />
                      <strong>Negative Tone:</strong> 0.30× multiplier
                    </p>
                  </div>
                </div>
              </div>

              {/* Sample Calculation */}
              <div className="bg-[#222A1E] text-white p-4 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between text-[#87BD28] font-bold">
                  <span>Example: The Economic Times Feature</span>
                  <span className="font-mono">₹24,000,000 (₹2.4 Cr)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  8.5M Reach × ₹0.28 Tier A Rate × 1.25 Exclusive Quote Multiplier × 1.10 Positive Tone = ~₹24 Lakh (0.24 Cr).
                </p>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-[#48821C] text-white font-bold text-xs rounded-xl hover:bg-[#3b6b17] transition-colors cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

