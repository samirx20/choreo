use std::sync::{Arc, Mutex};
use std::process::Child;

struct McpServerState(Arc<Mutex<Option<Child>>>);

#[tauri::command]
fn start_mcp_server(state: tauri::State<McpServerState>, port: u16) -> Result<String, String> {
  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(mut existing) = lock.take() {
    let _ = existing.kill();
  }

  let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
  let script_path = if cwd.join("mcp.js").exists() {
    cwd.join("mcp.js")
  } else if cwd.join("..").join("mcp.js").exists() {
    cwd.join("..").join("mcp.js")
  } else {
    std::path::PathBuf::from("mcp.js")
  };

  let child = std::process::Command::new("node")
    .arg(script_path)
    .arg("--port")
    .arg(port.to_string())
    .spawn()
    .map_err(|e| format!("Failed to spawn node mcp.js: {}", e))?;

  *lock = Some(child);
  Ok(format!("MCP Server running on port {}", port))
}

#[tauri::command]
fn stop_mcp_server(state: tauri::State<McpServerState>) -> Result<(), String> {
  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(mut child) = lock.take() {
    let _ = child.kill();
  }
  Ok(())
}

#[tauri::command]
fn is_mcp_server_running(state: tauri::State<McpServerState>) -> Result<bool, String> {
  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(ref mut child) = *lock {
    match child.try_wait() {
      Ok(None) => Ok(true),
      _ => {
        *lock = None;
        Ok(false)
      }
    }
  } else {
    Ok(false)
  }
}

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
  let mcp_state = McpServerState(Arc::new(Mutex::new(None)));

  tauri::Builder::default()
    .manage(mcp_state)
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
    .on_window_event(|_window, event| {
      match event {
        tauri::WindowEvent::Resized(size) => {
          log_msg(&format!("Window resized: {:?}", size));
        }
        tauri::WindowEvent::CloseRequested { .. } => {
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
      close_window,
      start_mcp_server,
      stop_mcp_server,
      is_mcp_server_running
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
