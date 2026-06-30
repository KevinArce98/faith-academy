import { type ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';

type TooltipProps = {
	label: string;
	children: ReactNode;
	className?: string;
};

// Tooltip ligero basado en portal: se renderiza en document.body con position
// fixed, así nunca lo recorta un contenedor con overflow-hidden (p.ej. tablas).
export function Tooltip({ label, children, className }: TooltipProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const [coords, setCoords] = useState<{ top: number; left: number } | null>(
		null,
	);

	function show() {
		const el = ref.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		setCoords({ top: r.top, left: r.left + r.width / 2 });
	}

	function hide() {
		setCoords(null);
	}

	return (
		<span
			ref={ref}
			className="inline-flex"
			onMouseEnter={show}
			onMouseLeave={hide}
			onFocus={show}
			onBlur={hide}
		>
			{children}
			{coords &&
				createPortal(
					<span
						role="tooltip"
						style={{
							position: 'fixed',
							top: coords.top - 6,
							left: coords.left,
							transform: 'translate(-50%, -100%)',
						}}
						className={cn(
							'bg-dark pointer-events-none z-[100] whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-white shadow-md',
							className,
						)}
					>
						{label}
					</span>,
					document.body,
				)}
		</span>
	);
}
