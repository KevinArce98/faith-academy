import { Outlet } from 'react-router-dom';

import studioConfig from '@/lib/config/studio.config';

export default function AuthLayout() {
	return (
		<div className="flex min-h-screen">
			{/* ── Columna izquierda — fondo dark ───────────────────────── */}
			<div className="bg-dark relative hidden flex-col items-center justify-center gap-8 px-12 lg:flex lg:w-2/5">
				{studioConfig.studio.logoUrl ? (
					<img
						src={studioConfig.studio.logoUrl}
						alt={studioConfig.studio.name}
						width={80}
						height={80}
					/>
				) : (
					<div className="bg-primary flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg">
						<span className="text-3xl font-bold tracking-tight text-white">
							{studioConfig.studio.logoText}
						</span>
					</div>
				)}

				{(studioConfig.studio.name || studioConfig.studio.tagline) && (
					<div className="text-center">
						{studioConfig.studio.name && (
							<h1 className="text-3xl font-bold text-white">
								{studioConfig.studio.name}
							</h1>
						)}
						{studioConfig.studio.tagline && (
							<p className="mt-2 text-base text-white/60">
								{studioConfig.studio.tagline}
							</p>
						)}
					</div>
				)}
				<p className="absolute bottom-6 text-xs text-white/30">v1.0.0</p>
			</div>

			{/* ── Columna derecha — fondo blanco ───────────────────────── */}
			<div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
				<div className="w-full max-w-md">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
