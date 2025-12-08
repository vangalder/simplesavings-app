"use client";

import ReactECharts from "echarts-for-react";
import { useMemo, useEffect } from "react";
import ChartPalmLeaves from "@/components/ChartPalmLeaves";

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
  // Generate a stable key based on data to force remount when data structure changes significantly
  const dataKey = useMemo(() => {
    if (!data || data.length === 0) return 'empty';
    // Create a hash-like key from data length and first/last values
    const first = data[0];
    const last = data[data.length - 1];
    return `${data.length}-${first?.year || 0}-${last?.year || 0}-${Math.round(first?.value || 0)}-${Math.round(last?.value || 0)}`;
  }, [data]);

  const option = useMemo(() => {
    if (!data || data.length === 0) {
      // Return a minimal valid option instead of empty object
      return {
        grid: {
          left: "12%",
          right: "12%",
          top: "15%",
          bottom: "20%",
        },
        xAxis: {
          type: "value",
          name: "Years",
        },
        yAxis: {
          type: "value",
          name: "Value",
        },
        series: [],
      };
    }

    // Prepare data for stacked area chart
    // Process and validate all data points
    const validDataPoints = data
      .map((d, index) => {
        // Safely extract and convert values, handling undefined/null/NaN
        if (!d || typeof d !== 'object') {
          return null;
        }

        const year = (typeof d.year === 'number' && !isNaN(d.year))
          ? d.year
          : (typeof d.year === 'string' ? parseFloat(d.year) : 0);
        const principal = (typeof d.principal === 'number' && !isNaN(d.principal))
          ? d.principal
          : (typeof d.principal === 'string' ? parseFloat(d.principal) : 0);
        const total = (typeof d.value === 'number' && !isNaN(d.value))
          ? d.value
          : (typeof d.value === 'string' ? parseFloat(d.value) : 0);

        // Final validation - ensure all values are valid, finite numbers
        const validYear = (isNaN(year) || !isFinite(year)) ? 0 : Math.max(0, year);
        const validPrincipal = (isNaN(principal) || !isFinite(principal)) ? 0 : Math.max(0, principal);
        const validTotal = (isNaN(total) || !isFinite(total)) ? 0 : Math.max(0, total);

        // Double-check - if any value is still invalid, skip this point
        if (isNaN(validYear) || isNaN(validPrincipal) || isNaN(validTotal) ||
          !isFinite(validYear) || !isFinite(validPrincipal) || !isFinite(validTotal)) {
          return null;
        }

        return {
          year: validYear,
          principal: validPrincipal,
          total: validTotal,
        };
      })
      .filter((point): point is { year: number; principal: number; total: number } => point !== null && point.year >= 0) // Filter out nulls and negative years
      .sort((a, b) => a.year - b.year); // Sort by year

    // Create a lookup map for tooltip
    const dataMap = new Map(validDataPoints.map((p) => [p.year, p]));

    // Ensure we have valid data points
    if (validDataPoints.length === 0) {
      return {
        grid: {
          left: "12%",
          right: "12%",
          top: "15%",
          bottom: "20%",
        },
        xAxis: {
          type: "value",
          name: "Years",
        },
        yAxis: {
          type: "value",
          name: "Value",
        },
        series: [],
      };
    }

    const maxValue = Math.max(...validDataPoints.map((p) => p.total), 0);
    const maxYear = Math.max(...validDataPoints.map((p) => p.year), 0);
    const calculatedYAxisMax = Math.ceil(maxValue / 100000) * 100000;

    // Debug: Log the max values
    console.log('Chart maxValue (total):', maxValue);
    console.log('Chart maxYear:', maxYear);
    console.log('Calculated Y-Axis max:', calculatedYAxisMax);
    console.log('Year 20 data point:', validDataPoints.find(p => p.year === 20));

    // Prepare aligned data arrays for both series - use exact values from validDataPoints
    // Create a map for quick lookup by year, then build arrays in year order (0 to maxYear)
    const dataByYear = new Map(validDataPoints.map((point) => {
      const interest = Math.max(0, point.total - point.principal);
      return [point.year, {
        principal: point.principal,
        interest: interest,
      }];
    }));

    // Build aligned arrays in year order (0 to maxYear) to match xAxis.data
    const alignedData: Array<{ principal: number; interest: number }> = [];
    for (let year = 0; year <= maxYear; year++) {
      const dataPoint = dataByYear.get(year);
      if (dataPoint) {
        alignedData.push(dataPoint);
      } else {
        // Fill missing years with zeros
        alignedData.push({ principal: 0, interest: 0 });
      }
    }


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
          // For stacked charts with category axis, params is an array with one entry per series
          const paramsArray = Array.isArray(params) ? params : [params];
          if (paramsArray.length === 0) return "";

          const firstParam = paramsArray[0];
          // With category axis, the axis value is the category name (year as string)
          const yearStr = firstParam.axisValue || firstParam.value?.[0] || firstParam.name;
          const year = typeof yearStr === 'string' ? parseInt(yearStr, 10) : yearStr;

          // Find the corresponding data point using the lookup map
          const dataPoint = dataMap.get(year);
          if (!dataPoint) return "";

          const principal = dataPoint.principal;
          const interest = dataPoint.total - dataPoint.principal;
          const total = dataPoint.total;

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
            optionToContent: (opt: any) => {
              try {
                const principalSeries = opt.series?.[0];
                const interestSeries = opt.series?.[1];
                if (!principalSeries?.data || !interestSeries?.data) return '';

                let html = '<table style="width:100%;text-align:center;border-collapse:collapse;"><thead><tr style="background:#f0f0f0;"><th style="padding:8px;border:1px solid #ddd;">Year</th><th style="padding:8px;border:1px solid #ddd;">Principal</th><th style="padding:8px;border:1px solid #ddd;">Interest</th><th style="padding:8px;border:1px solid #ddd;">Total</th></tr></thead><tbody>';

                const maxLen = Math.max(principalSeries.data.length, interestSeries.data.length);
                for (let i = 0; i < maxLen; i++) {
                  const principalPoint = principalSeries.data[i] as [number, number] | undefined;
                  const interestPoint = interestSeries.data[i] as [number, number] | undefined;

                  if (!principalPoint || !interestPoint) continue;

                  const year = principalPoint[0];
                  const principal = principalPoint[1] || 0;
                  const interest = interestPoint[1] || 0;
                  const total = principal + interest;

                  html += `<tr><td style="padding:8px;border:1px solid #ddd;">${year}</td><td style="padding:8px;border:1px solid #ddd;">$${principal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td style="padding:8px;border:1px solid #ddd;">$${interest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td style="padding:8px;border:1px solid #ddd;">$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
                }

                html += '</tbody></table>';
                return html;
              } catch (error) {
                return '<p>Error displaying data</p>';
              }
            },
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
      xAxis: {
        type: "category",
        data: Array.from({ length: maxYear + 1 }, (_, i) => i.toString()),
        boundaryGap: false,
        name: "Years",
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: {
          fontSize: 12,
          color: "#64748B",
          fontWeight: "bold",
        },
        axisLabel: {
          color: "#64748B",
          fontSize: 11,
          interval: Math.ceil(maxYear / 5),
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
        max: Math.ceil(maxValue / 100000) * 100000 || 1200000, // Ensure at least $1.2M if calculation fails
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
          // With category axis, provide just the y-values (ECharts will match them to xAxis.data by index)
          data: alignedData.map((point) => point.principal),
          areaStyle: {
            color: "#81B214",
            opacity: 0.8,
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
        {
          name: "Interest",
          type: "line",
          stack: "total",
          // With category axis, provide just the y-values (ECharts will match them to xAxis.data by index)
          data: alignedData.map((point) => point.interest),
          areaStyle: {
            color: "#F58634",
            opacity: 0.9,
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

  // Debug: Log the complete option object being passed to ECharts
  useEffect(() => {
    console.log('=== ECharts Option Object ===');
    console.log(JSON.stringify(option, null, 2));
    console.log('=== Series Data ===');
    if (option && option.series) {
      option.series.forEach((series: any, index: number) => {
        console.log(`Series ${index} (${series.name}):`, {
          type: series.type,
          stack: series.stack,
          dataLength: series.data?.length,
          first3DataPoints: series.data?.slice(0, 3),
          last3DataPoints: series.data?.slice(-3),
          hasAreaStyle: !!series.areaStyle,
        });
      });
    }
    console.log('=== Y-Axis Max ===');
    if (option && option.yAxis) {
      console.log('Y-Axis max:', option.yAxis.max);
    }
  }, [option]);

  // Ensure option is always valid
  const validOption = useMemo(() => {
    if (!option || Object.keys(option).length === 0) {
      return {
        grid: {
          left: "12%",
          right: "12%",
          top: "15%",
          bottom: "20%",
        },
        xAxis: {
          type: "value",
          name: "Years",
        },
        yAxis: {
          type: "value",
          name: "Value",
        },
        series: [],
      };
    }
    return option;
  }, [option]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        minHeight: "400px",
        background: "linear-gradient(to bottom, #FFCC29, #F58634)"
      }}
    >
      <ReactECharts
        key={dataKey}
        option={validOption}
        style={{ height: "100%", minHeight: "400px", width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge={true}
        lazyUpdate={false}
      />
      {/* Decorative palm leaf silhouettes at bottom corners */}
      <ChartPalmLeaves />
    </div>
  );
}
