import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { Readable } from "stream";

export enum CloudFileType {
    PDF = 'application/pdf',
    JPEG = 'image/jpeg',
    PNG = 'image/png'
}

export interface ICloudService {
    uploadFile(filePath: string, folder?: string, fileType?: CloudFileType): Promise<string>;
    uploadBuffer(buffer: Buffer, folder?: string, fileType?: CloudFileType): Promise<string>;
    uploadStream(stream: Readable, folder?: string, fileType?: CloudFileType): Promise<string>;
    getSignedUrl(fileKey: string, expiresIn?: number): Promise<string>;
    deleteFile(fileKey: string): Promise<void>;
}

export class YandexCloudService implements ICloudService {
    private s3: AWS.S3;
    private readonly bucketName: string;

    constructor() {
        this.s3 = new AWS.S3({
            endpoint: process.env.YC_STORAGE_ENDPOINT || 'https://storage.yandexcloud.net',
            region: process.env.YC_REGION || 'ru-central1',
            credentials: {
                accessKeyId: process.env.YC_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.YC_SECRET_ACCESS_KEY || ''
            },
            s3ForcePathStyle: true
        });

        this.bucketName = process.env.YC_BUCKET_NAME || '';

        if (!this.bucketName) {
            throw new Error('YC_BUCKET_NAME is not defined in environment variables');
        }
    }

    private generateFileKey(folder?: string, extension?: string): string {
        const fileName = `${uuidv4()}${extension ? `.${extension}` : ''}`;
        return folder ? `${folder}/${fileName}` : fileName;
    }

    async uploadFile(filePath: string, folder?: string, fileType: CloudFileType = CloudFileType.PDF): Promise<string> {
        const fileContent = fs.readFileSync(filePath);
        const extension = path.extname(filePath).substring(1);
        const key = this.generateFileKey(folder, extension);

        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: fileContent,
            ContentType: fileType
        };

        const result = await this.s3.upload(params).promise();
        return result.Location;
    }

    async uploadBuffer(buffer: Buffer, folder?: string, fileType: CloudFileType = CloudFileType.PDF): Promise<string> {
        const key = this.generateFileKey(folder, fileType.split('/')[1]);

        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: buffer,
            ContentType: fileType
        };

        const result = await this.s3.upload(params).promise();
        return result.Location;
    }

    async uploadStream(stream: Readable, folder?: string, fileType: CloudFileType = CloudFileType.PDF): Promise<string> {
        const key = this.generateFileKey(folder, fileType.split('/')[1]);

        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: stream,
            ContentType: fileType
        };

        const result = await this.s3.upload(params).promise();
        return result.Location;
    }

    async getSignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
        return this.s3.getSignedUrlPromise('getObject', {
            Bucket: this.bucketName,
            Key: fileKey,
            Expires: expiresIn
        });
    }

    async deleteFile(fileKey: string): Promise<void> {
        await this.s3.deleteObject({
            Bucket: this.bucketName,
            Key: fileKey
        }).promise();
    }

    async extractKeyFromUrl(url: string): Promise<string> {
        const baseUrl = `https://${this.bucketName}.storage.yandexcloud.net/`;
        if (url.startsWith(baseUrl)) {
            return url.substring(baseUrl.length);
        }
        throw new Error('Invalid Yandex Cloud Storage URL format');
    }
}