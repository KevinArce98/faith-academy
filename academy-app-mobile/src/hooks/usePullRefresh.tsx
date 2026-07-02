import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { theme } from '@/theme';

/**
 * Devuelve un <RefreshControl> listo para el prop `refreshControl` de un
 * ScrollView/FlatList. Al tirar hacia abajo refetchea SOLO las queries cuya
 * primera parte de la key esté en `keys` (ej. `['students']`), evitando el
 * refetch global de toda la app.
 */
export function usePullRefresh(keys: string[]) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({
        predicate: (q) => keys.includes(String(q.queryKey[0])),
      });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
    />
  );
}
