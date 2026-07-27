import { ROUTES } from './constants/routes';

export interface BackNavigation {
  canGoBack(): boolean;
  goBack(): void;
  navigate(routeName: string, params?: unknown): void;
  getParent?(): BackNavigation | undefined;
}

export function navigateBackOrFeed(navigation: BackNavigation): void {
  const visited = new Set<BackNavigation>();
  let current: BackNavigation | undefined = navigation;
  let root = navigation;

  while (current && !visited.has(current)) {
    visited.add(current);
    root = current;

    if (current.canGoBack()) {
      current.goBack();
      return;
    }

    current = current.getParent?.();
  }

  root.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.FEED });
}
