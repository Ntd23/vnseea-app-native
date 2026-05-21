---
name: ux-guidelines
description: Use this skill when designing user interactions, animations, error handling, and state representations (loading, empty states) for VnseeaRn.
license: Proprietary
metadata:
  author: Vnseea
  version: "1.0"
---

# VnseeaRn — UX Guidelines

## 1. Touch Targets & Interactions
- **Opacity Feedback**: All touchable elements MUST provide visual feedback.
  - Primary/solid buttons: `activeOpacity={0.9}`.
  - Cards, list items, icon buttons: `activeOpacity={0.8}`.
- **Hit Slop**: For small icon buttons (e.g., in headers or inputs), add `hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}` to improve tap accuracy.

## 2. Loading & Empty States
- Always show loading indicators when waiting for data.
- During the **UI-only phase**, simulate loading in ViewModels using `setTimeout` or provide a toggle to preview loading states.
- Empty states must be informative, not just blank screens. Provide a clear message (e.g., "Bạn chưa có bài viết nào") and a call-to-action button if applicable.

## 3. Transitions & Animations
- Screen transitions are handled by React Navigation (Native Stack default transitions).
- For interactive elements (like custom switches, accordions, or like buttons), use React Native's `LayoutAnimation` or `Reanimated` for smooth micro-interactions.

## 4. Keyboard Handling
- Use `KeyboardAvoidingView` or `ScrollView` wrapped with `keyboardShouldPersistTaps="handled"` for screens with multiple text inputs.
- Ensure the primary CTA (Call To Action) button remains visible or easily accessible when the keyboard is open.

## 5. Safe Area
- Always wrap the main screen component in `SafeAreaView` from `react-native-safe-area-context` (NOT `react-native`).
- If a screen has a full-bleed colored header (like the Auth screens), apply the background color to the `SafeAreaView` itself, so the status bar area matches the header color smoothly.

## 6. Typography & Contrast
- Maintain high contrast for readable text. Use `.text-body-secondary` (`#64748B`) for descriptive text, but ensure actionable links are highly visible using `.text-link` (`#0700FF`).
- Adhere to the defined font hierarchy in `tokens.css` (do not introduce arbitrary font sizes or weights).
