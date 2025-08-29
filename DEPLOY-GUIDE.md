# 🚀 Hướng dẫn Deploy Image Resizer lên Cloudflare Workers

## 📋 Các bước thực hiện

### Bước 1: Đăng nhập Cloudflare
```bash
# Thử đăng nhập bằng browser
wrangler login

# Nếu không được, dùng API token:
# 1. Truy cập: https://dash.cloudflare.com/profile/api-tokens
# 2. Tạo token với quyền "Edit Cloudflare Workers"
# 3. Set environment variable:
$env:CLOUDFLARE_API_TOKEN="your_api_token_here"
```

### Bước 2: Tạo R2 Buckets
1. Truy cập [Cloudflare Dashboard > R2](https://dash.cloudflare.com/5e0bcc4a2e645ae7b23150fedc5d8987/r2)
2. Tạo bucket `source-images` (bucket nguồn)
3. Tạo bucket `resized-images` (bucket đích)

### Bước 3: Thiết lập Secrets
```bash
# Chạy script setup
.\setup-secrets.ps1

# Hoặc thủ công:
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Nhập: 5e0bcc4a2e645ae7b23150fedc5d8987

wrangler secret put R2_ACCESS_KEY_ID  
# Nhập: 454bfb81b0e8eac50bdcb8dc4059a824

wrangler secret put R2_SECRET_ACCESS_KEY
# Nhập: 194eda820aca9437249fbc12d23a28f296074c42d326397fb00c765facaf3717
```

### Bước 4: Deploy Worker
```bash
npm run deploy
```

### Bước 5: Kiểm tra Deployment
```bash
# Health check
curl https://image-resizer-worker.your-subdomain.workers.dev/health

# Test xử lý ảnh (sau khi upload ảnh vào source-images bucket)
curl -X POST https://image-resizer-worker.your-subdomain.workers.dev/process-image \
  -H "Content-Type: application/json" \
  -d '{"bucket": "source-images", "key": "test-image.jpg"}'
```

## 🔧 Cấu trúc Worker

### Endpoints có sẵn:
- `GET /health` - Health check
- `POST /process-image` - Xử lý ảnh thủ công
  ```json
  {
    "bucket": "source-images", 
    "key": "image-name.jpg"
  }
  ```

### R2 Buckets:
- `source-images` - Bucket chứa ảnh gốc
- `resized-images` - Bucket chứa ảnh đã resize (trong folder `thumbnails/`)

## 📝 Lưu ý quan trọng

1. **Free Plan**: Worker hiện tại chỉ hỗ trợ xử lý thủ công qua API endpoint
2. **Paid Plan**: Để có tự động xử lý khi upload ảnh, cần upgrade lên Workers Paid ($5/tháng)
3. **Image Resizing**: Hiện tại chưa implement logic resize thực tế, cần thêm Canvas API hoặc library khác

## 🛠️ Troubleshooting

### Lỗi authentication:
```bash
wrangler whoami  # Kiểm tra login status
```

### Lỗi build:
```bash
npm run build  # Kiểm tra TypeScript errors
```

### Lỗi deploy:
```bash
wrangler tail  # Xem logs real-time
```

### Lỗi R2 access:
- Kiểm tra bucket names trong `wrangler.toml`
- Verify R2 API credentials
- Đảm bảo Account ID đúng

## 🔄 Development Workflow

```bash
# Development local
npm run start

# Xem logs
npm run wrangler:tail

# Deploy production  
npm run deploy
```

