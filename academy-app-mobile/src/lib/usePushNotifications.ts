import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useApiClient } from '@/lib/api';
import { getExpoPushToken, routeForNotification } from '@/lib/push';


let registeredToken: string | null = null;
export function getRegisteredPushToken(): string | null {
  return registeredToken;
}

export function usePushNotifications(enabled: boolean) {
  const api = useApiClient();
  const router = useRouter();
  const didRegister = useRef(false);

  useEffect(() => {
    if (!enabled || didRegister.current) return;
    didRegister.current = true;

    (async () => {
      const token = await getExpoPushToken();
      if (!token) return;
      registeredToken = token;
      try {
        await api('/api/v1/notifications/register-device', {
          method: 'POST',
          body: JSON.stringify({ token, platform: Platform.OS }),
        });
      } catch {
      }
    })();
  }, [enabled, api]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeForNotification(response.notification.request.content.data);
      if (route) router.push(route as never);
    });

    const last = Notifications.getLastNotificationResponse();
    if (last) {
      const route = routeForNotification(last.notification.request.content.data);
      if (route) router.push(route as never);
    }

    return () => sub.remove();
  }, [router]);
}
