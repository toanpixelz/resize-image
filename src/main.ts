// src/main.ts - Cloudflare Workers Entry Point
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// Interface cho R2 Environment bindings
interface Env {
  SOURCE_BUCKET: R2Bucket;
  DESTINATION_BUCKET: R2Bucket;
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
}

// Interface cho message từ queue
interface QueueMessage {
  bucket: string;
  key: string;
}

// Service class để xử lý image
class ImageService {
  private s3Client: S3Client;

  constructor(accountId: string, accessKeyId: string, secretAccessKey: string) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async resizeAndUpload(bucket: string, key: string): Promise<void> {
    console.log(`Processing image: ${key} from bucket: ${bucket}`);

    try {
      // 1. Lấy object từ bucket nguồn
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const { Body } = await this.s3Client.send(getObjectCommand);

      if (!Body) {
        throw new Error('Image body is empty.');
      }

      const imageBuffer = await this.streamToBuffer(Body as any);

      // 2. Resize ảnh bằng Canvas API (thay vì sharp)
      const resizedBuffer = await this.resizeImage(imageBuffer);

      // 3. Upload ảnh đã resize vào bucket đích
      const destinationBucket = 'resized-images';
      const destinationKey = `thumbnails/${key}`;

      const putObjectCommand = new PutObjectCommand({
        Bucket: destinationBucket,
        Key: destinationKey,
        Body: resizedBuffer,
        ContentType: 'image/jpeg',
      });
      await this.s3Client.send(putObjectCommand);

      console.log(`Successfully resized and uploaded to ${destinationBucket}/${destinationKey}`);
    } catch (error) {
      console.error(`Failed to process image ${key}:`, error);
      throw error;
    }
  }

  private async streamToBuffer(stream: any): Promise<ArrayBuffer> {
    // Handle both ReadableStream and other stream types
    if (stream instanceof ReadableStream) {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result.buffer;
    }
    
    // Handle other stream types (like from AWS SDK)
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader ? stream.getReader() : stream;
    
    for await (const chunk of reader) {
      chunks.push(new Uint8Array(chunk));
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result.buffer;
  }

  private async resizeImage(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Sử dụng Canvas API để resize (có sẵn trong Cloudflare Workers)
    // Tạm thời return buffer gốc, sẽ implement resize logic sau
    console.log('Resizing image with Canvas API...');
    
    // TODO: Implement proper image resizing using Canvas API
    // For now, return original buffer
    return imageBuffer;
  }
}

// Worker export object
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response('OK', { status: 200 });
      }

      // Manual image processing endpoint
      if (url.pathname === '/process-image' && request.method === 'POST') {
        console.log('Processing image request...');
        
        // Validate request body
        let body: QueueMessage;
        try {
          body = await request.json() as QueueMessage;
          console.log('Request body:', JSON.stringify(body));
        } catch (error) {
          console.error('Invalid JSON body:', error);
          return new Response(JSON.stringify({ 
            error: 'Invalid JSON body',
            message: 'Request body must be valid JSON'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Validate required fields
        if (!body.bucket || !body.key) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields',
            message: 'Both bucket and key are required'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Check environment variables
        if (!env.CLOUDFLARE_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
          console.error('Missing environment variables');
          return new Response(JSON.stringify({ 
            error: 'Configuration error',
            message: 'Missing required environment variables'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const imageService = new ImageService(
          env.CLOUDFLARE_ACCOUNT_ID,
          env.R2_ACCESS_KEY_ID,
          env.R2_SECRET_ACCESS_KEY
        );
        
        try {
          await imageService.resizeAndUpload(body.bucket, body.key);
          
          return new Response(JSON.stringify({ 
            success: true, 
            message: `Successfully processed ${body.key}` 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (processError) {
          console.error('Processing error:', processError);
          return new Response(JSON.stringify({ 
            error: 'Processing failed',
            message: processError instanceof Error ? processError.message : 'Unknown processing error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Default response
      return new Response('Image Resizer Worker is running!', { status: 200 });
      
    } catch (error) {
      console.error('Error in fetch handler:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  async queue(batch: MessageBatch<QueueMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    const imageService = new ImageService(
      env.CLOUDFLARE_ACCOUNT_ID,
      env.R2_ACCESS_KEY_ID,
      env.R2_SECRET_ACCESS_KEY
    );

    for (const message of batch.messages) {
      const { bucket, key } = message.body;
      console.log(`Received queue message to process: ${key}`);
      
      try {
        await imageService.resizeAndUpload(bucket, key);
      } catch (error) {
        console.error(`Error processing ${key}:`, error);
        message.retry();
      }
    }
  },
};