---
name: ui-development
description: Use this skill when building or styling UI components and screens for the VnseeaRn app. It contains the design tokens, layout templates, and NativeWind styling guidelines.
license: Proprietary
metadata:
  author: Vnseea
  version: '1.0'
---

# VnseeaRn — UI Development Skill

## 1. Core Stack

- **Styling**: NativeWind v4 (Tailwind className syntax).
- **Icons**: `react-native-vector-icons/FontAwesome` for brands (Facebook, Google). `lucide-react-native` for system icons.
- **Tokens**: Design tokens are centralized in `assets/styles/tokens.css` (imported via `global.css`).

## 1.1 Token-First Rule

- All app screens and components must use `assets/styles/tokens.css` utility classes first.
- Use token utilities for typography, surfaces, buttons, cards, app bars, icon chips, input shells, avatars, colors, radius, and shadows.
- Do not duplicate token values with ad hoc classes like `bg-[#...]`, `text-[...]`, `rounded-[...]`, or `shadow-[...]` when a token utility already exists.
- Arbitrary NativeWind values are allowed only for screen-specific layout geometry that is not a design token, such as exact Stitch spacing, one-off width/height, or safe-area composition.
- If a Stitch or reference design needs a repeated visual primitive that is missing from `tokens.css`, add a reusable utility to `tokens.css` first, then use that class in the screen.
- Stitch/reference screens define layout and hierarchy; `tokens.css` defines the app-wide visual language.

## 2. Custom Utility Classes

PRIORITIZE these custom classes from `tokens.css` over writing verbose Tailwind strings:

### Typography

- `.text-display`: 28px, extrabold (hero text)
- `.text-heading`: 20px, bold (section headers)
- `.text-title-primary`: 15px, bold (primary item titles)
- `.text-title-secondary`: 15px, semibold (secondary item titles)
- `.text-body-primary`: 14px, regular (main body)
- `.text-body-secondary`: 14px, regular (secondary body)
- `.text-caption-primary`: 12px, medium
- `.text-caption-secondary`: 12px, regular
- `.text-label-primary`: 11px, bold, uppercase
- `.text-brand`: brand blue color
- `.text-link`: brand blue, underline on hover

### Surfaces

- `.surface-base`: Background color for screens (`#f1f4fb` or equivalent)
- `.surface-card`: White card with light border, xl radius, md shadow
- `.surface-card-hover`: Card with interactive hover shadow
- `.surface-brand`: Blue brand background, white text
- `.surface-muted`: Light gray/slate background
- `.surface-topbar`: Light top app bar with subtle token border and shadow
- `.surface-panel`: Light bordered panel/card with token radius and shadow
- `.input-shell`: Standard form input shell using token background, border, and radius
- `.icon-chip`: Circular muted brand icon surface

### Buttons

- `.btn-primary`: Brand blue button, rounded-full
- `.btn-secondary`: Transparent button with default border
- `.btn-ghost`: Transparent button, interactive hover background

### Avatars & Icons

- Avatars: `.avatar-sm` (32px), `.avatar-md` (40px), `.avatar-lg` (48px), `.avatar-xl` (64px)
- Icons: `.icon-sm` (16px), `.icon-md` (20px), `.icon-lg` (24px)
- Icon colors: `.icon-primary`, `.icon-secondary`, `.icon-brand`

## 3. Screen Templates

Reference and Stitch designs take precedence over generic templates. Pick the auth/single-task structure that matches the reference:

- Hero header + rounded card body
- Top app bar + centered card
- No-footer single-task card

Use this hero pattern only when there is no more specific Stitch/reference layout:
\`\`\`tsx
import React from 'react';
import {StatusBar, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ROUTES} from '../../../../navigation/constants/routes';

export default function ExampleScreen() {
const navigation = useNavigation<any>();
return (
<SafeAreaView className="flex-1 surface-base">
<StatusBar barStyle="light-content" />
<View className="flex-1">
{/_ Hero Header _/}
<View className="overflow-hidden bg-[#0700FF] px-6 pb-16 pt-5">
<View className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-white/8" />
<View className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/8" />
<View className="items-center pt-10">
<View className="h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/12">
<Text className="text-3xl text-inverse">V</Text>
</View>
<Text className="mt-4 text-display text-inverse">VNSEEA</Text>
<Text className="mt-1 text-label-primary text-white/75">SUBTITLE</Text>
</View>
</View>
{/_ Card Body _/}
<View className="-mt-10 flex-1 rounded-t-[38px] surface-base px-5 pt-5">
<View className="surface-card px-6 py-7">
{/_ content here _/}
</View>
<View className="flex-row items-center justify-center py-5">
<Text className="text-body-secondary">Action text? </Text>
<TouchableOpacity activeOpacity={0.8} onPress={() => {}}>
<Text className="text-body-primary text-link">Link</Text>
</TouchableOpacity>
</View>
</View>
</View>
</SafeAreaView>
);
}
\`\`\`

## 4. UI Rules

- DO NOT use `StyleSheet.create`. Use NativeWind + tokens.css utility classes.
- DO NOT hardcode colors, typography, borders, shadows, cards, inputs, or buttons when a `tokens.css` utility exists.
- Add missing reusable primitives to `assets/styles/tokens.css` instead of repeating arbitrary Tailwind values across screens.
- UI text must be in Vietnamese.
- Buttons must use `activeOpacity={0.8}` or `0.9`.
- DO NOT import `Facebook` from `lucide-react-native` (it does not exist). Use `FontAwesome`.
