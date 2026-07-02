import { PlansClient } from '@/components/dashboard/PlansClient';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useMe, usePlans } from '@/lib/queries';
import { isAdminOrTeacher } from '@/lib/roles';

export default function Plans() {
  const { data: me } = useMe();
  const { data: plans, isLoading, isError } = usePlans();

  if (isLoading) {
    return <InlineSpinner />;
  }

  if (isError || !plans) {
    return (
      <div className="p-6 text-center text-sm text-danger">
        Error al cargar los planes. Intenta de nuevo.
      </div>
    );
  }

  const isAdmin = me ? isAdminOrTeacher(me.role) : false;

  return <PlansClient plans={plans} isAdmin={isAdmin} />;
}
