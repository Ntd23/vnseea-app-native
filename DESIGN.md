# VnseeaRn Design System

## Product Feel

VnseeaRn is a Vietnamese social and commerce mobile app.
The interface should feel clean, fast, trustworthy, and familiar for everyday mobile use.

Design screens as real app surfaces, not marketing pages.
Prioritize readable content, clear actions, and compact mobile layouts.

## Existing App Reference

VnseeaRn should be designed from the existing sample/demo app interface whenever a reference is available.

The sample app is the visual and product reference for:

- feature intent
- screen composition
- content hierarchy
- navigation patterns
- main user flows
- relative placement of actions
- density and information grouping

The new React Native UI does not need to be a pixel-perfect clone.
It should feel like a native mobile version of the existing app while using the VnseeaRn design tokens in this document.

When a sample screen exists:

1. Keep the same feature purpose.
2. Keep the same primary and secondary user actions.
3. Preserve the main content order and information hierarchy.
4. Adapt layout for mobile ergonomics and safe areas.
5. Replace web-specific UI patterns with native mobile patterns.
6. Use VnseeaRn colors, typography, spacing, radius, and card styles.

When no sample screen exists:

1. Use related sample screens as style references.
2. Follow the token system and mobile screen patterns in this document.
3. Keep the design consistent with nearby domains.

Reference screenshots should be stored in:

```txt
docs/reference-screens/
```

Use `docs/screen-ui-plan.md` to map each reference screenshot to its owning domain, dependent domains, and route key.

## Design Role

This document is for visual design generation only.

Stitch should define:

- layout
- visual hierarchy
- spacing
- component composition
- screen states
- Vietnamese UI copy

Stitch should not define:

- React Native architecture
- DDD domain ownership
- API calls
- repository structure
- route registration
- production code boundaries

Codex will translate Stitch designs into React Native code using the project architecture.

The design handoff should describe how the Stitch screen relates to the existing app reference:

- which reference screen was used
- which feature behavior was preserved
- which web-specific layout choices were adapted for mobile
- which visual choices intentionally differ from the sample app

## Brand

Primary brand color:

```txt
#0000FF
```

Use brand blue for:

- primary buttons
- active tabs
- selected states
- key links
- important icons
- confirmation accents

Avoid making the whole app one solid blue surface.
Use blue as a strong action and identity color against light neutral surfaces.

## Color Tokens

Use these colors as the design source:

```txt
Primary:
50  #eef0ff
100 #dfe4ff
200 #c5caff
300 #a1a4ff
400 #7b73ff
500 #0000ff
600 #0000e6
700 #0000cc
800 #0000a3
900 #000080

Neutral:
50  #f8fafc
100 #f1f5f9
200 #e2e8f0
300 #cbd5e1
400 #94a3b8
500 #64748b
600 #475569
700 #334155
800 #1e293b
900 #0f172a

Accent:
50  #fff7eb
100 #ffedd5
500 #f59e0b
600 #d97706
700 #b45309

Status:
success #0ea5e9
warning #f59e0b
error   #ef4444
info    #3b82f6
```

Main app background:

```txt
#f1f4fb
```

Main card surface:

```txt
#ffffff
```

Text:

```txt
Primary   #000000
Secondary #64748b
Tertiary  #94a3b8
Inverse   #ffffff
Link      #0000e6
```

Borders should be subtle and slightly blue:

```txt
Light   rgba(0, 0, 255, 0.08)
Default rgba(0, 0, 255, 0.12)
Strong  rgba(0, 0, 255, 0.20)
```

## Typography

Use Vietnamese-friendly typography.

Preferred font hierarchy:

```txt
Primary font: Inter
Secondary font: Be Vietnam Pro
Fallback: system sans-serif
```

Text scale:

```txt
Display: 28px, extra bold, tight line height
Heading: 20px, bold, tight line height
Title:   15px, bold or semibold
Body:    14px, regular
Caption: 12px, regular or medium
Label:   11px, bold uppercase
Micro:   10px
```

Use:

- Display for app logo, hero values, money amounts, or major empty-state title.
- Heading for section headers.
- Title for cards, list rows, user names, product names.
- Body for readable content.
- Caption for metadata, timestamps, helper text.
- Label for badges, categories, and small uppercase markers.

Do not introduce arbitrary font sizes unless a screen truly needs a one-off visual exception.

## Spacing

Use a 4px spacing rhythm:

```txt
4, 8, 12, 16, 20, 24, 32, 40, 48
```

Common mobile layout spacing:

```txt
Screen horizontal padding: 16px to 20px
Card padding: 16px to 24px
List row gap: 10px to 14px
Section gap: 20px to 32px
Button vertical padding: 8px to 14px
```

Avoid loose desktop-style spacing.
Mobile screens should feel dense enough for repeated daily use while staying readable.

## Radius And Shadows

Radius:

```txt
Small  8px
Medium 14px
Large  18px
XL     24px
Full   9999px
```

Cards should usually use 18px to 24px radius.
Buttons and pills should use full radius.
Small controls can use 8px to 14px.

Shadows should be soft and blue-tinted:

```txt
Small: 0 2px 8px rgba(0, 0, 255, 0.04)
Medium: 0 4px 20px rgba(0, 0, 255, 0.06)
Large: 0 8px 32px rgba(0, 0, 255, 0.09)
Brand: 0 4px 14px rgba(0, 0, 255, 0.28)
```

Do not use heavy dark shadows.

## Core Surfaces

Base screen:

- light blue-gray background
- full height
- safe-area aware

Card (Transparent, Soft Border & Glass UI effects):

- semi-transparent white background (rgba(255, 255, 255, 0.15))
- soft border (1px solid rgba(255, 255, 255, 0.2))
- glass blur effect (backdrop-filter: blur(12px))
- soft shadow
- rounded corners (24px)
- content-first layout

Muted surface:

- light neutral background
- used for filters, inactive chips, secondary panels, input backgrounds

Brand surface:

- brand blue background
- white text
- reserved for primary action, selected state, or hero/header moments

## Buttons

Primary button (Glass effect):

- brand blue background (with slight transparency to enable glass effect)
- apply backdrop blur (e.g., backdrop-filter: blur(10px))
- white text
- rounded full
- medium or semibold text
- strong but clean shadow
- used for the main screen action only

Secondary button (Outline effect):

- transparent or white background
- brand blue text
- 2px solid brand blue border
- rounded full

Ghost button (Inset shadow effect):

- transparent background
- apply inset shadow (e.g., box-shadow: inset 0 4px 10px rgba(0, 0, 255, 0.15))
- secondary text
- no border
- used for low-priority actions

Icon button:

- at least 40px touch target
- simple icon
- high contrast
- use subtle background only when needed

## Icons

Use clean line icons for system actions.
Prefer Lucide-style icons for:

- search
- settings
- back
- close
- notification
- wallet
- chat
- send
- plus
- edit
- filter
- calendar
- bookmark
- heart
- share

Use brand icon style only for brand-specific actions such as Facebook or Google.

Icon sizes:

```txt
XS 14px
SM 16px
MD 20px
LG 24px
XL 32px
```

## Avatars

Avatar sizes:

```txt
Small  32px
Medium 40px
Large  48px
XL     64px
```

Use circular avatars.
If no image is available, use initials on a brand or muted background.

## Mobile Screen Patterns

### Auth And Single-Task Screens

Use a strong brand header with a rounded card body when appropriate.

Pattern:

- brand blue hero/header
- small logo or symbol
- app name or screen title
- rounded top content area
- white card for the form or main action
- secondary link below

### Feed And Social Screens

Use compact, scannable blocks:

- top header with search/action icons
- story row or quick actions
- composer card
- feed cards
- clear post actions
- readable metadata

Do not over-decorate the feed.
Content should be easy to scan.

### Profile Screens

Use:

- cover/header area
- avatar overlap
- name and social metadata
- primary action row
- tabs or segmented controls
- card/list content sections

### Wallet, Withdrawal, Checkout, Orders

These screens should feel especially trustworthy.

Use:

- clear balance or amount hierarchy
- compact transaction rows
- strong primary CTA
- visible status badges
- clear warning/error states
- less decorative noise

### Search And Directory Screens

Use:

- search input at top
- chips or filters
- grouped results
- clear empty state
- compact cards or rows

## States

Each screen design should include direction for:

- default
- loading
- empty
- error
- disabled action
- selected item

Loading state:

- simple indicator or skeleton-like blocks
- no blocking full-screen overlay unless the whole screen is unavailable

Empty state:

- helpful Vietnamese message
- optional icon or illustration
- one clear CTA if relevant

Error state:

- concise Vietnamese message
- retry action when possible
- use red only for real errors

## Vietnamese Copy

UI text must be Vietnamese unless the item is a fixed brand/product label.

Tone:

- clear
- direct
- friendly
- not overly playful

Examples:

```txt
Đăng nhập
Tạo tài khoản
Quên mật khẩu?
Bạn chưa có thông báo nào
Rút tiền
Số dư khả dụng
Tiếp tục
Thử lại
Lưu thay đổi
```

## Interaction Expectations

Design all touchable elements with enough size and spacing.

Minimum practical touch target:

```txt
40px by 40px
```

Primary buttons should feel tappable and stable.
Small icon buttons should have enough surrounding space.

Forms should keep the primary CTA visible or easy to reach when the keyboard is open.

## Bottom Navigation

Use a simple bottom tab bar when app-level navigation is needed:

- Feed
- Explore
- Reel
- Notifications
- Setting

Active: brand blue. Inactive: neutral gray. Keep labels short.

## Design Consistency Rules

Do:

- use brand blue consistently for primary action
- use the light app background
- use white cards for grouped content
- keep visual hierarchy compact
- use Vietnamese text
- create screen states
- keep mobile safe areas in mind

Do not:

- create a marketing landing page
- use heavy gradients as the main design language
- use dark mode unless requested for a specific screen
- make every section a floating decorative card
- use random colors outside the token set
- invent new font scales per screen
- use overly large desktop-like typography
- put business architecture into the design output

## Handoff To Codex

For each screen, Stitch should output:

- screen name
- final image/design
- main sections
- visible states
- notes for spacing or interaction
- reference screenshot used from `docs/reference-screens/*`
- notes about what was preserved from the existing app UI
- notes about what was adapted for native mobile usability

Codex will then implement:

- screen file in `src/{domain}/presentation/screens/*`
- components in `src/{domain}/presentation/components/*`
- mock ViewModel in `src/{domain}/application/view-models/*`
- route constants and navigator registration
- NativeWind class names
- React Native touch behavior

## Screen Reference Mapping

Use `docs/screen-ui-plan.md` for:

- owning domain
- dependent domains
- route key
- reference screenshot path
- implementation status

Use `docs/reference-screens/*` for:

- existing app UI reference
- feature parity expectations
- screen composition
- content hierarchy
- action placement

The design can show data from many domains, but the implementation must still have one owning domain.

Example:

```txt
Screen: Withdrawal
Owning domain: withdrawal
Dependent domains: wallet, profile
Reference: docs/reference-screens/withdrawal.png
```

The screen may show wallet balance and profile verification, but Codex will implement it under the `withdrawal` domain.
