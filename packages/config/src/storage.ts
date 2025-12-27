import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    // For now, use environment variables for S3 config
    // In production, these should be in config
    this.bucket = process.env.S3_BUCKET || 'aitrainer-datasets';

    const s3Config: {
      region: string;
      credentials: { accessKeyId: string; secretAccessKey: string };
      forcePathStyle: boolean;
      endpoint?: string;
    } = {
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true, // Required for MinIO
    };

    if (process.env.S3_ENDPOINT) {
      s3Config.endpoint = process.env.S3_ENDPOINT;
    }

    this.s3Client = new S3Client(s3Config);
  }

  async uploadFile(key: string, body: Buffer, contentType?: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    return `s3://${this.bucket}/${key}`;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getUploadSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  getStoragePath(
    orgId: string,
    projectId: string,
    datasetId: string,
    versionId: string,
    fileName: string,
  ): string {
    return `orgs/${orgId}/projects/${projectId}/datasets/${datasetId}/versions/${versionId}/${fileName}`;
  }
}
