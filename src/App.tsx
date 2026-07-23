import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RefinementBar } from "./components/RefinementBar";
import { ComparePage } from "./features/compare/ComparePage";
import { HomePage } from "./features/home/HomePage";
import { MenusPage } from "./features/menus/MenusPage";
import { NewSoundPage } from "./features/new-sound/NewSoundPage";
import { PhysicalPanelPage } from "./features/panel/PhysicalPanelPage";
import { SettingsPage } from "./features/settings/SettingsPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<NewSoundPage />} />
        <Route path="/panel" element={<PhysicalPanelPage />} />
        <Route path="/menus" element={<MenusPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <RefinementBar />
    </AppShell>
  );
}
