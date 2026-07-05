import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { overlayVariants, slideInRight } from '@/lib/animations';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { qk } from '@/lib/queryKeys';
import { timeAgo } from '@/utils/general';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Inicio',
  students: 'Alumnos',
  teachers: 'Profesores',
  payments: 'Pagos',
  classes: 'Clases',
  attendance: 'Inscripciones',
  'class-attendance': 'Asistencia',
  'my-classes': 'Mis Clases',
  payouts: 'Pago a profes',
  plans: 'Planes',
  account: 'Mi Cuenta',
  'video-library': 'Biblioteca de Videos',
  reports: 'Reportes',
};

type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type TopbarProps = {
  userInitials: string;
  userAvatarUrl?: string | null;
  onMenuClick?: () => void;
};

export function Topbar({ userInitials, userAvatarUrl, onMenuClick }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [listRef] = useAutoAnimate<HTMLDivElement>();
  const { pathname } = useLocation();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{
    notifications: ApiNotification[];
    unreadCount: number;
  }>({
    queryKey: qk.notifications,
    queryFn: () =>
      apiClient<{ notifications: ApiNotification[]; unreadCount: number }>(
        '/api/v1/notifications',
      ),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: () => apiClient('/api/v1/notifications/read', { method: 'POST', body: '{}' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.notifications }),
  });

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'Inicio' },
    ...segments
      .filter((s) => s !== 'dashboard')
      .map((s) => ({
        label: ROUTE_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1),
      })),
  ];

  function markAllRead() {
    markReadMutation.mutate();
  }

  function handleOpen() {
    setNotifOpen(true);
  }

  return (
    <>
      {/* ── Bar ────────────────────────────────────── */}
      <header className="fixed top-0 right-0 left-0 z-20 flex h-14 items-center gap-4 border-b border-gray-100 bg-white px-4 md:left-65 md:px-6">
        {/* Mobile hamburger */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-600 active:scale-95 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}

        {/* Mobile center logo */}
        <span className="text-dark flex-1 text-center text-base font-bold md:hidden">
          StudioFlow
        </span>

        {/* Breadcrumb — desktop only */}
        <div className="hidden flex-1 items-center gap-1.5 text-sm md:flex">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">/</span>}
              <span
                className={
                  i === breadcrumbs.length - 1 ? 'text-dark font-semibold' : 'text-gray-400'
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
          onClick={handleOpen}
          className="relative h-auto p-2 hover:bg-gray-50 active:scale-90 border-transparent"
        >
          <Bell className={cn('h-5 w-5', isLoading ? 'text-gray-300' : 'text-gray-500')} />
          {unreadCount > 0 && (
            <span className="bg-primary absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* Avatar → Mi Cuenta */}
        <Link to="/account" title="Mi Cuenta" className="shrink-0 active:scale-95">
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full">
              <span className="text-xs font-bold text-white">{userInitials}</span>
            </div>
          )}
        </Link>
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
                  {unreadCount > 0 && (
                    <Button
                      variant="text"
                      color="primary"
                      onClick={markAllRead}
                      className="h-auto p-0 text-xs font-semibold hover:bg-transparent hover:underline"
                    >
                      Marcar todas leídas
                    </Button>
                  )}
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
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner size="sm" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <Bell className="h-10 w-10 text-gray-200" />
                    <p className="text-sm text-gray-400">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const unread = !n.read;
                    return (
                      <div key={n.id} className={cn('px-5 py-4', unread && 'bg-primary/5')}>
                        <div className="flex items-start gap-2">
                          {unread && (
                            <div className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                          )}
                          <div className={cn('min-w-0 flex-1', !unread && 'pl-4')}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-dark text-sm font-semibold">{n.title}</p>
                              <span className="shrink-0 text-xs text-gray-400">
                                {timeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
