mod commands;
mod sidecar;
mod tray;

use commands::{
    get_books_path, get_data_dir, open_file_dialog, open_in_browser_and_hide, open_logs_dir,
    open_path, quit_app, save_books_path, splash_ready, start_sidecars, APP_URL, BOOKS_PATH_KEY,
    STORE_FILE,
};
use sidecar::{kill_all, spawn_backend, spawn_middleware, SidecarState};
use serde::Serialize;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Listener, Manager};
use tauri_plugin_store::StoreExt;

#[derive(Clone, Serialize)]
struct ProgressPayload {
    stage: &'static str,
    ok: bool,
}

#[derive(Clone, Serialize)]
struct ErrorPayload {
    message: String,
}

const HEALTH_TIMEOUT: Duration = Duration::from_secs(30);
const HEALTH_POLL_INTERVAL: Duration = Duration::from_millis(250);

/// Spawn an async task that polls the middleware's /health endpoint and emits
/// splash://progress / splash://ready / splash://error events. On timeout,
/// kill sidecars so the user can retry cleanly (watchdog).
fn kick_off_health_poll(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        // Progress transitions are driven by actual state:
        //  - backend/middleware `ok: true` is only asserted once /health succeeds
        //    (which itself implies both sidecars are up and proxying).
        //  - Until then we emit `ok: false` (rendered as "active" / in-progress).
        let _ = app.emit(
            "splash://progress",
            ProgressPayload { stage: "backend", ok: false },
        );
        let _ = app.emit(
            "splash://progress",
            ProgressPayload { stage: "middleware", ok: false },
        );
        let _ = app.emit(
            "splash://progress",
            ProgressPayload { stage: "health", ok: false },
        );

        let client = match reqwest::Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit(
                    "splash://error",
                    ErrorPayload {
                        message: format!("HTTP client init failed: {e}"),
                    },
                );
                return;
            }
        };

        let deadline = std::time::Instant::now() + HEALTH_TIMEOUT;
        let url = format!("{}/health", APP_URL);

        loop {
            if std::time::Instant::now() > deadline {
                // Watchdog: kill sidecars so a Retry starts clean.
                if let Some(state) = app.try_state::<SidecarState>() {
                    kill_all(&state);
                }
                let _ = app.emit(
                    "splash://progress",
                    ProgressPayload { stage: "health", ok: false },
                );
                let _ = app.emit(
                    "splash://error",
                    ErrorPayload {
                        message:
                            "Services did not become ready within 30 seconds. \
                             Check logs and retry."
                                .into(),
                    },
                );
                return;
            }

            if let Ok(resp) = client.get(&url).send().await {
                if resp.status().is_success() {
                    // /health succeeded → both sidecars are up. Flip all stages
                    // to done in order, then fire ready.
                    let _ = app.emit(
                        "splash://progress",
                        ProgressPayload { stage: "backend", ok: true },
                    );
                    let _ = app.emit(
                        "splash://progress",
                        ProgressPayload { stage: "middleware", ok: true },
                    );
                    let _ = app.emit(
                        "splash://progress",
                        ProgressPayload { stage: "health", ok: true },
                    );
                    let _ = app.emit("splash://ready", ());

                    // Splash is now the only UI. The ready event flips the
                    // splash JS into the ready pane (Open Yomitori / Change
                    // folder / Open dict / Quit). No navigation away from the
                    // bundled HTML.
                    return;
                }
            }

            tokio::time::sleep(HEALTH_POLL_INTERVAL).await;
        }
    });
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(SidecarState::new())
        .invoke_handler(tauri::generate_handler![
            get_books_path,
            get_data_dir,
            open_file_dialog,
            open_in_browser_and_hide,
            save_books_path,
            start_sidecars,
            open_path,
            open_logs_dir,
            quit_app,
            splash_ready,
        ])
        .setup(|app| {
            tray::setup_tray(app.handle())?;

            let handle = app.handle().clone();

            // Allow the splash to trigger a fresh health poll after a user-
            // driven retry or first-run bootstrap.
            {
                let handle2 = handle.clone();
                app.listen("splash://trigger-poll", move |_| {
                    kick_off_health_poll(handle2.clone());
                });
            }

            let books_path = app
                .store(STORE_FILE)
                .ok()
                .and_then(|s| s.get(BOOKS_PATH_KEY))
                .and_then(|v| v.as_str().map(|s| s.to_string()));

            if let Some(path) = books_path {
                if !path.is_empty() {
                    let data_dir = handle
                        .path()
                        .app_data_dir()
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default();

                    let state = handle.state::<SidecarState>();
                    kill_all(&state);

                    let backend_ok = match spawn_backend(&handle, &path, &data_dir) {
                        Ok(child) => {
                            *state.backend.lock().unwrap() = Some(child);
                            true
                        }
                        Err(e) => {
                            eprintln!("[setup] backend spawn failed: {}", e);
                            let _ = handle.emit(
                                "splash://error",
                                ErrorPayload {
                                    message: format!("Backend failed to start: {e}"),
                                },
                            );
                            false
                        }
                    };
                    let middleware_ok = if backend_ok {
                        match spawn_middleware(&handle) {
                            Ok(child) => {
                                *state.middleware.lock().unwrap() = Some(child);
                                true
                            }
                            Err(e) => {
                                eprintln!("[setup] middleware spawn failed: {}", e);
                                let _ = handle.emit(
                                    "splash://error",
                                    ErrorPayload {
                                        message: format!("Middleware failed to start: {e}"),
                                    },
                                );
                                false
                            }
                        }
                    } else {
                        false
                    };

                    if backend_ok && middleware_ok {
                        kick_off_health_poll(handle.clone());
                    }
                }
                // If path was empty the splash UI will render the wizard CTA;
                // the user-driven flow will emit splash://trigger-poll once
                // start_sidecars finishes.
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app.try_state::<SidecarState>() {
                    kill_all(&state);
                }
            }
        });
}
