import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api';
import { VideoLibraryClient } from '@/components/dashboard/VideoLibraryClient';

type Content = {
  id: string;
  title: string;
  type: string;
  url: string;
  createdAt: string;
  description: string | null;
  class: { id: string; name: string } | null;
};

type ContentResponse = { contents: Content[]; classes: { id: string; name: string }[] } | Content[];

export default function VideoLibrary() {
  const apiClient = useApiClient();

  const { data, isLoading, isError } = useQuery<ContentResponse>({
    queryKey: ['content'],
    queryFn: () => apiClient<ContentResponse>('/api/v1/content'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
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
