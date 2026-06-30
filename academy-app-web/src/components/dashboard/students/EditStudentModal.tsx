import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { Textarea } from '@/components/ui/Textarea';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { type Plan, type Student, currentSubscription } from '@/lib/interfaces/students';
import { type UpdateStudentInput, updateStudentSchema } from '@/lib/validations/students';

type EditStudentModalProps = {
  student: Student | null;
  plans: Plan[];
  onClose: () => void;
  onUpdated: (message: string) => void;
};

export function EditStudentModal({ student, plans, onClose, onUpdated }: EditStudentModalProps) {
  const apiClient = useApiClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors: fieldErrors },
  } = useForm<UpdateStudentInput>({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      planId: '',
      notes: '',
      enrollmentFee: '',
      enrolledAt: '',
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
        enrollmentFee: '',
        enrolledAt: '',
      });
      return;
    }

    const sub = currentSubscription(student);

    reset({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      planId: sub?.plan.id || '',
      notes: '',
      enrollmentFee: student.enrollmentFee != null ? String(student.enrollmentFee) : '',
      enrolledAt: student.enrolledAt ? student.enrolledAt.slice(0, 10) : '',
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
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          planId: form.planId || '',
          enrollmentFee: form.enrollmentFee ? parseFloat(form.enrollmentFee) : undefined,
          enrolledAt: form.enrolledAt || undefined,
        }),
      });
      onUpdated('Información del alumno actualizada.');
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Error al actualizar.'));
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
          <SelectMenu
            label="Plan de membresía"
            placeholder="Seleccionar plan"
            value={watch('planId') ?? ''}
            onChange={(v) => setValue('planId', v)}
            options={plans.map((plan) => ({
              value: plan.id,
              label: plan.name,
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              min="0"
              step="0.01"
              label="Matrícula"
              placeholder="0.00"
              endAdornment="CRC"
              hint="Pago único de inscripción"
              error={fieldErrors.enrollmentFee?.message}
              {...register('enrollmentFee')}
            />
            <Input
              type="date"
              label="Fecha de matrícula"
              error={fieldErrors.enrolledAt?.message}
              {...register('enrolledAt')}
            />
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
