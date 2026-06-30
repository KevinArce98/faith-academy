import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode } from 'react';

import { useScrollLock } from '@/hooks/useScrollLock';
import { modalVariants, overlayVariants } from '@/lib/animations';

type ResponsiveModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
};

export function ResponsiveModal({ isOpen, onClose, children, title }: ResponsiveModalProps) {
  useScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
          onClick={onClose}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl md:max-w-lg md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag indicator */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>
            {title && (
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 md:py-5">
                <h2 className="text-dark text-lg font-bold md:text-xl">{title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
            )}
            <div className="pb-8 md:pb-0">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
