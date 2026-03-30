import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { modalVariants, overlayVariants } from '@/lib/animations';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/lib/api';
import { INTERVAL_OPTIONS } from '@shared/interfaces/plans';
import { planFormSchema } from '@shared/validations/plans';
import type { Plan, PlanFormValues } from '@shared/interfaces/plans';

interface PlanModalProps {
  plan?: Plan | null;
  onClose: () => void;
  onSuccess: (plan: Plan, isNew: boolean) => void;
}

export function PlanModal({ plan, onClose, onSuccess }: PlanModalProps) {
  const isEditing = !!plan;
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors: fieldErrors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: plan
      ? {
          name: plan.name,
          description: plan.description ?? '',
          price: String(plan.price),
          credits: String(plan.credits),
          intervalType: plan.intervalType as PlanFormValues['intervalType'],
          intervalValue: String(plan.intervalValue),
        }
      : {
          name: '',
          description: '',
          price: '',
          credits: '',
          intervalType: 'MONTHLY',
          intervalValue: '1',
        },
  });

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(form: PlanFormValues) {
    setError(null);

    startTransition(async () => {
      try {
        const payload = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: parseFloat(form.price),
          credits: parseInt(form.credits, 10),
          intervalType: form.intervalType,
          intervalValue: parseInt(form.intervalValue, 10),
        };

        let result: { plan: Plan };

        if (isEditing) {
          result = await apiClient<{ plan: Plan }>(`/api/v1/plans/${plan.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          result = await apiClient<{ plan: Plan }>('/api/v1/plans', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }

        await queryClient.invalidateQueries({ queryKey: ['plans'] });

        // Build updated plan with _count for optimistic UI
        const updated: Plan = {
          ...result.plan,
          _count: plan?._count ?? { orders: 0 },
        };

        onSuccess(updated, !isEditing);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar el plan');
      }
    });
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
        onClick={onClose}
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl md:max-w-lg md:rounded-2xl"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <h2 className="text-dark text-lg font-bold">
              {isEditing ? 'Editar Plan' : 'Nuevo Plan'}
            </h2>
            <Button variant="icon" onClick={onClose} className="h-auto p-1">
              <X className="h-5 w-5 text-gray-400" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
            <Input
              label="Nombre del plan"
              placeholder="Ej. Plan Pro, VIP Anual"
              error={fieldErrors.name?.message}
              {...register('name')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                min="0"
                step="0.01"
                label="Precio"
                placeholder="0.00"
                endAdornment="CRC"
                error={fieldErrors.price?.message}
                {...register('price')}
              />
              <Input
                type="number"
                min="0"
                label="Créditos"
                placeholder="Ej. 8"
                hint="Usa 9999 para ilimitados"
                error={fieldErrors.credits?.message}
                {...register('credits')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tipo de intervalo"
                error={fieldErrors.intervalType?.message}
                {...register('intervalType')}
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <Input
                type="number"
                min="1"
                label="Cada cuántos periodos"
                placeholder="1"
                error={fieldErrors.intervalValue?.message}
                {...register('intervalValue')}
              />
            </div>

            <Textarea
              label="Descripción (opcional)"
              placeholder="Beneficios o detalles adicionales del plan"
              error={fieldErrors.description?.message}
              rows={3}
              {...register('description')}
            />

            {error && (
              <p className="bg-danger/10 text-danger rounded-lg px-4 py-2 text-sm">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="text"
                color="neutral"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isPending}
                className="rounded-xl px-6"
              >
                {isPending
                  ? isEditing
                    ? 'Guardando…'
                    : 'Creando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear plan'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
