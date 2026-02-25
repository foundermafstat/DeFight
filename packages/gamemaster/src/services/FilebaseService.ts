import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export class FilebaseService {
    private s3Client: S3Client;
    private bucket: string;

    constructor(base64ApiKey?: string) {
        const apiKey = base64ApiKey || process.env.IPFS_API_KEY;
        if (!apiKey) {
            throw new Error("Missing IPFS_API_KEY environment variable. Format: base64(ACCESS_KEY:SECRET_KEY:BUCKET)");
        }

        const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
        const [accessKeyId, secretAccessKey, bucketName] = decoded.split(':');

        if (!accessKeyId || !secretAccessKey || !bucketName) {
            throw new Error("Invalid IPFS_API_KEY format. Decoded value must be ACCESS_KEY:SECRET_KEY:BUCKET");
        }

        this.bucket = bucketName;
        this.s3Client = new S3Client({
            endpoint: "https://s3.filebase.com",
            region: "us-east-1",
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });
    }

    /**
     * Uploads a JSON metadata object to Filebase and automatically pins it to IPFS.
     * @param metadata The JSON object containing NFT metadata (e.g. name, generation, properties)
     * @returns The resulting CID and IPFS URI
     */
    public async uploadMetadata(metadata: any): Promise<{ cid: string; uri: string }> {
        const key = `defight-bot-metadata-${uuidv4()}.json`;
        const body = JSON.stringify(metadata, null, 2);

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: "application/json"
        });

        const response = await this.s3Client.send(command);

        // Filebase returns the IPFS CID in the x-amz-meta-cid header
        const resMetadata = response.$metadata as any;
        const cid = resMetadata.httpHeaders?.['x-amz-meta-cid'];

        if (!cid) {
            // In case the header is missing, we could construct it or fallback, but Filebase S3 API always includes it.
            console.warn("Missing x-amz-meta-cid header from Filebase response");
            return { cid: "unknown", uri: `https://${this.bucket}.s3.filebase.com/${key}` };
        }

        return {
            cid,
            uri: `ipfs://${cid}`
        };
    }
}
