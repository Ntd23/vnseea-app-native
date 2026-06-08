type Listener = (visible: boolean) => void;
const listeners = new Set<Listener>();
let isTabBarVisible = true;

export const tabBarVisibility = {
  getVisible() {
    return isTabBarVisible;
  },
  setVisible(visible: boolean) {
    if (isTabBarVisible !== visible) {
      isTabBarVisible = visible;
      listeners.forEach(cb => cb(visible));
    }
  },
  subscribe(cb: Listener) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
