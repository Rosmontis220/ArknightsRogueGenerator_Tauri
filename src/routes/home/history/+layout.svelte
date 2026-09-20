<script lang="ts">
	/**
	 * 记录 has no sub-pages yet, so this layout only supplies the shared body container.
	 *
	 * It exists so the structure is uniform: every route under `/home` owns a layout
	 * that decides its own navigation and padding, rather than one route's page
	 * quietly relying on the shell to pad it. When the record filters gain their own
	 * sub-pages, the row goes here.
	 */

	let { children } = $props();
</script>

<div class="route-body">
	{@render children()}
</div>
