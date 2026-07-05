import { S3Client } from '@aws-sdk/client-s3';

let _r2: S3Client | null = null;
export function getR2(): S3Client {
	if (_r2) return _r2;
	_r2 = new S3Client({
		region: 'auto',
		endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
		credentials: {
			accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? '',
			secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? '',
		},
	});
	return _r2;
}

export const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME ?? '';
export const R2_UPLOAD_EXPIRES_IN = 300;
