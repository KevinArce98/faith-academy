'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import studioConfig from '@/config/studio.config';
import { Button } from '@/components/ui/Button';

export default function NoAccessPage() {
  const { signOut } = useClerk();
  const router = useRouter();
  return (
    <div className="flex min-h-screen">
      {/* Left column */}
      <div className="bg-dark relative hidden flex-col items-center justify-center gap-8 px-12 lg:flex lg:w-2/5">
        <div className="bg-primary flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg">
          <span className="text-3xl font-bold tracking-tight text-white">
            {studioConfig.studio.logoText}
          </span>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">
            {studioConfig.studio.name}
          </h1>
          <p className="mt-2 text-base text-white/60">
            {studioConfig.studio.tagline}
          </p>
        </div>
        <p className="absolute bottom-6 text-xs text-white/30">v1.0.0</p>
      </div>

      {/* Right column */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-warning/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
            <svg
              className="text-warning h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <h2 className="text-dark text-[28px] leading-tight font-bold">
            Sin acceso
          </h2>
          <p className="mt-3 text-sm text-gray-500">
            Tu cuenta no está asociada a ningún estudio todavía. Contacta al
            administrador para que te asigne acceso.
          </p>

          <div className="mt-8">
            <Button
              variant="contained"
              size="lg"
              onClick={() => signOut(() => router.push('/sign-in'))}
              className="w-full rounded-xl"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
