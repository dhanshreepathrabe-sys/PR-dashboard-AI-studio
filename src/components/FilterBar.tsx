import React, { useState } from "react";
import { Filter, RotateCcw, ChevronDown, ChevronUp, X, SlidersHorizontal, Check, Download, FileText } from "lucide-react";
import { FilterState } from "../types";

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (updated: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onDownloadCSV?: () => void;
  onOpenExecutivePdfReport?: () => void;
  availableCountries: string[];
  availableCampaigns: string[];
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onDownloadCSV,
  onOpenExecutivePdfReport,
  availableCountries,
  availableCampaigns,
  totalFilteredCount,
}) => {

  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate active filter count
  const activeFiltersCount = [
    filters.campaign !== "all",
    filters.dateRange !== "all",
    filters.country !== "all",
    filters.categoryTier !== "all",
    filters.sentiment !== "all",
    filters.mediaType !== "all",
    Boolean(filters.searchQuery.trim()),
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs mb-6 overflow-hidden transition-all">
      {/* Bar Header / Toggle Ribbon */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 font-bold text-xs text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <span>Filter Coverage</span>
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {activeFiltersCount} Active
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Quick Active Tags when collapsed */}
          {!isExpanded && activeFiltersCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto text-[11px]">
              {filters.campaign !== "all" && (
                <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  {filters.campaign}
                </span>
              )}
              {filters.country !== "all" && (
                <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  {filters.country}
                </span>
              )}
              {filters.categoryTier !== "all" && (
                <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  Tier {filters.categoryTier}
                </span>
              )}
              {filters.sentiment !== "all" && (
                <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md font-semibold capitalize">
                  {filters.sentiment}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium hidden md:inline mr-1">
            Matching <strong className="text-slate-900 font-mono">{totalFilteredCount}</strong> articles
          </span>

          {onOpenExecutivePdfReport && (
            <button
              onClick={onOpenExecutivePdfReport}
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer text-xs border border-red-400/40"
              title="Download Executive PR Report PDF reflecting active filters"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>↓ Download Executive PR Report</span>
            </button>
          )}

          {onDownloadCSV && (
            <button
              onClick={onDownloadCSV}
              className="flex items-center gap-1.5 text-[#48821C] bg-emerald-50 hover:bg-emerald-100 border border-[#80C341]/30 font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs"
              title="Download CSV report for matched articles"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-semibold px-2 py-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer text-xs"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Controls Drawer */}
      {isExpanded && (
        <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Campaign Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              PR Campaign
            </label>
            <select
              value={filters.campaign}
              onChange={(e) => onFilterChange({ campaign: e.target.value })}
              className="w-full bg-slate-50 text-slate-800 font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Campaigns</option>
              {availableCampaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Time Horizon
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => onFilterChange({ dateRange: e.target.value as any })}
              className="w-full bg-slate-50 text-slate-800 font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>

          {/* Country Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Country / Geography
            </label>
            <select
              value={filters.country}
              onChange={(e) => onFilterChange({ country: e.target.value })}
              className="w-full bg-slate-50 text-slate-800 font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Countries</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Category / Tier Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Outlet Tier
            </label>
            <select
              value={filters.categoryTier}
              onChange={(e) => onFilterChange({ categoryTier: e.target.value })}
              className="w-full bg-slate-50 text-slate-800 font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Media Tiers</option>
              <option value="A">Category A (Top Tier Financial)</option>
              <option value="B">Category B (Mid Tier / Trade)</option>
              <option value="C">Category C (Regional / Niche)</option>
              <option value="Wire">Press Release Wires</option>
            </select>
          </div>

          {/* Sentiment Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Sentiment Tone
            </label>
            <select
              value={filters.sentiment}
              onChange={(e) => onFilterChange({ sentiment: e.target.value })}
              className="w-full bg-slate-50 text-slate-800 font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Sentiment Tones</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
