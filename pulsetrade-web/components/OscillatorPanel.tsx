"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  HistogramData,
  ColorType,
} from "lightweight-charts";
import { SeriesPoint } from "@/lib/indicators";

interface RsiPanelProps {
  kind: "rsi";
  data: SeriesPoint[];
}

interface MacdPanelProps {
  kind: "macd";
  macdLine: SeriesPoint[];
  signalLine: SeriesPoint[];
  histogram: SeriesPoint[];
}

type OscillatorPanelProps = (RsiPanelProps | MacdPanelProps) & {
  title: string;
  valueLabel: string;
};

export default function OscillatorPanel(props: OscillatorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 110,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "oklch(0.68 0.01 258)",
      },
   grid: {
        vertLines: { color: "oklch(0.32 0.02 258 / 0.3)" },
        horzLines: { color: "oklch(0.32 0.02 258 / 0.3)" },
      },
      timeScale: { borderColor: "oklch(0.32 0.02 258)" },
      rightPriceScale: { borderColor: "oklch(0.32 0.02 258)" },
    });
    chartRef.current = chart;

    if (props.kind === "rsi") {
      const rsiSeries = chart.addLineSeries({
        color: "oklch(0.68 0.20 25)",
        lineWidth: 2,
        priceLineVisible: false,
      });
      rsiSeries.setData(props.data as LineData[]);
      rsiSeries.createPriceLine({ price: 70, color: "oklch(0.48 0.01 258)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "70" });
      rsiSeries.createPriceLine({ price: 30, color: "oklch(0.48 0.01 258)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "30" });
    } else {
      const histSeries = chart.addHistogramSeries({ priceLineVisible: false });
      const histData: HistogramData[] = props.histogram.map((p) => ({
        time: p.time as HistogramData["time"],
        value: p.value,
        color: p.value >= 0 ? "oklch(0.74 0.18 148)" : "oklch(0.68 0.20 25)",
      }));
      histSeries.setData(histData);

      const macdSeries = chart.addLineSeries({ color: "oklch(0.68 0.17 250)", lineWidth: 2, priceLineVisible: false });
      macdSeries.setData(props.macdLine as LineData[]);

      const signalSeries = chart.addLineSeries({ color: "oklch(0.75 0.15 70)", lineWidth: 2, priceLineVisible: false });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props]);

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "oklch(0.68 0.01 258)",
          marginBottom: 4,
        }}
      >
        <span>{props.title}</span>
        <span>{props.valueLabel}</span>
      </div>
      <div ref={containerRef} style={{ width: "100%" }} />
    </div>
  );
}
