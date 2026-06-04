// Description: Registers React Native app globals and mounts the VNSEEA root component.
/**
 * @format
 */
import 'react-native-gesture-handler';
import './global.css';

import { registerGlobals } from '@livekit/react-native';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

registerGlobals();

AppRegistry.registerComponent(appName, () => App);
