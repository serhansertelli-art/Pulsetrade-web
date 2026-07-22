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
  const [dayOpenPrice, setDayOpenPrice] = useState<number | undefined>(undefined);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(
    new Set(["ema20", "ma50", "rsi"])
  );

  useEffect(() => {
    let cancelled = false;
    fetchCandles(symbol, 86400).then((dailyCandles) => {
      if (cancelled || dailyCandles.length === 0) return;
      setDayOpenPrice(dailyCandles[dailyCandles.length - 1].open);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    fetchCandles(symbol, timeframeSeconds).then((data) => {
      if (!cancelled) setCandles(data);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframeSeconds]);

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
      list.push({ id: "ema20", label: "EMA 20", color: "oklch(0.68 0.17 250)", data: emaData });
    }
    if (activeIndicators.has("ma50")) {
      list.push({ id: "ma50", label: "MA 50", color: "oklch(0.75 0.15 70)", data: smaData, dashed: true });
    }
    if (activeIndicators.has("bb")) {
      list.push({ id: "bb-upper", label: "BB üst", color: "oklch(0.72 0.12 300)", data: bbData.upper });
      list.push({ id: "bb-lower", label: "BB alt", color: "oklch(0.72 0.12 300)", data: bbData.lower });
    }
    return list;
  }, [activeIndicators, emaData, smaData, bbData]);

  const lastPrice = candles[candles.length - 1]?.close;
  const changePct =
    lastPrice && dayOpenPrice
      ? ((lastPrice - dayOpenPrice) / dayOpenPrice) * 100
      : 0;
  const lastRsi = rsiData[rsiData.length - 1]?.value;
  const lastMacdHist = macdData.histogram[macdData.histogram.length - 1]?.value;
  const changeColor = changePct >= 0 ? "var(--green)" : "var(--red)";

  const symbolNameMap: Record<string, string> = {
    "XAU/USD": "Altın",
    "EUR/USD": "Euro / Dolar",
    "BTC/USD": "Bitcoin",
  };

  return (
    <>
      <header className="header-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="header-logo">P</div>
          <span className="brand" style={{ fontSize: 17, letterSpacing: 0.5 }}>
            PULSETRADE
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="pill-group">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              className={`pill ${s === symbol ? "active" : ""}`}
              onClick={() => setSymbol(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="brand" style={{ fontSize: 24 }}>{symbol}</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{symbolNameMap[symbol]}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="mono" style={{ fontSize: 28, fontWeight: 600 }}>
                {lastPrice ? lastPrice.toFixed(symbol === "BTC/USD" ? 0 : 4) : "—"}
              </span>
              <span className="mono" style={{ fontSize: 14, fontWeight: 500, color: changeColor }}>
                {changePct >= 0 ? "+" : ""}
                {changePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div className="pill-group">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.label}
                  className={`pill ${tf.seconds === timeframeSeconds ? "active" : ""}`}
                  onClick={() => setTimeframeSeconds(tf.seconds)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          <PriceChart candles={candles} overlays={overlays} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className={`chip ${activeIndicators.has("ema20") ? "active" : ""}`} onClick={() => toggleIndicator("ema20")}>
            EMA 20
          </button>
          <button className={`chip ${activeIndicators.has("ma50") ? "active" : ""}`} onClick={() => toggleIndicator("ma50")}>
            MA 50
          </button>
          <button className={`chip ${activeIndicators.has("bb") ? "active" : ""}`} onClick={() => toggleIndicator("bb")}>
            Bollinger
          </button>
          <button className={`chip ${activeIndicators.has("rsi") ? "active" : ""}`} onClick={() => toggleIndicator("rsi")}>
            RSI
          </button>
          <button className={`chip ${activeIndicators.has("macd") ? "active" : ""}`} onClick={() => toggleIndicator("macd")}>
            MACD
          </button>
        </div>

        {activeIndicators.has("rsi") && rsiData.length > 0 && (
          <div className="panel">
            <OscillatorPanel kind="rsi" title="RSI (14)" valueLabel={lastRsi ? lastRsi.toFixed(1) : "—"} data={rsiData} />
          </div>
        )}

        {activeIndicators.has("macd") && macdData.histogram.length > 0 && (
          <div className="panel">
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
    </>
  );
}
