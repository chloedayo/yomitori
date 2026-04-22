use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_store::StoreExt;

use crate::sidecar::{kill_all, spawn_backend, spawn_middleware, SidecarState};

pub const STORE_FILE: &str = "config.json";
pub const BOOKS_PATH_KEY: &str = "booksPath";
pub const APP_URL: &str = "http://localhost:3000";

#[tauri::command]
pub fn get_books_path(app: AppHandle) -> Option<String> {
    let store = app.store(STORE_FILE).ok()?;
    store.get(BOOKS_PATH_KEY)?.as_str().map(|s| s.to_string())
}

#[tauri::command]
pub async fn open_file_dialog(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .set_title("Select your books folder")
        .blocking_pick_folder()
        .map(|p| p.to_string())
}

#[tauri::command]
pub fn save_books_path(app: AppHandle, books_path: String) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.set(BOOKS_PATH_KEY, serde_json::Value::String(books_path));
    store.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_sidecars(
    app: AppHandle,
    books_path: String,
    state: State<'_, SidecarState>,
) -> Result<(), String> {
    // Persist the chosen path
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.set(BOOKS_PATH_KEY, serde_json::Value::String(books_path.clone()));
    store.save().map_err(|e| e.to_string())?;

    // Resolve data dir (sibling of books folder, or app data dir)
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    // Kill existing sidecars before spawning new ones
    kill_all(&state);

    let backend = spawn_backend(&app, &books_path, &data_dir)?;
    *state.backend.lock().unwrap() = Some(backend);

    let middleware = spawn_middleware(&app)?;
    *state.middleware.lock().unwrap() = Some(middleware);

    Ok(())
}

#[tauri::command]
pub fn get_app_url() -> &'static str {
    APP_URL
}

#[tauri::command]
pub fn open_path(app: AppHandle, path: String) -> Result<(), String> {
    app.shell().open(&path, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_in_browser_and_hide(app: AppHandle) -> Result<(), String> {
    app.shell()
        .open(APP_URL, None)
        .map_err(|e| e.to_string())?;
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
