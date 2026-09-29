const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../LiveKitMiniCallBar.tsx'),
  'utf8',
);

describe('LiveKitMiniCallBar', () => {
  it('renders as a compact right-side card with vertical dragging', () => {
    expect(source).toContain('Gesture.Pan()');
    expect(source).toContain('<GestureDetector gesture={verticalDragGesture}>');
    expect(source).toContain('width: MINI_CALL_BAR_WIDTH');
    expect(source).toContain('right: MINI_CALL_BAR_EDGE_GAP');
    expect(source).toContain('translateY.value');
    expect(source).toContain('getMiniCallBarVerticalBounds');
  });

  it('resets the position only when the active call changes', () => {
    expect(source).toContain('activeCallKey');
    expect(source).toContain('[activeCallKey, bounds.minY, translateY]');
  });

  it('only stays visible for minimized voice calls', () => {
    expect(source).toContain("if (callType === 'video') return null;");
  });
});
