<script lang="ts">
	import { onMount } from 'svelte';

	import { goto } from '$app/navigation';

	import { t } from '$lib/i18n';

	// The splash lives at `/splash`. This route exists only because a
	// static build needs something at the root; it forwards immediately.
	onMount(() => void goto('/splash', { replaceState: true }));
</script>

<!-- This route is a redirect and shows one line for a frame, but it is the first
     thing painted, so it carries the same safe-area padding as every other screen. -->
<main class="safe-area flex h-dvh items-center justify-center">
	<p class="dim text-sm">{t('app.starting')}</p>
</main>
