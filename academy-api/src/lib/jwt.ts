import { SignJWT, jwtVerify } from 'jose';

export type JwtPayload = {
	sub: string;
	email: string;
	role: string;
};

function getSecret(): Uint8Array {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error('JWT_SECRET is required');
	return new TextEncoder().encode(secret);
}

// Access token de vida corta: se renueva vía el refresh token (cookie httpOnly).
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';

export async function signAccessToken(payload: JwtPayload): Promise<string> {
	return new SignJWT({ email: payload.email, role: payload.role })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(payload.sub)
		.setIssuedAt()
		.setExpirationTime(ACCESS_TTL)
		.sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
	const { payload } = await jwtVerify(token, getSecret(), {
		algorithms: ['HS256'],
	});
	return {
		sub: payload.sub as string,
		email: payload['email'] as string,
		role: payload['role'] as string,
	};
}
