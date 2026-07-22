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
        textColor: "#9a9890",
      },
      grid: {
        vertLines: { color: "rgba(150,150,150,0.06)" },
        horzLines: { color: "rgba(150,150,150,0.06)" },
      },
      timeScale: { borderColor: "rgba(150,150,150,0.2)" },
      rightPriceScale: { borderColor: "rgba(150,150,150,0.2)" },
    });
    chartRef.current = chart;

    if (props.kind === "rsi") {
      const rsiSeries = chart.addLineSeries({
        color: "#D85A30",
        lineWidth: 1.5,
        priceLineVisible: false,
      });
      rsiSeries.setData(props.data as LineData[]);
      rsiSeries.createPriceLine({ price: 70, color: "#888780", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "70" });
      rsiSeries.createPriceLine({ price: 30, color: "#888780", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "30" });
    } else {
      const histSeries = chart.addHistogramSeries({ priceLineVisible: false });
      const histData: HistogramData[] = props.histogram.map((p) => ({
        time: p.time as HistogramData["time"],
        value: p.value,
        color: p.value >= 0 ? "#5DCAA5" : "#E24B4A",
      }));
      histSeries.setData(histData);

      const macdSeries = chart.addLineSeries({ color: "#378ADD", lineWidth: 1.5, priceLineVisible: false });
      macdSeries.setData(props.macdLine as LineData[]);

      const signalSeries = chart.addLineSeries({ color: "#BA7517", lineWidth: 1.5, priceLineVisible: false });
      signalSeries.setData(props.signalLine as LineData[]);
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
          color: "#9a9890",
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
