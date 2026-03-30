import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useApiClient } from '@/lib/api';
import { getInitials } from '@/utils/general';
import type { Role } from '@/lib/roles';

type UserProfile = {
  name: string;
  role: Role;
};

export default function DashboardLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const apiClient = useApiClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    apiClient<UserProfile>('/api/v1/auth/me')
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {
        setNoAccess(true);
      })
      .finally(() => {
        setProfileLoading(false);
      });
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (noAccess || !profile) {
    return <Navigate to="/no-access" replace />;
  }

  const displayName = profile.name || clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress || '';
  const initials = getInitials(displayName);

  return (
    <DashboardShell user={{ name: displayName, role: profile.role, initials }}>
      <Outlet />
    </DashboardShell>
  );
}
