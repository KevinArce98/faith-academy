import {
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  forwardRef,
} from 'react';

import { cn } from '@/lib/cn';

/** Outer card wrapper: rounded border + shadow */
export function TableContainer({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-gray-50 bg-white shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** <table> element — always full-width text-sm */
export function Table({ className, children, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full text-sm', className)} {...props}>
      {children}
    </table>
  );
}

/**
 * <thead> that renders its own inner <tr> with header row styles.
 * Children should be <TableHeader> elements.
 */
export function TableHead({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <thead>
      <tr
        className={cn(
          'border-b border-gray-50 text-xs tracking-wide text-gray-400 uppercase',
          className
        )}
        {...props}
      >
        {children}
      </tr>
    </thead>
  );
}

/** <tbody> with forwardRef to support useAutoAnimate */
export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <tbody ref={ref} className={cn('divide-y divide-gray-50', className)} {...props}>
    {children}
  </tbody>
));
TableBody.displayName = 'TableBody';

/** <tr> body row with hover highlight */
export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-gray-50/50', className)} {...props}>
      {children}
    </tr>
  );
}

/** <th> header cell — left-aligned by default */
export function TableHeader({
  className,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('px-3 py-3 text-left font-medium', className)} {...props}>
      {children}
    </th>
  );
}

/** <td> body cell */
export function TableCell({
  className,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-3 py-3', className)} {...props}>
      {children}
    </td>
  );
}

/** Full-width empty state row shown when there is no data */
export function TableEmpty({ colSpan, children }: { colSpan: number; children?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-sm text-gray-400">
        {children ?? 'Sin datos'}
      </td>
    </tr>
  );
}
