/**
 * Operator portraits.
 *
 * All 137 six-star portraits ship as files in `static/avatars/`, each named after the
 * operator's *game id* (`char_293_thorns.png`) rather than after their Chinese name.
 *
 * The id is what makes the file safe to serve. A static file's name is also its URL, and a
 * URL with Chinese in it has to survive URL-encoding, the bundler's asset rewriting and the
 * filesystem at once — while `char_293_thorns` is already `[a-z0-9_]` and needs nothing
 * from any of them. The conversion is one line in `scripts/convert-operators.mjs`'s
 * tradition of not inventing a second name for things.
 *
 * The name -> file mapping is derived from `operators.json` here rather than stored
 * alongside it, for the same reason `Operator` is derived from that JSON: a second copy of
 * the mapping is a second thing that can drift out of step with the first.
 */

import { OPERATORS } from './operators';

/** Where the portraits are served from. Absolute: `static/` lands at the bundle's root. */
const AVATAR_BASE = '/avatars/';

/**
 * The URL of an operator's portrait.
 *
 * Returns `null` — not a placeholder path — when the dictionary has no portrait for that
 * name. The caller's job is then to draw the name, which is a better screen than a broken
 * image, and `null` is what makes that the caller's explicit decision rather than something
 * discovered from an `onerror` handler.
 */
export function operatorAvatarUrl(name: string): string | null {
	const operator = OPERATORS[name];
	return operator === undefined ? null : `${AVATAR_BASE}${operator.id}.png`;
}

/** Whether an operator has a portrait, for the picker that only lists those that do. */
export function hasAvatar(name: string): boolean {
	return OPERATORS[name] !== undefined;
}
