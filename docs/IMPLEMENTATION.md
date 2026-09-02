# Change: Taskora Studio

## Problem
Repo, video üretimiyle ilgisiz bir görev uygulaması içeriyordu.

## Desired behavior
Kullanıcı Türkçe bir panelden MoneyPrinterTurbo video işi oluşturabilmeli, proje durumunu görebilmeli ve arayüz motor yokken demo modunda incelenebilmelidir.

## Acceptance criteria
- [x] Mobil uyumlu üretim paneli
- [x] Konu, senaryo, format, kaynak, dil, ses ve altyazı ayarları
- [x] MoneyPrinterTurbo API iş oluşturma çağrısı
- [x] Bağlantı hatasının görünür durumu
- [x] Docker üretim imajı ve healthcheck
- [x] Hiçbir API anahtarının istemciye yazılmaması

## Risks and rollback
API rotası veya şeması yeni MoneyPrinterTurbo sürümlerinde değişebilir. Önceki Taskora sürümüne Git geçmişinden dönülebilir.

## Verification
`npm run typecheck`, `npm run build`, Docker yapılandırma incelemesi ve tarayıcı smoke testi.
