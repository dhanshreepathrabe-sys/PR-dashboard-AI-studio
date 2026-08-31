import React from "react";
import { Sparkles, Plus, Search, Menu, X, Download, RefreshCw, FileText } from "lucide-react";
import { FilterState } from "../types";

interface HeaderProps {
  filters: FilterState;
  onFilterChange: (updated: Partial<FilterState>) => void;
  onOpenAddModal: () => void;
  onOpenAIChat: () => void;
  onOpenCampaignPdfReport?: () => void;
  onDownloadCSV: () => void;
  onDownloadExcel: () => void;
  onRefreshData: () => void;
  lastUpdatedTime: string;
  isRefreshing: boolean;
  totalMentionsCount: number;
  activeTabTitle: string;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  filters,
  onFilterChange,
  onOpenAddModal,
  onOpenAIChat,
  onOpenCampaignPdfReport,
  onDownloadCSV,
  onDownloadExcel,
  onRefreshData,
  lastUpdatedTime,
  isRefreshing,
  totalMentionsCount,
  activeTabTitle,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Active Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-9 h-9 rounded-xl bg-[#222A1E] p-2 flex items-center justify-center text-white font-bold shadow-xs">
            <span className="text-[#80C341] text-lg font-black leading-none">M</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-[#222A1E]">
                Mintoak PR Analytics <span className="text-slate-300 font-normal">|</span>{" "}
                <span className="text-[#48821C] font-bold">{activeTabTitle}</span>
              </h1>
              <span className="bg-[#48821C]/10 text-[#48821C] text-[10px] font-bold px-2 py-0.5 rounded-xl border border-[#48821C]/20 hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#48821C] animate-pulse"></span>
                Active Tracking
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span>Media intelligence platform • {totalMentionsCount} total tracked mentions</span>
              <span className="text-slate-300">•</span>
              <span className="text-[#48821C] font-semibold flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-[#48821C]" : ""}`} />
                Auto-updated: {lastUpdatedTime}
              </span>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-[150px] md:min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search outlets, headlines..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              className="w-full bg-slate-50 text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#48821C] focus:bg-white text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Refresh Data Button */}
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-2 rounded-xl transition-all cursor-pointer border border-slate-200"
            title="Auto-update & sync dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#48821C] ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden lg:inline">{isRefreshing ? "Syncing..." : "Sync Data"}</span>
          </button>

          {/* Dedicated Executive PDF Report Button */}
          {onOpenCampaignPdfReport && (
            <button
              onClick={onOpenCampaignPdfReport}
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 border border-red-400/40"
              title="Download Executive PR Report PDF based on active filters"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">↓ Download Executive PR Report</span>
              <span className="sm:hidden">PDF Report</span>
            </button>
          )}

          {/* Export Excel / Sheets Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#48821C] border border-[#80C341]/40 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Download PR Data in Excel, PDF or CSV format"
            >
              <Download className="w-3.5 h-3.5 text-[#48821C]" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 text-xs animate-in fade-in slide-in-from-top-1"
                onClick={() => setShowExportMenu(false)}
              >
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Select PR Report Format
                </div>
                {onOpenCampaignPdfReport && (
                  <button
                    onClick={onOpenCampaignPdfReport}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-red-50 text-slate-800 hover:text-red-700 flex items-center justify-between font-bold transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-black">.PDF</span>
                      <span>Executive PR PDF Report</span>
                    </div>
                  </button>
                )}
                <button
                  onClick={onDownloadExcel}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-[#48821C] flex items-center justify-between font-semibold transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-[#48821C] rounded text-[10px] font-bold">.XLSX</span>
                    <span>Download Excel Sheet</span>
                  </div>
                </button>
                <button
                  onClick={onDownloadCSV}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-800 flex items-center justify-between font-medium transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">.CSV</span>
                    <span>Google Sheets / CSV</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAIChat}
            className="flex items-center gap-1.5 bg-[#48821C] hover:bg-[#386616] text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-lime-200" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Add Mention Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-2.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden xl:inline">Add Mention</span>
          </button>
        </div>
      </div>
    </header>
  );
};



