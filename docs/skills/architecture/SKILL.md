---
name: architecture
description: Use this skill when creating new files, refactoring logic, or structuring code in VnseeaRn. It contains the Domain-Driven Design (DDD) + MVVM rules, file placement, and the 36-domain structure.
license: Proprietary
metadata:
  author: Vnseea
  version: "1.0"
---

# VnseeaRn — Architecture Skill

## 1. Domain-Driven Design (DDD) + MVVM Structure
VnseeaRn uses a 36-domain DDD architecture mirrored from the web client.
EACH domain consists of 4 layers:
1. `domain/`: Types, interfaces, repository interfaces (NO UI, NO React Native code).
2. `application/`: ViewModels (React custom hooks) and UseCases.
3. `infrastructure/`: API Client repositories (axios implementations).
4. `presentation/`: React Native Screens and Components.

**IMPORTANT:** Currently, the project is in the **UI-only phase**. 
- Only work in the `presentation/` and `application/view-models/` folders.
- Do NOT make real API calls in `infrastructure/`.
- ViewModels must return static/mock data.

## 2. File Placement Rules
When adding a new screen, always place it in the correct domain:
- Screen: `src/{domain}/presentation/screens/{Name}Screen.tsx`
- Component: `src/{domain}/presentation/components/{Name}.tsx`
- ViewModel: `src/{domain}/application/view-models/use{Name}ViewModel.ts`

### 36 Domains (Categorized by Phase)
- **Phase 1 (MVP)**: `auth`, `profile`, `settings`, `feed`, `messages`, `notifications`, `community`, `pages`, `search`, `stories`
- **Phase 2**: `explore`, `photos`, `reels`, `blogs`, `events`, `live`, `movies`, `games`, `popular`, `memories`, `saved`, `poke`
- **Phase 3**: `product`, `orders`, `checkout`, `market`, `funding`, `wallet`, `withdrawal`, `go-pro`, `jobs`, `forum`, `directory`
- **Core**: `shared-kernel`, `foundation`, `navigation`

## 3. ViewModels (Mock Data Pattern)
Do not write state management inside Screens. Delegate it to ViewModels.
\`\`\`ts
// src/feed/application/view-models/useFeedViewModel.ts
import {useState} from 'react';

const MOCK_DATA = [{id: '1', title: 'Post 1'}];

export function useFeedViewModel() {
  const [items] = useState(MOCK_DATA);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  return {items, isLoading, error};
}
\`\`\`

## 4. Navigation Rules
When adding a new route:
1. Define it in `src/navigation/constants/routes.ts`:
\`\`\`ts
export const ROUTES = {
  // ...
  FEED: 'Feed',
} as const;
\`\`\`
2. Register the screen in `src/navigation/AppNavigator.tsx`:
\`\`\`tsx
import FeedScreen from '../feed/presentation/screens/FeedScreen';
<Stack.Screen name={ROUTES.FEED} component={FeedScreen} />
\`\`\`
3. Always import `ROUTES` relatively from the screen file (usually 4 levels up).
