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
  const routerRef = useRef(router);
  routerRef.current = router;
  const didRegister = useRef(false);
  const handledResponseIds = useRef(new Set<string>());

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

  // Deps vacío a propósito: getLastNotificationResponse() sigue devolviendo la
  // misma respuesta hasta que el SO la limpia, así que si este efecto
  // dependiera de `router` (cuya referencia puede cambiar entre renders),
  // cada re-ejecución volvería a navegar a la misma ruta → loop infinito
  // ("Maximum update depth exceeded"). router.push es imperativo, no necesita
  // estar en deps; se lee de un ref para evitar closures obsoletos.
  useEffect(() => {
    function handle(response: Notifications.NotificationResponse) {
      const id = response.notification.request.identifier;
      if (handledResponseIds.current.has(id)) return;
      handledResponseIds.current.add(id);
      const route = routeForNotification(response.notification.request.content.data);
      if (route) routerRef.current.push(route as never);
    }

    const sub = Notifications.addNotificationResponseReceivedListener(handle);

    const last = Notifications.getLastNotificationResponse();
    if (last) handle(last);

    return () => sub.remove();
  }, []);
}
