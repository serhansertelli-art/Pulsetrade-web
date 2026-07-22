// Teknik gösterge hesaplamaları.
// Girdi: zaman damgalı OHLC mumları. Çıktı: grafiğe çizilebilir { time, value } dizileri.
// Twelve Data'nın ham time_series verisiyle doğrudan çalışacak şekilde tasarlandı;
// ileride Twelve Data'nın hazır "technical indicators" endpoint'ine geçilirse
// bu dosya tamamen devre dışı bırakılabilir, arayüz aynı kalır.

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SeriesPoint {
  time: number;
  value: number;
}

/** Basit hareketli ortalama (Simple Moving Average). */
export function sma(candles: Candle[], period: number): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let windowSum = 0;

  for (let i = 0; i < candles.length; i++) {
    windowSum += candles[i].close;
    if (i >= period) {
      windowSum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: windowSum / period });
    }
  }
  return out;
}

/** Üstel hareketli ortalama (Exponential Moving Average). */
export function ema(candles: Candle[], period: number): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  const k = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    if (prevEma === null) {
      // İlk değer için basit ortalamadan başla (period kadar veri birikince).
      if (i < period - 1) continue;
      const seed =
        candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0) /
        period;
      prevEma = seed;
    } else {
      prevEma = close * k + prevEma * (1 - k);
    }
    out.push({ time: candles[i].time, value: prevEma });
  }
  return out;
}

/** Bollinger Bantları: orta (SMA), üst ve alt bant. */
export function bollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2
): { middle: SeriesPoint[]; upper: SeriesPoint[]; lower: SeriesPoint[] } {
  const middle = sma(candles, period);
  const upper: SeriesPoint[] = [];
  const lower: SeriesPoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    const windowSlice = candles.slice(i - period + 1, i + 1);
    const mean = middle[i - (period - 1)].value;
    const variance =
      windowSlice.reduce((s, c) => s + (c.close - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    upper.push({ time: candles[i].time, value: mean + stdDevMultiplier * stdDev });
    lower.push({ time: candles[i].time, value: mean - stdDevMultiplier * stdDev });
  }

  return { middle, upper, lower };
}

/** RSI (Relative Strength Index), Wilder'ın orijinal smoothing yöntemiyle. */
export function rsi(candles: Candle[], period = 14): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  if (candles.length < period + 1) return out;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  const pushRsi = (time: number) => {
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const value = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    out.push({ time, value });
  };
  pushRsi(candles[period].time);

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    pushRsi(candles[i].time);
  }

  return out;
}

/** MACD: macd çizgisi, sinyal çizgisi ve histogram. */
export function macd(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macdLine: SeriesPoint[]; signalLine: SeriesPoint[]; histogram: SeriesPoint[] } {
  const fastEma = ema(candles, fastPeriod);
  const slowEma = ema(candles, slowPeriod);

  // slowEma daha geç başladığı için ortak zaman aralığına hizala.
  const slowStartTime = slowEma[0]?.time;
  const fastAligned = fastEma.filter((p) => p.time >= (slowStartTime ?? p.time));

  const macdLine: SeriesPoint[] = fastAligned.map((p, i) => ({
    time: p.time,
    value: p.value - slowEma[i].value,
  }));

  // Sinyal çizgisi = MACD çizgisinin EMA'sı. ema() Candle beklediği için
  // burada değeri close alanına taşıyıp aynı fonksiyonu yeniden kullanıyoruz.
  const asCandles: Candle[] = macdLine.map((p) => ({
    time: p.time,
    open: p.value,
    high: p.value,
    low: p.value,
    close: p.value,
  }));
  const signalLine = ema(asCandles, signalPeriod);

  const signalStartTime = signalLine[0]?.time;
  const macdAligned = macdLine.filter((p) => p.time >= (signalStartTime ?? p.time));

  const histogram: SeriesPoint[] = macdAligned.map((p, i) => ({
    time: p.time,
    value: p.value - signalLine[i].value,
  }));

  return { macdLine, signalLine, histogram };
}
