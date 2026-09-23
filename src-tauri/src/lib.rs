#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      println!("[Motion Studio] Initializing native desktop window...");
      let _window = tauri::WebviewWindowBuilder::new(
        app,
        "main",
        tauri::WebviewUrl::default(),
      )
      .title("Motion Studio")
      .inner_size(1440.0, 900.0)
      .min_inner_size(1024.0, 700.0)
      .resizable(true)
      .center()
      .visible(true)
      .focused(true)
      .build()?;

      println!("[Motion Studio] Native desktop window successfully created!");
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
