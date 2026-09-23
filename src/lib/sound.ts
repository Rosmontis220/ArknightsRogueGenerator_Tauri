/**
 * The one place a sound is played.
 *
 * Two things are deliberately kept apart here. Which sound belongs to an event is a pure
 * mapping — {@link TOSS_SOUNDS} — so it can be asserted without a browser, and the playing
 * itself is a thin wrapper over `HTMLAudioElement` that never throws. A sound is decoration
 * on a result that has already been decided, so failing to play one must not be able to take
 * the result down with it.
 *
 * ## Why the volume is a parameter
 *
 * The level lives in the persisted state and this module deliberately does not read the
 * store: staying free of runes is what lets it be exercised in the node test environment,
 * where there is no `Audio` and no document. Callers hand it the current level.
 */

import type { TossVerdict } from './core/tongbao';

/**
 * Every sound the app ships. The value is the file's basename under `/sound/`.
 *
 * Named after the event rather than transliterated from the source files. Those are 普 / 花 /
 * 厉, and only 花 and 厉 are also coin names — 普 is the ordinary case, no two coins alike,
 * which this app calls `fate`. An id that spells the event cannot end up meaning two things
 * once a second sound is added to the same event.
 */
export type SoundName = 'toss-fate' | 'toss-flower' | 'toss-risk';

/** Where the sound files are served from. Absolute, like the coin and card images. */
const SOUND_BASE = '/sound/';

/** The URL of a sound. */
export function soundUrl(name: SoundName): string {
	return `${SOUND_BASE}${name}.mp3`;
}

/**
 * The sound each toss verdict lands on.
 *
 * Total, so a verdict cannot be added without a sound being chosen for it — that record is
 * how the type checker enforces it.
 */
export const TOSS_SOUNDS: Readonly<Record<TossVerdict, SoundName>> = {
	fate: 'toss-fate',
	flower: 'toss-flower',
	risk: 'toss-risk'
};

/**
 * One element per sound, kept between plays.
 *
 * A fresh `Audio` per play would re-request the file and delay the first note, and there are
 * three of them. Built lazily rather than at module load, because this module is also
 * evaluated while prerendering — where there is no media element to build.
 */
const players = new Map<SoundName, HTMLAudioElement>();

/**
 * Plays a sound at `volume`, which is the stored 0–100 rather than a 0–1 gain. Silent at 0.
 *
 * Never throws. The three ways this can fail — no audio support at all (the prerender), a
 * blocked autoplay, a file that will not decode — all end the same way: no sound. None is
 * worth an error the user has to dismiss, because none of them changes what was drawn.
 */
export function playSound(name: SoundName, volume: number): void {
	const gain = Math.min(1, Math.max(0, volume / 100));

	if (gain === 0 || typeof Audio === 'undefined') return;

	try {
		const player = players.get(name) ?? new Audio(soundUrl(name));
		players.set(name, player);
		player.volume = gain;
		// Rewound so a replay starts from the top rather than resuming: the same sound
		// belongs to the same moment every time it is heard.
		player.currentTime = 0;
		void player.play().catch(() => {
			// Blocked or undecodable; see above.
		});
	} catch {
		// No media support, or a volume the element refused.
	}
}
