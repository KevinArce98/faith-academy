import { ChevronDown, FileText, Pencil, PlayCircle, Search, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

type ContentClass = { id: string; name: string } | null;
type Content = {
  id: string;
  title: string;
  type: string;
  url: string;
  createdAt: string;
  description: string | null;
  class: ContentClass;
};

type VideoLibraryClientProps = {
  contents: Content[];
  classes: { id: string; name: string }[];
};

const TAG_COLORS: Record<string, string> = {
  'Material Global': 'bg-dark text-white',
};

function getTagColor(name: string) {
  return TAG_COLORS[name] ?? 'bg-primary text-white';
}

export function VideoLibraryClient({ contents }: VideoLibraryClientProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('todo');

  const tags = [
    'todo',
    ...Array.from(new Set(contents.map((c) => c.class?.name ?? 'Material Global'))),
  ];

  const filtered = contents.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'todo' ? true : filter === 'Material Global' ? !c.class : c.class?.name === filter;
    return matchSearch && matchFilter;
  });

  const now = new Date();
  function localTimeAgo(date: string) {
    const d = new Date(date);
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Hace 1 dia';
    if (days < 7) return `Hace ${days} dias`;
    if (days < 14) return 'Hace 1 sem';
    return `Hace ${Math.floor(days / 7)} sem`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-dark text-2xl font-bold md:text-3xl">Videoteca</h1>
        <Button variant="contained" className="rounded-xl px-4">
          + Subir Contenido
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="w-full md:w-56">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contenido..."
            startIcon={<Search className="h-4 w-4" />}
            className="h-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="text"
            color="neutral"
            className="h-9 shrink-0 px-3 text-sm border border-gray-200 hover:bg-gray-50 gap-1.5"
          >
            Por clase <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="text"
            color="neutral"
            className="h-9 shrink-0 px-3 text-sm border border-gray-200 hover:bg-gray-50 gap-1.5"
          >
            Tipo <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tag pills */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {tags.map((tag) => (
          <Button
            key={tag}
            onClick={() => setFilter(tag)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-semibold',
              filter === tag
                ? 'bg-primary text-white border-primary hover:bg-primary-light'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary hover:bg-white'
            )}
            variant={filter === tag ? 'contained' : 'text'}
            color={filter === tag ? 'primary' : 'neutral'}
          >
            {tag === 'todo' ? 'Todo' : tag}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((content) => {
          const isVideo = content.type === 'VIDEO';
          const isDocument = content.type === 'DOCUMENT';
          const tagName = content.class?.name ?? 'Material Global';
          return (
            <div
              key={content.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-50 bg-white shadow-sm"
            >
              <div className="bg-dark relative flex h-36 items-center justify-center">
                {isVideo ? (
                  <>
                    <PlayCircle className="h-12 w-12 text-white/80" />
                    <span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-xs text-white">
                      12:34
                    </span>
                  </>
                ) : isDocument ? (
                  <div className="text-primary/70 flex h-full w-full flex-col items-center justify-center gap-2 bg-blue-50">
                    <FileText className="text-primary h-10 w-10" />
                    <span className="text-primary text-xs font-bold">PDF</span>
                  </div>
                ) : (
                  <div className="h-10 w-10 text-gray-300">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01"
                      />
                    </svg>
                  </div>
                )}
                <span
                  className={cn(
                    'absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold',
                    getTagColor(tagName)
                  )}
                >
                  {tagName}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-dark line-clamp-2 text-sm font-semibold">{content.title}</h3>
                {isDocument ? (
                  <p className="text-xs text-gray-400">PDF · 2.4 MB</p>
                ) : (
                  <p className="text-xs text-gray-400">Subido {localTimeAgo(content.createdAt)}</p>
                )}
                {!isDocument && <p className="text-xs text-gray-400">👁 — vistas</p>}

                <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-success h-1.5 w-1.5 rounded-full" />
                    <span className="text-success text-xs font-medium">Publicado</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="text" color="neutral" className="h-auto p-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="text" color="danger" className="h-auto p-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <Button
          variant="text"
          color="neutral"
          className="h-64 flex-col rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary hover:text-primary"
        >
          <Upload className="h-8 w-8" />
          <span className="text-sm font-medium">Subir contenido</span>
          <span className="text-xs opacity-70">MP4, PDF, JPG</span>
        </Button>
      </div>
    </div>
  );
}
