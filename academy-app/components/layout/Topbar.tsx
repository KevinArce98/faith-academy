'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { cn } from '@/lib/cn';
import { slideInRight, overlayVariants } from '@/lib/animations';
import { Button } from '@/components/ui/Button';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Inicio',
  students: 'Estudiantes',
  payments: 'Pagos',
  classes: 'Clases',
  plans: 'Planes',
  'video-library': 'Biblioteca de Videos',
  reports: 'Reportes',
  settings: 'Configuración',
};

type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Pago pendiente',
    body: 'Maria Garcia solicito Plan Pro',
    time: 'Hace 5 min',
    unread: true,
  },
  {
    id: '2',
    title: 'Pago pendiente',
    body: 'Carlos Lopez solicito Plan Basico',
    time: 'Hace 18 min',
    unread: true,
  },
  {
    id: '3',
    title: 'Clase Ballet al 90% de capacidad',
    body: 'Ballet Basico · 9:00am tiene 18/20 cupos',
    time: 'Hace 1 hora',
    unread: false,
  },
  {
    id: '4',
    title: 'Membresia por vencer',
    body: 'Carlos Lopez — membresia vence en 3 dias',
    time: 'Hace 2 horas',
    unread: false,
  },
];

type TopbarProps = {
  userInitials: string;
  onMenuClick?: () => void;
};

export function Topbar({ userInitials, onMenuClick }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifs] = useState(mockNotifications);
  const [listRef] = useAutoAnimate<HTMLDivElement>();
  const pathname = usePathname();

  // Build breadcrumbs: "Dashboard / Alumnos"
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'Inicio' },
    ...segments
      .filter((s) => s !== 'dashboard')
      .map((s) => ({ label: ROUTE_LABELS[s] ?? s })),
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  return (
    <>
      {/* ── Bar ────────────────────────────────────── */}
      <header className="fixed top-0 right-0 left-0 z-20 flex h-14 items-center gap-4 border-b border-gray-100 bg-white px-4 md:left-65 md:px-6">
        {/* Mobile hamburger */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-600 active:scale-95 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}

        {/* Mobile center logo */}
        <span className="text-dark flex-1 text-center text-base font-bold md:hidden">StudioFlow</span>

        {/* Breadcrumb — desktop only */}
        <div className="hidden flex-1 items-center gap-1.5 text-sm md:flex">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">/</span>}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? 'text-dark font-semibold'
                    : 'text-gray-400'
                }
              >
                {bc.label}
              </span>
            </span>
          ))}
        </div>

        {/* Notification bell */}
        <Button
          variant="text"
          color="neutral"
          onClick={() => setNotifOpen((v) => !v)}
          className="relative h-auto p-2 hover:bg-gray-50 active:scale-90 border-transparent"
        >
          <Bell className="h-5 w-5 text-gray-500" />
          {unreadCount > 0 && (
            <span className="bg-primary absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>

        {/* Avatar */}
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full">
          <span className="text-xs font-bold text-white">{userInitials}</span>
        </div>
      </header>

      {/* ── Notification Drawer ──────────────────────── */}
      <AnimatePresence>
        {notifOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="notif-backdrop"
              className="fixed inset-0 z-30 bg-black/20"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setNotifOpen(false)}
            />
            {/* Panel */}
            <motion.div
              key="notif-panel"
              className="fixed top-0 right-0 z-40 flex h-full w-80 flex-col bg-white shadow-2xl"
              variants={slideInRight}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h2 className="text-dark text-base font-bold">Notificaciones</h2>
                <div className="flex items-center gap-3">
                  <Button
                    variant="text"
                    color="primary"
                    onClick={markAllRead}
                    className="h-auto p-0 text-xs font-semibold hover:bg-transparent hover:underline"
                  >
                    Marcar todas leidas
                  </Button>
                  <Button
                    variant="text"
                    color="neutral"
                    onClick={() => setNotifOpen(false)}
                    className="h-auto p-0 hover:bg-transparent border-transparent"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              </div>

              <div ref={listRef} className="flex-1 divide-y divide-gray-50 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn('px-5 py-4', n.unread && 'bg-primary/5')}
                  >
                    <div className="flex items-start gap-2">
                      {n.unread && (
                        <div className="bg-primary mt-1 h-2 w-2 shrink-0 rounded-full" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-dark text-sm font-semibold">
                            {n.title}
                          </p>
                          <span className="shrink-0 text-xs text-gray-400">
                            {n.time}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
