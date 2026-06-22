// Description: Tiny pub/sub used by the top-bar logo button to ask the
// current Feed screen to scroll to top + reload when the user taps the
// logo while already on the Feed tab. Lives outside React so the
// header can fire it without needing a ref into the Feed list.

type Listener = () => void;

const listeners = new Set<Listener>();

export const feedLogoEvents = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emitScrollToTop() {
    listeners.forEach(listener => {
      try {
        listener();
      } catch {
        // Swallow listener errors so one bad subscriber cannot break the
        // others — the home scroll is a UX nicety, never critical.
      }
    });
  },
};
