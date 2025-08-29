# Script để setup secrets cho Cloudflare Workers
# Chạy script này sau khi đã đăng nhập Cloudflare

Write-Host "=== THIẾT LẬP SECRETS CHO CLOUDFLARE WORKERS ===" -ForegroundColor Green

# Account ID
Write-Host "`n1. Thiết lập CLOUDFLARE_ACCOUNT_ID..." -ForegroundColor Yellow
wrangler secret put CLOUDFLARE_ACCOUNT_ID --local
# Khi được hỏi, nhập: 5e0bcc4a2e645ae7b23150fedc5d8987

Write-Host "`n2. Thiết lập R2_ACCESS_KEY_ID..." -ForegroundColor Yellow  
wrangler secret put R2_ACCESS_KEY_ID --local
# Khi được hỏi, nhập: 454bfb81b0e8eac50bdcb8dc4059a824

Write-Host "`n3. Thiết lập R2_SECRET_ACCESS_KEY..." -ForegroundColor Yellow
wrangler secret put R2_SECRET_ACCESS_KEY --local  
# Khi được hỏi, nhập: 194eda820aca9437249fbc12d23a28f296074c42d326397fb00c765facaf3717

Write-Host "`n=== HOÀN TẤT THIẾT LẬP SECRETS ===" -ForegroundColor Green
Write-Host "Bây giờ bạn có thể deploy worker bằng: npm run deploy" -ForegroundColor Cyan

