import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import studioConfig from '@/config/studio.config';
import { redirect } from 'next/navigation';
import { VideoLibraryClient } from '@/components/dashboard/VideoLibraryClient';

export default async function VideoLibraryPage() {
  if (!studioConfig.features.lms) redirect('/dashboard');

  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const [contents, classes] = await Promise.all([
    db.content.findMany({
      include: { class: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.class.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return <VideoLibraryClient contents={contents as never} classes={classes} />;
}
