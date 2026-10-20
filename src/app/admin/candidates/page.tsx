'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Pencil, Plus, Trash2, UserSquare2, Users, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ToastStack, useToasts } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { PageHeader, Panel } from '@/components/admin/Panel';
import { CandidatesSkeleton } from '@/components/skeletons/CandidatesSkeleton';
import { cn } from '@/lib/utils';
import {
  listCandidatesAdmin,
  upsertCandidate,
  deleteCandidate,
  type AdminCandidate,
} from '@/app/actions/candidates';

function nextFree(list: AdminCandidate[]) {
  for (let i = 1; i <= 20; i++) if (!list.some((c) => c.candidate_number === i)) return i;
  return 1;
}

export default function CandidatesPage() {
  const [rows, setRows] = useState<AdminCandidate[]>([]);
  const [editing, setEditing] = useState<AdminCandidate | null>(null);
  const [no, setNo] = useState('');
  const [name, setName] = useState('');
  const [kelas, setKelas] = useState('');
  const [visi, setVisi] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const { toasts, push, dismiss } = useToasts();
  const formRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await listCandidatesAdmin();
      if (!res.success) {
        push('error', res.error.message);
        return [] as AdminCandidate[];
      }
      setRows(res.data.rows);
      // Nomor urut default = angka terkecil yang masih kosong (kalau user belum mengisi)
      setNo((prev) => prev || String(nextFree(res.data.rows)));
      return res.data.rows;
    } catch (err) {
      // Server action bisa gagal total (env/server error). Tanpa catch, daftar cuma
      // tampil kosong seolah-olah belum ada kandidat.
      push('error', err instanceof Error ? err.message : 'Gagal memuat kandidat.');
      return [] as AdminCandidate[];
    } finally {
      setReady(true);
    }
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  // Preview foto yang baru dipilih
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    // Reset input supaya file yang sama bisa dipilih ulang setelah crop dibatalkan.
    e.target.value = '';
    if (!picked) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(picked.type)) {
      push('error', 'Foto harus JPG, PNG, atau WebP.');
      return;
    }
    if (picked.size > 25 * 1024 * 1024) {
      push('error', 'Foto terlalu besar. Maksimal 25MB sebelum crop.');
      return;
    }
    setCropFile(picked);
  }

  function resetForm(list?: AdminCandidate[]) {
    setEditing(null);
    setName('');
    setKelas('');
    setVisi('');
    setFile(null);
    setCropFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setNo(String(nextFree(list ?? rows)));
  }

  function startEdit(c: AdminCandidate) {
    setEditing(c);
    setNo(String(c.candidate_number));
    setName(c.name);
    setKelas(c.class_name);
    setVisi(c.vision_mission);
    setFile(null);
    setCropFile(null);
    if (fileRef.current) fileRef.current.value = '';
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const fd = new FormData();
    if (editing) fd.set('id', editing.id);
    fd.set('candidate_number', no);
    fd.set('name', name);
    fd.set('class_name', kelas);
    fd.set('vision_mission', visi);
    if (file) fd.set('photo', file);
    const res = await upsertCandidate(fd);
    if (!res.success) {
      setSaving(false);
      push('error', res.error.message);
      return;
    }
    const wasEdit = !!editing;
    const label = name.trim();
    const fresh = await load();
    resetForm(fresh);
    setSaving(false);
    push('success', wasEdit ? `"${label}" diperbarui.` : `"${label}" ditambahkan.`);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    const res = await deleteCandidate({ id: pendingDelete.id });
    setBusy(false);
    if (!res.success) {
      push('error', res.error.message);
      return;
    }
    const removed = res.data.votes_removed ?? 0;
    push('success', removed > 0 ? `"${pendingDelete.name}" dihapus — ${removed} suara ikut terhapus.` : `"${pendingDelete.name}" dihapus.`);
    const fresh = await load();
    if (editing?.id === pendingDelete.id) resetForm(fresh);
    setPendingDelete(null);
  }

  if (!ready) return <CandidatesSkeleton />;

  const totalVotes = rows.reduce((a, c) => a + c.vote_count, 0);
  const previewSrc = preview ?? (!file && editing ? editing.photo_url : null);

  return (
    <main className="app-page animate-fade-in">
      <PageHeader
        icon={UserSquare2}
        kicker="Command Center"
        title="Manajemen Kandidat"
        description="Atur paslon, visi misi, dan foto yang tampil di surat suara digital."
      >
        <Badge tone="sky">{rows.length} kandidat</Badge>
        <span className="app-chip font-mono text-[10px]" aria-live="polite">
          {totalVotes} suara masuk
        </span>
      </PageHeader>

      <div ref={formRef} className="mt-4 scroll-mt-5">
        <Panel
          icon={editing ? Pencil : Plus}
          title={editing ? `Edit Kandidat No.${editing.candidate_number}` : 'Tambah Kandidat'}
          tone="yellow"
          aside={
            editing && (
              <span className="app-chip bg-brand-sky-light text-[10px]">Mode edit</span>
            )
          }
        >
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid content-start gap-3.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <div>
                  <label htmlFor="c-no" className="app-label">No. urut</label>
                  <input
                    id="c-no"
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={no}
                    onChange={(e) => setNo(e.target.value)}
                    className="app-input mt-1.5 font-mono font-bold"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="c-name" className="app-label">Nama paslon</label>
                  <input
                    id="c-name"
                    required
                    minLength={3}
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="cth: Ananda Pratama"
                    className="app-input mt-1.5"
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <label htmlFor="c-class" className="app-label">
                    Kelas <span className="normal-case text-ink/35">(opsional)</span>
                  </label>
                  <input
                    id="c-class"
                    maxLength={60}
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="cth: XI RPL 1"
                    className="app-input mt-1.5"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label htmlFor="c-visi" className="app-label">
                  Visi misi <span className="normal-case text-ink/35">(opsional)</span>
                </label>
                <textarea
                  id="c-visi"
                  maxLength={2000}
                  rows={5}
                  value={visi}
                  onChange={(e) => setVisi(e.target.value)}
                  placeholder="Visi misi singkat (opsional)…"
                  className="app-input mt-1.5 resize-y"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t-2 border-dashed border-ink/15 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-brand-sky-light/45">
                  {previewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewSrc} alt="Preview foto kandidat" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-ink/30" aria-hidden />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileRef}
                      id="c-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoPick}
                      className="hidden"
                    />
                    <label
                      htmlFor="c-photo"
                      className="cursor-pointer rounded-full border-2 border-ink bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-[2px_2px_0_#131313] transition hover:bg-brand-yellow active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                      Pilih Foto
                    </label>
                    {file && (
                      <button
                        type="button"
                        onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink/50 transition hover:text-brand-red"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden /> Batalkan
                      </button>
                    )}
                  </div>
                  <p className="mt-1 max-w-[260px] truncate text-[11px] font-medium text-ink/40">
                    {file ? file.name : editing?.photo_url ? 'Foto saat ini — pilih file baru untuk mengganti' : 'JPG/PNG/WebP — atur crop 4:3 setelah memilih foto'}
                  </p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {editing && (
                  <Button type="button" variant="secondary" onClick={() => resetForm()}>
                    Batal
                  </Button>
                )}
                <Button type="submit" variant="accent" loading={saving}>
                  {editing ? 'Simpan Perubahan' : 'Tambah Kandidat'}
                </Button>
              </div>
            </div>
          </form>
        </Panel>
      </div>

      <Panel
        icon={Users}
        title="Daftar Kandidat"
        className="mt-4"
        aside={<Badge tone="amber">{rows.length} paslon</Badge>}
      >
        {rows.length === 0 ? (
          <div className="app-empty">
            <UserSquare2 className="mx-auto mb-2 h-8 w-8 text-ink/25" aria-hidden />
            <p className="font-semibold">Belum ada kandidat.</p>
            <p className="mt-1 text-xs">Tambahkan minimal 2 paslon lewat form di atas.</p>
          </div>
        ) : (
          <div className="stagger-fade grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {rows.map((c, i) => (
              <div
                key={c.id}
                style={{ '--i': Math.min(i, 8) } as React.CSSProperties}
                className={cn(
                  'flex gap-3 rounded-2xl border-2 border-ink bg-white p-3 shadow-hard-sm transition',
                  editing?.id === c.id
                    ? 'bg-brand-yellow/15 ring-4 ring-brand-yellow'
                    : 'hover:-translate-y-0.5 hover:shadow-hard'
                )}
              >
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-brand-sky-light/45">
                  {c.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.photo_url}
                      alt={`Foto paslon No.${c.candidate_number} ${c.name}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-ink/25" aria-hidden>
                      {c.name.charAt(0)}
                    </span>
                  )}
                  <span className="absolute -left-1 -top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-ink bg-brand-yellow text-[11px] font-extrabold shadow-[2px_2px_0_#131313]">
                    {c.candidate_number}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-[family-name:var(--font-display)] font-extrabold leading-tight tracking-tight">
                      {c.name}
                    </h3>
                  </div>
                  {c.class_name && (
                    <p className="mt-0.5 text-xs font-bold text-brand-sky-deep">Kelas {c.class_name}</p>
                  )}
                  {c.vision_mission ? (
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-ink/55">{c.vision_mission}</p>
                  ) : (
                    <p className="mt-1 text-xs italic text-ink/35">Tanpa visi misi</p>
                  )}
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <Badge tone="sky" className="text-[10px]">{c.vote_count} suara</Badge>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(c)}
                        aria-label={`Edit ${c.name}`}
                        title="Edit kandidat"
                        className="inline-flex h-7 items-center gap-1 px-2.5 text-[11px]"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setPendingDelete(c)}
                        aria-label={`Hapus ${c.name}`}
                        title={c.vote_count > 0 ? `Hapus kandidat (${c.vote_count} suara ikut terhapus)` : 'Hapus kandidat'}
                        className="inline-flex h-7 w-7 items-center justify-center px-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {cropFile && (
        <ImageCropDialog
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={(cropped) => {
            setFile(cropped);
            setCropFile(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!pendingDelete}
        title={`Hapus "${pendingDelete?.name ?? ''}"?`}
        message={
          pendingDelete && pendingDelete.vote_count > 0
            ? `Kandidat dan fotonya dihapus permanen — ${pendingDelete.vote_count} suara milik kandidat ini ikut terhapus dan total hasil berubah.`
            : 'Kandidat dan fotonya dihapus permanen.'
        }
        confirmLabel="Ya, Hapus"
        danger
        busy={busy}
        onCancel={() => { if (!busy) setPendingDelete(null); }}
        onConfirm={confirmDelete}
      />
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
