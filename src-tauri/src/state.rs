//! The persisted application state.
//!
//! This mirrors `src/lib/api/types.ts` on the frontend one-for-one, including
//! the camelCase wire names — the frontend writes `schemaVersion`, `colorScheme`
//! and friends, so every struct below opts into `rename_all = "camelCase"`.
//!
//! The Rust side owns exactly one responsibility — storing and returning this
//! document — and deliberately knows nothing about generator rules or the
//! operator dictionary. Every rule about what may be drawn lives in TypeScript.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Bumped whenever the shape below changes in a way older files cannot satisfy.
///
/// Version 2 moved the interface language out of `appearance` into its own
/// `language` section, and gave `identity` a portrait and `box` a second reason to
/// hold an operator back. Version 3 is not a shape change at all: it is the version
/// that started filling in a blank `identity.name`, which `migrate` needs to tell
/// apart from a name the player typed.
pub const SCHEMA_VERSION: u32 = 3;

/// The ID a draw uses when the player has not named one.
///
/// Chinese in every locale rather than a translated "Doctor": the name is the seed's
/// input, so a translated default would make the same date produce different runs
/// depending on the interface language. Stored, not merely displayed, so the ID the
/// export prints is the ID the draw actually used.
pub const DEFAULT_IDENTITY_NAME: &str = "博士";

/// The volume a fresh install starts at.
///
/// Full rather than a cautious fraction: what was asked for is a control to turn the
/// sounds *down*, and a default nobody can hear reads as a broken feature. Mirrored on the
/// TypeScript side as `DEFAULT_SOUND_VOLUME`.
pub const DEFAULT_SOUND_VOLUME: u8 = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityState {
    /// The player name. It is the only source of the generation seed's name part.
    pub name: String,
    /// The operator whose portrait is the profile picture, or `""` for the built-in
    /// mark. A name rather than a path: the portraits ship as files named after the
    /// operator, so the name is already the key.
    #[serde(default)]
    pub avatar: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceState {
    /// One of `rhodes` / `endfield` / `p5` / `p3r`.
    pub color_scheme: String,
    /// `always` / `never` / `system`.
    pub reduce_motion: String,
    /// The splash background as a data URL, or `""` for none.
    ///
    /// `#[serde(default)]` here is load-bearing rather than tidiness. Every document
    /// written before this field existed has no such key, and serde would otherwise
    /// fail the parse — and a failed parse is not an error the caller sees, it is a
    /// quarantine. The user's box, ID and history would silently reset on the first
    /// launch after the upgrade. The empty string means "no image", which is also the
    /// default, so the fallback and a real answer agree.
    #[serde(default)]
    pub splash_image: String,
    /// Show operator portraits instead of names wherever a list of operators appears.
    #[serde(default)]
    pub avatar_mode: bool,
    /// The interface language, as schema version 1 wrote it.
    ///
    /// Read but never written. Version 2 moved the field into its own `language`
    /// section, and [`crate::commands::migrate`] carries the value across. Without
    /// this the key would fall to serde's unknown-field handling, and someone who had
    /// chosen English would come back to a Chinese interface after the upgrade.
    #[serde(default, skip_serializing)]
    pub locale: Option<String>,
}

/// The interface language, as its own section rather than a field of `appearance`.
///
/// Split out because the two are chosen for unrelated reasons, and while they shared a
/// screen the language could only be found by someone already changing the theme.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguageState {
    /// `zh-CN` or `en`.
    ///
    /// Defaulted by name rather than left empty: `""` is not a locale and would render
    /// the whole catalogue as raw keys.
    #[serde(default = "default_locale")]
    pub locale: String,
}

/// The source language, and what a fresh install starts in.
fn default_locale() -> String {
    "zh-CN".to_string()
}

impl Default for LanguageState {
    fn default() -> Self {
        Self {
            locale: default_locale(),
        }
    }
}

/// The master volume for everything the app plays.
///
/// A section of its own rather than a field of `appearance`, mirroring `SoundState` in
/// `src/lib/api/types.ts`: it is a destination in the settings root, and more sounds are
/// planned, so the section is where they will be described.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SoundState {
    /// 0-100. `0` is silence; `100` is the sound file's own level.
    ///
    /// Read through [`de_volume`] rather than as a plain `u8`. A hand-edited `volume` of 300
    /// — or of `-1`, or of `null` — would fail the parse, and a failed parse is not an error
    /// the caller sees: it is a quarantine, and the user's ID, box and history would be gone
    /// over a number nothing reads until a sound plays. This is the one numeric field in the
    /// document a player has any reason to type by hand, so it is the one that tolerates it.
    #[serde(default = "default_sound_volume", deserialize_with = "de_volume")]
    pub volume: u8,
}

/// The named default for [`SoundState::volume`].
///
/// Spelled out rather than left to a bare `#[serde(default)]`, which would reach for
/// `u8::default()` — 0, silence — for a document whose `sound` section exists but has no
/// `volume` key. The whole point of the default is that an app that has never been told a
/// volume plays at full; `{}` and a missing section have to agree on that.
fn default_sound_volume() -> u8 {
    DEFAULT_SOUND_VOLUME
}

/// Reads the volume from any JSON number, clamped into the range the app uses.
///
/// Clamping happens here rather than in `migrate`, because `migrate` only ever sees a
/// document that already parsed — by the time it could repair the value, the quarantine has
/// happened. `null` and a missing key both fall back to [`DEFAULT_SOUND_VOLUME`], and a
/// non-finite number does too: `clamp` passes `NaN` straight through, and `NaN as u8` is 0,
/// which would silently turn a broken file into a muted app.
fn de_volume<'de, D>(deserializer: D) -> Result<u8, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let raw = Option::<f64>::deserialize(deserializer)?;

    Ok(match raw {
        Some(value) if value.is_finite() => value.clamp(0.0, 100.0).round() as u8,
        _ => DEFAULT_SOUND_VOLUME,
    })
}

impl Default for SoundState {
    fn default() -> Self {
        Self {
            volume: DEFAULT_SOUND_VOLUME,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoxState {
    /// Six-star operators that are **not** in the user's box.
    ///
    /// Storing the exclusions rather than the inclusions means an operator added
    /// to the dictionary later is in the box by default, so nobody has to revisit
    /// the box screen after a game update.
    pub excluded: Vec<String>,
    /// Six-star operators the user owns but cannot field yet: imported with an elite
    /// level below 2.
    ///
    /// Kept apart from `excluded` because the fact is different, not because the effect
    /// is — both keep an operator out of the draw, and the frontend applies one
    /// predicate over both. "I do not have this one" and "I have it but it is not
    /// promoted" call for different actions from the user.
    #[serde(default)]
    pub unusable: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommonOptions {
    pub enabled_rogue_ids: Vec<u32>,
    pub is_job_team_only: bool,
    pub is_support_unit_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratorState {
    /// Currently selected generator, e.g. `opening` or `xianshu-8`.
    pub current: String,
    /// Which edition of a multi-edition family is selected, keyed by family id.
    pub current_by_family: BTreeMap<String, String>,
    /// Per-generator option values, keyed by generator id.
    pub options: BTreeMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    /// Unix milliseconds.
    pub at: i64,
    pub generator_id: String,
    pub action_id: String,
    pub identity: String,
    /// The deterministic seed. A full `u32` must survive the JSON round trip, so
    /// this is a `u64` rather than anything floating point.
    pub seed: u64,
    /// Structured result fields; never rendered markup.
    pub fields: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub schema_version: u32,
    pub identity: IdentityState,
    pub appearance: AppearanceState,
    /// `#[serde(default)]` here is load-bearing for the same reason as
    /// `AppearanceState::splash_image`, and more sharply: this section did not exist in
    /// version 1 at all, so *every* previously written document is missing the key.
    /// Without it the parse fails, `read_or_quarantine` reads that as a corrupt file, and
    /// the user's box, ID and history disappear on the first launch after the upgrade.
    /// [`crate::commands::migrate`] then carries the old `appearance.locale` across.
    #[serde(default)]
    pub language: LanguageState,
    /// The master volume. `#[serde(default)]` here is load-bearing for the same reason as
    /// `language`: the section did not exist before this release, so every document written
    /// earlier is missing the key, and a failed parse is a quarantine rather than an error
    /// the caller ever sees.
    ///
    /// No `SCHEMA_VERSION` bump accompanies it. That number marks shapes older files cannot
    /// satisfy, and a section whose default is its own whole answer is one they can —
    /// `AppearanceState::splash_image` was added the same way.
    #[serde(default)]
    pub sound: SoundState,
    /// `box` is a Rust keyword, so the field is named differently here while the
    /// wire name stays `box` for the frontend.
    #[serde(rename = "box")]
    pub box_state: BoxState,
    pub common: CommonOptions,
    pub generators: GeneratorState,
    pub history: Vec<HistoryEntry>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            identity: IdentityState {
                name: DEFAULT_IDENTITY_NAME.to_string(),
                avatar: String::new(),
            },
            appearance: AppearanceState {
                color_scheme: "rhodes".to_string(),
                reduce_motion: "system".to_string(),
                splash_image: String::new(),
                avatar_mode: true,
                locale: None,
            },
            language: LanguageState {
                locale: default_locale(),
            },
            sound: SoundState::default(),
            box_state: BoxState {
                excluded: Vec::new(),
                unusable: Vec::new(),
            },
            common: CommonOptions {
                // Every theme starts checked. Which old ones a given player cares about is
                // not something a fresh install can guess, and a generator that silently
                // never draws 傀影 is worse than a longer list to uncheck.
                enabled_rogue_ids: vec![2, 3, 4, 5, 6, 7],
                is_job_team_only: false,
                is_support_unit_enabled: false,
            },
            generators: GeneratorState {
                current: "opening".to_string(),
                current_by_family: BTreeMap::new(),
                options: BTreeMap::new(),
            },
            history: Vec::new(),
        }
    }
}