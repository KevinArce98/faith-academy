import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';

import { VideoLibraryClient } from '@/components/dashboard/VideoLibraryClient';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import studioConfig from '@/lib/config/studio.config';

type Content = {
	id: string;
	title: string;
	type: string;
	url: string;
	createdAt: string;
	description: string | null;
	class: { id: string; name: string } | null;
};

type ContentResponse =
	| { contents: Content[]; classes: { id: string; name: string }[] }
	| Content[];

export default function VideoLibrary() {
	const apiClient = useApiClient();

	const { data, isLoading, isError } = useQuery<ContentResponse>({
		queryKey: ['content'],
		queryFn: () => apiClient<ContentResponse>('/api/v1/content'),
		enabled: studioConfig.features.lms,
	});

	if (!studioConfig.features.lms) return <Navigate to="/no-access" replace />;

	if (isLoading) {
		return <InlineSpinner />;
	}

	if (isError || !data) {
		return (
			<div className="p-6 text-center text-sm text-danger">
				Error al cargar el contenido. Intenta de nuevo.
			</div>
		);
	}

	const contents: Content[] = Array.isArray(data) ? data : data.contents;
	const classes = Array.isArray(data) ? [] : data.classes;

	return <VideoLibraryClient contents={contents} classes={classes} />;
}
