# Taskora Studio

MoneyPrinterTurbo motoruna bağlanan, Türkçe öncelikli yapay zekâ video üretim paneli. Konu, senaryo, format, dil, ses ve materyal kaynağını tek akışta seçerek API üzerinden video işi başlatır.

## Hızlı başlangıç

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_MPT_API_URL` değerini çalışan MoneyPrinterTurbo API adresine ayarlayın (varsayılan motor portu `8080`). Değer boş bırakılırsa arayüz demo modunda çalışır.

## Üretim derlemesi

```bash
npm run typecheck
npm run build
docker build --build-arg VITE_MPT_API_URL=http://host.docker.internal:8080 -t taskora-studio .
docker run --rm -p 3000:80 taskora-studio
```

## Mimari

- React + TypeScript + Vite istemci
- MoneyPrinterTurbo `/api/v1/videos` iş oluşturma entegrasyonu
- Nginx tabanlı üretim konteyneri ve healthcheck
- API anahtarları bu istemcide tutulmaz; anahtarlar MoneyPrinterTurbo sunucusunda yönetilmelidir

## Güvenlik notu

MoneyPrinterTurbo API’sini doğrudan internete açmayın. Taskora ile motoru aynı özel ağda çalıştırın, dış erişime kimlik doğrulama ve hız sınırı ekleyin. `.env` dosyalarını repoya göndermeyin.

## Kaynak motor

Video üretim motoru: [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) (MIT). Taskora Studio motor kodunu kopyalamaz; HTTP API üzerinden bağlanır.
