import { useEffect, useMemo, useRef, useState } from "react";
import { RECOMMENDED_MAX_DURATION_SECONDS, validateAudioFile } from "../../services/audio";
import { useAppStore } from "../../stores/useAppStore";

export function AudioWorkbench() {
  const setAudioFileName = useAppStore((state) => state.setAudioFileName);
  const [file, setFile] = useState<File>();
  const [url, setUrl] = useState<string>();
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(RECOMMENDED_MAX_DURATION_SECONDS);
  const [gain, setGain] = useState(0.8);
  const [loop, setLoop] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const bars = useMemo(
    () => Array.from({ length: 80 }, (_, index) => 16 + ((index * 37 + (file?.name.length ?? 4) * 11) % 68)),
    [file?.name],
  );

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const loadFile = (next: File) => {
    try {
      const warnings = validateAudioFile(next);
      if (url) URL.revokeObjectURL(url);
      setFile(next);
      setUrl(URL.createObjectURL(next));
      setAudioFileName(next.name);
      setMessage(warnings.join(" "));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "File non valido");
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.currentTime = Math.max(start, Math.min(audio.currentTime, end));
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="audio-workbench">
      <div className="field-heading">
        <div><label htmlFor="audio-file">Estratto audio <span>facoltativo</span></label><small>WAV, AIFF, MP3, M4A, FLAC · max 50 MB · consigliati 30 s</small></div>
        {file ? <button className="text-button" type="button" onClick={() => { setFile(undefined); setUrl(undefined); setAudioFileName(undefined); }}>Rimuovi</button> : null}
      </div>
      {!file ? (
        <label className="drop-zone" htmlFor="audio-file">
          <input id="audio-file" type="file" accept=".wav,.aif,.aiff,.mp3,.m4a,.flac,audio/*" onChange={(event) => { const next = event.target.files?.[0]; if (next) loadFile(next); }} />
          <span className="upload-icon">↥</span>
          <strong>Seleziona un estratto ottenuto legalmente</strong>
          <small>Il file non viene caricato nel cloud in modalità demo.</small>
        </label>
      ) : (
        <div className="waveform-panel">
          <audio
            ref={audioRef}
            src={url}
            loop={loop}
            onLoadedMetadata={(event) => { const value = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0; setDuration(value); setEnd(Math.min(value, RECOMMENDED_MAX_DURATION_SECONDS)); }}
            onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= end) { if (loop) event.currentTarget.currentTime = start; else { event.currentTarget.pause(); setPlaying(false); } } }}
            onEnded={() => setPlaying(false)}
          />
          <div className="waveform" aria-label={`Forma d'onda simulata per ${file.name}`}>
            {bars.map((height, index) => {
              const position = duration ? (index / bars.length) * duration : 0;
              const selected = position >= start && position <= end;
              return <span key={index} className={selected ? "selected" : ""} style={{ height: `${height}%` }} />;
            })}
          </div>
          <div className="audio-controls">
            <button type="button" className="play-button" onClick={() => void togglePlay()} aria-label={playing ? "Pausa" : "Riproduci"}>{playing ? "Ⅱ" : "▶"}</button>
            <div className="range-field"><label htmlFor="trim-start">Inizio <strong>{start.toFixed(1)}s</strong></label><input id="trim-start" type="range" min="0" max={Math.max(0, end - 0.1)} step="0.1" value={start} onChange={(event) => setStart(Number(event.target.value))} /></div>
            <div className="range-field"><label htmlFor="trim-end">Fine <strong>{end.toFixed(1)}s</strong></label><input id="trim-end" type="range" min={Math.min(duration, start + 0.1)} max={duration || RECOMMENDED_MAX_DURATION_SECONDS} step="0.1" value={end} onChange={(event) => setEnd(Number(event.target.value))} /></div>
            <div className="range-field narrow"><label htmlFor="audio-gain">Gain <strong>{Math.round(gain * 100)}%</strong></label><input id="audio-gain" type="range" min="0" max="1" step="0.05" value={gain} onChange={(event) => { const value = Number(event.target.value); setGain(value); if (audioRef.current) audioRef.current.volume = value; }} /></div>
            <label className="check-control"><input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} /> Loop</label>
          </div>
          <div className="file-meta"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(1)} MB · regione {(end - start).toFixed(1)}s</span></div>
        </div>
      )}
      {message ? <p className="field-message">{message}</p> : null}
    </div>
  );
}
