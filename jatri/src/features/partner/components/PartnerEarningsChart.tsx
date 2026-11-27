"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Star, BarChart2 } from "lucide-react";
import axios from "axios";

type Earnings = {
  date: string;
  earnings: number;
};

type TooltipPayload = {
  value: number;
  payload: Earnings;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-[8px] p-3 min-w-[130px]">
        <p className="text-[10px] tabular-nums font-bold text-[var(--text-secondary)] mb-1">
          {label}
        </p>
        <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
          ₹{payload[0].value.toLocaleString("en-IN")}
        </p>
      </div>
    );
  }
  return null;
};

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function PartnerEarningsChart() {
  const [data, setData] = useState<Earnings[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axios
      .get("/api/partner/earnings")
      .then((res) => {
        const earnings = Array.isArray(res.data?.earnings) ? res.data.earnings : [];
        const last7Days: Earnings[] = earnings.slice(-7);
        setData(last7Days);
        setLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load partner earnings:", err);
        setData([]);
        setLoaded(true);
      });
  }, []);

  const total = data.reduce((a, d) => a + d.earnings, 0);
  const avg = data.length ? Math.round(total / data.length) : 0;
  const max = data.length ? Math.max(...data.map((d) => d.earnings)) : 0;
  const bestDay = data.find((d) => d.earnings === max);
  const today = data[data.length - 1];
  const yesterday = data[data.length - 2];
  const delta = today && yesterday ? today.earnings - yesterday.earnings : 0;
  const deltaPositive = delta >= 0;
  const deltaPct = yesterday && yesterday.earnings > 0 ? Math.abs(Math.round((delta / yesterday.earnings) * 100)) : 0;

  const metrics = [
    {
      label: "Peak Day",
      value: fmt(max),
      sub: bestDay?.date ?? "—",
      icon: <Star size={13} />,
    },
    {
      label: "Shift Average",
      value: fmt(avg),
      sub: "per day",
      icon: <BarChart2 size={13} />,
    },
  ];

  return (
    <div className="bg-[var(--surface-raised)] rounded-[14px] border border-[var(--border-default)] p-5 sm:p-7 ">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-6 border-b border-[var(--border-default)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#123D32] dark:bg-[#347858] inline-block" />
            <span className="text-[10px] tabular-nums font-bold text-[var(--text-secondary)]">
              Revenue Analytics
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-sans text-[var(--text-primary)] tracking-tight">
            7-Day Performance Ledger
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans">
            Daily verified fare settlements
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-[10px] tabular-nums font-bold text-[var(--text-secondary)] mb-0.5">
            Trailing 7-Day Gross
          </p>
          <motion.p
            key={total}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight"
          >
            {fmt(total)}
          </motion.p>
          <div
            className={`flex items-center sm:justify-end gap-1 text-[11px] tabular-nums mt-0.5 ${
              deltaPositive ? "text-[#123D32] dark:text-[#347858]" : "text-[#E34222] dark:text-[#E06A50]"
            }`}
          >
            {deltaPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{deltaPct}% vs previous day</span>
          </div>
        </div>
      </div>

      {/* Metric Cards Bento */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 6 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="bg-[var(--background)] rounded-[12px] border border-[var(--border-default)] p-3.5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[var(--text-secondary)] text-[10px] tabular-nums font-bold mb-2">
              <span>{m.label}</span>
              <span className="text-[#123D32] dark:text-[#347858]">{m.icon}</span>
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums leading-none">
                {m.value}
              </p>
              <p className="text-[10px] tabular-nums text-[var(--text-secondary)] mt-1">{m.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <AnimatePresence>
        {loaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-56"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="2 2" stroke="currentColor" className="text-[#DED7CA] dark:text-[#29372E]" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#929D93", fontFamily: "monospace" }}
                  axisLine={{ stroke: "#DED7CA" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#929D93", fontFamily: "monospace" }}
                  axisLine={{ stroke: "#DED7CA" }}
                  tickLine={false}
                  tickFormatter={(v) => "₹" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "currentColor", className: "text-[#123D32]/5 dark:text-[#FAF7F0]/5" }} />
                <Bar dataKey="earnings" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => {
                    const isToday = index === data.length - 1;
                    const isBest = entry.earnings === max && !isToday;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isToday ? "#123D32" : isBest ? "#D7AC62" : "#929D93"}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}