import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, getR2Config } from "./r2";
import { promises as fs } from "node:fs";
import { join } from "node:path";

export type UploadOptions = {
  file: File | Buffer;
  filename: string;
  contentType: string;
  folder?: "company" | "products" | "general";
};

export type UploadResult = {
  url: string;
  key: string;
};

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-");
}

export async function uploadToStorage({
  file,
  filename,
  contentType,
  folder = "general",
}: UploadOptions): Promise<UploadResult> {
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const safeName = sanitizeFilename(filename);
  const ext = safeName.includes(".") ? safeName.split(".").pop()! : "bin";
  const baseName = safeName.includes(".") ? safeName.substring(0, safeName.lastIndexOf(".")) : safeName;
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const filenameWithSuffix = `${baseName}-${uniqueSuffix}.${ext}`;
  const key = `${folder}/${filenameWithSuffix}`;

  const r2Client = getR2Client();
  const config = getR2Config();

  if (r2Client && config.bucketName) {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const url = config.publicUrl ? `${config.publicUrl}/${key}` : `/api/media/${key}`;
    return { url, key };
  }

  // Graceful local disk fallback for environments without R2 credentials configured
  const localDir = join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(localDir, { recursive: true });
  const localFilePath = join(localDir, filenameWithSuffix);
  await fs.writeFile(localFilePath, buffer);

  const localRelative = `/uploads/${folder}/${filenameWithSuffix}`;
  return { url: localRelative, key };
}

export async function deleteFromStorage(key: string): Promise<void> {
  if (!key) return;

  const r2Client = getR2Client();
  const config = getR2Config();

  if (r2Client && config.bucketName) {
    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        })
      );
    } catch {
      // Ignore deletion errors for non-existent objects
    }
    return;
  }

  const localPath = join(process.cwd(), "public", "uploads", key);
  try {
    await fs.unlink(localPath);
  } catch {
    // Ignore if not present
  }
}

export async function getFromStorage(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!key) return null;

  const r2Client = getR2Client();
  const config = getR2Config();

  if (r2Client && config.bucketName) {
    try {
      const response = await r2Client.send(
        new GetObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        })
      );

      if (!response.Body) return null;
      const bytes = await response.Body.transformToByteArray();
      return {
        buffer: Buffer.from(bytes),
        contentType: response.ContentType || "application/octet-stream",
      };
    } catch {
      return null;
    }
  }

  const localPath = join(process.cwd(), "public", "uploads", key);
  try {
    const buffer = await fs.readFile(localPath);
    const ext = key.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      svg: "image/svg+xml",
    };
    return { buffer, contentType: (ext && mimeMap[ext]) || "application/octet-stream" };
  } catch {
    return null;
  }
}
