use tauri::{AppHandle, Emitter, Manager, State};
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
    // `blocking_pick_folder` parks the calling thread until the native dialog
    // closes. On an async command this blocks the Tauri async runtime — on a
    // single-threaded executor it can deadlock the whole app. Move to a
    // blocking worker thread so the runtime stays responsive.
    tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Select your books folder")
            .blocking_pick_folder()
            .map(|p| p.to_string())
    })
    .await
    .ok()
    .flatten()
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
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;

    // Idempotency: if both sidecars are running with the same booksPath, no-op.
    let existing = store
        .get(BOOKS_PATH_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()));
    let running = {
        let backend_guard = state.backend.lock().unwrap();
        let middleware_guard = state.middleware.lock().unwrap();
        backend_guard.is_some() && middleware_guard.is_some()
    };
    if running && existing.as_deref() == Some(books_path.as_str()) {
        return Ok(());
    }

    // Persist the chosen path.
    store.set(BOOKS_PATH_KEY, serde_json::Value::String(books_path.clone()));
    store.save().map_err(|e| e.to_string())?;

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    kill_all(&state);

    let backend = spawn_backend(&app, &books_path, &data_dir)?;
    *state.backend.lock().unwrap() = Some(backend);

    let middleware = spawn_middleware(&app)?;
    *state.middleware.lock().unwrap() = Some(middleware);

    Ok(())
}

/// Canonicalize a path if it exists, returning `None` on error. Used to build
/// the `open_path` allowlist without failing the whole command when a root
/// (e.g. `resource_dir`) is missing on a given platform.
fn canonical(p: std::path::PathBuf) -> Option<std::path::PathBuf> {
    p.canonicalize().ok()
}

#[tauri::command]
pub fn open_path(app: AppHandle, path: String) -> Result<(), String> {
    use std::path::PathBuf;

    // Reject anything that isn't a real filesystem path under an allowed root.
    // Spec §4: `open_path` must be a Rust-side allowlist restricted to
    //   - app_data_dir (logs, store, kuromoji dict cache)
    //   - user books path (from store)
    //   - resource_dir (bundled assets, for debug)
    // Anything else — including URLs, arbitrary files, sibling dirs — is denied.
    let requested = PathBuf::from(&path)
        .canonicalize()
        .map_err(|e| format!("path not permitted: {e}"))?;

    let books_root = app
        .store(STORE_FILE)
        .ok()
        .and_then(|s| s.get(BOOKS_PATH_KEY))
        .and_then(|v| v.as_str().map(PathBuf::from))
        .and_then(canonical);
    let data_root = app.path().app_data_dir().ok().and_then(canonical);
    let resource_root = app.path().resource_dir().ok().and_then(canonical);

    let allowed = [books_root, data_root, resource_root]
        .into_iter()
        .flatten()
        .any(|root| requested.starts_with(&root));

    if !allowed {
        return Err("path not permitted".into());
    }

    app.shell()
        .open(requested.to_string_lossy().to_string(), None)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    /// Smoke test: an arbitrary system path must not pass the `starts_with`
    /// check against a fabricated allowlist. This does not exercise the full
    /// `open_path` command (which requires an `AppHandle`) but locks down the
    /// core predicate. Integration test for the Tauri command is tracked in
    /// Kotone's review §1.13 (test gap #4).
    #[test]
    fn rejects_out_of_allowlist_paths() {
        let root = PathBuf::from("/nonexistent/yomitori-data");
        let requested = PathBuf::from("/etc/passwd");
        assert!(!requested.starts_with(&root));
    }

    #[test]
    fn accepts_nested_allowlist_paths() {
        let root = PathBuf::from("/tmp/yomitori-data");
        let requested = PathBuf::from("/tmp/yomitori-data/logs/app.log");
        assert!(requested.starts_with(&root));
    }
}

#[tauri::command]
pub fn open_logs_dir(app: AppHandle) -> Result<(), String> {
    let logs_dir = app
        .path()
        .app_log_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| e.to_string())?;
    app.shell()
        .open(logs_dir.to_string_lossy().to_string(), None)
        .map_err(|e| e.to_string())
}

/// Open the middleware SPA in the user's default browser and hide the splash
/// window. Called from the splash "Open Yomitori" button on the ready pane.
///
/// URL is hard-coded to APP_URL — the splash never passes a URL argument, so
/// there is no untrusted-URL path here. Matches the `shell:allow-open`
/// capability scope (localhost:3000 only).
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

/// Return the app_data_dir path as a string for the splash UI. The splash uses
/// this to compute the dictionaries subfolder path before calling `open_path`.
#[tauri::command]
pub fn get_data_dir(app: AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    if let Some(state) = app.try_state::<SidecarState>() {
        kill_all(&state);
    }
    app.exit(0);
}

/// Called from the splash UI after the user completes first-run bootstrap
/// (pick folder -> save -> start_sidecars). Triggers the Rust-side readiness
/// poll so the splash receives `splash://ready` and can navigate.
#[tauri::command]
pub fn splash_ready(app: AppHandle) -> Result<(), String> {
    // Ask lib.rs to kick off a health poll for the main window.
    app.emit("splash://trigger-poll", ())
        .map_err(|e| e.to_string())
}
