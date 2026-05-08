use tauri::Manager;

#[tauri::command]
async fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    let display = path.to_string_lossy().to_string();
    println!("[OptiMap] App data dir: {}", display);
    Ok(display)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_app_data_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
