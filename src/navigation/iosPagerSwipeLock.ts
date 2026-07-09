type Listener = (locked: boolean) => void;

const listeners = new Set<Listener>();
let isLocked = false;

export const iosPagerSwipeLock = {
  getLocked() {
    return isLocked;
  },
  setLocked(locked: boolean) {
    if (isLocked === locked) {
      return;
    }

    isLocked = locked;
    listeners.forEach(listener => listener(locked));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
