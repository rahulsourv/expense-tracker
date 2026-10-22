import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import * as Notifications from 'expo-notifications';

import App from './App';

AppRegistry.registerHeadlessTask('ExpoSmsListenerBackground', () => async (data) => {
  const body = String(data?.body || '');
  if (!/(debited|debit|spent|paid|withdrawn|credited|credit|received|upi|imps|neft|card)/i.test(body)) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'NYNET found a transaction', body: 'Open NYNET to review and add this expense.', data: { rawSms: body } },
    trigger: null,
  });
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
