import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanSheet } from '@/components/dashboard/plans/PlanSheet';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InlineSpinner } from '@/components/ui/Spinner';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { getErrorMessage } from '@/lib/errorMessages';
import type { Plan } from '@/lib/interfaces/plans';
import { useDeletePlan, useTogglePlan } from '@/lib/mutations';
import { usePlans, useRole } from '@/lib/queries';
import { qkRoot } from '@/lib/queryKeys';
import { isAdmin as isAdminRole } from '@/lib/roles';
import { theme } from '@/theme';
import { formatPrice } from '@/utils/general';
import { cn } from '@/utils/cn';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
];

export default function PlansScreen() {
  return (
    <RoleGuard screen="/plans">
      <Plans />
    </RoleGuard>
  );
}

function Plans() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const { data: plansData, isLoading, isError } = usePlans();

  const admin = isAdminRole(useRole());

  const toggleMutation = useTogglePlan({
    onError: (err) => Alert.alert('Error', getErrorMessage(err, 'No se pudo actualizar el plan.')),
  });

  const deleteMutation = useDeletePlan({
    onError: (err) => Alert.alert('Error', getErrorMessage(err, 'No se pudo eliminar el plan.')),
  });

  const refresh = usePullRefresh([qkRoot.plans]);

  if (isLoading) return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  if (isError) return <SafeAreaView className="flex-1 bg-background"><ErrorBanner message="Error al cargar los planes." /></SafeAreaView>;

  const allPlans = plansData ?? [];
  const filtered = allPlans.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const effectiveFilter = admin ? statusFilter : 'active';
    const matchStatus =
      effectiveFilter === 'all' ? true : effectiveFilter === 'active' ? p.isActive : !p.isActive;
    return matchSearch && matchStatus;
  });

  function confirmDelete(plan: Plan) {
    Alert.alert('Eliminar plan', `¿Eliminar "${plan.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(plan.id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-6 gap-4">
        <Text className="text-2xl font-bold text-dark">Planes de Membresía</Text>

        {admin && (
          <Pressable
            onPress={() => setSheetOpen(true)}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3"
          >
            <Text className="text-lg text-primary">＋</Text>
            <Text className="text-sm font-semibold text-primary">Nuevo plan</Text>
          </Pressable>
        )}

        {/* Tabs (solo admin ve todos) */}
        {admin && (
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

        <TextInput
          className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-dark"
          placeholder="Buscar plan..."
          placeholderTextColor={theme.colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(plan) => plan.id}
        refreshControl={refresh}
        contentContainerClassName="px-4 py-4 gap-3"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState message="No hay planes disponibles." icon="pricetag-outline" />
        }
        renderItem={({ item: plan }) => (
          <Card className={cn(!plan.isActive && 'opacity-60')}>
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
              {admin && ` · ${plan._count.subscriptions} inscritos`}
            </Text>

            {admin && (
              <View className="gap-2">
                <View className="flex-row gap-2">
                  <Button
                    label="Editar"
                    variant="outlined"
                    color="neutral"
                    size="sm"
                    className="flex-1"
                    onPress={() => setEditing(plan)}
                  />
                  <Button
                    label={plan.isActive ? 'Desactivar' : 'Activar'}
                    variant="outlined"
                    color={plan.isActive ? 'danger' : 'success'}
                    size="sm"
                    className="flex-1"
                    loading={toggleMutation.isPending}
                    onPress={() => {
                      Alert.alert(
                        plan.isActive ? 'Desactivar plan' : 'Activar plan',
                        `¿${plan.isActive ? 'Desactivar' : 'Activar'} el plan "${plan.name}"?`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Confirmar',
                            onPress: () =>
                              toggleMutation.mutate({ id: plan.id, isActive: !plan.isActive }),
                          },
                        ],
                      );
                    }}
                  />
                </View>
                <Button
                  label="Eliminar"
                  variant="outlined"
                  color="danger"
                  size="sm"
                  loading={deleteMutation.isPending}
                  onPress={() => confirmDelete(plan)}
                />
              </View>
            )}
          </Card>
        )}
      />

      <PlanSheet plan={undefined} visible={sheetOpen} onClose={() => setSheetOpen(false)} />
      <PlanSheet plan={editing ?? undefined} visible={!!editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}
