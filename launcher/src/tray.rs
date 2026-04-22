use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_shell::ShellExt;

use crate::commands::APP_URL;

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_browser = MenuItem::with_id(app, "open_browser", "Open Yomitori", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_browser, &show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open_browser" => {
                let _ = app.shell().open(APP_URL, None);
            }
            "show" => show_window(app),
            "quit" => {
                use crate::sidecar::{kill_all, SidecarState};
                if let Some(state) = app.try_state::<SidecarState>() {
                    kill_all(&state);
                }
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // Splash is the only UI window. Left-click → show it again
                // (ready pane has the "Open Yomitori" button to launch browser).
                show_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
