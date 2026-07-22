"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  ColorType,
} from "lightweight-charts";
import { Candle } from "@/lib/indicators";

interface OverlaySeries {
  id: string;
  label: string;
  color: string;
  data: LineData[];
  dashed?: boolean;
}

interface PriceChartProps {
  candles: Candle[];
  overlays: OverlaySeries[];
  onVisibleRangeChange?: (range: { from: number; to: number } | null) => void;
}

export default function PriceChart({
  candles,
  overlays,
  onVisibleRangeChange,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "oklch(0.68 0.01 258)",
      },
      grid: {
        vertLines: { color: "oklch(0.32 0.02 258 / 0.35)" },
        horzLines: { color: "oklch(0.32 0.02 258 / 0.35)" },
      },
      timeScale: { borderColor: "oklch(0.32 0.02 258)" },
      rightPriceScale: { borderColor: "oklch(0.32 0.02 258)" },
      },
      timeScale: { borderColor: "rgba(150,150,150,0.2)" },
      rightPriceScale: { borderColor: "rgba(150,150,150,0.2)" },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "oklch(0.74 0.18 148)",
      downColor: "oklch(0.68 0.20 25)",
      borderVisible: false,
      wickUpColor: "oklch(0.74 0.18 148)",
      wickDownColor: "oklch(0.68 0.20 25)",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    if (onVisibleRangeChange) {
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        const range = chart.timeScale().getVisibleRange();
        if (range) {
          onVisibleRangeChange({
            from: range.from as number,
            to: range.to as number,
          });
        } else {
          onVisibleRangeChange(null);
        }
      });
    }

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
      candleSeriesRef.current = null;
      overlaySeriesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const formatted: CandlestickData[] = candles.map((c) => ({
      time: c.time as CandlestickData["time"],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(formatted);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const activeIds = new Set(overlays.map((o) => o.id));

    // Artık listede olmayan overlay'leri kaldır.
    for (const [id, series] of overlaySeriesRef.current) {
      if (!activeIds.has(id)) {
        chart.removeSeries(series);
        overlaySeriesRef.current.delete(id);
      }
    }

    // Yeni/mevcut overlay'leri ekle ya da güncelle.
    for (const overlay of overlays) {
      let series = overlaySeriesRef.current.get(overlay.id);
      if (!series) {
        series = chart.addLineSeries({
          color: overlay.color,
          lineWidth: 1,
          lineStyle: overlay.dashed ? 2 : 0,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        overlaySeriesRef.current.set(overlay.id, series);
      }
      series.setData(overlay.data as LineData[]);
    }
  }, [overlays]);

  return <div ref={containerRef} style={{ width: "100%" }} />;
}
