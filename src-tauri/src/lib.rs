#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_devtools(window: tauri::WebviewWindow) {
    window.open_devtools();
}

/// Lee los bytes de una imagen local para previsualizarla sin copiarla.
/// Solo se usa cuando la ruta queda fuera del scope del protocolo asset
/// (p. ej. otra unidad): el caso común va por `convertFileSrc`.
#[tauri::command]
fn read_image_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            open_devtools,
            read_image_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
