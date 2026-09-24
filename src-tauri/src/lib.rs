#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      use tauri::Manager;
      eprintln!(">>> [TAURI SETUP] starting");
      let windows = app.webview_windows();
      eprintln!(">>> [TAURI SETUP] windows count: {}", windows.len());
      for (label, win) in &windows {
        eprintln!(">>> [TAURI SETUP] found window: {}", label);
        if let Err(e) = win.show() {
          eprintln!(">>> [TAURI SETUP] show() error: {:?}", e);
        }
        if let Err(e) = win.set_focus() {
          eprintln!(">>> [TAURI SETUP] set_focus() error: {:?}", e);
        }
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
