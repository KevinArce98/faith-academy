import { AnimatePresence, motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';

import type { TeacherProfile } from '@/lib/interfaces/teachers';

type TeacherMenuProps = {
	teacher: TeacherProfile;
	isOpen: boolean;
	loading: boolean;
	onToggleMenu: () => void;
	onEdit: () => void;
	onChangeRole: () => void;
	onToggleActive: () => void;
	onDelete: () => void;
};

export function TeacherMenu({
	teacher,
	isOpen,
	loading,
	onToggleMenu,
	onEdit,
	onChangeRole,
	onToggleActive,
	onDelete,
}: TeacherMenuProps) {
	return (
		<div className="relative">
			<motion.button
				onClick={(e) => {
					e.stopPropagation();
					onToggleMenu();
				}}
				className="text-gray-400 transition-colors hover:text-dark"
				aria-label="Acciones"
				whileTap={{ scale: 0.92 }}
				animate={{ rotate: isOpen ? 90 : 0 }}
				transition={{ duration: 0.16, ease: 'easeOut' }}
			>
				<MoreVertical className="h-5 w-5" />
			</motion.button>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-xl border border-gray-100 bg-white text-sm shadow-xl"
						initial={{ opacity: 0, y: -8, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -6, scale: 0.98 }}
						transition={{ duration: 0.18, ease: 'easeOut' }}
					>
						<button
							className="w-full px-4 py-2 text-left transition-colors hover:bg-gray-50"
							onClick={onEdit}
						>
							Editar
						</button>
						<button
							className="text-left w-full px-4 py-2 transition-colors hover:bg-gray-50"
							onClick={onChangeRole}
						>
							Cambiar a Alumno
						</button>
						<button
							className="text-left w-full px-4 py-2 transition-colors hover:bg-gray-50"
							onClick={onToggleActive}
							disabled={loading}
						>
							{teacher.isActive ? 'Desactivar' : 'Activar'}
						</button>
						<button
							className="text-left w-full px-4 py-2 text-danger transition-colors hover:bg-danger/5"
							onClick={onDelete}
						>
							Eliminar
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
