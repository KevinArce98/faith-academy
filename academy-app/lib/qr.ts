import { SignJWT, jwtVerify } from 'jose'

const QR_SECRET = new TextEncoder().encode(process.env.QR_SECRET!)

// Payload simplificado: solo studentId
// Ya no necesita studioId porque no hay multi-tenant
export async function generateQRPayload(studentId: string): Promise<string> {
  return new SignJWT({ studentId, v: 2 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(QR_SECRET)
}

export async function verifyQRPayload(token: string): Promise<{ studentId: string }> {
  const { payload } = await jwtVerify(token, QR_SECRET)
  return payload as { studentId: string }
}
