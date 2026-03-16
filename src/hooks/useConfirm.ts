import { useState, useCallback, createContext, useContext } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const CLOSED: Omit<ConfirmDialogState, "onConfirm" | "onCancel"> = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  destructive: false,
};

export const ConfirmContext = createContext<ConfirmFn>(
  () => Promise.resolve(false),
);

export function useConfirmProvider() {
  const [state, setState] = useState<ConfirmDialogState>({
    ...CLOSED,
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || "Confirm",
        destructive: options.destructive ?? false,
        onConfirm: () => {
          setState((prev) => ({ ...prev, ...CLOSED }));
          resolve(true);
        },
        onCancel: () => {
          setState((prev) => ({ ...prev, ...CLOSED }));
          resolve(false);
        },
      });
    });
  }, []);

  return { dialogState: state, confirm };
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}
