<script lang="ts">
	/**
	 * The settings root: one entry per section, each entering its own page.
	 *
	 * This page used to be a redirect to `/home/settings/identity` with a tab row in the
	 * layout. The reference client does neither — its settings root is a list of entries
	 * with icon, title, description and a chevron — and that fits better here: the
	 * sections are destinations, not siblings you flip between.
	 *
	 * The markup lives in `EntryNav`, shared with the generator selection page, which is
	 * the same screen with different data.
	 */

	import EntryNav from '$lib/components/EntryNav.svelte';
	import { t } from '$lib/i18n';
	import { settingsNavGroups } from '$lib/nav-entries';
</script>

<EntryNav groups={settingsNavGroups()} label={t('nav.settingsSections')} />
