"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
} as const;

/** 카테고리별 관심 가중치 막대 그래프 (나의 취향 리포트). */
export default function TasteChart({
  categories,
}: {
  categories: [string, number][];
}) {
  const data = {
    labels: categories.map(([c]) => c),
    datasets: [
      {
        label: "관심도",
        data: categories.map(([, w]) => w),
        backgroundColor: "#f97316",
        borderRadius: 6,
      },
    ],
  };
  return (
    <div style={{ height: 220, padding: "0 16px" }}>
      <Bar data={data} options={CHART_OPTS} />
    </div>
  );
}
