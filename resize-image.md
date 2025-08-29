# Bài toán: Xây dựng hệ thống tự động Resize ảnh bằng NestJS và Cloudflare R2

## 1. Mục tiêu

Xây dựng một quy trình tự động, serverless để resize ảnh ngay khi chúng được tải lên. Hệ thống sẽ sử dụng các dịch vụ của Cloudflare (R2, Workers) và framework NestJS để xử lý logic.

## 2. Luồng hoạt động

1. **Input**: Người dùng tải một file ảnh gốc lên một bucket Cloudflare R2 (`source-images`).

2. **Trigger**: Sự kiện "tạo object mới" trên bucket này sẽ tự động kích hoạt một Cloudflare Worker.

3. **Processing**: Cloudflare Worker (chứa ứng dụng NestJS) sẽ thực hiện các việc sau:
   - Tải file ảnh gốc từ bucket `source-images`
   - Sử dụng thư viện `sharp` để thay đổi kích thước ảnh thành thumbnail (ví dụ: 200x200 pixels)

4. **Output**: Worker sau khi xử lý xong sẽ tải file thumbnail đã resize lên một bucket R2 khác (`resized-images`) và lưu vào một thư mục con tên là `thumbnails/`.

> **Lưu ý**: Thay thế bằng link ảnh sơ đồ thực tế nếu có

## 3. Các công nghệ và dịch vụ sử dụng

- **Lưu trữ**: Cloudflare R2 Object Storage
- **Thực thi logic**: Cloudflare Workers
- **Framework**: NestJS (chạy bên trong Worker)
- **Thư viện xử lý ảnh**: `sharp`
- **Tương tác với R2**: `@aws-sdk/client-s3` (do R2 tương thích với S3 API)
- **Triển khai**: Wrangler CLI

## 4. Các bước thực hiện chính

### Bước 1: Cấu hình Cloudflare

#### Tạo Bucket:
- Tạo bucket `source-images` để chứa ảnh gốc
- Tạo bucket `resized-images` để chứa ảnh thumbnail

#### Cấp quyền truy cập công khai (Tùy chọn):
- Cấu hình public access cho bucket `resized-images` để có thể truy cập ảnh thumbnail qua URL

#### Tạo R2 API Token:
- Tạo một API Token với quyền Edit để Worker có thể đọc/ghi trên các bucket R2
- Lưu lại Access Key ID và Secret Access Key

### Bước 2: Xây dựng ứng dụng NestJS

#### Khởi tạo dự án:
- Sử dụng `nest new` để tạo một dự án NestJS mới

#### Cài đặt thư viện:
- `@aws-sdk/client-s3`: Để giao tiếp với R2
- `sharp`: Để resize ảnh
- `@cloudflare/workers-types`: Để có các kiểu dữ liệu cho môi trường Worker

#### Viết Logic Service (ImageService):
- Khởi tạo S3Client với thông tin endpoint và credentials của R2
- Viết hàm `resizeAndUpload(bucket, key)` với các logic:
  - Dùng `GetObjectCommand` để lấy ảnh từ bucket nguồn
  - Dùng `sharp` để xử lý buffer ảnh
  - Dùng `PutObjectCommand` để đẩy ảnh đã resize lên bucket đích

#### Tạo Entry Point cho Worker (main.ts):
- Sửa đổi file `main.ts` để export một đối tượng mặc định
- Triển khai hàm `queue(batch, env, ctx)`:
  - Hàm này sẽ được Cloudflare gọi khi có message từ R2
  - Khởi tạo NestJS ApplicationContext
  - Lấy ImageService từ context
  - Lặp qua các message trong batch và gọi hàm `resizeAndUpload` để xử lý từng ảnh

### Bước 3: Triển khai lên Cloudflare Workers

#### Cài đặt và cấu hình Wrangler:
- Cài đặt Wrangler CLI (`npm install -g wrangler`)
- Đăng nhập vào tài khoản Cloudflare (`wrangler login`)

#### Tạo file cấu hình wrangler.toml:
- Khai báo tên Worker và file entry point (main)
- Liên kết (bind) hai bucket R2 (`source-images` và `resized-images`)
- Cấu hình `[[queues.consumers]]` để Worker lắng nghe sự kiện `object-create` từ bucket `source-images`

#### Thêm Secrets:
- Sử dụng lệnh `wrangler secret put` để lưu trữ an toàn `R2_ACCESS_KEY_ID` và `R2_SECRET_ACCESS_KEY`

#### Build và Deploy:
- Build dự án NestJS (`npm run build`)
- Triển khai Worker lên Cloudflare (`wrangler deploy`)

### Bước 4: Kiểm tra

1. Tải một file ảnh lên bucket `source-images` thông qua giao diện Cloudflare
2. Quan sát bucket `resized-images`. Một thư mục `thumbnails/` sẽ xuất hiện cùng với file ảnh đã được resize bên trong
3. (Tùy chọn) Sử dụng lệnh `wrangler tail` để xem log thực thi của Worker trong thời gian thực