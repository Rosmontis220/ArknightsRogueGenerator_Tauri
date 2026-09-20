/**
 * Preparing a user-chosen image to be the splash background.
 *
 * The result is embedded in `state.json` as a data URL, and that document is rewritten
 * in full on every debounced save. So the size of this value is not a cosmetic
 * concern: a modern phone photo is 4-8 MB, and base64 adds a further third, which
 * would mean re-writing roughly 10 MB on every settings change. The file is therefore
 * decoded, scaled down and re-encoded *before* it is allowed anywhere near the state.
 *
 * The scaling and size arithmetic is pure and unit-tested; only `prepareSplashImage`
 * touches a canvas, and it is written so that every failure is a value rather than a
 * throw — the caller has to say something useful, and an exception crossing a file
 * input's change handler says nothing.
 */

/** Longest edge kept, in pixels. A maximised window on a 1080p screen is 1920 wide. */
export const SPLASH_IMAGE_MAX_EDGE = 1920;

/** Long edge of the preview shown on the settings screen. */
export const SPLASH_IMAGE_PREVIEW_EDGE = 320;

/** Refused before decoding: a very large file stalls the webview for seconds. */
export const SPLASH_IMAGE_MAX_SOURCE_BYTES = 12 * 1024 * 1024;

/**
 * Refused after encoding. Sized so that `state.json` stays in the low hundreds of
 * kilobytes even with an image set, since it is written on every save.
 */
export const SPLASH_IMAGE_MAX_RESULT_BYTES = 700 * 1024;

export const SPLASH_IMAGE_QUALITY = 0.85;

export interface ImageFit {
	width: number;
	height: number;
	/** False when the source already fits, in which case nothing is re-encoded. */
	scaled: boolean;
}

/**
 * Scales `width`x`height` down to fit inside a `maxEdge` square, preserving the
 * aspect ratio.
 *
 * Never upscales: blowing a small image up would cost quality and bytes to make it
 * blurrier. Rounds up the shorter edge's minimum to 1, because a canvas of width 0
 * throws.
 */
export function fitWithin(
	width: number,
	height: number,
	maxEdge: number = SPLASH_IMAGE_MAX_EDGE
): ImageFit {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new RangeError(`fitWithin: 尺寸无效 ${width}x${height}`);
	}
	if (!Number.isFinite(maxEdge) || maxEdge < 1) {
		throw new RangeError(`fitWithin: maxEdge 无效 ${maxEdge}`);
	}

	const longest = Math.max(width, height);
	if (longest <= maxEdge) {
		return { width: Math.round(width), height: Math.round(height), scaled: false };
	}

	const ratio = maxEdge / longest;
	return {
		width: Math.max(1, Math.round(width * ratio)),
		height: Math.max(1, Math.round(height * ratio)),
		scaled: true
	};
}

/** Decoded byte length of a data URL's payload. `0` for anything unparsable. */
export function dataUrlBytes(dataUrl: string): number {
	const comma = dataUrl.indexOf(',');
	if (comma < 0) return 0;

	const payload = dataUrl.slice(comma + 1);
	// Base64 carries 3 bytes per 4 characters, less one byte per `=` of padding.
	const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;

	return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

/** Why an image could not be used. The caller maps these to messages. */
export type ImageRejection =
	| 'notAnImage'
	| 'tooLarge'
	| 'tooLargeAfterResize'
	| 'decodeFailed';

export interface PreparedImage {
	dataUrl: string;
	width: number;
	height: number;
	bytes: number;
}

export type PrepareResult = { ok: true; image: PreparedImage } | { ok: false; reason: ImageRejection };

/** How long a decode may take before the pick is called a failure. */
export const SPLASH_IMAGE_DECODE_TIMEOUT_MS = 15000;

/**
 * Resolves once `src` is decoded far enough to draw.
 *
 * `onload`/`onerror` rather than `await image.decode()`. `decode()` is specified to
 * resolve once the image is ready to paint, and it can simply never settle — observed
 * hanging indefinitely under headless Chromium with an object URL. That is not a
 * cosmetic difference: `prepareSplashImage` awaits it, so the settings screen stayed on
 * "正在处理…" for ever, with no error and no way back.
 *
 * The timeout is the second half of the same lesson: nothing here may depend on a
 * promise that a browser is not obliged to settle.
 */
function loadImageElement(
	src: string,
	timeoutMs: number = SPLASH_IMAGE_DECODE_TIMEOUT_MS
): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();

		const timer = setTimeout(() => reject(new Error('image decode timed out')), timeoutMs);

		image.onload = () => {
			clearTimeout(timer);
			resolve(image);
		};
		image.onerror = () => {
			clearTimeout(timer);
			reject(new Error('image could not be decoded'));
		};

		image.src = src;
	});
}

/** Decodes and scales `file` down to something safe to store. */
export async function prepareSplashImage(file: File): Promise<PrepareResult> {
	if (!file.type.startsWith('image/')) {
		return { ok: false, reason: 'notAnImage' };
	}
	if (file.size > SPLASH_IMAGE_MAX_SOURCE_BYTES) {
		return { ok: false, reason: 'tooLarge' };
	}

	// An object URL rather than a data URL: reading a 10 MB file through FileReader
	// builds a second 13 MB string before anything has even been decoded.
	const objectUrl = URL.createObjectURL(file);

	try {
		const source = await loadImageElement(objectUrl);
		const fit = fitWithin(source.naturalWidth, source.naturalHeight);
		const canvas = document.createElement('canvas');
		canvas.width = fit.width;
		canvas.height = fit.height;

		const context = canvas.getContext('2d');
		if (context === null) {
			return { ok: false, reason: 'decodeFailed' };
		}

		// The splash image sits behind a scrim and nothing else, so it does not need an
		// alpha channel; a transparent source is simply flattened.
		context.drawImage(source, 0, 0, fit.width, fit.height);

		let dataUrl = canvas.toDataURL('image/webp', SPLASH_IMAGE_QUALITY);
		if (!dataUrl.startsWith('data:image/webp')) {
			// Per spec an unencodable type silently yields PNG. WebP is smaller and
			// supported by the webview this ships in, but JPEG is the fallback that
			// cannot blow the size budget by surprise.
			dataUrl = canvas.toDataURL('image/jpeg', SPLASH_IMAGE_QUALITY);
		}

		const image: PreparedImage = {
			dataUrl,
			width: fit.width,
			height: fit.height,
			bytes: dataUrlBytes(dataUrl)
		};

		if (image.bytes > SPLASH_IMAGE_MAX_RESULT_BYTES) {
			return { ok: false, reason: 'tooLargeAfterResize' };
		}

		return { ok: true, image };
	} catch {
		// An unsupported, truncated or never-decoding file.
		return { ok: false, reason: 'decodeFailed' };
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
