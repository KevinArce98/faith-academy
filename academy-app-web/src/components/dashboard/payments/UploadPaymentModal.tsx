import { useQuery } from '@tanstack/react-query';
import { FileText, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { LEVEL_LABELS } from '@/components/dashboard/classes/classes.types';
import { Button } from '@/components/ui/Button';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { formatPrice } from '@/utils/general';
import { to12h } from '@/utils/schedule';

export type PlanOption = {
  id: string;
  name: string;
  price: number;
  isSingleClass: boolean;
};

type Slot = { dayOfWeek: number; startTime: string; endTime: string };
type ClassOption = {
  id: string;
  name: string;
  skillLevel: string;
  slots: Slot[];
  isPrivate?: boolean;
  oneOffDate?: string | null;
};

function prettyDate(d: Date): string {
  return d.toLocaleDateString('es-CR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function upcomingSessions(cls: ClassOption, weeks = 6): { date: string; label: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (cls.oneOffDate) {
    const [y, m, d] = cls.oneOffDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt < today) return []; // ya pasó
    const slot = cls.slots[0];
    const time = slot ? ` · ${to12h(slot.startTime)}` : '';
    return [{ date: cls.oneOffDate, label: `${prettyDate(dt)}${time}` }];
  }

  const out: { date: string; label: string }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = ((d.getDay() + 6) % 7) + 1; // 1=Lun … 7=Dom
    const slot = cls.slots.find((s) => s.dayOfWeek === dow);
    if (!slot) continue;
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ date, label: `${prettyDate(d)} · ${to12h(slot.startTime)}` });
  }
  return out;
}

type UploadPaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  plans: PlanOption[];
  onSuccess: () => void;
};

const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'] as const;
type AllowedExt = (typeof ALLOWED_EXTS)[number];

export function UploadPaymentModal({ isOpen, onClose, plans, onSuccess }: UploadPaymentModalProps) {
  const apiClient = useApiClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [bookingClassId, setBookingClassId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const isSingleClass = selectedPlan?.isSingleClass ?? false;

  const { data: classesData } = useQuery<{ classes: ClassOption[] }>({
    queryKey: ['classes'],
    queryFn: () => apiClient<{ classes: ClassOption[] }>('/api/v1/classes'),
    enabled: isOpen && isSingleClass,
  });
  const classes = (classesData?.classes ?? []).filter((cl) => !cl.isPrivate);
  const bookingClass = classes.find((cl) => cl.id === bookingClassId);
  const sessionOptions = bookingClass ? upcomingSessions(bookingClass) : [];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTS.includes(ext as AllowedExt)) {
      setError('Solo se permiten imágenes (JPG, PNG, WEBP) o PDF');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('El archivo no debe exceder 10 MB');
      return;
    }

    setError(null);
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  function handleClose() {
    setSelectedPlanId('');
    setBookingClassId('');
    setBookingDate('');
    setFile(null);
    setPreview(null);
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!selectedPlanId || !file) return;
    if (isSingleClass && (!bookingClassId || !bookingDate)) {
      setError('Elige la clase y la fecha de la sesión.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { key } = await apiClient<{ key: string }>('/api/v1/payments/upload', {
        method: 'POST',
        body: formData,
      });

      await apiClient('/api/v1/payments/orders', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlanId,
          receiptKey: key,
          ...(isSingleClass ? { bookingClassId, bookingDate } : {}),
        }),
      });

      onSuccess();
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Error inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit =
    !!selectedPlanId &&
    !!file &&
    !isSubmitting &&
    (!isSingleClass || (!!bookingClassId && !!bookingDate));

  return (
    <ResponsiveModal isOpen={isOpen} onClose={handleClose} title="Subir comprobante de pago">
      <div className="space-y-5 px-6 py-5">
        {/* Plan selector */}
        <SelectMenu
          label="Plan"
          placeholder="Selecciona un plan"
          value={selectedPlanId}
          onChange={setSelectedPlanId}
          options={plans.map((plan) => ({
            value: plan.id,
            label: `${plan.name} — ${formatPrice(plan.price)}`,
          }))}
        />

        {/* Clase suelta: elegir clase + sesión */}
        {isSingleClass && (
          <>
            <SelectMenu
              label="Clase"
              placeholder="Selecciona la clase"
              value={bookingClassId}
              onChange={(value) => {
                setBookingClassId(value);
                setBookingDate('');
              }}
              options={classes.map((cl) => ({
                value: cl.id,
                label: `${cl.name} · ${LEVEL_LABELS[cl.skillLevel] ?? cl.skillLevel}`,
              }))}
            />
            <SelectMenu
              label="Fecha de la sesión"
              placeholder={bookingClass ? 'Selecciona la fecha' : 'Primero elige la clase'}
              value={bookingDate}
              onChange={setBookingDate}
              disabled={!bookingClass}
              options={sessionOptions.map((s) => ({
                value: s.date,
                label: s.label,
              }))}
            />
          </>
        )}

        {/* File upload area */}
        <div className="flex flex-col gap-1.5">
          <label className="text-dark text-sm font-medium">Comprobante de pago</label>
          <div
            className="hover:border-primary/40 hover:bg-primary/5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Vista previa del comprobante"
                  className="max-h-40 rounded-lg object-contain"
                />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 rounded-full border border-gray-100 bg-white p-1 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
                <FileText className="h-8 w-8 text-gray-400" />
                <span className="px-2 text-center font-medium break-all">{file.name}</span>
                <button
                  type="button"
                  className="text-danger text-xs underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Quitar archivo
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-300" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Toca para seleccionar archivo</p>
                  <p className="mt-0.5 text-xs text-gray-400">JPG, PNG, WEBP o PDF — máx. 10 MB</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Selected plan summary */}
        {selectedPlan && (
          <div className="bg-primary/5 border-primary/10 rounded-xl border px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Plan seleccionado</span>
              <span className="text-dark font-semibold">{selectedPlan.name}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-gray-500">Total a pagar</span>
              <span className="text-primary font-bold">{formatPrice(selectedPlan.price)}</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="bg-danger/5 border-danger/20 text-danger rounded-xl border px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-2">
          <Button
            variant="outlined"
            color="neutral"
            className="h-11 flex-1 rounded-xl"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            className="h-11 flex-1 rounded-xl"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar comprobante'}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
