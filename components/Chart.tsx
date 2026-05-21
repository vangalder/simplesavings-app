"use client";

import ReactECharts from "echarts-for-react";
import { useMemo, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import * as echarts from "echarts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";

export interface ChartDataPoint {
  year: number;
  value: number;
  principal?: number;
  interest?: number;
}

export type ChartType = "area" | "bar" | "line";

interface ChartProps {
  data: ChartDataPoint[];
  chartType?: ChartType;
  goalAmount?: number;
  locale?: string;
  currency?: string;
  xAxisUnit?: "years" | "months";
  onChartTypeChange?: (type: ChartType) => void;
}

// Local formatters are now replaced by formatCurrency/formatCurrencyCompact from lib/currency.ts.
// DS colors
const ACCENT_DARK = "#E6B825";
const ACCENT_LIGHT = "#FFD966";
const COLOR_PRINCIPAL = "#81B214";
const COLOR_INTEREST = "#F58634";
const COLOR_TOTAL = "#164A40";
const SECONDARY_COLORS = ["#81B214", "#5F8510", "#A5D44A"];

interface SvgPath { d: string; id: string; imageUrl?: string }

// fmt is now a closure built per render using locale+currency (see useMemo below)

const TYPE_ICONS: Record<ChartType, string> = {
  area: "◿",
  bar: "▐",
  line: "⌇",
};

export default function Chart({ data, chartType = "area", goalAmount = 0, locale = "en", currency = "USD", xAxisUnit = "years", onChartTypeChange }: ChartProps) {
  const t = useTranslations("chart");
  const [svgPaths, setSvgPaths] = useState<{ lowerLeft: SvgPath | null; lowerRight: SvgPath | null }>({
    lowerLeft: null,
    lowerRight: null,
  });

  const pathToImageUrl = async (path: SvgPath, color: string, opacity: number, viewBox: string): Promise<string> => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="2000" height="2000"><path d="${path.d}" fill="${color}" opacity="${opacity}" /></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/palm-fronds-and-silhouettes.svg");
        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = svgDoc.querySelector("svg");
        if (!svgElement) return;

        const viewBox = svgElement.getAttribute("viewBox") || "0 0 2000 2000";
        const allPaths = svgElement.querySelectorAll("path");
        const llPaths: SvgPath[] = [];
        const lrPaths: SvgPath[] = [];

        allPaths.forEach((p) => {
          const id = p.getAttribute("id") || "";
          const cls = p.getAttribute("class") || "";
          const d = p.getAttribute("d") || "";
          if (d && (id.toLowerCase().includes("lower-left") || cls.toLowerCase().includes("lower-left"))) llPaths.push({ d, id });
          if (d && (id.toLowerCase().includes("lower-right") || cls.toLowerCase().includes("lower-right"))) lrPaths.push({ d, id });
        });

        const pick = (arr: SvgPath[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
        const ll = pick(llPaths);
        const lr = pick(lrPaths);

        setSvgPaths({
          lowerLeft: ll ? { ...ll, imageUrl: await pathToImageUrl(ll, SECONDARY_COLORS[ll.id.length % 3], 0.5, viewBox) } : null,
          lowerRight: lr ? { ...lr, imageUrl: await pathToImageUrl(lr, SECONDARY_COLORS[lr.id.length % 3], 0.5, viewBox) } : null,
        });
      } catch { /* SVG load failures are non-fatal */ }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived milestone calculations
  const { validData, doublingYear, goalYear } = useMemo(() => {
    if (!data || data.length === 0) return { validData: [], doublingYear: undefined, goalYear: undefined };

    const validData = data
      .map((d) => {
        if (!d || typeof d !== "object") return null;
        const year = Number(d.year) || 0;
        const principal = Math.max(0, Number(d.principal) || 0);
        const total = Math.max(0, Number(d.value) || 0);
        if (!isFinite(year) || !isFinite(principal) || !isFinite(total)) return null;
        return { year, principal, total, interest: Math.max(0, total - principal) };
      })
      .filter((p): p is { year: number; principal: number; total: number; interest: number } => p !== null)
      .sort((a, b) => a.year - b.year);

    if (validData.length === 0) return { validData: [], doublingYear: undefined, goalYear: undefined };

    // Derive starting amount and monthly contribution from data shape
    // When xAxisUnit is "months", each step = 1 month; when "years", each step = 12 months
    const startingAmount = validData[0]?.principal ?? 0;
    const stepsPerMonth = xAxisUnit === "months" ? 1 : 12;
    const monthlyContribution = validData.length > 1
      ? Math.max(0, (validData[1].principal - validData[0].principal) / stepsPerMonth)
      : 0;
    const doublingTarget = 2 * startingAmount + 24 * monthlyContribution;

    const doublingYear = validData.find((d) => d.total >= doublingTarget && doublingTarget > 0)?.year;
    const goalYear = goalAmount > 0 ? validData.find((d) => d.total >= goalAmount)?.year : undefined;

    return { validData, doublingYear, goalYear };
  }, [data, goalAmount]);

  const dataKey = useMemo(() => {
    if (!validData.length) return "empty";
    const first = validData[0];
    const last = validData[validData.length - 1];
    return `${validData.length}-${first.year}-${last.year}-${Math.round(last.total)}-${chartType}-${goalAmount}`;
  }, [validData, chartType, goalAmount]);

  const option = useMemo(() => {
    const fmt = (v: number) => formatCurrency(v, currency, locale);
    const fmtCompact = (v: number) => formatCurrencyCompact(v, currency, locale);
    const axisXLabel = xAxisUnit === "months" ? t("months") : t("years");
    const axisValue = t("value");
    const goalLabel = t("goalLabel");
    const pointUnit = xAxisUnit === "months" ? "Month" : "Year";

    if (!validData.length) {
      return {
        grid: { left: "12%", right: "12%", top: "15%", bottom: "20%" },
        xAxis: { type: "value", name: axisXLabel },
        yAxis: { type: "value", name: axisValue },
        series: [],
      };
    }

    const maxYear = validData[validData.length - 1].year;
    const maxValue = validData.reduce((m, p) => Math.max(m, p.total), 0);

    // For monthly charts (short timeframe), zoom y-axis so growth is visible rather than swamped by the base
    const startTotal = validData[0]?.total ?? 0;
    const growth = maxValue - startTotal;
    const yMin = xAxisUnit === "months" && growth > 0
      ? Math.max(0, Math.floor((startTotal - growth * 1.5) / 10000) * 10000)
      : 0;

    // Build aligned arrays
    const byYear = new Map(validData.map((p) => [p.year, p]));
    const aligned: { principal: number; interest: number; total: number }[] = [];
    for (let y = 0; y <= maxYear; y++) {
      const p = byYear.get(y);
      aligned.push(p ? { principal: p.principal, interest: p.interest, total: p.total } : { principal: 0, interest: 0, total: 0 });
    }

    const xCategories = Array.from({ length: maxYear + 1 }, (_, i) => i.toString());

    // Graphic overlays
    const graphic: object[] = [];
    if (svgPaths.lowerLeft?.imageUrl) {
      graphic.push({ type: "image", left: "12%", bottom: "19.5%", z: 10, silent: true, style: { image: svgPaths.lowerLeft.imageUrl, width: 120, height: 120, opacity: 1 } });
    }
    if (svgPaths.lowerRight?.imageUrl) {
      graphic.push({ type: "image", right: "12%", bottom: "19.5%", z: 10, silent: true, style: { image: svgPaths.lowerRight.imageUrl, width: 120, height: 120, opacity: 1 } });
    }

    // markPoint for doubling milestone on phantom total series
    const doublingMarkPoint = doublingYear !== undefined ? {
      symbolSize: 40,
      data: [{
        name: "2× Growth",
        coord: [doublingYear.toString(), aligned[doublingYear]?.total ?? 0],
        label: { formatter: "2×", color: "white", fontWeight: "bold", fontSize: 11 },
        itemStyle: { color: COLOR_TOTAL },
      }],
    } : undefined;

    // markLine for goal amount on phantom total series
    const goalMarkLine = goalAmount > 0 ? {
      silent: true,
      symbol: "none",
      lineStyle: { color: "#F59E0B", width: 2, type: "dashed" },
      label: { formatter: `${goalLabel}: ${fmt(goalAmount)}`, position: "insideEndTop", color: "#92400E", fontWeight: "bold", fontSize: 11 },
      data: [{ yAxis: goalAmount }],
    } : undefined;

    // Phantom total series (transparent, carries markers)
    // z: 5 keeps markLine/markPoint above the area fills in the canvas so they
    // appear correctly in both on-screen rendering and saveAsImage exports.
    const phantomSeries = {
      name: "_total",
      type: "line",
      data: aligned.map((d) => d.total),
      lineStyle: { width: 0, opacity: 0 },
      itemStyle: { color: "transparent" },
      symbol: "none",
      z: 5,
      ...(doublingMarkPoint ? { markPoint: doublingMarkPoint } : {}),
      ...(goalMarkLine ? { markLine: goalMarkLine } : {}),
    };

    // Series based on chart type
    const isBar = chartType === "bar";
    const isUnstackedLine = chartType === "line";

    let mainSeries: object[];

    if (isUnstackedLine) {
      mainSeries = [
        {
          name: "Total Value",
          type: "line",
          data: aligned.map((d) => d.total),
          smooth: true,
          lineStyle: { width: 3, color: COLOR_INTEREST },
          itemStyle: { color: COLOR_INTEREST },
          symbol: "circle",
          symbolSize: 4,
          emphasis: { focus: "series" },
        },
        {
          name: "Principal",
          type: "line",
          data: aligned.map((d) => d.principal),
          smooth: true,
          lineStyle: { width: 2, color: COLOR_PRINCIPAL },
          itemStyle: { color: COLOR_PRINCIPAL },
          areaStyle: { color: COLOR_PRINCIPAL, opacity: 0.15 },
          symbol: "circle",
          symbolSize: 4,
          emphasis: { focus: "series" },
        },
      ];
    } else {
      mainSeries = [
        {
          name: "Principal",
          type: isBar ? "bar" : "line",
          stack: "total",
          data: aligned.map((d) => d.principal),
          ...(isBar ? {} : { areaStyle: { color: COLOR_PRINCIPAL, opacity: 0.8 }, lineStyle: { width: 0 } }),
          itemStyle: { color: COLOR_PRINCIPAL },
          emphasis: { focus: "series" },
        },
        {
          name: "Interest",
          type: isBar ? "bar" : "line",
          stack: "total",
          data: aligned.map((d) => d.interest),
          ...(isBar ? {} : { areaStyle: { color: COLOR_INTEREST, opacity: 0.9 }, lineStyle: { width: 0 } }),
          itemStyle: { color: COLOR_INTEREST },
          emphasis: { focus: "series" },
        },
      ];
    }

    return {
      backgroundColor: new echarts.graphic.RadialGradient(0.5, 0.5, 0.8, [
        { offset: 0, color: ACCENT_DARK },
        { offset: 1, color: ACCENT_LIGHT },
      ]),
      graphic,
      grid: { left: "12%", right: "12%", top: "15%", bottom: "20%" },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", label: { backgroundColor: "#6a7985" } },
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: COLOR_TOTAL,
        borderWidth: 2,
        textStyle: { color: "#F8FAFC", fontSize: 12 },
        formatter: (params: { axisValue?: string | number; name?: string }[]) => {
          const arr = Array.isArray(params) ? params : [params];
          if (!arr.length) return "";
          const yearStr = arr[0].axisValue ?? arr[0].name ?? "0";
          const year = typeof yearStr === "string" ? parseInt(yearStr, 10) : yearStr;
          const pt = byYear.get(year);
          if (!pt) return "";
          return `
            <div style="padding:8px;min-width:160px;">
              <div style="font-weight:700;margin-bottom:6px;font-size:13px;">${pointUnit} ${year}</div>
              <div style="margin:3px 0;display:flex;justify-content:space-between;gap:12px;">
                <span><span style="display:inline-block;width:10px;height:10px;background:${COLOR_INTEREST};border-radius:2px;margin-right:5px;"></span>Total</span>
                <span style="font-weight:600;">${fmt(pt.total)}</span>
              </div>
              <div style="margin:3px 0;display:flex;justify-content:space-between;gap:12px;">
                <span><span style="display:inline-block;width:10px;height:10px;background:${COLOR_PRINCIPAL};border-radius:2px;margin-right:5px;"></span>Principal</span>
                <span>${fmt(pt.principal)}</span>
              </div>
              <div style="margin:3px 0;display:flex;justify-content:space-between;gap:12px;">
                <span><span style="display:inline-block;width:10px;height:10px;background:#FFCC29;border-radius:2px;margin-right:5px;"></span>Interest</span>
                <span>${fmt(pt.interest)}</span>
              </div>
              ${goalAmount > 0 && pt.total >= goalAmount ? `<div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.2);color:#FCD34D;font-size:11px;">🎯 Goal reached!</div>` : ""}
              ${doublingYear === year ? `<div style="margin-top:4px;color:#6EE7B7;font-size:11px;">🎉 2× growth milestone</div>` : ""}
            </div>
          `;
        },
      },
      toolbox: {
        show: true,
        feature: {
          saveAsImage: { title: "Save as Image", name: "savings-chart" },
          restore: { title: "Restore" },
        },
        right: "5%",
        top: "5%",
        iconStyle: { borderColor: "#64748B" },
        emphasis: { iconStyle: { borderColor: COLOR_TOTAL } },
      },
      xAxis: {
        type: "category",
        data: xCategories,
        boundaryGap: isBar,
        name: axisXLabel,
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: { fontSize: 12, color: "#64748B", fontWeight: "bold" },
        axisLabel: { color: "#64748B", fontSize: 11, interval: Math.ceil(maxYear / 5) },
        splitLine: { show: false },
        axisPointer: { show: true, type: "line", lineStyle: { color: COLOR_TOTAL, width: 1, type: "dashed" } },
      },
      yAxis: {
        type: "value",
        name: axisValue,
        nameLocation: "middle",
        nameGap: 60,
        nameTextStyle: { fontSize: 12, color: "#64748B", fontWeight: "bold" },
        min: yMin,
        max: Math.ceil(Math.max(maxValue, goalAmount) / 100000) * 100000 || 1200000,
        axisLabel: {
          formatter: (v: number) => fmtCompact(v),
          color: "#64748B",
          fontSize: 11,
        },
        splitLine: { show: false },
        axisPointer: { show: true, type: "line", lineStyle: { color: COLOR_TOTAL, width: 1, type: "dashed" } },
      },
      series: [...mainSeries, phantomSeries],
      animation: true,
      animationDuration: 800,
      animationEasing: "cubicOut",
    };
  }, [validData, chartType, goalAmount, locale, currency, xAxisUnit, svgPaths, doublingYear, goalYear, t]);

  return (
    <div className="flex flex-col gap-2">
      {/* Chart type switcher */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-1">
          {(["area", "bar", "line"] as ChartType[]).map((type) => (
            <button
              key={type}
              onClick={() => onChartTypeChange?.(type)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                chartType === type
                  ? "bg-white text-secondary-dark shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {TYPE_ICONS[type]} {t(type)}
            </button>
          ))}
        </div>
        {doublingYear !== undefined && (
          <span className="text-xs text-white/70 hidden sm:inline">
            {t("doublingMilestone", { year: doublingYear })}
          </span>
        )}
      </div>

      {/* ECharts canvas */}
      <div className="relative w-full rounded-2xl overflow-hidden" style={{ minHeight: "400px" }}>
        <ReactECharts
          key={dataKey}
          option={option}
          style={{ height: "100%", minHeight: "400px", width: "100%" }}
          opts={{ renderer: "canvas" }}
          notMerge={true}
          lazyUpdate={false}
        />
      </div>

      {/* Goal callout */}
      {goalAmount > 0 && (
        <div className={`text-xs text-center font-medium px-3 py-1.5 rounded-lg ${
          goalYear !== undefined
            ? "bg-amber-500/20 text-amber-100"
            : "bg-white/10 text-white/60"
        }`}>
          {goalYear !== undefined
            ? t("goalReached", { amount: formatCurrency(goalAmount, currency, locale), year: goalYear })
            : t("goalNotReached", { amount: formatCurrency(goalAmount, currency, locale) })}
        </div>
      )}
    </div>
  );
}
