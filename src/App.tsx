import { Routes, Route } from "react-router-dom";
import { useConfig } from "./hooks/useConfig.ts";
import { useBookmarks } from "./hooks/useBookmarks.ts";
import { useNetworkStatus } from "./hooks/useNetworkStatus.ts";
import { useSync } from "./hooks/useSync.ts";
import { useConfirmProvider, ConfirmContext } from "./hooks/useConfirm.ts";
import { Layout } from "./components/Layout.tsx";
import { ConfirmDialog } from "./components/ConfirmDialog.tsx";
import { BookmarkList } from "./pages/BookmarkList.tsx";
import { AddBookmark } from "./pages/AddBookmark.tsx";
import { ViewBookmark } from "./pages/ViewBookmark.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";

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
