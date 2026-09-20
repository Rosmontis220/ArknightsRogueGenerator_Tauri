/**
 * Icon geometry.
 *
 * ## Why inline paths
 *
 * The icons are Material Symbols, and the reference client loads that font. This is
 * an offline desktop app, so a webfont would be a network dependency that fails
 * *silently* — the text stays, every icon becomes an empty box, and nothing in the
 * build complains. A handful of `<path>` strings costs a few hundred bytes in the
 * bundle and cannot fail to load.
 *
 * ## Shape
 *
 * Every icon is a list of `d` strings drawn as strokes. Dots are zero-length
 * subpaths (`M8.5 8.5h.01`) rather than `<circle>` elements, so an icon is always
 * just data — the renderer has one branch, not four.
 *
 * All geometry is authored for a 24x24 viewBox.
 */

export const ICON_PATHS = {
	/** House. The home route, which sits above 生成 in the rail. */
	home: [
		'M3.8 10.6 12 4.2l8.2 6.4',
		'M6 9.6v9.8a1.2 1.2 0 0 0 1.2 1.2h9.6a1.2 1.2 0 0 0 1.2-1.2V9.6',
		'M9.8 20.6v-5.4h4.4v5.4'
	],

	/** Dice. The generate route, and the opening generator. */
	casino: [
		'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
		'M8.5 8.5h.01',
		'M15.5 8.5h.01',
		'M12 12h.01',
		'M8.5 15.5h.01',
		'M15.5 15.5h.01'
	],

	/** Clock. The history route. */
	history: ['M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z', 'M12 7.6V12l3.2 1.9'],

	/** Gear. The settings route. */
	settings: [
		'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
		'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z'
	],

	/** Trophy. The cup editions. */
	emoji_events: [
		'M8 3.2h8v4.8a4 4 0 0 1-8 0V3.2Z',
		'M8 5H5.6a2.4 2.4 0 0 0 2.5 4.4',
		'M16 5h2.4a2.4 2.4 0 0 1-2.5 4.4',
		'M12 12.2v4.2',
		'M10 16.4h4l.7 3.6H9.3Z'
	],

	/**
	 * A comedy mask. The 老缠杯 editions.
	 *
	 * Deliberately not the trophy the other two cups use: 老缠杯 is an entertainment event
	 * rather than a competitive one, and a trophy would promise the opposite of what it is.
	 * A rounded face with a smile reads as "this one is for fun" at a glance, next to two
	 * trophies it is unmistakable, and it says nothing about how the draw works.
	 */
	theater_comedy: [
		'M5.4 4.6h13.2v6.8a6.6 6.6 0 0 1-13.2 0V4.6Z',
		'M9 8.6h.01',
		'M15 8.6h.01',
		'M9 12.2a3 3 0 0 0 6 0'
	],

	menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],

	check: ['M5 12.5 9.5 17 19 7.5'],

	/** Head and shoulders. The ID entry. */
	person: ['M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z', 'M4.6 20.4a7.4 7.4 0 0 1 14.8 0'],

	/** A lidded crate. The box entry. */
	inventory: [
		'M3.6 7.8h16.8v11.2a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6V7.8Z',
		'M2.6 4.6h18.8v3.2H2.6z',
		'M10 12.6h4'
	],

	/** Painter's palette. The appearance entry. */
	palette: [
		'M12 3.6a8.4 8.4 0 0 0 0 16.8c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6h1.9A4.1 4.1 0 0 0 20.4 11c0-4.1-3.8-7.4-8.4-7.4Z',
		'M7.6 12.4h.01',
		'M9.9 9.1h.01',
		'M14.1 9.1h.01'
	],

	/** Three sliders. The generator-defaults entry. */
	tune: [
		'M4 7h9',
		'M17 7h3',
		'M4 12h3',
		'M11 12h9',
		'M4 17h9',
		'M17 17h3',
		'M14.5 5.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z',
		'M9.5 10.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z',
		'M14.5 15.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z'
	],

	/** Stacked discs. The data entry. */
	database: [
		'M4 6.5c0-1.4 3.6-2.5 8-2.5s8 1.1 8 2.5-3.6 2.5-8 2.5-8-1.1-8-2.5Z',
		'M4 6.5v11c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-11',
		'M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5'
	],

	/** The about entry. */
	info: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z', 'M12 11.2v5', 'M12 7.9h.01'],

	arrow_back: ['M19.5 12h-15', 'M11 18.5 4.5 12 11 5.5'],

	/**
	 * The language entry. A globe — outline, equator, one meridian lens.
	 *
	 * Drawn rather than reusing `palette`: the two settings used to share a screen and a
	 * language hidden behind a palette icon is exactly the discoverability problem that
	 * splitting them apart was meant to fix.
	 */
	globe: [
		'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z',
		'M3.5 12h17',
		'M12 3.5c2.6 2.3 4 5.2 4 8.5s-1.4 6.2-4 8.5c-2.6-2.3-4-5.2-4-8.5s1.4-6.2 4-8.5Z'
	],

	chevron_right: ['M9.5 5.5 16 12l-6.5 6.5']
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICON_PATHS;

/** Every icon name, for the test that checks generators only ask for real ones. */
export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

/** Narrows a plain string — `GeneratorDefinition.icon` is typed as `string`. */
export function isIconName(value: string): value is IconName {
	return Object.hasOwn(ICON_PATHS, value);
}
