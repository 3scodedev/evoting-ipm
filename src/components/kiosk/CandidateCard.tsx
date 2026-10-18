import { cn } from '@/lib/utils';

export type Candidate = {
  id: string;
  candidate_number: number;
  name: string;
  class_name?: string | null;
  vision_mission: string;
  photo_url: string | null;
};

export function CandidateCard({
  c,
  selected,
  onSelect,
  style,
}: {
  c: Candidate;
  selected?: boolean;
  onSelect?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!selected}
      onClick={onSelect}
      style={style}
      className={cn(
        'text-center rounded-2xl bg-white border shadow-sm overflow-hidden transition hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-green-700',
        selected ? 'border-green-700 ring-4 ring-green-200' : 'border-slate-200'
      )}
    >
      <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center text-5xl font-bold text-slate-400">
        {c.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photo_url} alt={`Foto kandidat ${c.candidate_number} ${c.name}`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          c.name.charAt(0)
        )}
      </div>
      <div className="p-4">
        <span className="inline-block rounded-full bg-amber-400 text-slate-900 text-sm font-bold px-3 py-1">{c.candidate_number}</span>
        <h3 className="mt-2 text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          {c.name}
        </h3>
        {c.class_name && <p className="text-sm font-medium text-slate-500">Kelas {c.class_name}</p>}
        {c.vision_mission && (
          <p className="mt-1 text-sm text-slate-600 line-clamp-3">{c.vision_mission.slice(0, 300)}</p>
        )}
        {selected && <p className="mt-2 font-bold text-green-700">✓ Dipilih</p>}
      </div>
    </button>
  );
}
