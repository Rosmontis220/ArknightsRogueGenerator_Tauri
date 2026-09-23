/**
 * Clipboard access.
 *
 * `navigator.clipboard` rejects rather than throwing synchronously, and it is denied
 * outright in some webview configurations. Every caller here has the text on screen
 * already, so a failure is not worth an error banner — but it does have to be
 * *reported*, otherwise the UI flashes "已复制" for a copy that never happened.
 */

/** Writes `text` to the clipboard. Resolves to whether it actually worked. */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
