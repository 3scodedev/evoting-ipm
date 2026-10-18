/**
 * Generator PDF Berita Acara Pemilihan Ketua IPM.
 * Dijalankan di browser — jsPDF di-import dinamis agar tidak ikut bundle awal.
 */
import type { jsPDF } from 'jspdf';

export type BeritaAcaraCandidate = {
  candidate_number: number;
  name: string;
  class_name?: string;
  vote_count: number;
};

export type BeritaAcaraInput = {
  candidates: BeritaAcaraCandidate[];
  stoppedAt: string | null;
  resultsHash: string | null;
  printedAt?: Date;
};

type RGB = [number, number, number];

const PAGE = { W: 210, H: 297 };
const ML = 16;
const MR = 16;
const RIGHT = PAGE.W - MR; // 194
const CW = PAGE.W - ML - MR; // 178
const BOTTOM = 15;
const ROW_LIMIT = 236; // batas bawah baris tabel sebelum pindah halaman
const XC1 = 62; // pusat blok tanda tangan kiri
const XC2 = 148; // pusat blok tanda tangan kanan

const COL = {
  no: { x: ML, w: 12 },
  name: { x: ML + 12, w: 102 },
  vote: { x: ML + 114, w: 32 },
  pct: { x: ML + 146, w: 32 },
};

const CLR: Record<
  | 'green'
  | 'greenDark'
  | 'greenSoft'
  | 'amber'
  | 'amberInk'
  | 'amberSoft'
  | 'white'
  | 'ink'
  | 'body'
  | 'muted'
  | 'faint'
  | 'hairline'
  | 'zebra',
  RGB
> = {
  green: [11, 107, 58],
  greenDark: [6, 78, 44],
  greenSoft: [233, 246, 239],
  amber: [242, 176, 10],
  amberInk: [154, 96, 3],
  amberSoft: [255, 249, 227],
  white: [255, 255, 255],
  ink: [15, 23, 42],
  body: [51, 65, 85],
  muted: [100, 116, 139],
  faint: [148, 163, 184],
  hairline: [226, 232, 240],
  zebra: [248, 250, 252],
};

const TZ = 'Asia/Jakarta';
const LONG_DATE = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const MID_DATE = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const STAMP_DATE = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });

function fillColor(doc: jsPDF, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function lineColor(doc: jsPDF, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function textColor(doc: jsPDF, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function fmtPct(v: number, total: number) {
  if (total <= 0) return '—';
  return `${((v / total) * 100).toFixed(1).replace('.', ',')}%`;
}

function fileDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat ${src}`));
    img.src = src;
  });
}

/** Kop halaman pertama: dua logo mengapit identitas sekolah + garis ganda hijau/kuning. */
function drawKop(doc: jsPDF, logoSmk: HTMLImageElement | null, logoIpm: HTMLImageElement | null): number {
  const h = 21;
  const wSmk = h * (264 / 384);
  const wIpm = h * (330 / 639);
  if (logoSmk) doc.addImage(logoSmk, 'PNG', ML, 13, wSmk, h);
  if (logoIpm) doc.addImage(logoIpm, 'PNG', RIGHT - wIpm, 13, wIpm, h);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  textColor(doc, CLR.greenDark);
  doc.text('SMK MUHAMMADIYAH KANDANGHAUR', PAGE.W / 2, 24.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  textColor(doc, CLR.muted);
  doc.text('PEMILIHAN KETUA IKATAN PELAJAR MUHAMMADIYAH (IPM)', PAGE.W / 2, 30.5, { align: 'center' });

  lineColor(doc, CLR.green);
  doc.setLineWidth(0.6);
  doc.line(ML, 38, RIGHT, 38);
  lineColor(doc, CLR.amber);
  doc.setLineWidth(0.3);
  doc.line(ML, 39.4, RIGHT, 39.4);

  return 48;
}

/** Kop mini untuk halaman lanjutan. */
function drawContinuedKop(doc: jsPDF): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  textColor(doc, CLR.muted);
  doc.text('BERITA ACARA PEMILIHAN KETUA IPM — LANJUTAN', ML, 17);
  lineColor(doc, CLR.hairline);
  doc.setLineWidth(0.25);
  doc.line(ML, 19.5, RIGHT, 19.5);
  return 24;
}

function drawTitle(doc: jsPDF, y: number, year: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  textColor(doc, CLR.ink);
  doc.text('BERITA ACARA', PAGE.W / 2, y, { align: 'center' });

  doc.setFontSize(10);
  textColor(doc, CLR.green);
  doc.text(`PEMILIHAN KETUA IKATAN PELAJAR MUHAMMADIYAH (IPM) TAHUN ${year}`, PAGE.W / 2, y + 7.5, {
    align: 'center',
  });

  lineColor(doc, CLR.amber);
  doc.setLineWidth(0.7);
  doc.line(PAGE.W / 2 - 13, y + 11.5, PAGE.W / 2 + 13, y + 11.5);
  return y + 21;
}

function drawOpening(doc: jsPDF, y: number, stoppedAt: Date | null, printedAt: Date): number {
  const parts: string[] = [
    `Pada hari ini, ${LONG_DATE.format(stoppedAt ?? printedAt)}, telah dilaksanakan Pemilihan Ketua Ikatan Pelajar Muhammadiyah (IPM) SMK Muhammadiyah Kandanghaur secara elektronik (e-voting).`,
  ];
  if (stoppedAt) {
    parts.push(`Pemungutan suara ditutup pada pukul ${TIME.format(stoppedAt)} WIB dan rekapitulasi perolehan suara telah selesai dilakukan.`);
  }
  parts.push('Berdasarkan hasil rekapitulasi tersebut, ditetapkan perolehan suara sebagai berikut:');

  const text = parts.join(' ');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  textColor(doc, CLR.body);
  const lh = 10.5 * 0.352778 * 1.45; // line-height 1.45
  doc.text(text, ML, y, { align: 'justify', maxWidth: CW, lineHeightFactor: 1.45 });
  const lines = doc.splitTextToSize(text, CW) as string[];
  return y + (lines.length - 1) * lh + 10;
}

function drawTableHead(doc: jsPDF, y: number): number {
  const h = 9;
  fillColor(doc, CLR.green);
  doc.rect(ML, y, CW, h, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  textColor(doc, CLR.white);
  const mid = y + h / 2;
  doc.text('No.', COL.no.x + COL.no.w / 2, mid, { align: 'center', baseline: 'middle' });
  doc.text('Nama Kandidat', COL.name.x + 3, mid, { baseline: 'middle' });
  doc.text('Perolehan Suara', COL.vote.x + COL.vote.w - 3, mid, { align: 'right', baseline: 'middle' });
  doc.text('Persentase', COL.pct.x + COL.pct.w - 3, mid, { align: 'right', baseline: 'middle' });
  return y + h;
}

function drawCandidateRow(
  doc: jsPDF,
  y: number,
  c: BeritaAcaraCandidate,
  rank: number,
  total: number,
  isWinner: boolean
): number {
  doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
  doc.setFontSize(10);
  const nameLines = doc.splitTextToSize(c.name, COL.name.w - 4) as string[];
  const hasClass = !!c.class_name;
  const classStep = 4.6;
  const blockH = (nameLines.length - 1) * 5 + (hasClass ? classStep : 0);
  const rowH = 9.6 + blockH;
  const mid = y + rowH / 2;

  // Latar baris: pemenang kuning lembut, sisanya zebra halus.
  if (isWinner) fillColor(doc, CLR.amberSoft);
  else if (rank % 2 === 0) fillColor(doc, CLR.zebra);
  else fillColor(doc, CLR.white);
  doc.rect(ML, y, CW, rowH, 'F');
  if (isWinner) {
    fillColor(doc, CLR.amber);
    doc.rect(ML, y, 1.4, rowH, 'F');
  }

  lineColor(doc, CLR.hairline);
  doc.setLineWidth(0.2);
  doc.line(ML, y + rowH, RIGHT, y + rowH);

  // No. urut
  doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
  doc.setFontSize(10);
  textColor(doc, CLR.ink);
  doc.text(String(c.candidate_number), COL.no.x + COL.no.w / 2, mid, { align: 'center', baseline: 'middle' });

  // Nama (+ badge TERPILIH kalau muat sebaris) + kelas kecil di bawahnya
  const firstBaseline = y + (rowH - blockH) / 2 + 1.2;
  nameLines.forEach((ln, i) => doc.text(ln, COL.name.x + 2.5, firstBaseline + i * 5));
  if (isWinner && nameLines.length === 1) {
    const pillW = 15.5;
    const pillH = 4.6;
    const nameMid = firstBaseline - 1.6;
    const px = COL.name.x + 2.5 + doc.getTextWidth(c.name) + 3;
    if (px + pillW <= COL.name.x + COL.name.w - 2) {
      fillColor(doc, CLR.green);
      doc.roundedRect(px, nameMid - pillH / 2, pillW, pillH, 2.3, 2.3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      textColor(doc, CLR.white);
      doc.text('TERPILIH', px + pillW / 2, nameMid, { align: 'center', baseline: 'middle' });
    }
  }
  if (hasClass) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    textColor(doc, CLR.muted);
    doc.text(`Kelas ${c.class_name}`, COL.name.x + 2.5, firstBaseline + (nameLines.length - 1) * 5 + classStep);
  }

  // Jumlah suara
  doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
  doc.setFontSize(10.5);
  textColor(doc, CLR.ink);
  doc.text(String(c.vote_count), COL.vote.x + COL.vote.w - 3, mid, { align: 'right', baseline: 'middle' });

  // Persentase
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  textColor(doc, CLR.muted);
  doc.text(fmtPct(c.vote_count, total), COL.pct.x + COL.pct.w - 3, mid, { align: 'right', baseline: 'middle' });

  return y + rowH;
}

function drawTotalRow(doc: jsPDF, y: number, total: number): number {
  const h = 9.8;
  fillColor(doc, CLR.greenSoft);
  doc.rect(ML, y, CW, h, 'F');
  lineColor(doc, CLR.green);
  doc.setLineWidth(0.45);
  doc.line(ML, y, RIGHT, y);

  const mid = y + h / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  textColor(doc, CLR.greenDark);
  doc.text('TOTAL SUARA MASUK', ML + 3, mid, { baseline: 'middle' });
  doc.setFontSize(10.5);
  doc.text(String(total), COL.vote.x + COL.vote.w - 3, mid, { align: 'right', baseline: 'middle' });
  doc.setFontSize(9.5);
  doc.text(total > 0 ? '100,0%' : '—', COL.pct.x + COL.pct.w - 3, mid, { align: 'right', baseline: 'middle' });
  return y + h;
}

function drawWinnerBox(doc: jsPDF, y: number, winners: BeritaAcaraCandidate[], maxVotes: number, total: number): number {
  const right =
    winners.length > 1 ? `masing-masing ${maxVotes} suara` : `${maxVotes} suara (${fmtPct(maxVotes, total)})`;
  const label = winners
    .map((w) => `No. ${w.candidate_number} — ${w.name}${w.class_name ? ` (${w.class_name})` : ''}`)
    .join('  dan  ');

  // Ukur dulu: nama pemenang boleh wrap, kotak meninggi, angka di kanan tetap aman.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const rightW = doc.getTextWidth(right);
  const avail = CW - 12 - rightW - 8;

  doc.setFontSize(12.5);
  const lines = doc.splitTextToSize(label, avail) as string[];
  const lineH = 5.8;
  const h = 17 + (lines.length - 1) * lineH;

  fillColor(doc, CLR.amberSoft);
  lineColor(doc, CLR.amber);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, h, 2.2, 2.2, 'FD');
  fillColor(doc, CLR.amber);
  doc.rect(ML + 1.4, y + 3.4, 1.3, h - 6.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  textColor(doc, CLR.amberInk);
  doc.text('CALON TERPILIH — PEROLEHAN SUARA TERBANYAK', ML + 6, y + 6.4);

  doc.setFontSize(12.5);
  textColor(doc, CLR.ink);
  lines.forEach((ln, i) => doc.text(ln, ML + 6, y + 13.2 + i * lineH));

  doc.setFontSize(10.5);
  textColor(doc, CLR.greenDark);
  doc.text(right, RIGHT - 6, y + 13 + ((lines.length - 1) * lineH) / 2, { align: 'right' });
  return y + h;
}

function drawHashBox(doc: jsPDF, y: number, hash: string | null): number {
  const h = 13.5;
  fillColor(doc, CLR.zebra);
  lineColor(doc, CLR.hairline);
  doc.setLineWidth(0.25);
  doc.roundedRect(ML, y, CW, h, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  textColor(doc, CLR.muted);
  doc.text('KODE VERIFIKASI HASIL (SHA-256)', ML + 4, y + 5.1);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.6);
  textColor(doc, CLR.ink);
  doc.text(hash ?? '—', ML + 4, y + 10.3);
  return y + h;
}

function drawSignatures(doc: jsPDF, y: number, printedAt: Date): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  textColor(doc, CLR.ink);
  doc.text(`Kandanghaur, ${MID_DATE.format(printedAt)}`, RIGHT, y, { align: 'right' });

  doc.text('Ketua Panitia', XC1, y + 14.5, { align: 'center' });
  doc.text('Saksi', XC2, y + 14.5, { align: 'center' });

  lineColor(doc, CLR.muted);
  doc.setLineWidth(0.3);
  doc.line(XC1 - 23, y + 37, XC1 + 23, y + 37);
  doc.line(XC2 - 23, y + 37, XC2 + 23, y + 37);
}

function drawFooters(doc: jsPDF, printedAt: Date): void {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    lineColor(doc, CLR.hairline);
    doc.setLineWidth(0.25);
    doc.line(ML, 286, RIGHT, 286);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    textColor(doc, CLR.faint);
    doc.text(
      `Dicetak otomatis oleh E-Voting IPM — SMK Muhammadiyah Kandanghaur  •  ${STAMP_DATE.format(printedAt)} ${TIME.format(printedAt)} WIB`,
      ML,
      290.6
    );
    doc.text(`Halaman ${i} dari ${pages}`, RIGHT, 290.6, { align: 'right' });
  }
}

export async function generateBeritaAcaraPdf(input: BeritaAcaraInput): Promise<void> {
  const [{ jsPDF }, logoSmk, logoIpm] = await Promise.all([
    import('jspdf'),
    loadImage('/images/logo-smk.png').catch(() => null),
    loadImage('/images/logo-ipm.png').catch(() => null),
  ]);

  const printedAt = input.printedAt ?? new Date();
  const stoppedAt = input.stoppedAt ? new Date(input.stoppedAt) : null;
  const total = input.candidates.reduce((a, c) => a + c.vote_count, 0);
  const maxVotes = input.candidates.reduce((m, c) => Math.max(m, c.vote_count), 0);
  const ranked = [...input.candidates].sort(
    (a, b) => b.vote_count - a.vote_count || a.candidate_number - b.candidate_number
  );
  const winners = maxVotes > 0 ? ranked.filter((c) => c.vote_count === maxVotes) : [];
  const year = (stoppedAt ?? printedAt).getFullYear();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: 'Berita Acara Pemilihan Ketua IPM',
    subject: `Hasil pemilihan — ${total} suara`,
    author: 'E-Voting IPM — SMK Muhammadiyah Kandanghaur',
    creator: 'E-Voting IPM',
  });

  let y = drawKop(doc, logoSmk, logoIpm);
  y = drawTitle(doc, y + 8, year);
  y = drawOpening(doc, y, stoppedAt, printedAt);
  y = drawTableHead(doc, y);

  ranked.forEach((c, i) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const nameLines = doc.splitTextToSize(c.name, COL.name.w - 4) as string[];
    const rowH = 9.6 + (nameLines.length - 1) * 5 + (c.class_name ? 4.6 : 0);
    if (y + rowH > ROW_LIMIT) {
      doc.addPage();
      y = drawContinuedKop(doc);
      y = drawTableHead(doc, y);
    }
    y = drawCandidateRow(
      doc,
      y,
      c,
      i + 1,
      total,
      winners.some((w) => w.candidate_number === c.candidate_number)
    );
  });

  if (y + 10 > ROW_LIMIT) {
    doc.addPage();
    y = drawContinuedKop(doc);
    y = drawTableHead(doc, y);
  }
  y = drawTotalRow(doc, y, total);

  // Blok penutup (pemenang + hash + tanda tangan) butuh ~112mm — pindah halaman kalau sempit.
  if (y + 112 > PAGE.H - BOTTOM) {
    doc.addPage();
    y = drawContinuedKop(doc);
  }
  if (winners.length > 0) {
    y += 7;
    y = drawWinnerBox(doc, y, winners, maxVotes, total);
  }
  y += 5;
  y = drawHashBox(doc, y, input.resultsHash);
  y += 15;
  drawSignatures(doc, y, printedAt);

  drawFooters(doc, printedAt);
  doc.save(`Berita-Acara-IPM-${fileDate(printedAt)}.pdf`);
}
