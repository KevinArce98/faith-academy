import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { theme } from '@/theme';

type KpiProps = {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  valueColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  className?: string;
};

export function Kpi({
  label,
  value,
  sub,
  subColor = 'text-text-muted',
  valueColor = 'text-dark',
  icon,
  iconColor = theme.colors.primary,
  className,
}: KpiProps) {
  return (
    <Card className={cn('flex-1 gap-2.5', className)}>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</Text>
        {icon && (
          <View
            className="h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: `${iconColor}1A` }}
          >
            <Ionicons name={icon} size={15} color={iconColor} />
          </View>
        )}
      </View>
      <Text className={cn('text-[26px] font-bold leading-tight', valueColor)} numberOfLines={1}>
        {value}
      </Text>
      {sub && <Text className={cn('text-xs font-medium', subColor)}>{sub}</Text>}
    </Card>
  );
}
