import { getCurrentUser } from '@/lib/auth';
import { uploadUrlSchema } from '@/lib/validations/payments';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const EXPIRES_IN = 300; // 5 minutos

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = uploadUrlSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { studentId, ext } = parsed.data;
  const timestamp = Date.now();
  const key = `receipts/${user.id}/${studentId}/${timestamp}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: EXPIRES_IN });

  return Response.json({ uploadUrl, key });
}
