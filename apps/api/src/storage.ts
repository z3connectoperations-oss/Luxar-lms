import { AppEnv } from "./types";

export class StorageService {
  constructor(private bucket: R2Bucket) {}

  /**
   * Uploads a file to the R2 bucket.
   * Supports course thumbnails, PDFs, Videos, Certificates, User profile images.
   */
  async uploadFile(key: string, file: File | Blob | ArrayBuffer | ReadableStream, contentType: string): Promise<void> {
    await this.bucket.put(key, file, {
      httpMetadata: { contentType },
    });
  }

  /**
   * Retrieves a file from the R2 bucket.
   */
  async getFile(key: string): Promise<R2ObjectBody | null> {
    return await this.bucket.get(key);
  }

  /**
   * Deletes a file from the R2 bucket.
   */
  async deleteFile(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  /**
   * Generates a public URL if the bucket is configured for public access,
   * or a signed URL mechanism could be implemented here.
   */
  getPublicUrl(customDomain: string, key: string): string {
    return `https://${customDomain}/${key}`;
  }
}

/**
 * Helper to initialize the StorageService from the Hono context bindings.
 */
export function getStorageService(env: AppEnv["Bindings"]) {
  return new StorageService(env.BUCKET);
}
