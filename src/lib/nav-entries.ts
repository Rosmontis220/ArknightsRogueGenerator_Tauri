/**
 * The entry lists behind the app's "pick a page" screens.
 *
 * 设置 lands on a list of sections. 生成 lands on one full-width button per mode — and a
 * mode holding several editions (`?f=xianshu`) opens a second list.
 * Centralised rather than written twice in markup for two reasons:
 *
 *   - the lists are the same shape, so they render through one component, and
 *   - the pattern is the app's navigation idiom (a rail item leads to a list, the list
 *     leads to a page). A change to that idiom should be one change.
 *
 * Labels are resolved here rather than inside the component, so both lists are testable
 * without mounting anything — which matters because the failure mode of a list like this
 * is a heading that reads `generator.xianshu6.name`.
 */

import { generatorTabs } from './generators/registry';
import type { IconName } from './icons';
import { t } from './i18n';
import { SETTINGS_ENTRIES } from './settings-entries';

export interface NavEntry {
	/** Stable key for `{#each}`: the generator id, or the settings section slug. */
	id: string;
	href: string;
	icon: IconName;
	label: string;
	description: string;
	/** Trailing note such as 上次使用; `undefined` when there is nothing to say. */
	badge: string | undefined;
}

export interface NavGroup {
	/** Stable key for `{#each}`. */
	id: string;
	/** Rendered as the group's heading; omitted when there is only one group. */
	title?: string;
	entries: readonly NavEntry[];
}

/** The settings root's list: one ungrouped run of every section in `SETTINGS_ENTRIES`. */
export function settingsNavGroups(): NavGroup[] {
	return [
		{
			id: 'settings',
			entries: SETTINGS_ENTRIES.map((entry) => ({
				id: entry.id,
				href: entry.href,
				icon: entry.icon,
				label: t(entry.labelKey),
				description: t(entry.descriptionKey),
				badge: undefined
			}))
		}
	];
}

export const GENERATE_PATH = '/home/generate';

/**
 * The query parameter naming a family whose editions still have to be chosen.
 *
 * Separate from `g` on purpose: `?g=xianshu` would have to mean "not a generator", and
 * every reader of `g` — the page, the tests, a hand-written URL — would then carry a
 * special case for a value the registry does not contain.
 */
export const FAMILY_PARAM = 'f';

/** The canonical URL for one generator. */
export function generatorHref(id: string): string {
	return `${GENERATE_PATH}?g=${encodeURIComponent(id)}`;
}

/** The canonical URL for one family's edition list. */
export function familyHref(family: string): string {
	return `${GENERATE_PATH}?${FAMILY_PARAM}=${encodeURIComponent(family)}`;
}

/** One of the full-width buttons on the generate landing screen. */
export interface FamilyEntry {
	/** Stable key for `{#each}`: the family name, or the generator's id when standalone. */
	key: string;
	label: string;
	/** The sole member's icon; a multi-member family shows its first member's. */
	icon: IconName;
	/** Where the button goes: the generator itself, or the family's edition list. */
	href: string;
	/** How many generators sit behind the button. More than one means `href` is a list. */
	count: number;
}

/**
 * The generate landing screen: one button per mode.
 *
 * The edition list sits *behind* the 仙术杯 button rather than on the landing screen with
 * it. Eleven editions of one cup under a single heading buried the other modes, and the
 * landing screen's job is to ask which mode, not which numbered event.
 *
 * A mode with a single generator has nothing to ask, so its button points straight at the
 * generator and the second step never appears.
 */
export function generatorFamilyEntries(): FamilyEntry[] {
	return generatorTabs().map((tab) => {
		const first = tab.members[0];
		const standalone = tab.members.length === 1 && first !== undefined;

		return {
			key: tab.key,
			label: t(tab.labelKey),
			icon: first?.icon ?? 'casino',
			href: standalone ? generatorHref(first.id) : familyHref(tab.key),
			count: tab.members.length
		};
	});
}

/**
 * One family's display name, or `undefined` when there is no such family.
 *
 * The back link out of a generator needs the mode's name — 仙术杯, not 生成器 — and
 * assembling the key at the call site (`generator.${family}.name`) would go on producing
 * a plausible label after a family is renamed.
 */
export function familyLabel(family: string): string | undefined {
	const tab = generatorTabs().find((candidate) => candidate.key === family);
	return tab === undefined ? undefined : t(tab.labelKey);
}

/**
 * One family's editions, as an `EntryNav` group.
 *
 * `undefined` for a family that does not exist, so a hand-edited `?f=` lands on the
 * landing screen rather than on a blank one.
 *
 * `lastUsedId` earns the stored selection a purpose it did not have behind a tab row:
 * with the tabs, "which generator did I use last" was simply the tab you left open.
 */
export function familyNavGroup(family: string, lastUsedId?: string): NavGroup | undefined {
	const tab = generatorTabs().find((candidate) => candidate.key === family);
	if (tab === undefined) return undefined;

	return {
		id: tab.key,
		title: t(tab.labelKey),
		entries: tab.members.map((member) => ({
			id: member.id,
			href: generatorHref(member.id),
			icon: member.icon,
			label: t(member.nameKey),
			description: t(member.descriptionKey),
			badge: member.id === lastUsedId ? t('generate.lastUsed') : undefined
		}))
	};
}
