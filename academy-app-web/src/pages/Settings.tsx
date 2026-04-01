import { Navigate, useOutletContext } from 'react-router-dom';
import { Settings as SettingsIcon, Palette, Building2, Bell, Shield, Globe } from 'lucide-react';
import studioConfig from '@/lib/config/studio.config';
import { isAdmin, type Role } from '@/lib/roles';

const sections = [
  { icon: Building2, label: 'Estudio', desc: 'Nombre, logo, información general' },
  { icon: Palette, label: 'Apariencia', desc: 'Colores, tipografías, tema' },
  { icon: Bell, label: 'Notificaciones', desc: 'Correos, alertas, recordatorios' },
  { icon: Shield, label: 'Seguridad', desc: 'Roles, permisos, accesos' },
  { icon: Globe, label: 'Integraciones', desc: 'Pagos, redes sociales, APIs' },
  { icon: SettingsIcon, label: 'Modulos', desc: 'Feature flags y funcionalidades' },
];

export default function Settings() {
  const { role } = useOutletContext<{ role: Role }>();
  if (!isAdmin(role)) return <Navigate to="/no-access" replace />;

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-dark text-3xl font-bold">Configuracion</h1>

      <div className="divide-y divide-gray-50 rounded-2xl border border-gray-50 bg-white shadow-sm">
        <div className="bg-dark/5 rounded-t-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-xl">
              <span className="text-sm font-bold text-white">{studioConfig.studio.logoText}</span>
            </div>
            <div>
              <p className="text-dark font-bold">{studioConfig.studio.name}</p>
              <p className="text-xs text-gray-400">{studioConfig.studio.tagline}</p>
            </div>
          </div>
        </div>

        {sections.map((s) => (
          <button
            key={s.label}
            className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50/80"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <s.icon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-dark text-sm font-medium">{s.label}</p>
              <p className="text-xs text-gray-400">{s.desc}</p>
            </div>
            <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      {/* Feature flags summary */}
      <div className="rounded-2xl border border-gray-50 bg-white p-6 shadow-sm">
        <h2 className="text-dark mb-4 text-base font-bold">Modulos activos</h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(studioConfig.features).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <span className="text-dark text-sm font-medium capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <div className={`relative h-5 w-10 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'} shadow`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
