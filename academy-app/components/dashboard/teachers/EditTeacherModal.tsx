'use client';

import { FormEvent, useState } from 'react';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { TeacherProfile } from '@/interfaces/teachers';

async function patchTeacher(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/v1/teachers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(data?.error ?? 'Error al actualizar el profesor.');
  }
  
  return data;
}

type EditTeacherModalProps = {
  teacher: TeacherProfile | null;
  onClose: () => void;
  onUpdated: (message: string) => void;
};

export function EditTeacherModal({ teacher, onClose, onUpdated }: EditTeacherModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleClose() {
    setName('');
    setError(null);
    onClose();
  }

  const displayedName = teacher ? name || teacher.name || '' : '';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (!teacher) return;
    
    const trimmed = displayedName.replace(/\s+/g, ' ').trim();
    
    if (!trimmed) {
      setError('El nombre es requerido.');
      return;
    }

    setIsPending(true);
    
    try {
      await patchTeacher(teacher.id, { name: trimmed });
      onUpdated('Información del profesor actualizada.');
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <ResponsiveModal
      isOpen={!!teacher}
      onClose={handleClose}
      title="Editar Profesor"
    >
      {teacher && (
        <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
          <Input
            label="Nombre completo"
            value={displayedName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del profesor"
            disabled={isPending}
          />
          <Input
            label="Email"
            value={teacher.email}
            disabled
            className="bg-gray-50"
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outlined"
              color="neutral"
              className="flex-1"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      )}
    </ResponsiveModal>
  );
}
