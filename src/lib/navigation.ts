/**
 * The shell's primary navigation.
 *
 * Data rather than markup, for the same reason the generator list is data: the rail
 * renders whatever is here, so adding or reordering a route is one entry. It lives
 * outside the `.svelte` file so this table can be asserted directly — a rail
 * item pointing at a route that does not exist is a link that looks fine and 404s.
 *
 * 首页 sits above 生成 and is the only exact-match item: every other route lives under
 * `/home/`, so the prefix rule below would otherwise mark it current everywhere.
 * Generators are still *not* here — they grow, and the generate route keeps them behind
 * its own selection screen rather than in the shell.
 */

import type { IconName } from './icons';

export interface NavItem {
	/** Stable identity, also the `aria-current` comparison key. */
	id: string;
	href: string;
	icon: IconName;
	/** i18n key; the shell never renders a literal label. */
	labelKey: string;
	/** The digit for `Ctrl+<digit>`. */
	shortcut: string;
	/** True when only an exact pathname match counts. */
	exact?: boolean;
}

export const PRIMARY_NAV: readonly NavItem[] = [
	{
		id: 'home',
		href: '/home',
		icon: 'home',
		labelKey: 'nav.home',
		shortcut: '1',
		exact: true
	},
	{
		id: 'generate',
		href: '/home/generate',
		icon: 'casino',
		labelKey: 'nav.generate',
		shortcut: '2'
	},
	{
		id: 'history',
		href: '/home/history',
		icon: 'history',
		labelKey: 'nav.history',
		shortcut: '3'
	},
	{
		id: 'settings',
		href: '/home/settings',
		icon: 'settings',
		labelKey: 'nav.settings',
		shortcut: '4'
	}
];

/** True when `pathname` is this item's route or a sub-route of it. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
	if (item.exact === true) return pathname === item.href;
	return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
