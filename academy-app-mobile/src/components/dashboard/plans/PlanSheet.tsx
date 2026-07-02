import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { getErrorMessage } from '@/lib/errorMessages';
import { useSavePlan } from '@/lib/mutations';
import type { Plan } from '@/lib/interfaces/plans';
import { theme } from '@/theme';

type PlanSheetProps = {
  /** undefined = creando; Plan = editando (ignorado si visible es false) */
  plan: Plan | undefined;
  visible: boolean;
  onClose: () => void;
};

export function PlanSheet({ plan, visible, onClose }: PlanSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={plan ? 'Editar Plan' : 'Nuevo Plan'}>
      {visible && <PlanForm key={plan?.id ?? 'new'} plan={plan} onClose={onClose} />}
    </Sheet>
  );
}

function PlanForm({ plan, onClose }: { plan: Plan | undefined; onClose: () => void }) {
  const isEditing = !!plan;

  const [form, setForm] = useState({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: plan ? String(plan.price) : '',
    classesPerWeek: plan && plan.classesPerWeek !== 0 ? String(plan.classesPerWeek) : plan ? '' : '1',
    unlimited: plan ? plan.classesPerWeek === 0 : false,
    isPublic: plan?.isPublic ?? true,
    isSingleClass: plan?.isSingleClass ?? false,
  });
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useSavePlan(plan?.id, {
    onSuccess: () => onClose(),
    onError: (err) => setError(getErrorMessage(err, 'No se pudo guardar el plan.')),
  });

  function handleSubmit() {
    setError(null);
    const name = form.name.trim();
    if (!name) {
      setError('El nombre del plan es requerido.');
      return;
    }
    const price = Number(form.price);
    if (form.price.trim() === '' || Number.isNaN(price) || price < 0) {
      setError('El precio debe ser un número válido.');
      return;
    }
    const classesPerWeek = form.unlimited ? 0 : parseInt(form.classesPerWeek || '0', 10);

    saveMutation.mutate({
      name,
      description: form.description.trim() || null,
      price,
      classesPerWeek,
      isPublic: form.isPublic,
      isSingleClass: form.isSingleClass,
    });
  }

  return (
    <>
      <Input
        label="Nombre del plan"
        placeholder="Ej. Plan Pro, VIP Anual"
        value={form.name}
        onChangeText={(name) => setForm((p) => ({ ...p, name }))}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label={`Precio (${theme.currencySymbol})`}
            placeholder="0.00"
            value={form.price}
            onChangeText={(price) => setForm((p) => ({ ...p, price }))}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <Input
            label="Clases / semana"
            placeholder={form.unlimited ? 'Ilimitadas' : 'Ej. 2'}
            value={form.classesPerWeek}
            onChangeText={(classesPerWeek) => setForm((p) => ({ ...p, classesPerWeek }))}
            keyboardType="numeric"
            editable={!form.unlimited}
            className={form.unlimited ? 'bg-gray-50' : undefined}
          />
        </View>
      </View>

      <View className="gap-3 rounded-xl bg-gray-50 p-4">
        <ToggleRow
          title="Clases ilimitadas (indefinidas)"
          description="El alumno puede asistir a todas las clases que quiera"
          value={form.unlimited}
          onValueChange={(unlimited) => setForm((p) => ({ ...p, unlimited }))}
        />
        <ToggleRow
          title="Visible para alumnos"
          description="Desmárcalo para un plan oculto tipo beca (solo lo asigna el admin)"
          value={form.isPublic}
          onValueChange={(isPublic) => setForm((p) => ({ ...p, isPublic }))}
        />
        <ToggleRow
          title="Plan de una sola clase"
          description="Para alumnos que toman una única clase"
          value={form.isSingleClass}
          onValueChange={(isSingleClass) => setForm((p) => ({ ...p, isSingleClass }))}
        />
      </View>

      <Input
        label="Descripción (opcional)"
        placeholder="Beneficios o detalles adicionales del plan"
        value={form.description}
        onChangeText={(description) => setForm((p) => ({ ...p, description }))}
        multiline
        numberOfLines={3}
        className="h-20 py-3"
        textAlignVertical="top"
      />

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button
        label={
          saveMutation.isPending
            ? isEditing
              ? 'Guardando...'
              : 'Creando...'
            : isEditing
              ? 'Guardar cambios'
              : 'Crear plan'
        }
        className="w-full"
        loading={saveMutation.isPending}
        onPress={handleSubmit}
      />
    </>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-dark">{title}</Text>
        <Text className="text-xs text-gray-500">{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}
