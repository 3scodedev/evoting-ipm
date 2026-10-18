'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Pencil, Plus, Trash2, UserSquare2, Users, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ToastStack, useToasts } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const { toasts, push, dismiss } = useToasts();
  const formRef = useRef<HTMLElement>(null);
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

  function resetForm(list?: AdminCandidate[]) {
    setEditing(null);
    setName('');
    setKelas('');
    setVisi('');
    setFile(null);
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
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 pb-24 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-600/20 flex items-center justify-center">
            <UserSquare2 className="h-5 w-5 text-sky-400" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none">Manajemen Kandidat</h1>
            <p className="text-xs text-slate-500 mt-0.5">Kelola paslon, visi misi &amp; foto surat suara</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="sky">{rows.length} kandidat</Badge>
          <span className="text-xs text-slate-400 font-mono" aria-live="polite">{totalVotes} suara masuk</span>
        </div>
      </div>

      <div className="animate-fade-in">
        {/* Form tambah/edit */}
        <section ref={formRef} className="mt-6 rounded-xl bg-slate-800 border border-slate-700/60 p-4 scroll-mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              {editing ? <Pencil className="h-4 w-4 text-amber-400" aria-hidden /> : <Plus className="h-4 w-4 text-amber-400" aria-hidden />}
            </div>
            <h2 className="font-bold text-base">
              {editing ? `Edit Kandidat No.${editing.candidate_number}` : 'Tambah Kandidat'}
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid content-start gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <div>
                  <label htmlFor="c-no" className="text-xs text-slate-400">No. urut</label>
                  <input
                    id="c-no"
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={no}
                    onChange={(e) => setNo(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="c-name" className="text-xs text-slate-400">Nama paslon</label>
                  <input
                    id="c-name"
                    required
                    minLength={3}
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="cth: Ananda Pratama"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <label htmlFor="c-class" className="text-xs text-slate-400">
                    Kelas <span className="text-slate-500">(opsional)</span>
                  </label>
                  <input
                    id="c-class"
                    maxLength={60}
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="cth: XI RPL 1"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label htmlFor="c-visi" className="text-xs text-slate-400">
                  Visi misi <span className="text-slate-500">(opsional)</span>
                </label>
                <textarea
                  id="c-visi"
                  maxLength={2000}
                  rows={3}
                  value={visi}
                  onChange={(e) => setVisi(e.target.value)}
                  placeholder="Visi misi singkat (opsional)…"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-slate-700/40 pt-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                  {previewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewSrc} alt="Preview foto kandidat" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-slate-600" aria-hidden />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileRef}
                      id="c-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="c-photo"
                      className="cursor-pointer rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-600 active:scale-95"
                    >
                      Pilih Foto
                    </label>
                    {file && (
                      <button
                        type="button"
                        onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden /> Batalkan
                      </button>
                    )}
                  </div>
                  <p className="mt-1 max-w-[240px] truncate text-[11px] text-slate-500">
                    {file ? file.name : editing?.photo_url ? 'Foto saat ini — pilih file baru untuk mengganti' : 'JPG/PNG/WebP, rasio 4:3 disarankan'}
                  </p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {editing && (
                  <Button type="button" variant="secondary" onClick={() => resetForm()}>
                    Batal
                  </Button>
                )}
                <Button type="submit" loading={saving}>
                  {editing ? 'Simpan Perubahan' : 'Tambah Kandidat'}
                </Button>
              </div>
            </div>
          </form>
        </section>

        {/* Daftar kandidat */}
        <section className="mt-4 rounded-xl bg-slate-800 border border-slate-700/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Users className="h-4 w-4 text-emerald-400" aria-hidden />
            </div>
            <h2 className="font-bold text-base">Daftar Kandidat</h2>
          </div>

          {rows.length === 0 ? (
            <div className="mt-2 text-sm text-slate-400 text-center py-8 border border-dashed border-slate-700 rounded-lg">
              <UserSquare2 className="h-8 w-8 mx-auto mb-2 text-slate-600" aria-hidden />
              <p>Belum ada kandidat.</p>
              <p className="text-xs text-slate-500 mt-1">Tambahkan minimal 2 paslon lewat form di atas.</p>
            </div>
          ) : (
            <div className="mt-1 grid gap-3 md:grid-cols-2 2xl:grid-cols-3 stagger-fade">
              {rows.map((c, i) => (
                <div
                  key={c.id}
                  style={{ '--i': Math.min(i, 8) } as React.CSSProperties}
                  className={cn(
                    'flex gap-3 rounded-xl border bg-slate-900/60 p-3',
                    editing?.id === c.id ? 'border-sky-500/70 ring-2 ring-sky-500/30' : 'border-slate-700/50'
                  )}
                >
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900">
                    {c.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.photo_url}
                        alt={`Foto paslon No.${c.candidate_number} ${c.name}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-slate-600" aria-hidden>{c.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold leading-tight">{c.name}</h3>
                      <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900">
                        No.{c.candidate_number}
                      </span>
                    </div>
                    {c.class_name && (
                      <p className="mt-0.5 text-xs font-medium text-sky-300/90">Kelas {c.class_name}</p>
                    )}
                    {c.vision_mission ? (
                      <p className="mt-1 text-sm text-slate-400 line-clamp-2">{c.vision_mission}</p>
                    ) : (
                      <p className="mt-1 text-sm italic text-slate-500">Tanpa visi misi</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Badge tone="sky" className="text-xs">{c.vote_count} suara</Badge>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(c)}
                          aria-label={`Edit ${c.name}`}
                          title="Edit kandidat"
                          className="inline-flex h-7 items-center gap-1 px-2 text-xs"
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
        </section>
      </div>

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
