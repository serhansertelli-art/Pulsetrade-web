import { NextRequest, NextResponse } from "next/server";

// Bu route tamamen sunucu tarafında çalışır (Next.js Route Handler).
// PULSETRADE_CLIENT_TOKEN hiçbir zaman tarayıcıya gönderilmez —
// yalnızca burada, sunucudan sunucuya (Railway) isteğe eklenir.

const INTERVAL_SECONDS_TO_TWELVE_DATA: Record<number, string> = {
  300: "5min",
  3600: "1h",
  14400: "4h",
  86400: "1day",
};

interface UpstreamHistoryPoint {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const intervalSeconds = Number(searchParams.get("intervalSeconds"));
  const interval = INTERVAL_SECONDS_TO_TWELVE_DATA[intervalSeconds];

  if (!symbol || !interval) {
    return NextResponse.json(
      { error: "symbol ve desteklenen bir intervalSeconds gerekli." },
      { status: 400 }
    );
  }

  const base = process.env.PULSETRADE_API_BASE;
  const token = process.env.PULSETRADE_CLIENT_TOKEN;

  if (!base || !token) {
    return NextResponse.json(
      {
        error:
          "PULSETRADE_API_BASE / PULSETRADE_CLIENT_TOKEN tanımlı değil (.env.local dosyasını kontrol et).",
      },
      { status: 503 }
    );
  }

  const upstreamUrl = new URL("/api/v1/history", base);
  upstreamUrl.searchParams.set("symbol", symbol);
  upstreamUrl.searchParams.set("interval", interval);
  upstreamUrl.searchParams.set("outputsize", "180");

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Railway sunucusuna ulaşılamadı." },
      { status: 502 }
    );
  }

  const payload = await upstreamResponse.json().catch(() => null);

  if (!upstreamResponse.ok || !payload?.data) {
    return NextResponse.json(
      { error: payload?.error ?? "Geçmiş veri alınamadı." },
      { status: upstreamResponse.status || 502 }
    );
  }

  const candles = (payload.data as UpstreamHistoryPoint[]).map((point) => ({
    // Backend Europe/Istanbul (UTC+3) saat dilimiyle döndürüyor.
    time: Math.floor(
      new Date(`${point.datetime.replace(" ", "T")}+03:00`).getTime() / 1000
    ),
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
  }));

  return NextResponse.json({ candles });
}
