// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  std::panic::set_hook(Box::new(|info| {
    let msg = format!("Panic: {}\n", info);
    if let Ok(dir) = std::env::var("LOCALAPPDATA") {
      let path = std::path::Path::new(&dir).join("app.motionstudio").join("crash.log");
      if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
      }
      let _ = std::fs::write(path, &msg);
    }
  }));

  app_lib::run();
}
