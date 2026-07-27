import { useEffect, useRef, useState, type ChangeEvent, type PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { copy } from "../i18n/it";
import {
  openProjectFile,
  parseProjectFileContents,
  saveProjectFile,
} from "../services/projectFiles";
import { selectActiveProposal, selectIsDirty, useAppStore } from "../stores/useAppStore";

const navItems = [
  { to: "/", label: copy.nav.home, icon: "⌂" },
  { to: "/new", label: copy.nav.newSound, icon: "+" },
  { to: "/panel", label: copy.nav.panel, icon: "◉" },
  { to: "/menus", label: copy.nav.menus, icon: "▤" },
  { to: "/compare", label: copy.nav.compare, icon: "⇄" },
  { to: "/settings", label: copy.nav.settings, icon: "⚙" },
];

export function AppShell({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const proposal = useAppStore(selectActiveProposal);
  const status = useAppStore((state) => state.statusMessage);
  const dirty = useAppStore(selectIsDirty);
  const loadProject = useAppStore((state) => state.loadProject);
  const toProject = useAppStore((state) => state.toProject);
  const [projectNotice, setProjectNotice] = useState("");
  const browserProjectInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  const handleSave = async () => {
    try {
      setProjectNotice(await saveProjectFile(toProject()));
    } catch (error) {
      setProjectNotice(error instanceof Error ? error.message : "Salvataggio non riuscito");
    }
  };

  const handleOpen = async () => {
    try {
      if (!window.__TAURI_INTERNALS__) {
        browserProjectInput.current?.click();
        return;
      }
      const project = await openProjectFile();
      if (project) loadProject(project);
      else setProjectNotice("Apertura annullata");
    } catch (error) {
      setProjectNotice(error instanceof Error ? error.message : "Apertura non riuscita");
    }
  };

  const handleBrowserProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      loadProject(parseProjectFileContents(await file.text()));
      setProjectNotice(`Progetto aperto: ${file.name}`);
    } catch (error) {
      setProjectNotice(error instanceof Error ? error.message : "Apertura non riuscita");
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            SPA
          </div>
          <div>
            <strong>SUMMIT</strong>
            <span>PATCH ARCHITECT</span>
          </div>
        </div>
        <nav aria-label="Navigazione principale">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              key={item.to}
              to={item.to}
              end={item.to === "/"}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-pill">
            <span className="status-dot amber" /> MIDI non verificato
          </div>
          <p>{copy.disclaimer}</p>
        </div>
      </aside>

      <div className="main-column">
        <input
          ref={browserProjectInput}
          className="visually-hidden"
          type="file"
          accept=".summitproject,application/json"
          aria-label="Seleziona file progetto"
          onChange={(event) => void handleBrowserProject(event)}
        />
        <header className="topbar">
          <div>
            <span className="eyebrow">PROGETTO ATTIVO</span>
            <strong>{proposal?.patch.name ?? "Nessuna patch"}</strong>
          </div>
          <div className="topbar-status" role="status">
            <span className={`status-dot ${dirty ? "amber" : "green"}`} /> {status}
          </div>
          <div className="topbar-actions">
            <button className="button subtle" onClick={() => void handleOpen()}>
              Apri
            </button>
            <button
              className="button subtle"
              onClick={() => void handleSave()}
              disabled={!proposal}
            >
              Salva
            </button>
          </div>
        </header>
        {projectNotice ? (
          <button className="project-notice" onClick={() => setProjectNotice("")}>
            {projectNotice}
          </button>
        ) : null}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
