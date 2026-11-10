/// Nexus desktop shell.
///
/// Loads the hosted web app in a native window. The remote page is granted
/// no Tauri IPC permissions (see capabilities/), so it behaves exactly like the
/// browser version. Native extras (tray timer, global shortcuts, notifications)
/// get added here as plugins with narrowly-scoped capabilities.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Nexus desktop");
}
