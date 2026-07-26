# Roadmap MIDI

## Milestone 1

- enumerazione input/output tramite Rust `midir`;
- rilevamento euristico del nome “Summit”;
- diagnostica in sola lettura;
- nessun messaggio inviato.

## Gate per funzioni successive

CC, NRPN, dump patch, import/export SysEx o trasferimento automatico possono essere implementati solo quando:

1. il protocollo è presente nella documentazione ufficiale;
2. range e semantica sono registrati nel catalogo;
3. esiste un test con hardware reale e rollback sicuro;
4. la UI distingue chiaramente operazioni verificate e non supportate.

Non verrà reverse-engineerizzato un formato SysEx per la produzione.

## Fasi

1. Monitor MIDI raw in developer mode con redazione dei log.
2. Controlli real-time documentati e opt-in.
3. Patch dump/import solo dopo verifica ufficiale e hardware.
4. Trasferimento guidato con conferma esplicita.
