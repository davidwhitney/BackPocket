import { useCallback } from "react";
import { useConfirm } from "./useConfirm.ts";

export function useBookmarkDelete(onDelete: (id: string) => Promise<void>) {
  const confirm = useConfirm();

  return useCallback(async (id: string, title: string) => {
    const ok = await confirm({
      title: "Delete bookmark",
      message: `Delete "${title}" permanently?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) await onDelete(id);
  }, [confirm, onDelete]);
}
