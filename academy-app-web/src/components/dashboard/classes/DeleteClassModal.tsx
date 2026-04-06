import { useState } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { X, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { modalVariants, overlayVariants } from '@/lib/animations';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Button } from '@/components/ui/Button';
import type { Cls } from './classes.types';

type DeleteClassModalProps = {
  classData: Cls;
  onClose: () => void;
};

export function DeleteClassModal({
  classData,
  onClose,
}: DeleteClassModalProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useScrollLock(true);

  async function handleDelete() {
    setError(null);
    setLoading(true);

    try {
      await apiClient(`/api/v1/classes/${classData.id}`, {
        method: 'DELETE',
      });

      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la clase'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={onClose}
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl md:max-w-md md:rounded-2xl"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <h2 className="text-dark text-lg font-bold">Eliminar Clase</h2>
          <Button
            variant="text"
            color="neutral"
            onClick={onClose}
            className="h-auto p-1"
          >
            <X className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
        <div className="space-y-5 p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-dark text-lg font-semibold">¿Eliminar esta clase?</p>
            <p className="mt-2 text-sm text-gray-600">{classData.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              Esta acción no se puede deshacer
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="text"
              color="neutral"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-gray-200 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={handleDelete}
              className="h-11 flex-1 rounded-xl"
              disabled={loading}
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
