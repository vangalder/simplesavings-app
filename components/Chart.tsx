"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

interface ChartDataPoint {
  year: number;
  value: number;
  principal?: number;
  interest?: number;
}

interface ChartProps {
  data: ChartDataPoint[];
}

export default function Chart({ data }: ChartProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return {};
    }

    // Prepare data for stacked area chart
    // For stacked area: first series is principal, second series is total (which shows interest as the difference)
    const years = data.map((d) => d.year);
    const principalData = data.map((d) => d.principal ?? 0);
    const totalData = data.map((d) => d.value);

    const maxValue = Math.max(...totalData);
    const maxYear = Math.max(...years);

    return {
      grid: {
        left: "12%",
        right: "12%",
        top: "15%",
        bottom: "20%",
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: {
            backgroundColor: "#6a7985",
          },
        },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          const year = param.value[0];
          const total = param.value[1];
          const principal = principalData[param.dataIndex] || 0;
          const interest = total - principal;

          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">Year ${year}</div>
              <div style="margin: 2px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #F58634; margin-right: 5px;"></span>
                Total: ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(total)}
              </div>
              <div style="margin: 2px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #FFCC29; margin-right: 5px;"></span>
                Principal: ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(principal)}
              </div>
              <div style="margin: 2px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #81B214; margin-right: 5px;"></span>
                Interest: ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(interest)}
              </div>
            </div>
          `;
        },
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "#164A40",
        borderWidth: 2,
        textStyle: {
          color: "#F8FAFC",
          fontSize: 12,
        },
      },
      legend: {
        data: ["Principal", "Interest"],
        bottom: "5%",
        textStyle: {
          color: "#64748B",
          fontSize: 12,
        },
        itemGap: 20,
      },
      toolbox: {
        show: true,
        feature: {
          saveAsImage: {
            title: "Save as Image",
            name: "savings-chart",
          },
          restore: {
            title: "Restore",
          },
          dataView: {
            title: "Data View",
            readOnly: false,
          },
        },
        right: "5%",
        top: "5%",
        iconStyle: {
          borderColor: "#64748B",
        },
        emphasis: {
          iconStyle: {
            borderColor: "#164A40",
          },
        },
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          xAxisIndex: [0],
          bottom: "8%",
          height: 20,
          handleStyle: {
            color: "#F58634",
          },
          dataBackground: {
            areaStyle: {
              color: "rgba(245, 134, 52, 0.2)",
            },
            lineStyle: {
              color: "#F58634",
            },
          },
          selectedDataBackground: {
            areaStyle: {
              color: "rgba(245, 134, 52, 0.4)",
            },
            lineStyle: {
              color: "#F58634",
            },
          },
        },
        {
          type: "inside",
          xAxisIndex: [0],
        },
      ],
      brush: {
        toolbox: ["rect", "clear"],
        xAxisIndex: 0,
      },
      xAxis: {
        type: "value",
        name: "Years",
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: {
          fontSize: 12,
          color: "#64748B",
          fontWeight: "bold",
        },
        min: 0,
        max: maxYear,
        interval: Math.ceil(maxYear / 5),
        axisLabel: {
          color: "#64748B",
          fontSize: 11,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "#E2E8F0",
            type: "dashed",
          },
        },
        axisPointer: {
          show: true,
          type: "line",
          lineStyle: {
            color: "#164A40",
            width: 1,
            type: "dashed",
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Value",
        nameLocation: "middle",
        nameGap: 60,
        nameTextStyle: {
          fontSize: 12,
          color: "#64748B",
          fontWeight: "bold",
        },
        min: 0,
        max: Math.ceil(maxValue / 100000) * 100000,
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000000) return `$${value / 1000000}M`;
            if (value >= 1000) return `$${value / 1000}k`;
            return `$${value}`;
          },
          color: "#64748B",
          fontSize: 11,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "#E2E8F0",
            type: "dashed",
          },
        },
        axisPointer: {
          show: true,
          type: "line",
          lineStyle: {
            color: "#164A40",
            width: 1,
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "Principal",
          type: "line",
          stack: "total",
          data: years.map((year, idx) => [year, principalData[idx]]),
          smooth: true,
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: "#F58634", // Orange
                },
                {
                  offset: 1,
                  color: "#FFCC29", // Yellow
                },
              ],
            },
          },
          lineStyle: {
            width: 0,
          },
          itemStyle: {
            color: "#F58634",
          },
          emphasis: {
            focus: "series",
          },
        },
        {
          name: "Interest",
          type: "line",
          stack: "total",
          data: years.map((year, idx) => [year, totalData[idx]]), // Total value, which will show interest as stacked area
          smooth: true,
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: "#A5D44A", // Light green (secondary-light)
                },
                {
                  offset: 1,
                  color: "#81B214", // Dark green (secondary-base)
                },
              ],
            },
          },
          lineStyle: {
            width: 0,
          },
          itemStyle: {
            color: "#81B214",
          },
          emphasis: {
            focus: "series",
          },
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };
  }, [data]);

  return (
    <div className="relative w-full" style={{ minHeight: "400px" }}>
      <ReactECharts
        option={option}
        style={{ height: "100%", minHeight: "400px", width: "100%" }}
        opts={{ renderer: "svg" }}
      />
      {/* Decorative palm leaf silhouettes at bottom corners */}
      <svg
        className="absolute bottom-0 left-0 pointer-events-none"
        width="80"
        height="80"
        viewBox="0 0 100 100"
        style={{ opacity: 0.15, zIndex: 1 }}
      >
        <path
          d="M20 80 Q30 60 40 70 Q50 50 60 60 Q70 40 80 50 Q75 30 70 20 Q60 25 50 15 Q40 20 30 10 Q25 20 20 30 Q15 40 20 50 Q15 60 20 80 Z"
          fill="#164A40"
        />
      </svg>
      <svg
        className="absolute bottom-0 right-0 pointer-events-none"
        width="80"
        height="80"
        viewBox="0 0 100 100"
        style={{ opacity: 0.15, zIndex: 1 }}
      >
        <path
          d="M80 80 Q70 60 60 70 Q50 50 40 60 Q30 40 20 50 Q25 30 30 20 Q40 25 50 15 Q60 20 70 10 Q75 20 80 30 Q85 40 80 50 Q85 60 80 80 Z"
          fill="#164A40"
        />
      </svg>
    </div>
  );
}
