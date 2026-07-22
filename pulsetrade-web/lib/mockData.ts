import { Candle } from "./indicators";

// Öncelik: gerçek veri (Railway backend → Twelve Data).
// PULSETRADE_API_BASE / PULSETRADE_CLIENT_TOKEN henüz ayarlanmadıysa
// ya da istek başarısız olursa, geliştirmeye devam edebilmek için
// rastgele üretilmiş mum verisine düşer.

export function generateMockCandles(
  count: number,
  startPrice: number,
  intervalSeconds: number
): Candle[] {
  const candles: Candle[] = [];
  let last = startPrice;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - count * intervalSeconds;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * intervalSeconds;
    const drift = (Math.random() - 0.5) * (startPrice * 0.004);
    const open = last;
    const close = open + drift;
    const high = Math.max(open, close) + Math.random() * (startPrice * 0.001);
    const low = Math.min(open, close) - Math.random() * (startPrice * 0.001);
    candles.push({ time, open, high, low, close });
    last = close;
  }

  return candles;
}

function fallbackCandles(symbol: string, intervalSeconds: number): Candle[] {
  const startPriceBySymbol: Record<string, number> = {
    "XAU/USD": 4155,
    "EUR/USD": 1.141,
    "BTC/USD": 66000,
  };
  const startPrice = startPriceBySymbol[symbol] ?? 100;
  return generateMockCandles(180, startPrice, intervalSeconds);
}

export async function fetchCandles(
  symbol: string,
  intervalSeconds: number
): Promise<Candle[]> {
  try {
    const url = `/api/candles?symbol=${encodeURIComponent(
      symbol
    )}&intervalSeconds=${intervalSeconds}`;
    const response = await fetch(url);
    const payload = await response.json();

    if (!response.ok || !Array.isArray(payload?.candles)) {
      console.warn(
        "Gerçek veri alınamadı, mock veriye geçildi:",
        payload?.error
      );
      return fallbackCandles(symbol, intervalSeconds);
    }

    return payload.candles as Candle[];
  } catch (error) {
    console.warn("Gerçek veri isteği başarısız oldu, mock veriye geçildi:", error);
    return fallbackCandles(symbol, intervalSeconds);
  }
}
