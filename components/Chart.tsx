"use client";

import ReactECharts from "echarts-for-react";

interface ChartDataPoint {
  year: number;
  value: number;
}

interface ChartProps {
  data: ChartDataPoint[];
}

export default function Chart({ data }: ChartProps) {
  const option = {
      grid: {
        left: "10%",
        right: "10%",
        top: "10%",
        bottom: "15%",
      },
      xAxis: {
        type: "value",
        name: "years",
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: {
          fontSize: 12,
          color: "#64748B",
        },
        min: 0,
        max: data.length > 0 ? data[data.length - 1].year : 20,
        interval: 5,
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
      },
      yAxis: {
        type: "value",
        name: "value",
        nameLocation: "middle",
        nameGap: 50,
        nameTextStyle: {
          fontSize: 12,
          color: "#64748B",
        },
        min: 0,
        max: data.length > 0 ? Math.ceil(Math.max(...data.map((d) => d.value)) / 250000) * 250000 : 1000000,
        interval: 250000,
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
      },
      series: [
        {
          type: "line",
          data: data.map((d) => [d.year, d.value]),
          smooth: true,
          lineStyle: {
            color: "#206A5D",
            width: 3,
          },
          itemStyle: {
            color: "#206A5D",
          },
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
                  color: "rgba(32, 106, 93, 0.3)",
                },
                {
                  offset: 1,
                  color: "rgba(32, 106, 93, 0.05)",
                },
              ],
            },
          },
        },
      ],
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const param = Array.isArray(params) ? params[0] : params;
        const value = param.value[1];
        return `Year ${param.value[0]}: ${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)}`;
      },
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      borderColor: "#206A5D",
      textStyle: {
        color: "#F8FAFC",
      },
    },
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: "400px", minHeight: "300px", width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}
