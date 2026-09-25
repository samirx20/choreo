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

fn log_msg(msg: &str) {
  if let Ok(dir) = std::env::var("LOCALAPPDATA") {
    let path = std::path::Path::new(&dir).join("app.motionstudio").join("app.log");
    if let Some(parent) = path.parent() {
      let _ = std::fs::create_dir_all(parent);
    }
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
      let _ = writeln!(f, "[{}] {}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis(), msg);
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  log_msg("run() started");
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      log_msg("setup hook entered");
      use tauri::Manager;
      if let Some(win) = app.get_webview_window("main") {
        log_msg("found main window in setup");
        log_msg(&format!("hwnd: {:?}, visible: {:?}, pos: {:?}, size: {:?}", win.hwnd(), win.is_visible(), win.outer_position(), win.outer_size()));
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
      } else {
        log_msg("main window NOT found in setup!");
      }
      Ok(())
    })
    .on_window_event(|window, event| {
      match event {
        tauri::WindowEvent::Resized(size) => {
          log_msg(&format!("Window resized: {:?}", size));
        }
        tauri::WindowEvent::CloseRequested { api, .. } => {
          log_msg("Window close requested");
        }
        tauri::WindowEvent::Destroyed => {
          log_msg("Window destroyed");
        }
        _ => {}
      }
    })
    .invoke_handler(tauri::generate_handler![
      minimize_window,
      toggle_maximize_window,
      close_window
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, event| {
      match event {
        tauri::RunEvent::Ready => {
          log_msg("RunEvent::Ready");
        }
        tauri::RunEvent::ExitRequested { code, .. } => {
          log_msg(&format!("RunEvent::ExitRequested with code {:?}", code));
        }
        tauri::RunEvent::WindowEvent { label, event, .. } => {
          // Window event
        }
        _ => {}
      }
    });
}
