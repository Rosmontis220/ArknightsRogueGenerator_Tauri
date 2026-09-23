//! Persistence commands for [`AppState`].
//!
//! The state lives in one JSON document under the app data directory. Two
//! properties matter and are both covered by tests:
//!
//! * **Atomic writes.** A crash mid-write must never leave a truncated file, so
//!   every save goes to a temporary sibling and is then renamed over the target.
//! * **Recoverable reads.** A missing or unparsable file is not an error the
//!   user should have to think about: the caller gets `None` (and therefore
//!   defaults) and the unreadable file is preserved as `.bak` for inspection.

use crate::state::{AppState, DEFAULT_IDENTITY_NAME, SCHEMA_VERSION};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const STATE_FILE: &str = "state.json";

/// Resolves the state file path, creating the app data directory if needed.
fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位应用数据目录：{error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("无法创建应用数据目录：{error}"))?;
    Ok(dir.join(STATE_FILE))
}

/// Moves an unreadable state file aside so the next save starts from a clean
/// slate without destroying whatever the user had.
fn quarantine(path: &Path) {
    let backup = path.with_extension("json.bak");
    // A previous backup is stale by definition; replacing it keeps exactly one
    // copy of the last broken file around.
    let _ = fs::remove_file(&backup);
    let _ = fs::rename(path, backup);
}

/// Reads and parses `path`, setting a corrupt file aside instead of failing.
///
/// Split out from the command so the two behaviours the module doc claims —
/// quarantine on bad content, hard error on bad access — are testable without an
/// `AppHandle`, which cannot be constructed outside a running app.
fn read_or_quarantine(path: &Path) -> Result<Option<AppState>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let raw = match fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(error) => {
            // Unreadable for reasons other than content (permissions, locks).
            // Do not quarantine: the file may be fine once the lock clears.
            return Err(format!("读取设置文件失败：{error}"));
        }
    };

    match serde_json::from_str::<AppState>(&raw) {
        Ok(state) => Ok(Some(migrate(state))),
        Err(_) => {
            quarantine(path);
            Ok(None)
        }
    }
}

/// Reads the stored state, or `None` when there is nothing usable to read.
#[tauri::command]
pub fn load_state(app: AppHandle) -> Result<Option<AppState>, String> {
    read_or_quarantine(&state_path(&app)?)
}

/// Brings an older document up to the current schema.
///
/// Version 1 → 2: the interface language used to live under `appearance`, and moving it
/// into its own section would otherwise drop the choice and reset anyone who had picked
/// English back to Chinese. `AppearanceState::locale` is still deserialised for exactly
/// that reason, and is never written again.
///
/// Version 2 → 3: a blank ID becomes [`DEFAULT_IDENTITY_NAME`]. Blank was never a name the
/// player chose — it is what the document has always defaulted to — but it was still a
/// valid seed input, so an unnamed player was drawing runs under a hash of the empty
/// string. Filling it in makes the stored ID the one the settings screen shows, the one the
/// draw uses and the one the export prints, instead of three things that disagree.
///
/// Filling only a *blank* name is what makes this safe to run on a document that simply
/// predates the schema bump: anyone who did type an ID keeps it, and keeps every run their
/// history was drawn from. The step is idempotent, which matters because `migrate` repairs
/// the value in memory — a document that is never saved is migrated again next launch.
///
/// Everything else added after version 1 has `#[serde(default)]`, so an older document loads
/// with the new fields at their defaults and needs no help here.
fn migrate(mut state: AppState) -> AppState {
    if state.schema_version < 2 {
        if let Some(legacy_locale) = state.appearance.locale.take() {
            state.language.locale = legacy_locale;
        }
    }

    if state.schema_version < 3 && state.identity.name.trim().is_empty() {
        state.identity.name = DEFAULT_IDENTITY_NAME.to_string();
    }

    state.schema_version = SCHEMA_VERSION;
    state
}

/// Writes `payload` to `path` atomically: temp file first, then rename over it.
///
/// Split out from the command for the same reason as [`read_or_quarantine`].
fn write_atomic(path: &Path, payload: &[u8]) -> Result<(), String> {
    let temp = path.with_extension("json.tmp");

    {
        let mut file =
            fs::File::create(&temp).map_err(|error| format!("创建临时文件失败：{error}"))?;
        file.write_all(payload)
            .map_err(|error| format!("写入临时文件失败：{error}"))?;
        // Flush to disk before the rename so a power loss cannot surface an
        // empty file under the real name.
        file.sync_all()
            .map_err(|error| format!("同步临时文件失败：{error}"))?;
    }

    fs::rename(&temp, path).map_err(|error| format!("替换设置文件失败：{error}"))?;
    Ok(())
}

/// Writes the state atomically: temp file first, then rename over the target.
#[tauri::command]
pub fn save_state(app: AppHandle, state: AppState) -> Result<(), String> {
    let path = state_path(&app)?;
    let payload =
        serde_json::to_vec_pretty(&state).map_err(|error| format!("序列化设置失败：{error}"))?;

    write_atomic(&path, &payload)
}

/// Absolute path of the state file. The data screen shows it so the user can
/// back the file up by hand.
#[tauri::command]
pub fn state_file_path(app: AppHandle) -> Result<String, String> {
    Ok(state_path(&app)?.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::AppState;

    fn round_trip(state: &AppState) -> AppState {
        let raw = serde_json::to_vec_pretty(state).unwrap();
        serde_json::from_slice::<AppState>(&raw).unwrap()
    }

    #[test]
    fn default_state_matches_the_declared_schema_version() {
        assert_eq!(AppState::default().schema_version, SCHEMA_VERSION);
    }

    #[test]
    fn state_survives_a_serialize_parse_cycle() {
        let mut state = AppState::default();
        state.identity.name = "Rosmontis220".to_string();
        state.box_state.excluded = vec!["维什戴尔".to_string()];
        state.common.enabled_rogue_ids = vec![5, 6, 7];
        state.history.push(crate::state::HistoryEntry {
            at: 1_700_000_000_000,
            generator_id: "xianshu-6".to_string(),
            action_id: "bp8".to_string(),
            identity: "博士".to_string(),
            seed: 4_294_967_295,
            fields: [("opening_team_name".to_string(), "堡垒战术分队".to_string())]
                .into_iter()
                .collect(),
        });

        let restored = round_trip(&state);
        assert_eq!(restored.identity.name, state.identity.name);
        assert_eq!(restored.box_state.excluded, state.box_state.excluded);
        // A full u32 seed must survive JSON, i.e. it must not be stored as a float.
        assert_eq!(restored.history[0].seed, 4_294_967_295);
    }

    #[test]
    fn defaults_match_the_shipped_settings() {
        let state = AppState::default();
        assert_eq!(state.appearance.color_scheme, "rhodes");
        assert_eq!(state.appearance.reduce_motion, "system");
        assert_eq!(state.appearance.splash_image, "");
        // On by default: the portraits are the point of the dictionary being bundled, and a
        // fresh install has shown the user no reason to prefer names.
        assert!(state.appearance.avatar_mode);
        // Every theme, including the two oldest ones.
        assert_eq!(state.common.enabled_rogue_ids, vec![2, 3, 4, 5, 6, 7]);
        // Language is its own section since version 2; it used to sit under `appearance`.
        assert_eq!(state.language.locale, "zh-CN");
        // No portrait until one is chosen; the identity button then shows the name alone.
        assert_eq!(state.identity.avatar, "");
        // An unnamed player draws under a real name rather than under the empty string, so
        // the ID on screen and the ID the seed was built from are the same string.
        assert_eq!(state.identity.name, DEFAULT_IDENTITY_NAME);
        // Not "unusable": an empty box means every operator is a candidate.
        assert!(state.box_state.unusable.is_empty());
    }

    #[test]
    fn a_document_written_before_splash_image_still_loads() {
        // The upgrade path, and the reason `splash_image` carries
        // `#[serde(default)]`: every file written by the previous release has no
        // `splashImage` key. Without the attribute this parse fails, and a failed
        // parse is not an error the caller sees — `read_or_quarantine` treats it as a
        // corrupt file, moves it to `.bak` and answers "no state". The user's box, ID
        // and history would vanish on the first launch after upgrading.
        //
        // The same file also predates `language`, which is why that section defaults to a
        // real locale rather than to `String::new()`: an empty locale would render the
        // whole catalogue as raw keys.
        let raw = r#"{
            "schemaVersion": 1,
            "identity": { "name": "博士" },
            "appearance": { "colorScheme": "p5", "reduceMotion": "never" },
            "box": { "excluded": ["维什戴尔"] },
            "common": { "enabledRogueIds": [5], "isJobTeamOnly": true, "isSupportUnitEnabled": true },
            "generators": { "current": "laochan", "currentByFamily": {}, "options": {} },
            "history": []
        }"#;

        let state: AppState = serde_json::from_str(raw).expect("an older document must still parse");

        assert_eq!(state.identity.name, "博士");
        assert_eq!(state.appearance.color_scheme, "p5");
        assert_eq!(state.appearance.reduce_motion, "never");
        assert_eq!(state.appearance.splash_image, "");
        assert_eq!(state.language.locale, "zh-CN");
        assert_eq!(state.box_state.excluded, ["维什戴尔"]);
    }

    #[test]
    fn a_hand_edited_volume_clamps_instead_of_quarantining() {
        // `volume` is the one number in the document a player has any reason to type by
        // hand, so every way of getting it wrong has to end in a clamp rather than in a
        // quarantine — a quarantined file takes the box, the ID and the history with it.
        //
        // Driven through the parse rather than by calling `de_volume` directly: what matters
        // is that the *document* still loads, and a unit test of the helper would keep
        // passing if the attribute were ever dropped from the field.
        let volume_of = |volume: &str| -> u8 {
            let raw = format!(
                r#"{{ "schemaVersion": 3, "identity": {{ "name": "博士" }},
                     "appearance": {{ "colorScheme": "rhodes", "reduceMotion": "system" }},
                     "sound": {{ "volume": {volume} }},
                     "box": {{ "excluded": [] }},
                     "common": {{ "enabledRogueIds": [2], "isJobTeamOnly": false, "isSupportUnitEnabled": false }},
                     "generators": {{ "current": "opening", "currentByFamily": {{}}, "options": {{}} }},
                     "history": [] }}"#
            );

            serde_json::from_str::<AppState>(&raw)
                .expect("a hand-edited volume must not quarantine the document")
                .sound
                .volume
        };

        assert_eq!(volume_of("0"), 0);
        assert_eq!(volume_of("55"), 55);
        assert_eq!(volume_of("100"), 100);
        // Out of range in both directions, the upper one past what a `u8` can even hold.
        assert_eq!(volume_of("300"), 100);
        assert_eq!(volume_of("-1"), 0);
        // `null` is "never chosen", which is full volume rather than silence.
        assert_eq!(volume_of("null"), crate::state::DEFAULT_SOUND_VOLUME);
    }

    #[test]
    fn a_sound_section_with_no_volume_plays_at_full() {
        // A bare `#[serde(default)]` on a `u8` would answer 0 here — silence — which is the
        // opposite of what "nobody has chosen a volume yet" means, and would make the app
        // mute itself for anyone whose file lost the key.
        let raw = r#"{
            "schemaVersion": 3,
            "identity": { "name": "博士" },
            "appearance": { "colorScheme": "rhodes", "reduceMotion": "system" },
            "sound": {},
            "box": { "excluded": [] },
            "common": { "enabledRogueIds": [2], "isJobTeamOnly": false, "isSupportUnitEnabled": false },
            "generators": { "current": "opening", "currentByFamily": {}, "options": {} },
            "history": []
        }"#;

        let state: AppState = serde_json::from_str(raw).expect("a bare sound section must parse");

        assert_eq!(state.sound.volume, crate::state::DEFAULT_SOUND_VOLUME);
    }

    #[test]
    fn a_pre_split_document_keeps_the_language_its_reader_chose() {
        // The version 1 → 2 step. Without it an English reader comes back to a Chinese
        // interface on the first launch after upgrading, and the evidence of their
        // choice — the one key version 2 stopped using — is thrown away by the next save.
        let raw = r#"{
            "schemaVersion": 1,
            "identity": { "name": "博士" },
            "appearance": { "colorScheme": "p5", "reduceMotion": "never", "locale": "en" },
            "box": { "excluded": [] },
            "common": { "enabledRogueIds": [4], "isJobTeamOnly": false, "isSupportUnitEnabled": false },
            "generators": { "current": "opening", "currentByFamily": {}, "options": {} },
            "history": []
        }"#;

        let stale: AppState = serde_json::from_str(raw).expect("version 1 must still parse");
        // Parsed, not applied: the field is still readable at this point.
        assert_eq!(stale.appearance.locale.as_deref(), Some("en"));

        let state = migrate(stale);

        assert_eq!(state.language.locale, "en");
        assert_eq!(state.schema_version, SCHEMA_VERSION);
        // Taken, so it cannot be written back or migrate a second time.
        assert_eq!(state.appearance.locale, None);
        // And the serialised form carries no trace of the legacy key: this is what keeps
        // the file from growing a dead field that every later release has to know about.
        // Checked per section rather than by searching the whole string, because the new
        // home for the value is also spelled `locale` — a substring search would pass on
        // the very output this is guarding against.
        let written = serde_json::to_value(&state).expect("state must serialise");
        assert!(
            written["appearance"].get("locale").is_none(),
            "appearance kept {written}"
        );
        assert_eq!(written["language"]["locale"], "en");
    }

    #[test]
    fn migrating_a_current_document_does_not_undo_a_chosen_language() {
        // A version 2 file with no legacy field must survive `migrate` untouched. If the
        // step ran unconditionally it would still be harmless here, but the guard is what
        // makes that true rather than lucky.
        let mut state = AppState::default();
        state.language.locale = "en".to_string();
        state.schema_version = SCHEMA_VERSION;

        let migrated = migrate(state);

        assert_eq!(migrated.language.locale, "en");
    }

    #[test]
    fn a_document_from_the_future_is_not_quietly_accepted() {
        // `#[serde(default)]` on one field must not have turned into a blanket
        // `#[serde(default)]` on the struct: a document missing a *required* section
        // still has to fail, or a half-written file would load as a half-empty app.
        assert!(serde_json::from_str::<AppState>(r#"{"schemaVersion":1,"appearance":{}}"#).is_err());
    }

    #[test]
    fn migration_stamps_the_current_version() {
        let stale = AppState {
            schema_version: 0,
            ..AppState::default()
        };
        assert_eq!(migrate(stale).schema_version, SCHEMA_VERSION);
    }

    #[test]
    fn a_blank_id_becomes_the_default_one() {
        // What an unnamed player actually has on disk: the key is present and empty, which is
        // what every release before version 3 wrote. Left alone it is a real seed input, so
        // their runs are drawn under a hash of the empty string while the settings screen
        // shows nothing at all.
        //
        // Whitespace is checked too, because a blank ID that is not literally the empty
        // string is exactly the case a bare `is_empty` lets through — and it is reachable
        // from the settings field by typing a space.
        for blank in ["", "   "] {
            let mut stale = AppState::default();
            stale.schema_version = 2;
            stale.identity.name = blank.to_string();

            assert_eq!(
                migrate(stale).identity.name,
                DEFAULT_IDENTITY_NAME,
                "{blank:?} should not survive as an ID"
            );
        }
    }

    #[test]
    fn migrating_leaves_an_id_the_player_typed_alone() {
        // The name is the seed's input, so overwriting it would silently re-draw every future
        // run under a different ID — and relabel nothing, because history keeps its own copy.
        let mut typed = AppState::default();
        typed.schema_version = 2;
        typed.identity.name = "狂暴冰箱投掷手".to_string();

        assert_eq!(migrate(typed).identity.name, "狂暴冰箱投掷手");
    }

    #[test]
    fn wire_names_are_the_ones_the_frontend_reads() {
        // Paired with `src/lib/api/types.test.ts`, which pins the same shape from
        // the TypeScript side. Neither language can see the other's field names,
        // so a rename on one side alone fails only as a silently ignored setting.
        let value: serde_json::Value =
            serde_json::from_str(&serde_json::to_string(&AppState::default()).unwrap()).unwrap();

        let mut keys: Vec<&str> = value.as_object().unwrap().keys().map(String::as_str).collect();
        keys.sort_unstable();
        assert_eq!(
            keys,
            [
                "appearance",
                "box",
                "common",
                "generators",
                "history",
                "identity",
                "language",
                "schemaVersion",
                "sound"
            ]
        );

        let mut common: Vec<&str> = value["common"]
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        common.sort_unstable();
        assert_eq!(
            common,
            ["enabledRogueIds", "isJobTeamOnly", "isSupportUnitEnabled"]
        );

        let mut appearance: Vec<&str> = value["appearance"]
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        appearance.sort_unstable();
        // No `locale`: `AppearanceState::locale` is `skip_serializing`, so the legacy key
        // is read but never written back. This assertion is what keeps that true — if the
        // attribute were dropped, the section would grow a dead field that every later
        // release has to keep knowing about.
        assert_eq!(
            appearance,
            ["avatarMode", "colorScheme", "reduceMotion", "splashImage"]
        );

        // Language is its own section, spelled the same as on the TypeScript side.
        assert_eq!(value["language"]["locale"], "zh-CN");

        // The master volume, which the sound settings section reads and writes.
        assert_eq!(value["sound"]["volume"], 100);

        // The portrait and the second box list, both added in version 2.
        assert_eq!(value["identity"]["avatar"], "");
        assert!(value["box"].get("unusable").is_some());

        // Named `box_state` in Rust because `box` is a keyword there.
        assert!(value["box"].get("excluded").is_some());
    }

    #[test]
    fn unparsable_payload_is_detected() {
        // The command treats a parse failure as "no state", so the important
        // contract here is that garbage really does fail to parse rather than
        // silently producing a half-built document.
        assert!(serde_json::from_str::<AppState>("{ not json").is_err());
        assert!(serde_json::from_str::<AppState>(r#"{"schema_version":1}"#).is_err());
    }

    /// A private directory per test, removed first so reruns are independent.
    fn scratch_dir(tag: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("arg-commands-test-{}-{tag}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn a_missing_file_reads_as_no_state() {
        let path = scratch_dir("missing").join(STATE_FILE);
        assert!(read_or_quarantine(&path).unwrap().is_none());
    }

    #[test]
    fn an_atomic_write_round_trips_and_leaves_no_temp_file() {
        let path = scratch_dir("round-trip").join(STATE_FILE);

        let mut state = AppState::default();
        state.identity.name = "Rosmontis220".to_string();
        state.box_state.excluded = vec!["维什戴尔".to_string()];

        write_atomic(&path, &serde_json::to_vec_pretty(&state).unwrap()).unwrap();

        // The rename must have consumed the temporary sibling, otherwise the next
        // save would be writing over a file that is already gone.
        assert!(!path.with_extension("json.tmp").exists());

        let restored = read_or_quarantine(&path).unwrap().unwrap();
        assert_eq!(restored.identity.name, state.identity.name);
        assert_eq!(restored.box_state.excluded, state.box_state.excluded);
    }

    #[test]
    fn a_corrupt_file_is_quarantined_rather_than_reported() {
        let path = scratch_dir("corrupt").join(STATE_FILE);
        fs::write(&path, "{ this is not json").unwrap();

        assert!(read_or_quarantine(&path).unwrap().is_none());

        // Preserved for inspection, and gone from the live path so the next save
        // starts from a clean slate.
        assert_eq!(
            fs::read_to_string(path.with_extension("json.bak")).unwrap(),
            "{ this is not json"
        );
        assert!(!path.exists());
    }

    #[test]
    fn quarantine_keeps_only_the_latest_broken_file() {
        let path = scratch_dir("quarantine-twice").join(STATE_FILE);

        fs::write(&path, "first").unwrap();
        assert!(read_or_quarantine(&path).unwrap().is_none());
        fs::write(&path, "second").unwrap();
        assert!(read_or_quarantine(&path).unwrap().is_none());

        // Exactly one backup survives, or a repeatedly failing launch would pile
        // up copies of the same broken document.
        assert_eq!(
            fs::read_to_string(path.with_extension("json.bak")).unwrap(),
            "second"
        );
    }

    #[test]
    fn an_unreadable_path_is_an_error_and_is_not_quarantined() {
        // The distinction the module doc draws: bad *content* is the user's file
        // and is set aside; bad *access* may be transient (a lock or permissions)
        // and must not be, or the data would be lost to a passing condition.
        let path = scratch_dir("unreadable").join(STATE_FILE);
        fs::create_dir_all(&path).unwrap();

        assert!(read_or_quarantine(&path).is_err());
        assert!(path.is_dir());
    }
}
