import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[push] Falta projectId de EAS; se omite el registro de push.');
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn('[push] No se pudo obtener el Expo push token', err);
    return null;
  }
}

export function routeForNotification(data: unknown): string | null {
  const screen =
    data && typeof data === 'object' ? (data as { screen?: string }).screen : undefined;
  switch (screen) {
    case 'payments':
      return '/(app)/payments';
    case 'my-classes':
      return '/(app)/my-classes';
    case 'classes':
      return '/(app)/classes';
    case 'notifications':
      return '/(app)/notifications';
    default:
      return null;
  }
}
