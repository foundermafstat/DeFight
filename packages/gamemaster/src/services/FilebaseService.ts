import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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
	 * After uploading, performs a HeadObject request to retrieve the CID from Metadata.
	 */
	public async uploadMetadata(metadata: any): Promise<{ cid: string; uri: string; }> {
		const key = `defight-bot-metadata-${uuidv4()}.json`;
		const body = JSON.stringify(metadata, null, 2);

		// 1. Upload the file
		const putCommand = new PutObjectCommand({
			Bucket: this.bucket,
			Key: key,
			Body: body,
			ContentType: "application/json"
		});
		await this.s3Client.send(putCommand);

		// 2. HeadObject to get the CID from Filebase metadata
		// Filebase stores the CID in the object's metadata after pinning
		let cid: string | null = null;
		try {
			// Short delay to let Filebase pin the content
			await new Promise(r => setTimeout(r, 1500));

			const headCommand = new HeadObjectCommand({
				Bucket: this.bucket,
				Key: key,
			});
			const headResponse = await this.s3Client.send(headCommand);

			// Filebase puts CID in the Metadata map under 'cid' key
			cid = headResponse.Metadata?.['cid'] || null;
			console.log(`[FilebaseService] HeadObject metadata:`, headResponse.Metadata);
		} catch (e) {
			console.warn("[FilebaseService] HeadObject failed:", e);
		}

		if (!cid) {
			console.warn("[FilebaseService] Could not retrieve CID. Using bucket gateway URL.");
			return {
				cid: key,
				uri: `https://${this.bucket}.s3.filebase.com/${key}`
			};
		}

		console.log(`[FilebaseService] Pinned to IPFS: ${cid}`);
		return {
			cid,
			uri: `https://ipfs.filebase.io/ipfs/${cid}`
		};
	}

	/**
	 * Uploads an image buffer (PNG/SVG) to Filebase and pins it to IPFS.
	 */
	public async uploadImage(buffer: Buffer, filename: string): Promise<{ cid: string; uri: string; }> {
		const contentType = filename.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

		const putCommand = new PutObjectCommand({
			Bucket: this.bucket,
			Key: filename,
			Body: buffer,
			ContentType: contentType,
		});
		await this.s3Client.send(putCommand);

		let cid: string | null = null;
		try {
			await new Promise(r => setTimeout(r, 1500));
			const headCommand = new HeadObjectCommand({
				Bucket: this.bucket,
				Key: filename,
			});
			const headResponse = await this.s3Client.send(headCommand);
			cid = headResponse.Metadata?.['cid'] || null;
			console.log(`[FilebaseService] Image pinned, CID:`, cid);
		} catch (e) {
			console.warn("[FilebaseService] HeadObject for image failed:", e);
		}

		if (!cid) {
			return {
				cid: filename,
				uri: `https://${this.bucket}.s3.filebase.com/${filename}`
			};
		}

		return {
			cid,
			uri: `https://ipfs.filebase.io/ipfs/${cid}`
		};
	}
}
