import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// Tauri drives this dev server, so it must always land on the port that
// `tauri.conf.json` declares as `devUrl`; a silent fallback to another port
// would leave the native shell pointing at nothing.
const DEV_PORT = 1420;

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	clearScreen: false,
	server: {
		port: DEV_PORT,
		strictPort: true,
		host: false,
		watch: {
			// Rust and Android sources are rebuilt by their own toolchains.
			ignored: ['**/src-tauri/**', '**/gen/**']
		}
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
