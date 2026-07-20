const IMAGE_SIGNATURES = {
	jpg: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
	jpeg: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
	png: (b: Uint8Array) =>
		b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
		b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
	webp: (b: Uint8Array) =>
		String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
		String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
};

export function detectedUploadType(
	bytes: Uint8Array,
	allowed: ReadonlySet<string>,
): { ext: string; contentType: string } | null {
	for (const [ext, matches] of Object.entries(IMAGE_SIGNATURES)) {
		if (allowed.has(ext) && matches(bytes)) {
			return { ext: ext === 'jpeg' ? 'jpg' : ext, contentType: `image/${ext}` };
		}
	}
	if (allowed.has('pdf') && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-') {
		return { ext: 'pdf', contentType: 'application/pdf' };
	}
	return null;
}
