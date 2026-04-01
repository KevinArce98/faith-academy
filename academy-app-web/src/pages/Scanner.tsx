import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from "@clerk/react";
import { useQuery } from '@tanstack/react-query';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { useApiClient } from '@/lib/api';
import { isAdminOrTeacher, type Role } from '@/lib/roles';
import studioConfig from '@/lib/config/studio.config';

interface ScanResult {
  ok: boolean;
  reason?: string;
  student?: { name: string; avatarUrl: string | null };
  balance?: number;
  nearExpiry?: boolean;
  scannedAt: Date;
}

const PRIMARY = studioConfig.colors.primary;
const NAVY = studioConfig.colors.dark;

export default function Scanner() {
  const { isSignedIn, isLoaded } = useAuth();
  const apiClient = useApiClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const lastTokenRef = useRef<string>('');

  const { data: me, isLoading: meLoading } = useQuery<{ role: Role }>({
    queryKey: ['me'],
    queryFn: () => apiClient<{ role: Role }>('/api/v1/auth/me'),
    enabled: isLoaded && !!isSignedIn,
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!me || !isAdminOrTeacher(me.role)) return;
    if (!videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    setScanning(true);

    reader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, error) => {
          if (error instanceof NotFoundException || !result) return;

          const token = result.getText();
          if (token === lastTokenRef.current) return;
          lastTokenRef.current = token;
          setTimeout(() => {
            lastTokenRef.current = '';
          }, 3000);

          setLoading(true);
          try {
            const data = await apiClient<Omit<ScanResult, 'scannedAt'>>(
              '/api/v1/attendance/scan',
              {
                method: 'POST',
                body: JSON.stringify({ token }),
              }
            );
            setHistory((prev) =>
              [{ ...data, scannedAt: new Date() }, ...prev].slice(0, 20)
            );
          } catch {
            setHistory((prev) =>
              [{ ok: false, reason: 'ERROR', scannedAt: new Date() }, ...prev].slice(0, 20)
            );
          } finally {
            setLoading(false);
          }
        }
      )
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch(console.error);

    return () => {
      controlsRef.current?.stop();
      setScanning(false);
    };
  }, [isLoaded, isSignedIn, me]);

  if (!isLoaded || meLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!me || !isAdminOrTeacher(me.role)) {
    return <Navigate to="/no-access" replace />;
  }

  function getCardStyle(entry: ScanResult): React.CSSProperties {
    if (!entry.ok)
      return { backgroundColor: 'var(--color-danger-bg)', borderColor: studioConfig.colors.danger };
    if (entry.nearExpiry)
      return { backgroundColor: 'var(--color-warning-bg)', borderColor: studioConfig.colors.warning };
    return { backgroundColor: 'var(--color-success-bg)', borderColor: studioConfig.colors.success };
  }

  function getStatusLabel(entry: ScanResult): string {
    if (!entry.ok) {
      if (entry.reason === 'MEMBERSHIP_INACTIVE') return 'Membresía inactiva';
      if (entry.reason === 'NO_CREDITS') return 'Sin créditos';
      if (entry.reason === 'INVALID_QR') return 'QR inválido';
      return 'Error';
    }
    if (entry.nearExpiry) return '¡Membresía por vencer!';
    return 'Asistencia registrada';
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: studioConfig.colors.background }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 shadow-sm" style={{ backgroundColor: NAVY }}>
        <div className="h-8 w-3 rounded-full" style={{ backgroundColor: PRIMARY }} />
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Scanner de Asistencia
        </h1>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
        {/* Camera */}
        <div className="flex flex-1 flex-col items-center gap-4">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border-4 shadow-lg"
            style={{ borderColor: scanning ? PRIMARY : 'var(--color-gray-400)' }}
          >
            <video ref={videoRef} className="aspect-square w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="h-48 w-48 rounded-xl border-4"
                style={{
                  borderColor: PRIMARY,
                  boxShadow: `0 0 0 9999px color-mix(in srgb, ${NAVY} 40%, transparent)`,
                }}
              />
            </div>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div
                  className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
                  style={{ borderColor: `${PRIMARY} transparent ${PRIMARY} ${PRIMARY}` }}
                />
              </div>
            )}
          </div>
          <p className="text-sm font-medium" style={{ color: NAVY }}>
            {loading ? 'Verificando...' : scanning ? 'Apunta la cámara al código QR del alumno' : 'Iniciando cámara...'}
          </p>
        </div>

        {/* History */}
        <div className="flex w-full flex-col gap-3 lg:w-80">
          <h2 className="text-base font-semibold" style={{ color: NAVY }}>
            Historial de escaneos
          </h2>
          {history.length === 0 && (
            <p className="text-sm text-slate-400">Sin escaneos aún.</p>
          )}
          <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
            {history.map((entry, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 rounded-xl border p-3 transition-all"
                style={getCardStyle(entry)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">
                    {entry.ok ? entry.student?.name : getStatusLabel(entry)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {entry.scannedAt.toLocaleTimeString('es-CR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
                {entry.ok && (
                  <>
                    <span className="text-xs font-medium" style={{ color: entry.nearExpiry ? studioConfig.colors.warning : studioConfig.colors.success }}>
                      {getStatusLabel(entry)}
                    </span>
                    <span className="text-xs text-slate-600">
                      Créditos restantes: <strong style={{ color: NAVY }}>{entry.balance}</strong>
                    </span>
                    {entry.nearExpiry && (
                      <span className="text-xs font-medium text-amber-700">⚠ La membresía vence pronto</span>
                    )}
                  </>
                )}
                {!entry.ok && (
                  <span className="text-xs font-medium text-red-600">{getStatusLabel(entry)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
