"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

export interface WeekBarData {
  week: string;
  Planned: number;
  Delivered: number;
}

export interface WeekLineData {
  week: string;
  Variance: number;
}

export function CapacityBarChart({ data }: { data: WeekBarData[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
          cursor={{ fill: "#f8fafc" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="Planned" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Delivered" fill="#005eb8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VarianceLineChart({
  data,
  amberThreshold = 5,
  redThreshold = 10,
}: {
  data: WeekLineData[];
  amberThreshold?: number;
  redThreshold?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(1)}%`, "Variance"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
        />
        <ReferenceLine y={amberThreshold} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${amberThreshold}%`, position: "right", fontSize: 10, fill: "#f59e0b" }} />
        <ReferenceLine y={redThreshold} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${redThreshold}%`, position: "right", fontSize: 10, fill: "#ef4444" }} />
        <Line
          type="monotone"
          dataKey="Variance"
          stroke="#005eb8"
          strokeWidth={2}
          dot={{ r: 3, fill: "#005eb8", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#003d8f" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
