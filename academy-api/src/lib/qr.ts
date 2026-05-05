import { SignJWT, jwtVerify } from 'jose';

function getQRSecret(): Uint8Array {
	const secret = process.env.QR_SECRET;
	if (!secret) throw new Error('QR_SECRET is required');
	return new TextEncoder().encode(secret);
}

export async function generateQRPayload(studentId: string): Promise<string> {
	return new SignJWT({ studentId, v: 2 })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('10m')
		.sign(getQRSecret());
}

export async function verifyQRPayload(
	token: string,
): Promise<{ studentId: string }> {
	const { payload } = await jwtVerify(token, getQRSecret());
	return payload as { studentId: string };
}
