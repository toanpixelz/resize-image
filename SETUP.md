# Hướng dẫn Setup và Deploy

## 1. Cài đặt dependencies

```bash
npm install
```

## 2. Cài đặt Wrangler CLI

```bash
npm install -g wrangler
```

## 3. Đăng nhập Cloudflare

```bash
wrangler login
```

## 4. Tạo R2 Buckets

Tạo 2 buckets trong Cloudflare Dashboard:
- `source-images` (bucket nguồn)
- `resized-images` (bucket đích)

## 5. Thiết lập Environment Variables

### Tạo R2 API Token:
1. Vào Cloudflare Dashboard > R2 > Manage R2 API tokens
2. Tạo token mới với quyền "Edit" cho cả 2 buckets
3. Lưu lại Access Key ID và Secret Access Key

### Thêm secrets vào Wrangler:

```bash
# Thêm Account ID
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Khi được hỏi, nhập: 5e0bcc4a2e645ae7b23150fedc5d8987

# Thêm R2 Access Key ID  
wrangler secret put R2_ACCESS_KEY_ID
# Khi được hỏi, nhập: 454bfb81b0e8eac50bdcb8dc4059a824

# Thêm R2 Secret Access Key
wrangler secret put R2_SECRET_ACCESS_KEY
# Khi được hỏi, nhập: 194eda820aca9437249fbc12d23a28f296074c42d326397fb00c765facaf3717
```

## 6. Cập nhật wrangler.toml

Đảm bảo `wrangler.toml` có cấu hình đúng bucket names của bạn.

## 7. Deploy và Test (Queue-Free Version)

**Note**: This version doesn't use Cloudflare Queues (requires paid plan). Instead, it provides HTTP endpoints for manual image processing.

## 8. Build và Deploy

```bash
# Build project
npm run build

# Deploy lên Cloudflare Workers
npm run deploy
```

## 9. Kiểm tra

### Manual Image Processing:
1. Upload một file ảnh vào bucket `source-images` (qua Cloudflare Dashboard hoặc API)
2. Gọi API để xử lý ảnh:
```bash
curl -X POST https://your-worker-domain.workers.dev/process-image \
  -H "Content-Type: application/json" \
  -d '{"bucket": "source-images", "key": "your-image.jpg"}'
```
3. Kiểm tra bucket `resized-images` - sẽ có thư mục `thumbnails/` chứa ảnh đã resize
4. Xem logs: `npm run wrangler:tail`

### Health Check:
```bash
curl https://your-worker-domain.workers.dev/health
```

## 10. Development

```bash
# Chạy local development
npm run wrangler:dev

# Xem logs real-time
npm run wrangler:tail
```

## Troubleshooting

### Lỗi credentials:
- Đảm bảo đã set đúng secrets
- Kiểm tra Account ID có đúng không
- Verify R2 API token có quyền truy cập đúng buckets

### Lỗi build:
- Chạy `npm run build` trước khi deploy
- Kiểm tra TypeScript errors

### Lỗi API không hoạt động:
- Kiểm tra worker đã deploy thành công
- Verify endpoint URL đúng
- Kiểm tra R2 credentials và bucket permissions

## Upgrade to Automatic Processing (Paid Plan)

If you want automatic image processing when files are uploaded to R2, you need to upgrade to a Workers Paid plan ($5/month minimum):

1. **Upgrade Plan**: Go to [Cloudflare Dashboard > Workers > Plans](https://dash.cloudflare.com/5e0bcc4a2e645ae7b23150fedc5d8987/workers/plans)

2. **Create Queue**:
```bash
wrangler queues create image-processing-queue
```

3. **Update wrangler.toml**:
```toml
# Add this back to wrangler.toml
[[queues.consumers]]
queue = "image-processing-queue"
max_batch_size = 10
max_batch_timeout = 5
```

4. **Setup R2 Event Notifications**:
   - Go to R2 Dashboard > source-images bucket > Settings
   - Create Event Notification for "Object Create" events
   - Target: image-processing-queue

5. **Add Queue Handler** (create new endpoint in your controller):
```typescript
@Post('queue-handler')
async handleQueueMessages(@Body() messages: any[]) {
  for (const message of messages) {
    const { bucket, key } = message.body;
    await this.imageService.resizeAndUpload(bucket, key);
  }
  return { processed: messages.length };
}
```
