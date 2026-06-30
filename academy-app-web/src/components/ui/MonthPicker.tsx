import { SelectMenu } from './SelectMenu';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

type MonthPickerProps = {
  /** Valor en formato "YYYY-MM" */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Años a mostrar hacia atrás desde el año actual (default 1) */
  yearsBefore?: number;
  /** Años a mostrar hacia adelante desde el año actual (default 1) */
  yearsAfter?: number;
};

function parseValue(v: string): { year: string; month: string } {
  const [y = '', m = ''] = v.split('-');
  return { year: y, month: m };
}

export function MonthPicker({
  value,
  onChange,
  label,
  yearsBefore = 1,
  yearsAfter = 1,
}: MonthPickerProps) {
  const { year, month } = parseValue(value);
  const currentYear = new Date().getFullYear();

  const yearOptions = Array.from({ length: yearsBefore + yearsAfter + 1 }, (_, i) => {
    const y = String(currentYear - yearsBefore + i);
    return { value: y, label: y };
  });

  const monthOptions = MONTHS.map((name, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: name,
  }));

  function handleYear(y: string) {
    onChange(`${y}-${month || '01'}`);
  }

  function handleMonth(m: string) {
    onChange(`${year || String(currentYear)}-${m}`);
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-dark text-label">{label}</span>}
      <div className="flex gap-2">
        <SelectMenu
          value={month}
          onChange={handleMonth}
          options={monthOptions}
          placeholder="Mes"
          className="w-44"
        />
        <SelectMenu
          value={year}
          onChange={handleYear}
          options={yearOptions}
          placeholder="Año"
          className="w-28"
        />
      </div>
    </div>
  );
}
