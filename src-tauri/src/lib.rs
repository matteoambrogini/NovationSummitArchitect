mod services;

use services::{midi, openai, project};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            openai::generate_summit_patch,
            midi::list_midi_devices,
            project::save_project,
            project::open_project
        ])
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio di Summit Patch Architect");
}
