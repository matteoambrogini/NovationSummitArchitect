import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { summitProjectFileSchema, type SummitProjectFile } from "../domain/schemas";

function downloadJson(project: SummitProjectFile) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${project.proposals.find((proposal) => proposal.proposalId === project.activeProposalId)?.patch.name ?? "summit-patch"}.summitproject`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function parseProjectFileContents(contents: string): SummitProjectFile {
  let candidate: unknown;
  try {
    candidate = JSON.parse(contents) as unknown;
  } catch {
    throw new Error("Il file progetto non contiene JSON valido");
  }
  return summitProjectFileSchema.parse(candidate);
}

export async function saveProjectFile(project: SummitProjectFile): Promise<string> {
  const validProject = summitProjectFileSchema.parse(project);
  if (!window.__TAURI_INTERNALS__) {
    downloadJson(validProject);
    return "Progetto esportato dal browser";
  }
  const path = await save({
    title: "Salva progetto Summit Patch Architect",
    filters: [{ name: "Summit project", extensions: ["summitproject"] }],
  });
  if (!path) return "Salvataggio annullato";
  const target = path.endsWith(".summitproject") ? path : `${path}.summitproject`;
  await invoke("save_project", { path: target, contents: JSON.stringify(validProject, null, 2) });
  return `Progetto salvato: ${target}`;
}

export async function openProjectFile(): Promise<SummitProjectFile | undefined> {
  if (!window.__TAURI_INTERNALS__) return undefined;
  const path = await open({
    title: "Apri progetto Summit Patch Architect",
    multiple: false,
    directory: false,
    filters: [{ name: "Summit project", extensions: ["summitproject"] }],
  });
  if (!path || Array.isArray(path)) return undefined;
  const contents = await invoke<string>("open_project", { path });
  return parseProjectFileContents(contents);
}
