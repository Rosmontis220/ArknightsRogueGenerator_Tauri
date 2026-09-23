/**
 * The entries listed on the settings root.
 *
 * Data rather than markup, mirroring the reference client's `settings-entries.ts`: the
 * root renders whatever is here, so adding a section is one entry plus its route. Kept
 * out of the `.svelte` file so the table can be asserted directly — an entry pointing
 * at a route that does not exist is a link that looks fine and 404s.
 *
 * ## Why a root list instead of a tab row
 *
 * The reference client has no `settings/+layout.svelte`: `/home/settings` *is* the
 * navigation, and each section is a page you enter from it. That is what this mirrors.
 * A tab row across the top works for a handful of peer views, but settings sections are
 * destinations rather than siblings — each one is a place you go and come back from —
 * and the row would have to grow a scroll once there are more of them.
 *
 * The way back is the rail's 设置 item, which is always on screen and always means
 * "settings root". The layout adds an explicit back link as well, because a link is
 * cheaper to find than a convention.
 */

import type { IconName } from './icons';

export interface SettingsEntry {
	/** The route slug. Also the `{#each}` key and the tail of `href`. */
	id: string;
	href: string;
	icon: IconName;
	labelKey: string;
	descriptionKey: string;
}

export const SETTINGS_ROOT = '/home/settings';

export const SETTINGS_ENTRIES: readonly SettingsEntry[] = [
	{
		id: 'identity',
		href: `${SETTINGS_ROOT}/identity`,
		icon: 'person',
		labelKey: 'settings.identity.title',
		descriptionKey: 'settings.identity.summary'
	},
	{
		id: 'box',
		href: `${SETTINGS_ROOT}/box`,
		icon: 'inventory',
		labelKey: 'settings.box.title',
		descriptionKey: 'settings.box.summary'
	},
	{
		id: 'appearance',
		href: `${SETTINGS_ROOT}/appearance`,
		icon: 'palette',
		labelKey: 'settings.appearance.title',
		descriptionKey: 'settings.appearance.summary'
	},
	/*
	 * Its own entry rather than a field of 外观. The two are chosen for unrelated
	 * reasons, and while they shared a screen the language could only be found by
	 * someone who had already decided to change the theme — which made the bilingual
	 * interface almost undiscoverable for the readers it exists for.
	 */
	{
		id: 'language',
		href: `${SETTINGS_ROOT}/language`,
		icon: 'globe',
		labelKey: 'settings.language.title',
		descriptionKey: 'settings.language.summary'
	},
	/*
	 * Next to 语言 rather than on 外观. The two are both "how the app presents itself"
	 * preferences, and the volume is read by every sound the app will make — keeping the
	 * sounds themselves behind the palette icon would repeat the mistake that split the
	 * language out of it.
	 */
	{
		id: 'sound',
		href: `${SETTINGS_ROOT}/sound`,
		icon: 'volume',
		labelKey: 'settings.sound.title',
		descriptionKey: 'settings.sound.summary'
	},
	{
		id: 'generators',
		href: `${SETTINGS_ROOT}/generators`,
		icon: 'tune',
		labelKey: 'settings.generators.title',
		descriptionKey: 'settings.generators.summary'
	},
	{
		id: 'data',
		href: `${SETTINGS_ROOT}/data`,
		icon: 'database',
		labelKey: 'settings.data.title',
		descriptionKey: 'settings.data.summary'
	},
	{
		id: 'about',
		href: `${SETTINGS_ROOT}/about`,
		icon: 'info',
		labelKey: 'settings.about.title',
		descriptionKey: 'settings.about.summary'
	}
];
