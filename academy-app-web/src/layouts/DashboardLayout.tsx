import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
import { type Role, canAccessRoute } from '@/lib/roles';
import { getInitials } from '@/utils/general';

type UserProfile = {
	id: string;
	name: string;
	role: Role;
};

export default function DashboardLayout() {
	const { isSignedIn, isLoaded } = useAuth();
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
		return <Navigate to="/sign-in" replace />;
	}

	if (profileLoading) {
		return <FullPageSpinner />;
	}

	if (noAccess || !profile) {
		return <Navigate to="/no-access" replace />;
	}

	if (!canAccessRoute(profile.role, pathname)) {
		return <Navigate to="/no-access" replace />;
	}

	const displayName = profile.name || '';
	const initials = getInitials(displayName);

	return (
		<DashboardShell user={{ name: displayName, role: profile.role, initials }}>
			<ErrorBoundary>
				<Outlet context={{ role: profile.role, userId: profile.id }} />
			</ErrorBoundary>
		</DashboardShell>
	);
}
