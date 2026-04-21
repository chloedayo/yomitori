mod commands;
mod sidecar;
mod tray;

use commands::{get_books_path, open_file_dialog, start_sidecars};
use sidecar::{kill_all, SidecarState};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(SidecarState::new())
        .invoke_handler(tauri::generate_handler![
            get_books_path,
            open_file_dialog,
            start_sidecars,
        ])
        .setup(|app| {
            tray::setup_tray(app.handle())?;
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
