Description: Setup and handoff guide for connecting Stitch MCP to Codex and using Stitch as the design-only source for VnseeaRn screens.

# Stitch MCP Setup And Design Handoff

## Goal

Use Stitch for visual screen design only.
Use Codex for React Native implementation, DDD/MVVM boundaries, file placement, navigation, ViewModels, and code quality.

Stitch does not need to understand the full app architecture. It only needs enough design context to produce consistent screens.

## Current Codex MCP Config

Codex reads MCP servers from:

```txt
C:\Users\DELL\.codex\config.toml
```

The working Stitch MCP block is:

```toml
[mcp_servers.stitch]
command = "npx"
args = ["-y", "@_davideast/stitch-mcp", "proxy"]
env = { STITCH_PROJECT_ID = "vnseea-2026" }
```

After changing this file, restart VS Code and the Codex extension.

## Setup Steps

Run the Stitch MCP wizard:

```powershell
npx @_davideast/stitch-mcp init
```

Choose:

```txt
Client: Codex CLI
Auth mode: OAuth
Connection: Proxy (Recommended for Dev)
Project: vnseea-2026
```

If the wizard asks to configure gcloud path, use PowerShell syntax:

```powershell
$env:PATH = "C:\Users\DELL\.stitch-mcp\google-cloud-sdk\bin;$env:PATH"
```

If Google Cloud auth is needed:

```powershell
$env:CLOUDSDK_CONFIG = "C:\Users\DELL\.stitch-mcp\config"
& "C:\Users\DELL\.stitch-mcp\google-cloud-sdk\bin\gcloud.cmd" auth login
```

If Application Default Credentials are missing:

```powershell
$env:CLOUDSDK_CONFIG = "C:\Users\DELL\.stitch-mcp\config"
& "C:\Users\DELL\.stitch-mcp\google-cloud-sdk\bin\gcloud.cmd" auth application-default login
```

Verify ADC:

```powershell
& "C:\Users\DELL\.stitch-mcp\google-cloud-sdk\bin\gcloud.cmd" auth application-default print-access-token
```

If this prints a long `ya29...` token, OAuth is working.

## Troubleshooting

If the wizard completes but `config.toml` does not contain Stitch:

1. Add the `[mcp_servers.stitch]` block manually.
2. Restart VS Code.
3. Start a new Codex session.

If the wizard says it cannot obtain an access token:

1. Run `gcloud auth application-default login`.
2. Verify with `gcloud auth application-default print-access-token`.
3. Run the wizard again.

If Codex cannot see Stitch after config is present:

```powershell
npx @_davideast/stitch-mcp doctor --verbose
```

## Design Inputs For Stitch

Give Stitch these project files as design context:

```txt
assets/styles/tokens.css
skills/ui-development/SKILL.md
skills/ux-guidelines/SKILL.md
docs/screen-ui-plan.md
```

These files help Stitch keep screens visually consistent:

- `tokens.css`: colors, typography, surfaces, radius, spacing, buttons, avatars, icons.
- `ui-development/SKILL.md`: NativeWind/token usage and screen template expectations.
- `ux-guidelines/SKILL.md`: touch feedback, hit slop, loading/empty states, keyboard behavior, safe area.
- `screen-ui-plan.md`: screen owner, dependent domains, reference screenshot path, route key, and status.

## What Stitch Can Keep Consistent

If Stitch receives `tokens.css` and the UI/UX skill docs, it can keep the design mostly aligned on:

- brand blue and neutral palette
- text hierarchy
- card shape and surface style
- button hierarchy
- avatar/icon sizing
- safe-area-aware screen layout
- loading, empty, and error state expectations
- Vietnamese product copy style

This improves consistency across generated screen designs.

## What Stitch Cannot Guarantee

Stitch is still only the design source. It must not be treated as the code authority.

Stitch cannot guarantee:

- correct DDD owner
- correct `src/{domain}` file placement
- correct ViewModel boundaries
- route registration in `src/navigation`
- mock-data shape that matches project usage
- no accidental API calls
- NativeWind class choices that compile in this app
- React Native interaction details such as `activeOpacity`, `hitSlop`, keyboard handling, and safe area

Codex must translate Stitch design into project code using the local skills.

## Recommended Stitch Prompt

Use this prompt when asking Stitch for a screen:

```txt
Design a mobile React Native screen for VnseeaRn.
This is design only, do not produce production code.

Use the visual system from:
- assets/styles/tokens.css
- skills/ui-development/SKILL.md
- skills/ux-guidelines/SKILL.md

Screen: {screenName}
Owning domain: {owningDomain}
Dependent domains shown on screen: {dependentDomains}
Target reference path: docs/reference-screens/{fileName}.png

Visual rules:
- Vietnamese UI text.
- Brand blue primary color.
- Light app background.
- White cards with subtle blue border/shadow.
- Use the provided typography hierarchy.
- Include realistic loading/empty/error state direction if relevant.
- Keep touch targets large and mobile friendly.

Output:
- A final screen design or image export.
- Notes about visual states and component sections.
```

## Codex Implementation Prompt After Stitch

After Stitch creates the design, export or reference it and ask Codex:

```txt
Use the Stitch design/reference screenshot at docs/reference-screens/{fileName}.png.
Build the React Native UI for {screenName}.

Owning domain: {owningDomain}
Dependent domains: {dependentDomains}

Follow:
- docs/screen-ui-plan.md
- assets/styles/tokens.css
- skills/ui-development/SKILL.md
- skills/ux-guidelines/SKILL.md

Rules:
- UI-only phase.
- No real API calls.
- ViewModel returns mock data.
- Screen consumes ViewModel.
- NativeWind className only, no StyleSheet.create.
- UI text in Vietnamese.
```

## Practical Rule

Stitch decides the visual.
Codex decides the code.

If a Stitch design conflicts with DDD, keep the visual intent but implement it under the correct owning domain and ViewModel.
