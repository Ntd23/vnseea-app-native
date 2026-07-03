// Description: Registers React Native app globals and mounts the VNSEEA root component.
/* global globalThis */
/**
 * @format
 */
import 'react-native-gesture-handler';
import './global.css';

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';

const runtimeRoot = typeof globalThis !== 'undefined' ? globalThis : global;

if (typeof runtimeRoot.Event === 'undefined') {
  runtimeRoot.Event = class Event {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = Boolean(options.bubbles);
      this.cancelable = Boolean(options.cancelable);
      this.defaultPrevented = false;
      this.timeStamp = Date.now();
    }

    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true;
    }
  };
}

if (typeof runtimeRoot.CustomEvent === 'undefined') {
  runtimeRoot.CustomEvent = class CustomEvent extends runtimeRoot.Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail;
    }
  };
}

global.Event = runtimeRoot.Event;
global.CustomEvent = runtimeRoot.CustomEvent;

if (typeof runtimeRoot.DOMException === 'undefined') {
  runtimeRoot.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}
global.DOMException = runtimeRoot.DOMException;

if (typeof runtimeRoot.TextEncoder === 'undefined') {
  runtimeRoot.TextEncoder = class TextEncoder {
    constructor() {
      this.encoding = 'utf-8';
    }
    encode(string) {
      const units = [];
      const codePoints = [];
      for (let i = 0; i < string.length; i++) {
        const code = string.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff && i + 1 < string.length) {
          const next = string.charCodeAt(i + 1);
          if (next >= 0xdc00 && next <= 0xdfff) {
            codePoints.push(((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000);
            i++;
            continue;
          }
        }
        codePoints.push(code);
      }
      const bytes = new Uint8Array(codePoints.length * 4);
      let byteIndex = 0;
      for (let i = 0; i < codePoints.length; i++) {
        const cp = codePoints[i];
        if (cp <= 0x7f) {
          bytes[byteIndex++] = cp;
        } else if (cp <= 0x7ff) {
          bytes[byteIndex++] = 0xc0 | (cp >> 6);
          bytes[byteIndex++] = 0x80 | (cp & 0x3f);
        } else if (cp <= 0xffff) {
          bytes[byteIndex++] = 0xe0 | (cp >> 12);
          bytes[byteIndex++] = 0x80 | ((cp >> 6) & 0x3f);
          bytes[byteIndex++] = 0x80 | (cp & 0x3f);
        } else {
          bytes[byteIndex++] = 0xf0 | (cp >> 18);
          bytes[byteIndex++] = 0x80 | ((cp >> 12) & 0x3f);
          bytes[byteIndex++] = 0x80 | ((cp >> 6) & 0x3f);
          bytes[byteIndex++] = 0x80 | (cp & 0x3f);
        }
      }
      return bytes.subarray(0, byteIndex);
    }
  };
}

if (typeof runtimeRoot.TextDecoder === 'undefined') {
  runtimeRoot.TextDecoder = class TextDecoder {
    constructor(label = 'utf-8') {
      this.encoding = label.toLowerCase();
    }
    decode(bytes) {
      if (!bytes) return '';
      const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      let string = '';
      let i = 0;
      while (i < array.length) {
        const byte = array[i++];
        if (byte <= 0x7f) {
          string += String.fromCharCode(byte);
        } else if (byte <= 0xdf) {
          const byte2 = array[i++];
          string += String.fromCharCode(((byte & 0x1f) << 6) | (byte2 & 0x3f));
        } else if (byte <= 0xef) {
          const byte2 = array[i++];
          const byte3 = array[i++];
          string += String.fromCharCode(((byte & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
        } else {
          const byte2 = array[i++];
          const byte3 = array[i++];
          const byte4 = array[i++];
          let cp = ((byte & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);
          if (cp >= 0x10000) {
            cp -= 0x10000;
            string += String.fromCharCode((cp >> 10) + 0xd800, (cp & 0x3ff) + 0xdc00);
          } else {
            string += String.fromCharCode(cp);
          }
        }
      }
      return string;
    }
  };
}

global.TextEncoder = runtimeRoot.TextEncoder;
global.TextDecoder = runtimeRoot.TextDecoder;

if (global.window) {
  global.window.Event = runtimeRoot.Event;
  global.window.CustomEvent = runtimeRoot.CustomEvent;
  global.window.DOMException = runtimeRoot.DOMException;
  global.window.TextEncoder = runtimeRoot.TextEncoder;
  global.window.TextDecoder = runtimeRoot.TextDecoder;
}

const {
  registerLiveKitGlobalsForVnseea,
} = require('./src/shared-kernel/infrastructure/livekit/registerLiveKitGlobals');
const AppModule = require('./App');
const App = AppModule?.default ?? AppModule;

registerLiveKitGlobalsForVnseea();

AppRegistry.registerComponent(appName, () => App);
