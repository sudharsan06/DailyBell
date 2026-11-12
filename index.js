/**
 * @format
 */
import { AppRegistry } from 'react-native';
import notifee from 'react-native-notify-kit';
import App from './App';
import { name as appName } from './app.json';
import { handleNotificationEvent } from './src/services/alarmController';

// Must be registered at module scope so notification actions ("Got it" /
// "Dismiss") work while the app is backgrounded or killed.
notifee.onBackgroundEvent(handleNotificationEvent);

AppRegistry.registerComponent(appName, () => App);
