"use client";

import { useEffect, useMemo, useState } from "react";
import PriceChart from "@/components/PriceChart";
import OscillatorPanel from "@/components/OscillatorPanel";
import { fetchCandles } from "@/lib/mockData";
import { Candle, ema, sma, bollingerBands, rsi, macd } from "@/lib/indicators";

const SYMBOLS = ["XAU/USD", "EUR/USD", "BTC/USD"];

const TIMEFRAMES: { label: string; seconds: number }[] = [
  { label: "5D", seconds: 300 },
  { label: "1S", seconds: 3600 },
  { label: "4S", seconds: 14400 },
  { label: "1G", seconds: 86400 },
];

type IndicatorId = "ema20" | "ma50" | "bb" | "rsi" | "macd";

export default function Home() {
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframeSeconds, setTimeframeSeconds] = useState(TIMEFRAMES[1].seconds);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(
    new Set(["ema20", "ma50", "rsi"])
  );

  useEffect(() => {
    let cancelled = false;
    fetchCandles(symbol, timeframeSeconds).then((data) => {
      if (!cancelled) setCandles(data);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframeSeconds]);

  // Canlı fiyat: her 5 saniyede bir anlık fiyatı çek, son mumu güncelle.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/quote?symbol=${encodeURIComponent(symbol)}`
        );
        const payload = await response.json();
        if (cancelled || !response.ok || typeof payload.price !== "number") return;

        setCandles((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.close = payload.price;
          last.high = Math.max(last.high, payload.price);
          last.low = Math.min(last.low, payload.price);
          updated[updated.length - 1] = last;
          return updated;
        });
      } catch {
        // Sessizce yut — bir sonraki döngüde tekrar denenecek.
      }
    };

    poll();
    const intervalId = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [symbol]);

  const toggleIndicator = (id: IndicatorId) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const emaData = useMemo(() => ema(candles, 20), [candles]);
  const smaData = useMemo(() => sma(candles, 50), [candles]);
  const bbData = useMemo(() => bollingerBands(candles, 20, 2), [candles]);
  const rsiData = useMemo(() => rsi(candles, 14), [candles]);
  const macdData = useMemo(() => macd(candles, 12, 26, 9), [candles]);

  const overlays = useMemo(() => {
    const list: { id: string; label: string; color: string; data: any[]; dashed?: boolean }[] = [];
    if (activeIndicators.has("ema20")) {
      list.push({ id: "ema20", label: "EMA 20", color: "#378ADD", data: emaData });
    }
    if (activeIndicators.has("ma50")) {
      list.push({ id: "ma50", label: "MA 50", color: "#BA7517", data: smaData, dashed: true });
    }
    if (activeIndicators.has("bb")) {
      list.push({ id: "bb-upper", label: "BB üst", color: "#7F77DD", data: bbData.upper });
      list.push({ id: "bb-lower", label: "BB alt", color: "#7F77DD", data: bbData.lower });
    }
    return list;
  }, [activeIndicators, emaData, smaData, bbData]);

  const lastPrice = candles[candles.length - 1]?.close;
  const firstPrice = candles[0]?.close;
  const changePct =
    lastPrice && firstPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const lastRsi = rsiData[rsiData.length - 1]?.value;
  const lastMacdHist = macdData.histogram[macdData.histogram.length - 1]?.value;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {SYMBOLS.map((s) => (
          <button
            key={s}
            className={`chip ${s === symbol ? "active" : ""}`}
            onClick={() => setSymbol(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{symbol}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
            {lastPrice ? lastPrice.toFixed(symbol === "BTC/USD" ? 0 : 4) : "—"}
          </p>
          <p
            style={{
              fontSize: 12,
              margin: 0,
              color: changePct >= 0 ? "#5DCAA5" : "#E24B4A",
            }}
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.label}
            className={`timeframe-btn ${tf.seconds === timeframeSeconds ? "active" : ""}`}
            onClick={() => setTimeframeSeconds(tf.seconds)}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: 10 }}>
        <PriceChart candles={candles} overlays={overlays} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          className={`chip ${activeIndicators.has("ema20") ? "active" : ""}`}
          onClick={() => toggleIndicator("ema20")}
        >
          EMA 20
        </button>
        <button
          className={`chip ${activeIndicators.has("ma50") ? "active" : ""}`}
          onClick={() => toggleIndicator("ma50")}
        >
          MA 50
        </button>
        <button
          className={`chip ${activeIndicators.has("bb") ? "active" : ""}`}
          onClick={() => toggleIndicator("bb")}
        >
          Bollinger
        </button>
        <button
          className={`chip ${activeIndicators.has("rsi") ? "active" : ""}`}
          onClick={() => toggleIndicator("rsi")}
        >
          RSI
        </button>
        <button
          className={`chip ${activeIndicators.has("macd") ? "active" : ""}`}
          onClick={() => toggleIndicator("macd")}
        >
          MACD
        </button>
      </div>

      {activeIndicators.has("rsi") && rsiData.length > 0 && (
        <div className="panel">
          <OscillatorPanel
            kind="rsi"
            title="RSI (14)"
            valueLabel={lastRsi ? lastRsi.toFixed(1) : "—"}
            data={rsiData}
          />
        </div>
      )}

      {activeIndicators.has("macd") && macdData.histogram.length > 0 && (
        <div className="panel" style={{ marginTop: 10 }}>
          <OscillatorPanel
            kind="macd"
            title="MACD (12,26,9)"
            valueLabel={lastMacdHist ? lastMacdHist.toFixed(2) : "—"}
            macdLine={macdData.macdLine}
            signalLine={macdData.signalLine}
            histogram={macdData.histogram}
          />
        </div>
      )}
    </main>
  );
}
