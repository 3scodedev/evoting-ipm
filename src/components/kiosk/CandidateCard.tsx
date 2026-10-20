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
        'group relative overflow-hidden rounded-[22px] border-2 border-ink bg-white text-left shadow-hard-sm transition duration-200 hover:-translate-y-1 hover:shadow-hard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-sky',
        selected && 'bg-brand-yellow/15 ring-4 ring-brand-yellow shadow-hard'
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-ink bg-brand-sky-light/45">
        {c.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.photo_url}
            alt={`Foto kandidat ${c.candidate_number} ${c.name}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full w-full place-items-center font-[family-name:var(--font-display)] text-6xl font-extrabold text-ink/20">
            {c.name.charAt(0)}
          </span>
        )}
        <span className="absolute -left-1 -top-1 grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-brand-yellow font-[family-name:var(--font-display)] text-lg font-extrabold shadow-[3px_3px_0_#131313] 2xl:h-12 2xl:w-12 2xl:text-xl">
          {c.candidate_number}
        </span>
        {selected && (
          <span className="absolute right-2.5 top-2.5 rounded-full border-2 border-ink bg-brand-sky px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-[2px_2px_0_#131313]">
            Dipilih
          </span>
        )}
      </div>
      <div className="p-4 2xl:p-5">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight tracking-tight 2xl:text-2xl">
          {c.name}
        </h3>
        {c.class_name && (
          <p className="mt-0.5 text-xs font-bold text-brand-sky-deep 2xl:text-sm">Kelas {c.class_name}</p>
        )}
        {c.vision_mission && (
          <p className="mt-1.5 line-clamp-3 text-sm font-medium leading-relaxed text-ink/55 2xl:text-base">
            {c.vision_mission.slice(0, 300)}
          </p>
        )}
      </div>
    </button>
  );
}
