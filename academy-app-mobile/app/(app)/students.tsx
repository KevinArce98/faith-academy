import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditStudentSheet } from '@/components/dashboard/students/EditStudentSheet';
import { NewStudentSheet } from '@/components/dashboard/students/NewStudentSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import type { Student } from '@/lib/interfaces/students';
import { currentSubscription, isSubscriptionActive, isSubscriptionExpired } from '@/lib/interfaces/students';
import { useStudents } from '@/lib/queries';
import { qkRoot } from '@/lib/queryKeys';
import { theme } from '@/theme';
import { formatPrice } from '@/utils/general';
import { cn } from '@/utils/cn';

export default function StudentsScreen() {
  return (
    <RoleGuard screen="/students">
      <Students />
    </RoleGuard>
  );
}

function Students() {
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const { data, isLoading, isError } = useStudents();

  const refresh = usePullRefresh([qkRoot.students]);

  if (isLoading) return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 pt-6">
        <Text className="text-sm text-danger">Error al cargar los alumnos.</Text>
      </SafeAreaView>
    );
  }

  const students = data.filter((s) =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const active = students.filter((s) => s.isActive);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header fijo (no scrollea con la lista → el input no pierde foco) */}
      <View className="px-4 pt-6 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-dark">Alumnos</Text>
          <Text className="text-sm text-gray-400">{active.length} activos</Text>
        </View>

        <Pressable
          onPress={() => setSheetOpen(true)}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3"
        >
          <Text className="text-lg text-primary">＋</Text>
          <Text className="text-sm font-semibold text-primary">Nuevo alumno</Text>
        </Pressable>

        <TextInput
          className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-dark"
          placeholder="Buscar por nombre o email..."
          placeholderTextColor={theme.colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={students}
        keyExtractor={(s) => s.id}
        refreshControl={refresh}
        contentContainerClassName="px-4 py-4 gap-3"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <StudentRow student={item} onPress={() => setEditing(item)} />}
        ListEmptyComponent={
          <EmptyState
            message={search ? 'Sin resultados para esa búsqueda.' : 'No hay alumnos registrados.'}
            icon="people-outline"
          />
        }
      />

      <NewStudentSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
      <EditStudentSheet student={editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}

function StudentRow({ student: s, onPress }: { student: Student; onPress: () => void }) {
  const sub = currentSubscription(s);
  const subActive = isSubscriptionActive(sub);
  const subExpired = isSubscriptionExpired(sub);
  return (
    <Pressable onPress={onPress}>
      <Card className={cn(!s.isActive && 'opacity-60')}>
        <View className="flex-row items-center gap-3">
          <Avatar name={s.name ?? s.email} />
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold text-dark" numberOfLines={1}>{s.name ?? '—'}</Text>
              {!s.isActive && (
                <View className="rounded-full bg-gray-100 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-gray-400">INACTIVO</Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-gray-400" numberOfLines={1}>{s.email}</Text>
          </View>
          <Text className="text-gray-300">›</Text>
        </View>

        {sub && (
          <View className="mt-3 pt-3 border-t border-gray-100 flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-medium text-dark">{sub.plan.name}</Text>
              <Text className="text-xs text-gray-400">{formatPrice(sub.amount)} / mes</Text>
            </View>
            <View className={cn('rounded-full px-2.5 py-0.5', subActive ? 'bg-success/10' : subExpired ? 'bg-danger/10' : 'bg-warning/10')}>
              <Text className={cn('text-xs font-semibold', subActive ? 'text-success' : subExpired ? 'text-danger' : 'text-warning')}>
                {subActive ? 'Activo' : subExpired ? 'Vencido' : 'Pendiente'}
              </Text>
            </View>
          </View>
        )}
      </Card>
    </Pressable>
  );
}
