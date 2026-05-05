import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { useScrollLock } from '@/hooks/useScrollLock';
import type { Role } from '@/lib/roles';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

type DashboardShellProps = {
	user: { name: string; role: Role; initials: string };
	children: React.ReactNode;
};

export function DashboardShell({ user, children }: DashboardShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	useScrollLock(sidebarOpen);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Desktop sidebar — always visible md+ */}
			<div className="hidden md:block">
				<Sidebar user={user} />
			</div>

			{/* Mobile sidebar overlay + drawer */}
			<AnimatePresence>
				{sidebarOpen && (
					<>
						<motion.div
							key="sidebar-overlay"
							className="fixed inset-0 z-40 bg-black/40 md:hidden"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							onClick={() => setSidebarOpen(false)}
						/>
						<motion.div
							key="sidebar-mobile"
							className="fixed inset-y-0 left-0 z-50 w-[280px] md:hidden"
							initial={{ x: '-100%' }}
							animate={{ x: 0 }}
							exit={{ x: '-100%' }}
							transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						>
							<Sidebar user={user} onClose={() => setSidebarOpen(false)} />
						</motion.div>
					</>
				)}
			</AnimatePresence>

			{/* Topbar */}
			<Topbar
				userInitials={user.initials}
				onMenuClick={() => setSidebarOpen(true)}
			/>

			{/* Main content */}
			<main className="min-h-screen pt-14 md:ml-65">
				<div className="p-4 md:p-8">{children}</div>
			</main>
		</div>
	);
}
