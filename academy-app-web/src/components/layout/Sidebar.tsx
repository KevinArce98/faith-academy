import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  Calendar,
  Tag,
  PlayCircle,
  BarChart2,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import studioConfig from '@shared/config/studio.config';
import { Button } from '@/components/ui/Button';
import { useClerk } from '@clerk/clerk-react';
import { canAccessRoute, type Role } from '@/lib/roles';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

function getBaseNavItems(role: Role): NavItem[] {
  const items: NavItem[] = [
    { href: '/', icon: LayoutDashboard, label: 'Inicio' },
    { href: '/students', icon: Users, label: 'Estudiantes' },
  ];

  if (role === 'ADMIN') {
    items.push({ href: '/teachers', icon: GraduationCap, label: 'Profesores' });
  }

  items.push(
    { href: '/payments', icon: CreditCard, label: role === 'STUDENT' ? 'Mis Pagos' : 'Pagos' },
    { href: '/classes', icon: Calendar, label: 'Clases' },
    { href: '/plans', icon: Tag, label: 'Planes' },
  );

  return items;
}

const conditionalNavItems: Array<
  NavItem & { feature: keyof typeof studioConfig.features }
> = [
  {
    href: '/video-library',
    icon: PlayCircle,
    label: 'Biblioteca de Videos',
    feature: 'lms',
  },
  { href: '/reports', icon: BarChart2, label: 'Reportes', feature: 'reports' },
];

const bottomNavItem: NavItem = {
  href: '/settings',
  icon: Settings,
  label: 'Configuración',
};

type SidebarProps = {
  user: {
    name: string;
    role: Role;
    initials: string;
  };
  onClose?: () => void;
};

export function Sidebar({ user, onClose }: SidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();

  const navItems: NavItem[] = [
    ...getBaseNavItems(user.role),
    ...conditionalNavItems.filter(
      (item) => studioConfig.features[item.feature]
    ),
    bottomNavItem,
  ].filter((item) => canAccessRoute(user.role, item.href));

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await signOut();
    navigate('/sign-in');
  }

  return (
    <aside className="bg-dark flex h-screen w-full flex-col md:fixed md:top-0 md:left-0 md:z-30 md:w-65">
      {/* ── Logo ──────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <span className="text-sm leading-none font-bold text-white">
            {studioConfig.studio.logoText}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] leading-tight font-bold text-white">
            {studioConfig.studio.name}
          </p>
          <p className="truncate text-xs text-white/40">
            {studioConfig.studio.tagline}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Cerrar menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all active:scale-95',
                active
                  ? 'bg-dark-mid border-primary border-l-4 pl-2 font-bold text-white'
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* ── User ──────────────────────────────────── */}
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
        <div className="bg-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <span className="text-sm font-bold text-white">{user.initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {user.name}
          </p>
          <p className="truncate text-xs text-white/40 capitalize">
            {user.role === 'ADMIN'
              ? 'Administrador'
              : user.role === 'TEACHER'
                ? 'Profesor'
                : 'Alumno'}
          </p>
        </div>
        <Button
          variant="text"
          color="neutral"
          onClick={handleLogout}
          title="Cerrar sesión"
          className="h-auto border-transparent p-1 text-white/40 hover:bg-transparent hover:text-white active:scale-90"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
