import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useApiClient } from '@/lib/api';
import { getInitials } from '@/utils/general';
import { canAccessRoute, type Role } from '@/lib/roles';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type UserProfile = {
	id: string;
	name: string;
	role: Role;
};

export default function DashboardLayout() {
	const { isSignedIn, isLoaded } = useAuth();
	const { user: clerkUser } = useUser();
	const { pathname } = useLocation();
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
	}, [isLoaded, isSignedIn, apiClient]);

	if (!isLoaded) {
		return <FullPageSpinner />;
	}

	if (!isSignedIn) {
		return <Navigate to='/sign-in' replace />;
	}

	if (profileLoading) {
		return <FullPageSpinner />;
	}

	if (noAccess || !profile) {
		return <Navigate to='/no-access' replace />;
	}

	if (!canAccessRoute(profile.role, pathname)) {
		return <Navigate to='/no-access' replace />;
	}

	const displayName =
		profile.name ||
		clerkUser?.fullName ||
		clerkUser?.primaryEmailAddress?.emailAddress ||
		'';
	const initials = getInitials(displayName);

	return (
		<DashboardShell user={{ name: displayName, role: profile.role, initials }}>
			<ErrorBoundary>
				<Outlet context={{ role: profile.role, userId: profile.id }} />
			</ErrorBoundary>
		</DashboardShell>
	);
}
