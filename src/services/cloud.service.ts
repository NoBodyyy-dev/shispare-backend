import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import streamifier from "streamifier";

export type CloudUploadResult = {
    public_id: string;
    version?: number;
    signature?: string;
    width?: number;
    height?: number;
    format?: string;
    resource_type?: string;
    created_at?: string;
    tags?: string[];
    bytes?: number;
    type?: string;
    etag?: string;
    placeholder?: boolean;
    url?: string;
    secure_url?: string;
};

export class CloudService {
    constructor() {
        const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
            throw new Error(
                "Cloudinary environment variables are not set. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET"
            );
        }

        cloudinary.config({
            cloud_name: CLOUDINARY_CLOUD_NAME,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET,
            secure: true,
        });
    }

    /**
     * Upload a buffer (useful with multer.memoryStorage)
     * @param buffer - file buffer
     * @param options - cloudinary upload options (public_id, folder, transformation, etc.)
     */
    public uploadBuffer(
        buffer: Buffer,
        options: Record<string, unknown> = {}
    ): Promise<CloudUploadResult> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                options,
                (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
                    if (error) return reject(new Error(error.message));
                    if (!result) return reject(new Error("Empty upload result from Cloudinary"));
                    resolve(this.mapResult(result));
                }
            );

            streamifier.createReadStream(buffer).pipe(uploadStream);
        });
    }

    /**
     * Upload a local file by path
     */
    public async uploadFromPath(path: string, options: Record<string, unknown> = {}): Promise<CloudUploadResult> {
        const result = (await cloudinary.uploader.upload(path, options)) as UploadApiResponse;
        return this.mapResult(result);
    }

    /**
     * Delete an asset by public_id
     */
    public async deleteByPublicId(publicId: string, options: Record<string, unknown> = {}): Promise<any> {
        return cloudinary.uploader.destroy(publicId, options);
    }

    /**
     * Generate signed params for client-side direct upload (if you want signed uploads)
     * returns { signature, timestamp }
     */
    public generateSignature(paramsToSign: Record<string, unknown> = {}): { timestamp: number; signature: string } {
        const timestamp = Math.round(new Date().getTime() / 1000);
        // cloudinary.utils.api_sign_request expects plain JS object with string/number values
        const toSign: Record<string, unknown> = { ...paramsToSign, timestamp };
        // @ts-ignore - types for api_sign_request are loose
        const signature = cloudinary.utils.api_sign_request(toSign, process.env.CLOUDINARY_API_SECRET as string);
        return { timestamp, signature };
    }

    /**
     * Helper to map UploadApiResponse -> CloudUploadResult
     */
    private mapResult(result: UploadApiResponse): CloudUploadResult {
        return {
            public_id: result.public_id,
            version: result.version,
            signature: result.signature,
            width: result.width,
            height: result.height,
            format: result.format,
            resource_type: result.resource_type,
            created_at: result.created_at,
            tags: result.tags,
            bytes: result.bytes,
            type: result.type,
            etag: result.etag,
            placeholder: result.placeholder,
            url: result.url,
            secure_url: result.secure_url,
        };
    }
}