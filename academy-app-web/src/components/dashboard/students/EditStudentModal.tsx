import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { Plan, Student } from '@shared/interfaces/students';
import {
  updateStudentSchema,
  type UpdateStudentInput,
} from '@shared/validations/students';
import { useApiClient } from '@/lib/api';

type EditStudentModalProps = {
  student: Student | null;
  plans: Plan[];
  onClose: () => void;
  onUpdated: (message: string) => void;
};

export function EditStudentModal({
  student,
  plans,
  onClose,
  onUpdated,
}: EditStudentModalProps) {
  const apiClient = useApiClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors: fieldErrors } } =
    useForm<UpdateStudentInput>({
      resolver: zodResolver(updateStudentSchema),
      defaultValues: {
        name: '',
        email: '',
        phone: '',
        planId: '',
        notes: '',
      },
    });

  useEffect(() => {
    if (!student) {
      reset({
        name: '',
        email: '',
        phone: '',
        planId: '',
        notes: '',
      });
      return;
    }

    const activeOrder =
      student.orders.find((order) => order.status === 'ACTIVE') ??
      student.orders[0] ??
      null;

    reset({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      planId: activeOrder?.plan.id || '',
      notes: activeOrder?.notes || '',
    });
  }, [student, reset]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function onSubmit(form: UpdateStudentInput) {
    if (!student) return;

    setError(null);
    setSubmitting(true);

    try {
      await apiClient(`/api/v1/students/${student.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          planId: form.planId || '',
        }),
      });
      onUpdated('Información del alumno actualizada.');
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveModal isOpen={!!student} onClose={handleClose} title="Editar Alumno">
      {student && (
        <form className="space-y-5 p-6" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Nombre completo"
            placeholder="Ej. Maria Garcia"
            error={fieldErrors.name?.message}
            {...register('name')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="email"
              label="Email"
              placeholder="correo@ejemplo.com"
              error={fieldErrors.email?.message}
              {...register('email')}
            />
            <Input
              label="Telefono"
              placeholder="+506 0000 0000"
              error={fieldErrors.phone?.message}
              {...register('phone')}
            />
          </div>
          <Select
            label="Plan de membresia"
            error={fieldErrors.planId?.message}
            {...register('planId')}
          >
            <option value="">Seleccionar plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
          <div>
            <label className="text-dark mb-2 block text-sm font-medium">
              Cuenta familiar
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
              <div className="relative h-6 w-10 cursor-pointer rounded-full bg-gray-200">
                <div className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform" />
              </div>
              <span className="text-sm text-gray-500">
                Vincular a familia existente
              </span>
            </div>
          </div>
          <Textarea
            label="Notas internas"
            placeholder="Observaciones, preferencias, etc."
            rows={3}
            error={fieldErrors.notes?.message}
            {...register('notes')}
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="text"
              color="neutral"
              className="h-11 flex-1 rounded-xl border border-gray-200 hover:bg-gray-50"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              className="h-11 flex-1 rounded-xl"
              disabled={submitting}
            >
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      )}
    </ResponsiveModal>
  );
}
