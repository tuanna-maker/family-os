# Upload FCM V1 lên Expo (chạy 1 lần cho mỗi app). Cần đăng nhập: npx eas whoami
# Tham khảo: https://docs.expo.dev/push-notifications/fcm-credentials/

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$key = Join-Path $root "mobile\stos-20927-firebase-adminsdk-fbsvc-3e1704a013.json"

if (-not (Test-Path $key)) {
  Write-Host "Không tìm thấy FCM key: $key" -ForegroundColor Red
  exit 1
}

foreach ($app in @("family", "guard")) {
  $dir = Join-Path $root "mobile\$app"
  Copy-Item $key (Join-Path $dir "google-service-account.json") -Force
  Write-Host "`n=== $app : chọn trong menu ===" -ForegroundColor Cyan
  Write-Host "  Android -> production -> Google Service Account"
  Write-Host "  -> Manage FCM V1 -> Upload -> Y (file google-service-account.json)`n"
  Push-Location $dir
  npx eas credentials -p android
  Pop-Location
}

Write-Host "`nXong. Kiểm tra: expo.dev -> project -> Credentials -> Android -> FCM v1" -ForegroundColor Green
