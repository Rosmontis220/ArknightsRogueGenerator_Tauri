mod commands;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Handing a URL to the system browser is a plugin rather than something the webview
    // can do: inside the app there is no browser chrome to navigate back with.
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::load_state,
      commands::save_state,
      commands::state_file_path,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
