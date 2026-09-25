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
  eprintln!(">>> [TAURI] Initializing Builder...");
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      minimize_window,
      toggle_maximize_window,
      close_window
    ])
    .on_window_event(|window, event| {
      match event {
        tauri::WindowEvent::Resized(size) => {
          eprintln!(">>> [WINDOW {:?}] Resized: {:?}", window.label(), size);
        }
        tauri::WindowEvent::Moved(pos) => {
          eprintln!(">>> [WINDOW {:?}] Moved: {:?}", window.label(), pos);
        }
        tauri::WindowEvent::Focused(f) => {
          eprintln!(">>> [WINDOW {:?}] Focused: {}", window.label(), f);
        }
        tauri::WindowEvent::CloseRequested { .. } => {
          eprintln!(">>> [WINDOW {:?}] Close requested", window.label());
        }
        tauri::WindowEvent::Destroyed => {
          eprintln!(">>> [WINDOW {:?}] Destroyed", window.label());
        }
        _ => {}
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
