const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('runtime globals bootstrap', () => {
  it('loads runtime global polyfills before any app dependency import', () => {
    const indexSource = readProjectFile('index.js');
    const importLines = indexSource
      .split('\n')
      .filter(line => line.startsWith('import '));

    expect(importLines[0]).toBe(
      "import './src/shared-kernel/infrastructure/polyfills/runtimeGlobals';",
    );
    expect(indexSource).not.toContain('class Event {');
    expect(indexSource).not.toContain('class CustomEvent extends');
  });

  it('installs browser globals needed by LiveKit for Hermes startup', () => {
    const polyfillPath = path.join(
      root,
      'src/shared-kernel/infrastructure/polyfills/runtimeGlobals.js',
    );

    expect(fs.existsSync(polyfillPath)).toBe(true);
    if (!fs.existsSync(polyfillPath)) return;

    const polyfillSource = fs.readFileSync(polyfillPath, 'utf8');
    expect(polyfillSource).toContain('RuntimeDOMException');
    expect(polyfillSource).toContain('RuntimeTextEncoder');
    expect(polyfillSource).toContain('RuntimeTextDecoder');
    expect(polyfillSource).toContain("defineRuntimeGlobal('DOMException'");
    expect(polyfillSource).toContain("defineRuntimeGlobal('TextEncoder'");
    expect(polyfillSource).toContain("defineRuntimeGlobal('TextDecoder'");
    expect(polyfillSource).toContain("defineRuntimeGlobal('atob'");
    expect(polyfillSource).toContain("defineRuntimeGlobal('btoa'");
    expect(polyfillSource).toContain("defineRuntimeGlobal('Event'");
    expect(polyfillSource).toContain("defineRuntimeGlobal('CustomEvent'");
    expect(polyfillSource).toContain('runtimeRoot.window');
  });

  it('can encode and decode UTF-8 when Hermes lacks TextEncoder and TextDecoder', () => {
    const polyfillPath = path.join(
      root,
      'src/shared-kernel/infrastructure/polyfills/runtimeGlobals.js',
    );
    const originalGlobals = {
      TextEncoder: global.TextEncoder,
      TextDecoder: global.TextDecoder,
      window: global.window,
    };

    try {
      jest.resetModules();
      Object.defineProperty(global, 'TextEncoder', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      Object.defineProperty(global, 'TextDecoder', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      global.window = {};

      require(polyfillPath);

      const encoded = new global.TextEncoder().encode('VNSEEA ✓ gọi');
      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(new global.TextDecoder().decode(encoded)).toBe('VNSEEA ✓ gọi');
      expect(global.window.TextEncoder).toBe(global.TextEncoder);
      expect(global.window.TextDecoder).toBe(global.TextDecoder);
    } finally {
      Object.defineProperty(global, 'TextEncoder', {
        configurable: true,
        writable: true,
        value: originalGlobals.TextEncoder,
      });
      Object.defineProperty(global, 'TextDecoder', {
        configurable: true,
        writable: true,
        value: originalGlobals.TextDecoder,
      });

      if (typeof originalGlobals.window === 'undefined') {
        delete global.window;
      } else {
        global.window = originalGlobals.window;
      }

      jest.resetModules();
    }
  });

  it('can encode and decode base64 when Hermes lacks atob and btoa', () => {
    const polyfillPath = path.join(
      root,
      'src/shared-kernel/infrastructure/polyfills/runtimeGlobals.js',
    );
    const originalGlobals = {
      atob: global.atob,
      btoa: global.btoa,
      window: global.window,
    };

    try {
      jest.resetModules();
      Object.defineProperty(global, 'atob', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      Object.defineProperty(global, 'btoa', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      global.window = {};

      require(polyfillPath);

      expect(global.btoa('VNSEEA')).toBe('Vk5TRUVB');
      expect(global.atob('Vk5TRUVB')).toBe('VNSEEA');
      expect(global.window.atob).toBe(global.atob);
      expect(global.window.btoa).toBe(global.btoa);
    } finally {
      Object.defineProperty(global, 'atob', {
        configurable: true,
        writable: true,
        value: originalGlobals.atob,
      });
      Object.defineProperty(global, 'btoa', {
        configurable: true,
        writable: true,
        value: originalGlobals.btoa,
      });

      if (typeof originalGlobals.window === 'undefined') {
        delete global.window;
      } else {
        global.window = originalGlobals.window;
      }

      jest.resetModules();
    }
  });
});
