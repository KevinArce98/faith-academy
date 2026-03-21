import { getCurrentUser } from '@/lib/auth';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: 'Formato de petición inválido' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'Se requiere un archivo' }, { status: 422 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'El archivo excede el tamaño máximo de 10 MB' }, { status: 413 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTS.has(ext)) {
    return Response.json(
      { error: 'Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF' },
      { status: 422 }
    );
  }

  const key = `receipts/${user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  return Response.json({ key });
}
