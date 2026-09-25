use std::sync::{Arc, Mutex};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::io::Write;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

struct McpServerState(Arc<Mutex<Option<Child>>>);

struct FfmpegSession {
  child: Child,
  stdin: ChildStdin,
  output_path: String,
}

struct FfmpegExportState(Arc<Mutex<Option<FfmpegSession>>>);

fn resolve_ffmpeg_cmd() -> Option<Command> {
  // 1. Check next to executable or in resource dir
  if let Ok(exe_path) = std::env::current_exe() {
    if let Some(dir) = exe_path.parent() {
      let local_ffmpeg = dir.join("ffmpeg.exe");
      if local_ffmpeg.exists() {
        let mut cmd = Command::new(local_ffmpeg);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        return Some(cmd);
      }
    }
  }

  // 2. Check system PATH
  let mut check_cmd = Command::new("ffmpeg");
  check_cmd.arg("-version");
  #[cfg(target_os = "windows")]
  check_cmd.creation_flags(0x08000000);

  if check_cmd.output().is_ok() {
    let mut cmd = Command::new("ffmpeg");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    return Some(cmd);
  }

  None
}

fn resolve_node_cmd() -> Option<Command> {
  // 1. Next to executable
  if let Ok(exe_path) = std::env::current_exe() {
    if let Some(dir) = exe_path.parent() {
      let local_node = dir.join("node.exe");
      if local_node.exists() {
        let mut cmd = Command::new(local_node);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        return Some(cmd);
      }
    }
  }

  // 2. PATH check
  let mut check_cmd = Command::new("node");
  check_cmd.arg("-v");
  #[cfg(target_os = "windows")]
  check_cmd.creation_flags(0x08000000);
  if check_cmd.output().is_ok() {
    let mut cmd = Command::new("node");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    return Some(cmd);
  }

  // 3. Common Windows install locations
  #[cfg(target_os = "windows")]
  {
    let candidates = [
      r"C:\Program Files\nodejs\node.exe",
      r"C:\Program Files (x86)\nodejs\node.exe",
    ];
    for c in &candidates {
      let p = std::path::Path::new(c);
      if p.exists() {
        let mut cmd = Command::new(p);
        cmd.creation_flags(0x08000000);
        return Some(cmd);
      }
    }
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
      let p = std::path::Path::new(&local_app_data).join("Programs").join("node").join("node.exe");
      if p.exists() {
        let mut cmd = Command::new(p);
        cmd.creation_flags(0x08000000);
        return Some(cmd);
      }
    }
    if let Ok(app_data) = std::env::var("APPDATA") {
      let p = std::path::Path::new(&app_data).join("npm").join("node.exe");
      if p.exists() {
        let mut cmd = Command::new(p);
        cmd.creation_flags(0x08000000);
        return Some(cmd);
      }
    }
  }

  None
}

#[tauri::command]
fn check_ffmpeg_available() -> bool {
  resolve_ffmpeg_cmd().is_some()
}

#[tauri::command]
fn start_ffmpeg_export(
  state: tauri::State<FfmpegExportState>,
  output_path: String,
  fps: u32,
  format: String,
  is_transparent: bool,
  audio_path: Option<String>,
) -> Result<(), String> {
  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(mut existing) = lock.take() {
    let _ = existing.child.kill();
  }

  let mut cmd = resolve_ffmpeg_cmd().ok_or_else(|| "FFmpeg binary not found on system".to_string())?;

  cmd.arg("-y");
  cmd.arg("-f").arg("image2pipe");
  if is_transparent {
    cmd.arg("-vcodec").arg("png");
  } else {
    cmd.arg("-vcodec").arg("mjpeg");
  }
  cmd.arg("-r").arg(fps.to_string());
  cmd.arg("-i").arg("-"); // stdin pipe for video frames

  let has_valid_audio = if let Some(ref a_path) = audio_path {
    if std::path::Path::new(a_path).exists() {
      cmd.arg("-i").arg(a_path);
      true
    } else {
      false
    }
  } else {
    false
  };

  if is_transparent || format == "webm" {
    cmd.arg("-c:v").arg("libvpx-vp9");
    if is_transparent {
      cmd.arg("-pix_fmt").arg("yuva420p");
    } else {
      cmd.arg("-pix_fmt").arg("yuv420p");
    }
    cmd.arg("-b:v").arg("0");
    cmd.arg("-crf").arg("24");
  } else {
    cmd.arg("-c:v").arg("libx264");
    cmd.arg("-pix_fmt").arg("yuv420p");
    cmd.arg("-preset").arg("fast");
    cmd.arg("-crf").arg("18");
    cmd.arg("-movflags").arg("+faststart");
  }

  if has_valid_audio {
    cmd.arg("-c:a").arg("aac");
    cmd.arg("-b:a").arg("192k");
    cmd.arg("-shortest");
  }

  cmd.arg(&output_path);
  cmd.stdin(Stdio::piped());
  cmd.stdout(Stdio::null());
  cmd.stderr(Stdio::piped());

  let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn FFmpeg: {}", e))?;
  let stdin = child.stdin.take().ok_or_else(|| "Failed to open FFmpeg stdin pipe".to_string())?;

  *lock = Some(FfmpegSession {
    child,
    stdin,
    output_path,
  });

  Ok(())
}

#[tauri::command]
fn write_ffmpeg_frame(
  state: tauri::State<FfmpegExportState>,
  frame_data: Vec<u8>,
) -> Result<(), String> {
  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(ref mut session) = *lock {
    session.stdin.write_all(&frame_data).map_err(|e| format!("Failed writing frame to FFmpeg stdin: {}", e))?;
    Ok(())
  } else {
    Err("No active FFmpeg export session".to_string())
  }
}

#[tauri::command]
fn write_ffmpeg_frame_base64(
  state: tauri::State<FfmpegExportState>,
  frame_base64: String,
) -> Result<(), String> {
  use base64::Engine;
  let bytes = base64::engine::general_purpose::STANDARD
    .decode(&frame_base64)
    .map_err(|e| format!("Base64 decode error: {}", e))?;

  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(ref mut session) = *lock {
    session.stdin.write_all(&bytes).map_err(|e| format!("Failed writing frame to FFmpeg stdin: {}", e))?;
    Ok(())
  } else {
    Err("No active FFmpeg export session".to_string())
  }
}

#[tauri::command]
fn finish_ffmpeg_export(
  state: tauri::State<FfmpegExportState>,
) -> Result<String, String> {
  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(session) = lock.take() {
    let FfmpegSession { child, stdin, output_path } = session;
    drop(stdin); // Flush and close stdin pipe to signal EOF to FFmpeg

    let output = child.wait_with_output().map_err(|e| format!("FFmpeg failed to wait: {}", e))?;
    if output.status.success() {
      Ok(output_path)
    } else {
      let stderr = String::from_utf8_lossy(&output.stderr);
      Err(format!("FFmpeg export error (exit code {:?}): {}", output.status.code(), stderr))
    }
  } else {
    Err("No active FFmpeg export session".to_string())
  }
}

#[tauri::command]
fn cancel_ffmpeg_export(
  state: tauri::State<FfmpegExportState>,
) -> Result<(), String> {
  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(mut session) = lock.take() {
    let _ = session.child.kill();
    let _ = std::fs::remove_file(&session.output_path);
  }
  Ok(())
}

#[tauri::command]
fn start_mcp_server(app: tauri::AppHandle, state: tauri::State<McpServerState>, port: u16) -> Result<String, String> {
  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(mut existing) = lock.take() {
    let _ = existing.kill();
  }

  let mut script_path: Option<std::path::PathBuf> = None;

  // 1. Check Tauri resource directory
  if let Ok(res_dir) = app.path().resource_dir() {
    let candidate = res_dir.join("mcp.js");
    if candidate.exists() {
      script_path = Some(candidate);
    } else {
      let candidate2 = res_dir.join("_up_").join("mcp.js");
      if candidate2.exists() {
        script_path = Some(candidate2);
      }
    }
  }

  // 2. Check next to executable
  if script_path.is_none() {
    if let Ok(exe_path) = std::env::current_exe() {
      if let Some(dir) = exe_path.parent() {
        let candidate = dir.join("mcp.js");
        if candidate.exists() {
          script_path = Some(candidate);
        } else {
          let candidate_res = dir.join("resources").join("mcp.js");
          if candidate_res.exists() {
            script_path = Some(candidate_res);
          }
        }
      }
    }
  }

  // 3. Check CWD and parent CWD
  if script_path.is_none() {
    let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    if cwd.join("mcp.js").exists() {
      script_path = Some(cwd.join("mcp.js"));
    } else if cwd.join("..").join("mcp.js").exists() {
      script_path = Some(cwd.join("..").join("mcp.js"));
    }
  }

  let target_script = script_path.unwrap_or_else(|| std::path::PathBuf::from("mcp.js"));

  let mut cmd = resolve_node_cmd().ok_or_else(|| {
    "Node.js runtime not found on system. Please ensure Node.js is installed to run the MCP server.".to_string()
  })?;

  cmd.arg(&target_script);
  cmd.arg("--port");
  cmd.arg(port.to_string());
  cmd.stdin(Stdio::null());
  cmd.stdout(Stdio::piped());
  cmd.stderr(Stdio::piped());

  let child = cmd.spawn().map_err(|e| format!("Failed to spawn node {:?}: {}", target_script, e))?;

  *lock = Some(child);
  log_msg(&format!("MCP Server started on port {} with script {:?}", port, target_script));
  Ok(format!("MCP Server running on port {}", port))
}

#[tauri::command]
fn stop_mcp_server(state: tauri::State<McpServerState>) -> Result<(), String> {
  let mut lock = state.0.lock().map_err(|e| e.to_string())?;
  if let Some(mut child) = lock.take() {
    let _ = child.kill();
    log_msg("MCP Server stopped");
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
  let mcp_child_arc = Arc::new(Mutex::new(None));
  let mcp_state = McpServerState(Arc::clone(&mcp_child_arc));
  let ffmpeg_state = FfmpegExportState(Arc::new(Mutex::new(None)));
  let mcp_cleanup = Arc::clone(&mcp_child_arc);

  tauri::Builder::default()
    .manage(mcp_state)
    .manage(ffmpeg_state)
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
      is_mcp_server_running,
      check_ffmpeg_available,
      start_ffmpeg_export,
      write_ffmpeg_frame,
      write_ffmpeg_frame_base64,
      finish_ffmpeg_export,
      cancel_ffmpeg_export
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(move |_app_handle, event| {
      match event {
        tauri::RunEvent::Ready => {
          log_msg("RunEvent::Ready");
        }
        tauri::RunEvent::ExitRequested { code, .. } => {
          log_msg(&format!("RunEvent::ExitRequested with code {:?}", code));
          if let Ok(mut lock) = mcp_cleanup.lock() {
            if let Some(mut child) = lock.take() {
              let _ = child.kill();
              log_msg("Killed MCP server child on app exit");
            }
          }
        }
        tauri::RunEvent::WindowEvent { label, event, .. } => {
          // Window event
        }
        _ => {}
      }
    });
}
