import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import type { MeResponse } from '@/lib/interfaces/auth';
import type { Plan } from '@/lib/interfaces/plans';
import { isAdminOrTeacher } from '@/lib/roles';
import { formatPrice } from '@/utils/general';
import { cn } from '@/utils/cn';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
];

export default function Plans() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');

  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/v1/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: plansData, isLoading, isError } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api<Plan[] | { plans: Plan[] }>('/api/v1/plans');
      return Array.isArray(res) ? res : res.plans;
    },
  });

  const adminRole = me ? isAdminOrTeacher(me.role) : false;

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/v1/plans/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });

  if (isLoading) return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  if (isError) return <SafeAreaView className="flex-1 bg-background"><ErrorBanner message="Error al cargar los planes." /></SafeAreaView>;

  const allPlans = plansData ?? [];
  const filtered = allPlans.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? p.isActive : !p.isActive;
    return matchSearch && matchStatus;
  });

  const adminFilter: StatusFilter = adminRole ? statusFilter : 'active';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-4">
        <Text className="text-2xl font-bold text-dark">Planes de Membresía</Text>

        {/* Tabs (solo admin ve todos) */}
        {adminRole && (
          <View className="flex-row gap-2">
            {STATUS_TABS.map((t) => (
              <Button
                key={t.key}
                label={t.label}
                variant={statusFilter === t.key ? 'contained' : 'outlined'}
                color={statusFilter === t.key ? 'primary' : 'neutral'}
                size="sm"
                onPress={() => setStatusFilter(t.key)}
              />
            ))}
          </View>
        )}

        {/* Search */}
        <TextInput
          className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-dark"
          placeholder="Buscar plan..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />

        {filtered.length === 0 ? (
          <EmptyState message="No hay planes disponibles." emoji="🏷️" />
        ) : (
          <View className="gap-3">
            {filtered.map((plan) => (
              <Card key={plan.id} className={cn(!plan.isActive && 'opacity-60')}>
                <View className="flex-row items-start justify-between gap-2 mb-2">
                  <Text className="font-bold text-dark text-base flex-1">{plan.name}</Text>
                  {!plan.isActive && (
                    <View className="rounded-full bg-gray-100 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-gray-400">INACTIVO</Text>
                    </View>
                  )}
                </View>

                {plan.description && (
                  <Text className="text-sm text-gray-500 mb-2">{plan.description}</Text>
                )}

                <Text className="text-2xl font-bold text-dark mb-1">{formatPrice(plan.price)}</Text>
                <Text className="text-xs text-gray-400 mb-3">
                  {plan.isSingleClass ? 'Clase individual' : `${plan.classesPerWeek === 0 ? 'Ilimitado' : plan.classesPerWeek} clase${plan.classesPerWeek > 1 ? 's' : ''} / semana`}
                  {' · '}{plan._count.subscriptions} inscritos
                </Text>

                {adminRole && (
                  <Button
                    label={plan.isActive ? 'Desactivar' : 'Activar'}
                    variant="outlined"
                    color={plan.isActive ? 'danger' : 'success'}
                    size="sm"
                    loading={toggleMutation.isPending}
                    onPress={() => {
                      Alert.alert(
                        plan.isActive ? 'Desactivar plan' : 'Activar plan',
                        `¿${plan.isActive ? 'Desactivar' : 'Activar'} el plan "${plan.name}"?`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Confirmar', onPress: () => toggleMutation.mutate({ id: plan.id, isActive: !plan.isActive }) },
                        ]
                      );
                    }}
                  />
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
