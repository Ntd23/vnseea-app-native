// Description: Registers React Native app globals and mounts the VNSEEA root component.
/**
 * @format
 */
import './src/shared-kernel/infrastructure/polyfills/runtimeGlobals';
import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import './global.css';

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';

const {
  registerLiveKitGlobalsForVnseea,
} = require('./src/shared-kernel/infrastructure/livekit/registerLiveKitGlobals');
const {
  handleMessageQuickReplyHeadlessTask,
} = require('./src/messages/application/notifications/messageQuickReplyHeadlessTask');
const AppModule = require('./App');
const App = AppModule?.default ?? AppModule;

registerLiveKitGlobalsForVnseea();

AppRegistry.registerHeadlessTask(
  'VnseeaMessageQuickReply',
  () => handleMessageQuickReplyHeadlessTask,
);
AppRegistry.registerComponent(appName, () => App);
