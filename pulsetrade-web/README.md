# PulseTrade Web

Next.js + TypeScript ile geliştirilen sembol grafik / teknik analiz ekranı.
Mevcut Railway backend'indeki (`pulsetrade-server`) `/api/v1/history`
endpoint'inden gerçek Twelve Data verisi çeker. Backend'e ulaşılamazsa ya da
`.env.local` ayarlanmadıysa otomatik olarak mock (rastgele üretilmiş) veriye
düşer, böylece geliştirme hiç durmaz.

## Kurulum

Node.js 18+ yüklü bir makinede (Mac gerekmiyor — Windows/Linux'ta da çalışır):

```bash
cp .env.local.example .env.local
# .env.local içine Railway'deki CLIENT_API_TOKEN değerini yapıştır
npm install
npm run dev
```

Sonra tarayıcıda `http://localhost:3000` adresini aç.

`.env.local` doldurulmazsa uygulama otomatik olarak mock veriyle çalışmaya
devam eder — kurulumun ilk adımında bunu atlayabilirsin.

## Yapı

- `app/page.tsx` — ana ekran: sembol seçici, zaman dilimi, chart, gösterge chip'leri
- `components/PriceChart.tsx` — mum grafiği + overlay göstergeler (EMA/MA/Bollinger)
- `components/OscillatorPanel.tsx` — RSI ve MACD alt panelleri
- `lib/indicators.ts` — SMA, EMA, RSI, MACD, Bollinger Bantları hesaplama fonksiyonları
- `lib/mockData.ts` — `fetchCandles`: önce `/api/candles`'ı (gerçek veri) dener,
  başarısız olursa mock veriye düşer
- `app/api/candles/route.ts` — sunucu tarafı proxy; Railway'deki
  `pulsetrade-server`'ın `/api/v1/history` uç noktasını çağırır, CLIENT_API_TOKEN
  yalnızca burada, sunucuda kullanılır — tarayıcıya hiç gönderilmez

## Sırada ne var

1. ~~Twelve Data'ya bağlanmak~~ — tamamlandı, mevcut Railway backend'i üzerinden
2. Canlı fiyat akışı (şu an sadece geçmiş veri çekiliyor; `/api/v1/stream`
   WebSocket'i tarayıcıdan doğrudan çağrılamıyor çünkü auth header gerektiriyor
   — bunun için de bir sunucu tarafı proxy/SSE köprüsü gerekecek)
3. Ekonomik takvim + sinyal mekanizmasının eklenmesi
4. PWA desteği (Mac olmadan iOS'a "uygulama" olarak kurulabilmesi için)
