import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MediaMention, CompetitorSOV } from "../types";

interface SentimentChartsProps {
  mentions: MediaMention[];
  competitorSOV: CompetitorSOV[];
}

export const SentimentCharts: React.FC<SentimentChartsProps> = ({
  mentions,
  competitorSOV,
}) => {
  // Sentiment Distribution Breakdown
  const sentimentCounts = mentions.reduce((acc: any, m) => {
    acc[m.sentiment] = (acc[m.sentiment] || 0) + 1;
    return acc;
  }, {});

  const sentimentData = [
    { name: "Positive", value: sentimentCounts["positive"] || 0, color: "#48821C" },
    { name: "Neutral", value: sentimentCounts["neutral"] || 0, color: "#6B7566" },
    { name: "Negative", value: sentimentCounts["negative"] || 0, color: "#C1462F" },
    { name: "Mixed", value: sentimentCounts["mixed"] || 0, color: "#9A6A18" },
  ];

  // Mentions by Country Top 6
  const countryCounts = mentions.reduce((acc: any, m) => {
    acc[m.country] = (acc[m.country] || 0) + 1;
    return acc;
  }, {});

  const countryData = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // PR Value Growth Trend by Category Tier
  const tierValueData = [
    { name: "Category A (Top Tier)", value: mentions.filter(m => m.categoryTier === "A").reduce((s, m) => s + m.prValueINR, 0) },
    { name: "Category B (Mid Tier)", value: mentions.filter(m => m.categoryTier === "B").reduce((s, m) => s + m.prValueINR, 0) },
    { name: "Category C (Niche/Regional)", value: mentions.filter(m => m.categoryTier === "C").reduce((s, m) => s + m.prValueINR, 0) },
    { name: "Press Wires", value: mentions.filter(m => m.categoryTier === "Wire").reduce((s, m) => s + m.prValueINR, 0) },
  ];

  const formatINRShort = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Sentiment Pie Chart */}
      <div className="bg-white p-4 rounded-2xl border border-[#E4E9DD] shadow-xs flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="font-extrabold text-sm text-[#1E241B]">Media Sentiment Distribution</h3>
          <p className="text-xs text-[#6B7566]">Tone breakdown across active press mentions</p>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value} Articles`, "Count"]} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Top Geographic Coverage */}
      <div className="bg-white p-4 rounded-2xl border border-[#E4E9DD] shadow-xs flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="font-extrabold text-sm text-[#1E241B]">Geographic Footprint</h3>
          <p className="text-xs text-[#6B7566]">Press coverage by destination market</p>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={countryData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E9DD" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="country" type="category" width={80} tick={{ fontSize: 11, fontWeight: 600 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#48821C" radius={[0, 6, 6, 0]} name="Mentions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Share of Voice vs Competitors */}
      <div className="bg-white p-4 rounded-2xl border border-[#E4E9DD] shadow-xs flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="font-extrabold text-sm text-[#1E241B]">Share of Voice (SOV)</h3>
          <p className="text-xs text-[#6B7566]">Mintoak vs. Merchant Fintech Competitors</p>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={competitorSOV} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E9DD" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(value: any) => [`${value}%`, "Share of Voice"]} />
              <Bar dataKey="sharePct" name="Share %">
                {competitorSOV.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isTarget ? "#48821C" : "#6B7566"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. PR Value Generated by Outlet Tier */}
      <div className="bg-white p-4 rounded-2xl border border-[#E4E9DD] shadow-xs col-span-1 md:col-span-2 lg:col-span-3">
        <div className="mb-3">
          <h3 className="font-extrabold text-sm text-[#1E241B]">PR Value (AVE) Generated by Publication Tier</h3>
          <p className="text-xs text-[#6B7566]">Calculated advertising value equivalence in Indian Rupees (INR)</p>
        </div>

        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierValueData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E9DD" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tickFormatter={formatINRShort} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Est. PR Value"]} />
              <Bar dataKey="value" fill="#80C341" radius={[6, 6, 0, 0]} name="PR Value (INR)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
