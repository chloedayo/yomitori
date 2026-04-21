use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

pub struct SidecarState {
    pub backend: Mutex<Option<CommandChild>>,
    pub middleware: Mutex<Option<CommandChild>>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self {
            backend: Mutex::new(None),
            middleware: Mutex::new(None),
        }
    }
}

pub fn spawn_backend(app: &AppHandle, books_path: &str, data_dir: &str) -> Result<CommandChild, String> {
    let sidecar = app
        .shell()
        .sidecar("yomitori-backend")
        .map_err(|e| e.to_string())?
        .env("BOOKS_PATH", books_path)
        .env("DATA_DIR", data_dir)
        .env("CORS_ORIGINS", "tauri://localhost,http://tauri.localhost,http://localhost:5173");

    let (_, child) = sidecar.spawn().map_err(|e| e.to_string())?;
    Ok(child)
}

pub fn spawn_middleware(app: &AppHandle) -> Result<CommandChild, String> {
    let sidecar = app
        .shell()
        .sidecar("yomitori-middleware")
        .map_err(|e| e.to_string())?;

    let (_, child) = sidecar.spawn().map_err(|e| e.to_string())?;
    Ok(child)
}

pub fn kill_all(state: &SidecarState) {
    if let Ok(mut guard) = state.backend.lock() {
        if let Some(child) = guard.take() {
            let _ = child.kill();
        }
    }
    if let Ok(mut guard) = state.middleware.lock() {
        if let Some(child) = guard.take() {
            let _ = child.kill();
        }
    }
}
