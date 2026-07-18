// Description: Backward-compatible aliases for the app-wide Snackbar system.
import { SnackbarProvider, showSnackbar, useSnackbar } from './Snackbar';

export type {
  SnackbarAction as ToastAction,
  SnackbarConfig as ToastConfig,
  SnackbarDuration as ToastDuration,
  SnackbarType as ToastType,
} from './Snackbar';

/** @deprecated Import `showSnackbar` from `Snackbar` instead. */
export const showToast = showSnackbar;

/** @deprecated Import `SnackbarProvider` from `Snackbar` instead. */
export const ToastProvider = SnackbarProvider;

/** @deprecated Import `useSnackbar` from `Snackbar` instead. */
export function useToast() {
  const { showSnackbar: show } = useSnackbar();
  return { show: show, showToast: show };
}

/**
 * @deprecated The Snackbar host is mounted once in App.tsx.
 * Screen-level containers intentionally render nothing.
 */
export function ToastContainer() {
  return null;
}
