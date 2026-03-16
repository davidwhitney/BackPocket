import { Routes, Route } from "react-router-dom";
import { useConfig } from "./hooks/useConfig";
import { useBookmarks } from "./hooks/useBookmarks";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { useSync } from "./hooks/useSync";
import { useConfirmProvider, ConfirmContext } from "./hooks/useConfirm";
import { Layout } from "./components/Layout";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { BookmarkList } from "./pages/BookmarkList";
import { AddBookmark } from "./pages/AddBookmark";
import { ViewBookmark } from "./pages/ViewBookmark";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  const configHook = useConfig();
  const { scheduleSync, syncNow } = useSync({
    config: configHook.config,
    setConfig: configHook.setConfig,
  });
  const bookmarkHook = useBookmarks(scheduleSync);
  const networkStatus = useNetworkStatus();
  const { dialogState, confirm } = useConfirmProvider();
  const viewMode = configHook.config.viewMode;

  const handleSettingsDataChange = () => {
    bookmarkHook.refresh();
    scheduleSync();
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      <Layout networkStatus={networkStatus}>
        <Routes>
          <Route
            path="/"
            element={<BookmarkList bookmarks={bookmarkHook} viewMode={viewMode} />}
          />
          <Route
            path="/add"
            element={<AddBookmark bookmarks={bookmarkHook} />}
          />
          <Route
            path="/view/:id"
            element={<ViewBookmark bookmarks={bookmarkHook} />}
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                config={configHook}
                onDataChange={handleSettingsDataChange}
                syncNow={syncNow}
              />
            }
          />
        </Routes>
      </Layout>
      <ConfirmDialog {...dialogState} />
    </ConfirmContext.Provider>
  );
}
