import { NextRequest, NextResponse } from "next/server";

// Anlık fiyat için sunucu tarafı proxy. /api/candles ile aynı mantık:
// CLIENT_API_TOKEN yalnızca burada kullanılır, tarayıcıya hiç gitmez.

interface UpstreamQuote {
  symbol: string;
  price: number;
  providerTimestamp: string;
  receivedAt: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol gerekli." }, { status: 400 });
  }

  const base = process.env.PULSETRADE_API_BASE;
  const token = process.env.PULSETRADE_CLIENT_TOKEN;

  if (!base || !token) {
    return NextResponse.json(
      { error: "PULSETRADE_API_BASE / PULSETRADE_CLIENT_TOKEN tanımlı değil." },
      { status: 503 }
    );
  }

  const upstreamUrl = new URL("/api/v1/quotes", base);
  upstreamUrl.searchParams.set("symbols", symbol);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Railway sunucusuna ulaşılamadı." },
      { status: 502 }
    );
  }

  const payload = await upstreamResponse.json().catch(() => null);

  if (!upstreamResponse.ok || !Array.isArray(payload?.data)) {
    return NextResponse.json(
      { error: payload?.error ?? "Anlık fiyat alınamadı." },
      { status: upstreamResponse.status || 502 }
    );
  }

  const quote = (payload.data as UpstreamQuote[])[0];
  if (!quote) {
    return NextResponse.json({ error: "Bu sembol için veri yok." }, { status: 404 });
  }

  return NextResponse.json({
    price: quote.price,
    time: Math.floor(new Date(quote.providerTimestamp).getTime() / 1000),
  });
}
