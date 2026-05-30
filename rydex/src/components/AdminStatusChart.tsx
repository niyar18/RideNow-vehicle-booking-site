"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState } from "react";

type Stats = {
  approved: number;
  pending: number;
  rejected: number;
};

const STATUS_CONFIG = [
  {
    key: "approved" as const,
    label: "Approved",
    icon: CheckCircle2,
    color: "#22C55E",
    bg: "bg-green-50",
    iconColor: "text-green-600",
    textColor: "text-green-700",
    barColor: "bg-green-400",
    hex: "rgba(34,197,94,0.12)",
  },
  {
    key: "pending" as const,
    label: "Pending",
    icon: Clock,
    color: "#F59E0B",
    bg: "bg-amber-50",
    iconColor: "text-amber-500",
    textColor: "text-amber-700",
    barColor: "bg-amber-400",
    hex: "rgba(245,158,11,0.12)",
  },
  {
    key: "rejected" as const,
    label: "Rejected",
    icon: XCircle,
    color: "#EF4444",
    bg: "bg-red-50",
    iconColor: "text-red-500",
    textColor: "text-red-700",
    barColor: "bg-red-400",
    hex: "rgba(239,68,68,0.12)",
  },
];



const RADIAN = Math.PI / 180;

export default function StatusDonutChart({ stats }: { stats: Stats }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const chartData = STATUS_CONFIG.map((s) => ({
    name: s.label,
    value: stats[s.key],
    color: s.color,
    key: s.key,
  }));

  const total = chartData.reduce((a, d) => a + d.value, 0);
  const active = activeKey ? chartData.find((d) => d.key === activeKey) : null;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 w-full">
      {/* Header */}
      <div className="mb-5">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-2">
          Applications
        </span>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Status Overview</h2>
        <p className="text-sm text-gray-400 mt-0.5">{total} total applications</p>
      </div>

      {/* Chart + Legend */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Donut */}
        <div className="relative w-[180px] h-[180px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={82}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveKey(chartData[index].key)}
                onMouseLeave={() => setActiveKey(null)}
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.key}
                    fill={entry.color}
                    opacity={activeKey && activeKey !== entry.key ? 0.4 : 1}
                    style={{ transition: "opacity .2s", cursor: "pointer" }}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <motion.span
              key={active?.value ?? total}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="text-[28px] font-bold text-gray-900 font-mono leading-none"
            >
              {active?.value ?? total}
            </motion.span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-1">
              {active?.name ?? "Total"}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-[150px] flex flex-col gap-2.5">
          {STATUS_CONFIG.map((s, i) => {
            const Icon = s.icon;
            const val = stats[s.key];
            const pct = Math.round((val / total) * 100);
            const isActive = activeKey === s.key;
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                onMouseEnter={() => setActiveKey(s.key)}
                onMouseLeave={() => setActiveKey(null)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border cursor-pointer transition-all duration-150 ${
                  isActive
                    ? "bg-gray-50 border-gray-200"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}
                >
                  <Icon size={14} className={s.iconColor} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-semibold ${s.textColor}`}>{s.label}</div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <motion.div
                      className={`h-full ${s.barColor} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-900 font-mono">{val}</div>
                  <div className="text-[10px] text-gray-400 font-semibold">{pct}%</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}