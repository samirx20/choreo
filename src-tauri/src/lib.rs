#[tauri::command]
fn minimize_window(window: tauri::Window) -> Result<(), String> {
  window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_maximize_window(window: tauri::Window) -> Result<(), String> {
  if window.is_maximized().unwrap_or(false) {
    window.unmaximize().map_err(|e| e.to_string())
  } else {
    window.maximize().map_err(|e| e.to_string())
  }
}

#[tauri::command]
fn close_window(window: tauri::Window) -> Result<(), String> {
  window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      minimize_window,
      toggle_maximize_window,
      close_window
    ])
    .setup(|app| {
      use tauri::Manager;
      eprintln!(">>> [TAURI SETUP] starting");
      let windows = app.webview_windows();
      eprintln!(">>> [TAURI SETUP] windows count: {}", windows.len());
      for (label, win) in &windows {
        eprintln!(">>> [TAURI SETUP] found window: {} url: {:?}", label, win.url());
        eprintln!(">>> [TAURI SETUP] is_visible: {:?}", win.is_visible());
        eprintln!(">>> [TAURI SETUP] is_minimized: {:?}", win.is_minimized());
        eprintln!(">>> [TAURI SETUP] outer_position: {:?}", win.outer_position());
        eprintln!(">>> [TAURI SETUP] outer_size: {:?}", win.outer_size());
        let _ = win.unminimize();
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
