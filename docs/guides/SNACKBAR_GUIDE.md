# App Snackbar guide

VNSEEA uses one global Snackbar host mounted in `App.tsx`. Screens and
components only send notification data; they never mount their own host or
choose an arbitrary screen position.

## Standard usage

```ts
import { showSnackbar } from '../../shared-kernel/presentation/components/Snackbar';

showSnackbar({
  message: 'Đã lưu thay đổi.',
  type: 'success',
});
```

Available types are `success`, `error`, `warning`, and `info`.

The default `short` duration is 3.2 seconds. Use `long` for a message that
needs more reading time, or `persistent` only when the Snackbar includes an
action or must be dismissed explicitly.

```ts
showSnackbar({
  message: 'Không thể gửi. Kiểm tra kết nối và thử lại.',
  type: 'error',
  duration: 'long',
  action: {
    label: 'Thử lại',
    onPress: retry,
  },
});
```

## Interaction rules

- Use Snackbar for transient success, error, warning, and informational feedback.
- Keep `Alert.alert` for destructive confirmation, permission decisions, legal
  acknowledgement, or a blocking choice with multiple buttons.
- Do not use `ToastAndroid`; Snackbar must behave identically on Android and iOS.
- Do not render `ToastContainer`, `SnackbarProvider`, or another notification
  host inside a screen.
- Do not pass millisecond durations. Use the standardized duration names.
- Avoid showing several messages for one action. The global queue displays at
  most three and ignores consecutive duplicates.

## Global presentation

- Position: top center, below the device safe-area. The host uses the real top
  inset, so it stays below iPhone Dynamic Island/notches and Android camera
  cutouts/status bars without shifting the screen layout.
- Short duration: 3.2 seconds.
- Long duration: 5 seconds.
- Entry: spring downward from above with opacity and scale.
- Exit: short upward fade.
- Accessibility: live-region alert with a dismiss button on every message.
