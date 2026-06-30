// Description: Installs browser-compatible globals before app dependencies load.
/* eslint-disable no-bitwise */
/* global globalThis, global */

const runtimeRoot = typeof globalThis !== 'undefined' ? globalThis : global;

const DOM_EXCEPTION_CODES = {
  IndexSizeError: 1,
  DOMStringSizeError: 2,
  HierarchyRequestError: 3,
  WrongDocumentError: 4,
  InvalidCharacterError: 5,
  NoDataAllowedError: 6,
  NoModificationAllowedError: 7,
  NotFoundError: 8,
  NotSupportedError: 9,
  InUseAttributeError: 10,
  InvalidStateError: 11,
  SyntaxError: 12,
  InvalidModificationError: 13,
  NamespaceError: 14,
  InvalidAccessError: 15,
  ValidationError: 16,
  TypeMismatchError: 17,
  SecurityError: 18,
  NetworkError: 19,
  AbortError: 20,
  URLMismatchError: 21,
  QuotaExceededError: 22,
  TimeoutError: 23,
  InvalidNodeTypeError: 24,
  DataCloneError: 25,
};
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function setGlobalIfMissing(target, name, value) {
  if (!target || typeof target[name] !== 'undefined') return;
  target[name] = value;
}

function defineRuntimeGlobal(name, value) {
  setGlobalIfMissing(runtimeRoot, name, value);
  const installedValue = runtimeRoot[name] || value;

  if (typeof global !== 'undefined') {
    setGlobalIfMissing(global, name, installedValue);
  }

  if (runtimeRoot.window) {
    setGlobalIfMissing(runtimeRoot.window, name, installedValue);
  }

  if (typeof global !== 'undefined' && global.window) {
    setGlobalIfMissing(global.window, name, installedValue);
  }
}

function getUtf8CodePoint(input, index) {
  const first = input.charCodeAt(index);

  if (first >= 0xd800 && first <= 0xdbff) {
    const second = input.charCodeAt(index + 1);
    if (second >= 0xdc00 && second <= 0xdfff) {
      return {
        codePoint: ((first - 0xd800) << 10) + (second - 0xdc00) + 0x10000,
        read: 2,
      };
    }

    return { codePoint: 0xfffd, read: 1 };
  }

  if (first >= 0xdc00 && first <= 0xdfff) {
    return { codePoint: 0xfffd, read: 1 };
  }

  return { codePoint: first, read: 1 };
}

function encodeCodePointAsUtf8(codePoint) {
  if (codePoint <= 0x7f) return [codePoint];
  if (codePoint <= 0x7ff) {
    return [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)];
  }
  if (codePoint <= 0xffff) {
    return [
      0xe0 | (codePoint >> 12),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f),
    ];
  }

  return [
    0xf0 | (codePoint >> 18),
    0x80 | ((codePoint >> 12) & 0x3f),
    0x80 | ((codePoint >> 6) & 0x3f),
    0x80 | (codePoint & 0x3f),
  ];
}

function toUint8Array(input) {
  if (typeof input === 'undefined') return new Uint8Array();
  if (input instanceof Uint8Array) return input;
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(input);
}

function appendUtf8DecodeError(state) {
  if (state.fatal) {
    throw new TypeError('The encoded data was not valid UTF-8.');
  }

  state.output += '\ufffd';
}

function isUtf8ContinuationByte(byte) {
  return (byte & 0xc0) === 0x80;
}

function decodeUtf8(input, fatal) {
  const bytes = toUint8Array(input);
  const state = { fatal, output: '' };

  for (let index = 0; index < bytes.length; index += 1) {
    const first = bytes[index];

    if (first <= 0x7f) {
      state.output += String.fromCharCode(first);
      continue;
    }

    let needed = 0;
    let codePoint = 0;
    let minimum = 0;

    if (first >= 0xc2 && first <= 0xdf) {
      needed = 1;
      codePoint = first & 0x1f;
      minimum = 0x80;
    } else if (first >= 0xe0 && first <= 0xef) {
      needed = 2;
      codePoint = first & 0x0f;
      minimum = 0x800;
    } else if (first >= 0xf0 && first <= 0xf4) {
      needed = 3;
      codePoint = first & 0x07;
      minimum = 0x10000;
    } else {
      appendUtf8DecodeError(state);
      continue;
    }

    if (index + needed >= bytes.length) {
      appendUtf8DecodeError(state);
      break;
    }

    let valid = true;
    for (let offset = 1; offset <= needed; offset += 1) {
      const next = bytes[index + offset];
      if (!isUtf8ContinuationByte(next)) {
        valid = false;
        break;
      }
      codePoint = (codePoint << 6) | (next & 0x3f);
    }

    if (
      !valid ||
      codePoint < minimum ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      appendUtf8DecodeError(state);
      continue;
    }

    state.output += String.fromCodePoint(codePoint);
    index += needed;
  }

  return state.output;
}

function createInvalidCharacterError(message) {
  if (typeof runtimeRoot.DOMException === 'function') {
    return new runtimeRoot.DOMException(message, 'InvalidCharacterError');
  }

  const error = new Error(message);
  error.name = 'InvalidCharacterError';
  return error;
}

function runtimeBtoa(input = '') {
  const text = String(input);
  let output = '';

  for (let index = 0; index < text.length; index += 3) {
    const first = text.charCodeAt(index);
    const second = index + 1 < text.length ? text.charCodeAt(index + 1) : NaN;
    const third = index + 2 < text.length ? text.charCodeAt(index + 2) : NaN;

    if (first > 0xff || second > 0xff || third > 0xff) {
      throw createInvalidCharacterError(
        'The string to be encoded contains characters outside of the Latin1 range.',
      );
    }

    output += BASE64_ALPHABET[first >> 2];
    output += BASE64_ALPHABET[((first & 0x03) << 4) | ((second || 0) >> 4)];
    output += Number.isNaN(second)
      ? '='
      : BASE64_ALPHABET[((second & 0x0f) << 2) | ((third || 0) >> 6)];
    output += Number.isNaN(third) ? '=' : BASE64_ALPHABET[third & 0x3f];
  }

  return output;
}

function runtimeAtob(input = '') {
  const encoded = String(input).replace(/[\t\n\f\r ]/g, '');

  const base64Pattern = new RegExp('^[A-Za-z0-9+/]*={0,2}$');
  if (encoded.length % 4 === 1 || !base64Pattern.test(encoded)) {
    throw createInvalidCharacterError(
      'The string to be decoded is not correctly encoded.',
    );
  }

  const base64PaddingPattern = new RegExp('=+$');
  const unpadded = encoded.replace(base64PaddingPattern, '');
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (let index = 0; index < unpadded.length; index += 1) {
    const value = BASE64_ALPHABET.indexOf(unpadded[index]);
    if (value === -1) {
      throw createInvalidCharacterError(
        'The string to be decoded is not correctly encoded.',
      );
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

if (typeof runtimeRoot.DOMException === 'undefined') {
  class RuntimeDOMException extends Error {
    constructor(message = '', name = 'Error') {
      super(String(message));
      this.name = String(name);
      this.code = DOM_EXCEPTION_CODES[this.name] || 0;

      if (typeof Object.setPrototypeOf === 'function') {
        Object.setPrototypeOf(this, RuntimeDOMException.prototype);
      }
    }
  }

  RuntimeDOMException.INDEX_SIZE_ERR = 1;
  RuntimeDOMException.DOMSTRING_SIZE_ERR = 2;
  RuntimeDOMException.HIERARCHY_REQUEST_ERR = 3;
  RuntimeDOMException.WRONG_DOCUMENT_ERR = 4;
  RuntimeDOMException.INVALID_CHARACTER_ERR = 5;
  RuntimeDOMException.NO_DATA_ALLOWED_ERR = 6;
  RuntimeDOMException.NO_MODIFICATION_ALLOWED_ERR = 7;
  RuntimeDOMException.NOT_FOUND_ERR = 8;
  RuntimeDOMException.NOT_SUPPORTED_ERR = 9;
  RuntimeDOMException.INUSE_ATTRIBUTE_ERR = 10;
  RuntimeDOMException.INVALID_STATE_ERR = 11;
  RuntimeDOMException.SYNTAX_ERR = 12;
  RuntimeDOMException.INVALID_MODIFICATION_ERR = 13;
  RuntimeDOMException.NAMESPACE_ERR = 14;
  RuntimeDOMException.INVALID_ACCESS_ERR = 15;
  RuntimeDOMException.VALIDATION_ERR = 16;
  RuntimeDOMException.TYPE_MISMATCH_ERR = 17;
  RuntimeDOMException.SECURITY_ERR = 18;
  RuntimeDOMException.NETWORK_ERR = 19;
  RuntimeDOMException.ABORT_ERR = 20;
  RuntimeDOMException.URL_MISMATCH_ERR = 21;
  RuntimeDOMException.QUOTA_EXCEEDED_ERR = 22;
  RuntimeDOMException.TIMEOUT_ERR = 23;
  RuntimeDOMException.INVALID_NODE_TYPE_ERR = 24;
  RuntimeDOMException.DATA_CLONE_ERR = 25;

  defineRuntimeGlobal('DOMException', RuntimeDOMException);
} else {
  defineRuntimeGlobal('DOMException', runtimeRoot.DOMException);
}

if (typeof runtimeRoot.atob === 'undefined') {
  defineRuntimeGlobal('atob', runtimeAtob);
} else {
  defineRuntimeGlobal('atob', runtimeRoot.atob);
}

if (typeof runtimeRoot.btoa === 'undefined') {
  defineRuntimeGlobal('btoa', runtimeBtoa);
} else {
  defineRuntimeGlobal('btoa', runtimeRoot.btoa);
}

if (typeof runtimeRoot.TextEncoder === 'undefined') {
  class RuntimeTextEncoder {
    get encoding() {
      return 'utf-8';
    }

    encode(input = '') {
      const text = String(input);
      const bytes = [];

      for (let index = 0; index < text.length; ) {
        const { codePoint, read } = getUtf8CodePoint(text, index);
        bytes.push(...encodeCodePointAsUtf8(codePoint));
        index += read;
      }

      return Uint8Array.from(bytes);
    }

    encodeInto(input = '', destination) {
      if (!(destination instanceof Uint8Array)) {
        throw new TypeError('TextEncoder.encodeInto destination must be a Uint8Array.');
      }

      const text = String(input);
      let read = 0;
      let written = 0;

      for (let index = 0; index < text.length; ) {
        const next = getUtf8CodePoint(text, index);
        const bytes = encodeCodePointAsUtf8(next.codePoint);
        if (written + bytes.length > destination.length) break;

        destination.set(bytes, written);
        read += next.read;
        written += bytes.length;
        index += next.read;
      }

      return { read, written };
    }
  }

  defineRuntimeGlobal('TextEncoder', RuntimeTextEncoder);
} else {
  defineRuntimeGlobal('TextEncoder', runtimeRoot.TextEncoder);
}

if (typeof runtimeRoot.TextDecoder === 'undefined') {
  class RuntimeTextDecoder {
    constructor(label = 'utf-8', options = {}) {
      const normalizedLabel = String(label).trim().toLowerCase();
      if (
        normalizedLabel !== 'utf-8' &&
        normalizedLabel !== 'utf8' &&
        normalizedLabel !== 'unicode-1-1-utf-8'
      ) {
        throw new RangeError('Only utf-8 TextDecoder labels are supported.');
      }

      this.encoding = 'utf-8';
      this.fatal = Boolean(options.fatal);
      this.ignoreBOM = Boolean(options.ignoreBOM);
    }

    decode(input) {
      let output = decodeUtf8(input, this.fatal);

      if (!this.ignoreBOM && output.charCodeAt(0) === 0xfeff) {
        output = output.slice(1);
      }

      return output;
    }
  }

  defineRuntimeGlobal('TextDecoder', RuntimeTextDecoder);
} else {
  defineRuntimeGlobal('TextDecoder', runtimeRoot.TextDecoder);
}

if (typeof runtimeRoot.Event === 'undefined') {
  class RuntimeEvent {
    constructor(type, options = {}) {
      this.type = String(type);
      this.bubbles = Boolean(options.bubbles);
      this.cancelable = Boolean(options.cancelable);
      this.composed = Boolean(options.composed);
      this.defaultPrevented = false;
      this.timeStamp = Date.now();
      this.target = null;
      this.currentTarget = null;
      this.eventPhase = 0;
      this.isTrusted = false;
      this.cancelBubble = false;
    }

    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true;
    }

    stopPropagation() {
      this.cancelBubble = true;
    }

    stopImmediatePropagation() {
      this.cancelBubble = true;
    }
  }

  defineRuntimeGlobal('Event', RuntimeEvent);
} else {
  defineRuntimeGlobal('Event', runtimeRoot.Event);
}

if (typeof runtimeRoot.CustomEvent === 'undefined') {
  class RuntimeCustomEvent extends runtimeRoot.Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail;
    }
  }

  defineRuntimeGlobal('CustomEvent', RuntimeCustomEvent);
} else {
  defineRuntimeGlobal('CustomEvent', runtimeRoot.CustomEvent);
}
