use midir::{MidiInput, MidiOutput};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MidiDeviceSnapshot {
    inputs: Vec<String>,
    outputs: Vec<String>,
    summit_detected: bool,
    warnings: Vec<String>,
}

#[tauri::command]
pub fn list_midi_devices() -> Result<MidiDeviceSnapshot, String> {
    let input = MidiInput::new("summit-patch-architect-input")
        .map_err(|error| format!("Impossibile inizializzare MIDI input: {error}"))?;
    let output = MidiOutput::new("summit-patch-architect-output")
        .map_err(|error| format!("Impossibile inizializzare MIDI output: {error}"))?;

    let inputs = input
        .ports()
        .iter()
        .filter_map(|port| input.port_name(port).ok())
        .collect::<Vec<_>>();
    let outputs = output
        .ports()
        .iter()
        .filter_map(|port| output.port_name(port).ok())
        .collect::<Vec<_>>();
    let summit_detected = inputs
        .iter()
        .chain(outputs.iter())
        .any(|name| name.to_lowercase().contains("summit"));

    Ok(MidiDeviceSnapshot {
        inputs,
        outputs,
        summit_detected,
        warnings: vec![
            "Diagnostica in sola lettura: nessun messaggio di modifica o SysEx viene inviato."
                .to_string(),
        ],
    })
}

#[cfg(test)]
mod tests {
    #[test]
    fn summit_name_matching_is_case_insensitive() {
        let names = ["NOVATION SUMMIT MIDI", "altro device"];
        assert!(names
            .iter()
            .any(|name| name.to_lowercase().contains("summit")));
    }
}
