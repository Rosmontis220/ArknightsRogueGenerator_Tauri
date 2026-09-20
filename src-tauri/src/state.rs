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