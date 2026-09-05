import { S3Client } from "@aws-sdk/client-s3";

export function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim()?.replace(/\/+$/, "");

  const isConfigured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
    isConfigured,
  };
}

let clientInstance: S3Client | null = null;

export function getR2Client(): S3Client | null {
  const config = getR2Config();
  if (!config.isConfigured) return null;

  if (!clientInstance) {
    clientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!,
      },
    });
  }

  return clientInstance;
}
