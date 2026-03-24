'use client';

import { useState, useTransition, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, CircleCheckBig, X } from 'lucide-react';
import { createTeacherAction } from '@/actions/teachers';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function normalizeName(name: string) {
  return name.replace(/\s+/g, ' ').trim();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type NewTeacherModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (message: string) => void;
};

export function NewTeacherModal({ isOpen, onClose, onCreated }: NewTeacherModalProps) {
  const router = useRouter();
  const initialForm = { name: '', email: '' };
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function resetState() {
    setForm(initialForm);
    setError(null);
    setResult(null);
    setCopied(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const name = normalizeName(form.name);
    const email = normalizeEmail(form.email);
    if (!name || !email) {
      setError('Nombre y email son requeridos.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createTeacherAction({ name, email });
        if (!res?.success) {
          setError('No se pudo crear el profesor.');
          return;
        }
        setResult({ tempPassword: res.tempPassword });
        onCreated?.('Profesor creado exitosamente.');
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al crear el profesor.';
        setError(message);
      }
    });
  }

  function handleCopy() {
    if (!result?.tempPassword) return;
    navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canSubmit = normalizeName(form.name).length > 0 && normalizeEmail(form.email).length > 0;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title={result ? undefined : 'Nuevo Profesor'}
    >
      {result ? (
        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
          <div className="bg-success/10 flex h-16 w-16 items-center justify-center rounded-full">
            <CircleCheckBig className="h-9 w-9 text-success" />
          </div>
          <div>
            <p className="text-dark text-xl font-bold">Profesor creado exitosamente</p>
            <p className="text-gray-500 text-sm">Comparte la contraseña temporal para que pueda iniciar sesión.</p>
          </div>
          <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-sm font-semibold text-amber-800">Contraseña temporal</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="text-dark flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2 text-center font-mono text-base font-semibold tracking-wide">
                {result.tempPassword}
              </code>
              <Button
                type="button"
                variant="text"
                color="neutral"
                onClick={handleCopy}
                className="h-10 w-10 border border-amber-200 text-amber-700 hover:bg-amber-100"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-amber-700 mt-2">Pídele cambiarla al iniciar sesión por primera vez.</p>
          </div>
          <Button className="h-11 w-full rounded-xl" onClick={handleClose}>
            Cerrar
          </Button>
        </div>
      ) : (
        <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark text-lg font-bold">Nuevo Profesor</p>
              <p className="text-gray-400 text-sm">Crea una cuenta y envia una contraseña temporal.</p>
            </div>
            <Button
              type="button"
              variant="text"
              color="neutral"
              onClick={handleClose}
              className="h-auto p-1 text-gray-400"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Input
            label="Nombre completo"
            placeholder="Ej. Ana Valverde"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            type="email"
            label="Email"
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button
            type="submit"
            className="h-11 w-full rounded-xl"
            disabled={!canSubmit || isPending}
          >
            {isPending ? 'Creando...' : 'Crear Profesor'}
          </Button>
        </form>
      )}
    </ResponsiveModal>
  );
}
