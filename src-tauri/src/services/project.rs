use std::{fs, path::PathBuf};

#[tauri::command]
pub fn save_project(path: String, contents: String) -> Result<(), String> {
    let target = PathBuf::from(path);
    if target.extension().and_then(|value| value.to_str()) != Some("summitproject") {
        return Err("Il progetto deve usare l'estensione .summitproject".to_string());
    }
    serde_json::from_str::<serde_json::Value>(&contents)
        .map_err(|error| format!("Formato progetto non valido: {error}"))?;
    fs::write(target, contents).map_err(|error| format!("Salvataggio non riuscito: {error}"))
}

#[tauri::command]
pub fn open_project(path: String) -> Result<String, String> {
    let target = PathBuf::from(path);
    if target.extension().and_then(|value| value.to_str()) != Some("summitproject") {
        return Err("Il progetto deve usare l'estensione .summitproject".to_string());
    }
    fs::read_to_string(target).map_err(|error| format!("Apertura non riuscita: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_wrong_extension_before_writing() {
        let result = save_project("patch.json".into(), "{}".into());
        assert!(result.is_err());
    }
}
