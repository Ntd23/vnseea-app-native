// Description: Registers React Native app globals and mounts the VNSEEA root component.
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
if (global.window) {
  global.window.Event = runtimeRoot.Event;
  global.window.CustomEvent = runtimeRoot.CustomEvent;
}

const { registerGlobals } = require('@livekit/react-native');
const AppModule = require('./App');
const App = AppModule?.default ?? AppModule;

registerGlobals();

AppRegistry.registerComponent(appName, () => App);
