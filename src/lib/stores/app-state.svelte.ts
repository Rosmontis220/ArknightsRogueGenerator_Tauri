/**
 * The one reactive store for persisted state.
 *
 * A single store rather than one per screen: the document is written as a whole
 * by Rust, so splitting it across stores would only create ways for two screens
 * to save conflicting halves of it.
 *
 * Saves are debounced. Every operator chip on the box screen mutates the same
 * document, and without a debounce the atomic write would run hundreds of times
 * while a user scrolls.
 */

import {
	HISTORY_LIMIT,
	defaultAppState,
	type AppState,
	type HistoryEntry
} from '../api/types';
import { applyColorScheme } from '../appearance';
import { locale } from '../i18n/locale.svelte';
import { describeError, loadState, saveState } from '../persistence';

/** Long enough to coalesce a burst of edits, short enough to survive a close. */
const SAVE_DEBOUNCE_MS = 400;

class AppStateStore {
	/** The persisted document. Mutate it through {@link update}. */
	state = $state<AppState>(defaultAppState());

	/** False until the first read settles; screens wait on this. */
	loaded = $state(false);

	/** Human-readable persistence failure, or `null`. */
	error = $state<string | null>(null);

	/** True while a save is in flight, for the "saving…" hint. */
	saving = $state(false);

	#saveTimer: ReturnType<typeof setTimeout> | undefined;

	/** Reads the stored document and applies its theme. Safe to call twice. */
	async load(): Promise<void> {
		try {
			const stored = await loadState();
			if (stored !== null) {
				this.state = stored;
			}
			this.error = null;
		} catch (cause) {
			// Defaults stay in place; the user is told rather than silently reset.
			this.error = describeError(cause);
		} finally {
			this.loaded = true;
			applyColorScheme(this.state.appearance.colorScheme);
			// Applied here as well as written by the settings screen, for the same reason
			// as the theme: the whole point is that a restart comes back in the right
			// language, and this is the one place that knows the document has arrived.
			locale.set(this.state.language.locale);
		}
	}

	/** Applies a mutation and schedules a save. */
	update(mutate: (state: AppState) => void): void {
		mutate(this.state);
		this.scheduleSave();
	}

	/** Appends a run to the history, trimming to the cap. */
	recordHistory(entry: HistoryEntry): void {
		this.update((state) => {
			state.history.unshift(entry);
			if (state.history.length > HISTORY_LIMIT) {
				state.history.length = HISTORY_LIMIT;
			}
		});
	}

	/** Writes immediately, bypassing the debounce. Awaits the result. */
	async saveNow(): Promise<void> {
		clearTimeout(this.#saveTimer);
		this.#saveTimer = undefined;
		this.saving = true;

		try {
			await saveState($state.snapshot(this.state));
			this.error = null;
		} catch (cause) {
			this.error = describeError(cause);
		} finally {
			this.saving = false;
		}
	}

	scheduleSave(): void {
		clearTimeout(this.#saveTimer);
		this.#saveTimer = setTimeout(() => void this.saveNow(), SAVE_DEBOUNCE_MS);
	}
}

export const appState = new AppStateStore();
