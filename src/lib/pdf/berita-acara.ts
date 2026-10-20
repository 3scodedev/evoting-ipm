/**
 * Generator PDF Berita Acara Pemilihan Ketua IPM.
 * Dijalankan di browser — jsPDF di-import dinamis agar tidak ikut bundle awal.
 *
 * Layout dikunci satu halaman A4. Font memakai keluarga Times standar PDF
 * (Times-Roman/Times-Bold) yang tampilannya sesuai Times New Roman dan tidak
 * membutuhkan file font eksternal.
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
const ML = 15;
const MR = 15;
const RIGHT = PAGE.W - MR; // 195
const CW = PAGE.W - ML - MR; // 180
const XC1 = 62; // pusat blok tanda tangan kiri
const XC2 = 148; // pusat blok tanda tangan kanan
const FONT = 'times';

const COL = {
  no: { x: ML, w: 12 },
  name: { x: ML + 12, w: 104 },
  vote: { x: ML + 116, w: 32 },
  pct: { x: ML + 148, w: 32 },
};

/**
 * Palet mengikuti logo SMK Muhammadiyah Kandanghaur:
 * biru oval, kuning sinar matahari, hitam siluet, merah kilat.
 */
const CLR: Record<
  | 'blue'
  | 'blueDeep'
  | 'blueSoft'
  | 'yellow'
  | 'yellowSoft'
  | 'red'
  | 'white'
  | 'ink'
  | 'body'
  | 'muted'
  | 'faint'
  | 'hairline'
  | 'zebra',
  RGB
> = {
  blue: [27, 160, 219], // #1BA0DB
  blueDeep: [13, 105, 145], // #0D6991 — teks biru yang tetap terbaca
  blueSoft: [232, 247, 253], // #E8F7FD
  yellow: [250, 239, 18], // #FAEF12
  yellowSoft: [255, 252, 214], // #FFFCD6
  red: [230, 37, 44], // #E6252C
  white: [255, 255, 255],
  ink: [34, 30, 30], // #221E1E — hitam logo
  body: [45, 41, 41],
  muted: [90, 84, 84],
  faint: [128, 122, 122],
  hairline: [190, 227, 241], // #BEE3F1
  zebra: [247, 252, 254], // #F7FCFE
};

const TZ = 'Asia/Jakarta';
const LONG_DATE = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const MID_DATE = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const STAMP_DATE = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });

type RowStyle = {
  max: number;
  nameSize: number;
  classSize: number;
  baseH: number;
  lineH: number;
  classStep: number;
};

/**
 * Semakin banyak kandidat, baris makin rapat. Tetap satu halaman, tapi teks
 * tidak pernah mengecil di bawah 6,8pt agar masih terbaca.
 */
const ROW_STYLES: RowStyle[] = [
  { max: 4, nameSize: 10.5, classSize: 7.5, baseH: 9.4, lineH: 4.6, classStep: 4.0 },
  { max: 6, nameSize: 10, classSize: 7.2, baseH: 8.8, lineH: 4.4, classStep: 3.8 },
  { max: 8, nameSize: 9.6, classSize: 6.9, baseH: 8.0, lineH: 4.2, classStep: 3.4 },
  { max: 10, nameSize: 9, classSize: 6.6, baseH: 7.0, lineH: 4.0, classStep: 3.0 },
  { max: 12, nameSize: 8.4, classSize: 6.2, baseH: 6.2, lineH: 3.8, classStep: 2.8 },
  { max: 16, nameSize: 7.6, classSize: 5.8, baseH: 5.0, lineH: 3.4, classStep: 2.2 },
  { max: 99, nameSize: 6.8, classSize: 5.4, baseH: 4.0, lineH: 3.0, classStep: 1.8 },
];

function rowStyleFor(count: number): RowStyle {
  return ROW_STYLES.find((s) => count <= s.max) ?? ROW_STYLES[ROW_STYLES.length - 1];
}

function setFont(doc: jsPDF, style: 'normal' | 'bold', size: number) {
  doc.setFont(FONT, style);
  doc.setFontSize(size);
}

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
  return `${Math.round((v / total) * 100)}%`;
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

/** Kop: dua logo mengapit identitas sekolah + garis biru/kuning. */
function drawKop(doc: jsPDF, logoSmk: HTMLImageElement | null, logoIpm: HTMLImageElement | null): number {
  fillColor(doc, CLR.blueSoft);
  doc.ellipse(PAGE.W / 2, 26, 92, 22, 'F');

  const h = 20;
  const wSmk = h * (264 / 384);
  const wIpm = h * (330 / 639);
  if (logoSmk) doc.addImage(logoSmk, 'PNG', ML, 13.5, wSmk, h);
  if (logoIpm) doc.addImage(logoIpm, 'PNG', RIGHT - wIpm, 13.5, wIpm, h);

  setFont(doc, 'bold', 15);
  textColor(doc, CLR.ink);
  doc.text('SMK MUHAMMADIYAH KANDANGHAUR', PAGE.W / 2, 24.5, { align: 'center' });

  setFont(doc, 'normal', 8.5);
  textColor(doc, CLR.blueDeep);
  doc.text('PEMILIHAN KETUA IKATAN PELAJAR MUHAMMADIYAH (IPM)', PAGE.W / 2, 30.8, { align: 'center' });

  lineColor(doc, CLR.blue);
  doc.setLineWidth(0.7);
  doc.line(ML, 37.8, RIGHT, 37.8);
  lineColor(doc, CLR.yellow);
  doc.setLineWidth(0.35);
  doc.line(ML, 39.2, RIGHT, 39.2);

  return 47;
}

function drawTitle(doc: jsPDF, y: number, year: number): number {
  setFont(doc, 'bold', 20);
  textColor(doc, CLR.ink);
  doc.text('BERITA ACARA', PAGE.W / 2, y, { align: 'center' });

  setFont(doc, 'bold', 9.5);
  textColor(doc, CLR.blueDeep);
  doc.text(`PEMILIHAN KETUA IKATAN PELAJAR MUHAMMADIYAH (IPM) TAHUN ${year}`, PAGE.W / 2, y + 7, {
    align: 'center',
  });

  lineColor(doc, CLR.yellow);
  doc.setLineWidth(0.7);
  doc.line(PAGE.W / 2 - 13, y + 11, PAGE.W / 2 + 13, y + 11);
  return y + 19;
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
  const size = 10.5;
  const lh = size * 0.352778 * 1.35; // ~5 mm
  setFont(doc, 'normal', size);
  textColor(doc, CLR.body);
  const lines = doc.splitTextToSize(text, CW) as string[];
  lines.forEach((ln, i) => {
    doc.text(ln, ML, y + i * lh, {
      align: i < lines.length - 1 ? 'justify' : 'left',
      maxWidth: CW,
    });
  });
  return y + (lines.length - 1) * lh + 7;
}

function drawTableHead(doc: jsPDF, y: number): number {
  const h = 8.4;
  fillColor(doc, CLR.blue);
  doc.rect(ML, y, CW, h, 'F');
  lineColor(doc, CLR.yellow);
  doc.setLineWidth(0.8);
  doc.line(ML, y + h, RIGHT, y + h);

  setFont(doc, 'bold', 9.5);
  textColor(doc, CLR.ink);
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
  isWinner: boolean,
  style: RowStyle
): number {
  setFont(doc, isWinner ? 'bold' : 'normal', style.nameSize);
  const nameLines = doc.splitTextToSize(c.name, COL.name.w - 4) as string[];
  const hasClass = !!c.class_name;
  const rowH = style.baseH + (nameLines.length - 1) * style.lineH + (hasClass ? style.classStep : 0);
  const mid = y + rowH / 2;

  // Latar baris: pemenang kuning lembut, sisanya zebra biru sangat muda.
  if (isWinner) fillColor(doc, CLR.yellowSoft);
  else if (rank % 2 === 0) fillColor(doc, CLR.zebra);
  else fillColor(doc, CLR.white);
  doc.rect(ML, y, CW, rowH, 'F');
  if (isWinner) {
    fillColor(doc, CLR.yellow);
    doc.rect(ML, y, 1.4, rowH, 'F');
  }

  lineColor(doc, CLR.hairline);
  doc.setLineWidth(0.2);
  doc.line(ML, y + rowH, RIGHT, y + rowH);

  // No. urut
  setFont(doc, isWinner ? 'bold' : 'normal', style.nameSize);
  textColor(doc, CLR.ink);
  doc.text(String(c.candidate_number), COL.no.x + COL.no.w / 2, mid, { align: 'center', baseline: 'middle' });

  // Nama (+ badge TERPILIH kalau muat sebaris) + kelas kecil di bawahnya
  const blockH = (nameLines.length - 1) * style.lineH + (hasClass ? style.classStep : 0);
  const firstBaseline = y + (rowH - blockH) / 2 + 1.4;
  nameLines.forEach((ln, i) => doc.text(ln, COL.name.x + 2.5, firstBaseline + i * style.lineH));
  if (isWinner && nameLines.length === 1) {
    const pillW = 15.5;
    const pillH = 4.6;
    const nameMid = firstBaseline - 1.6;
    const px = COL.name.x + 2.5 + doc.getTextWidth(c.name) + 3;
    if (px + pillW <= COL.name.x + COL.name.w - 2) {
      fillColor(doc, CLR.red);
      doc.roundedRect(px, nameMid - pillH / 2, pillW, pillH, 2.3, 2.3, 'F');
      setFont(doc, 'bold', 6);
      textColor(doc, CLR.white);
      doc.text('TERPILIH', px + pillW / 2, nameMid, { align: 'center', baseline: 'middle' });
    }
  }
  if (hasClass) {
    setFont(doc, 'normal', style.classSize);
    textColor(doc, CLR.muted);
    doc.text(`Kelas ${c.class_name}`, COL.name.x + 2.5, firstBaseline + (nameLines.length - 1) * style.lineH + style.classStep);
  }

  // Jumlah suara
  setFont(doc, isWinner ? 'bold' : 'normal', Math.min(10.5, style.nameSize + 0.5));
  textColor(doc, CLR.ink);
  doc.text(String(c.vote_count), COL.vote.x + COL.vote.w - 3, mid, { align: 'right', baseline: 'middle' });

  // Persentase
  setFont(doc, 'normal', Math.max(6.4, style.nameSize - 1));
  textColor(doc, CLR.muted);
  doc.text(fmtPct(c.vote_count, total), COL.pct.x + COL.pct.w - 3, mid, { align: 'right', baseline: 'middle' });

  return y + rowH;
}

function drawTotalRow(doc: jsPDF, y: number, total: number): number {
  const h = 8.8;
  fillColor(doc, CLR.blueSoft);
  doc.rect(ML, y, CW, h, 'F');
  lineColor(doc, CLR.blue);
  doc.setLineWidth(0.45);
  doc.line(ML, y, RIGHT, y);

  const mid = y + h / 2;
  setFont(doc, 'bold', 9.5);
  textColor(doc, CLR.ink);
  doc.text('TOTAL SUARA MASUK', ML + 3, mid, { baseline: 'middle' });
  setFont(doc, 'bold', 10.5);
  doc.text(String(total), COL.vote.x + COL.vote.w - 3, mid, { align: 'right', baseline: 'middle' });
  setFont(doc, 'bold', 9.5);
  doc.text(total > 0 ? '100%' : '—', COL.pct.x + COL.pct.w - 3, mid, { align: 'right', baseline: 'middle' });
  return y + h;
}

function drawWinnerBox(
  doc: jsPDF,
  y: number,
  winners: BeritaAcaraCandidate[],
  maxVotes: number,
  total: number,
  compact: boolean
): number {
  const right =
    winners.length > 1 ? `masing-masing ${maxVotes} suara` : `${maxVotes} suara (${fmtPct(maxVotes, total)})`;
  const label = winners
    .map((w) => `No. ${w.candidate_number} — ${w.name}${w.class_name ? ` (${w.class_name})` : ''}`)
    .join('  dan  ');

  const titleSize = compact ? 7 : 7.5;
  const textSize = compact ? 9.5 : 12.5;
  const rightSize = compact ? 9 : 10.5;
  const lineH = compact ? 4.6 : 5.8;
  const baseH = compact ? 13 : 17;
  const textTop = compact ? 10.4 : 13.2;

  setFont(doc, 'bold', rightSize);
  const rightW = doc.getTextWidth(right);
  const avail = CW - 12 - rightW - 8;

  setFont(doc, 'bold', textSize);
  const lines = doc.splitTextToSize(label, avail) as string[];
  const h = baseH + (lines.length - 1) * lineH;

  fillColor(doc, CLR.yellowSoft);
  lineColor(doc, CLR.yellow);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, h, 2.2, 2.2, 'FD');
  fillColor(doc, CLR.yellow);
  doc.rect(ML + 1.4, y + 3.2, 1.3, h - 6.4, 'F');

  setFont(doc, 'bold', titleSize);
  textColor(doc, CLR.red);
  doc.text('CALON TERPILIH — PEROLEHAN SUARA TERBANYAK', ML + 6, y + (compact ? 5.4 : 6.4));

  setFont(doc, 'bold', textSize);
  textColor(doc, CLR.ink);
  lines.forEach((ln, i) => doc.text(ln, ML + 6, y + textTop + i * lineH));

  setFont(doc, 'bold', rightSize);
  textColor(doc, CLR.ink);
  doc.text(right, RIGHT - 6, y + textTop + ((lines.length - 1) * lineH) / 2, { align: 'right' });
  return y + h;
}

function drawHashBox(doc: jsPDF, y: number, hash: string | null, compact: boolean): number {
  const h = compact ? 11.5 : 13.5;
  fillColor(doc, CLR.blueSoft);
  lineColor(doc, CLR.blue);
  doc.setLineWidth(0.35);
  doc.roundedRect(ML, y, CW, h, 2, 2, 'FD');
  fillColor(doc, CLR.red);
  doc.rect(ML + 1.2, y + 2, 1.1, h - 4, 'F');

  setFont(doc, 'bold', compact ? 6.5 : 7);
  textColor(doc, CLR.red);
  doc.text('KODE VERIFIKASI HASIL (SHA-256)', ML + 4.8, y + (compact ? 4.3 : 5.1));

  setFont(doc, 'normal', compact ? 7.2 : 7.8);
  textColor(doc, CLR.ink);
  doc.text(hash ?? '—', ML + 4.8, y + (compact ? 8.8 : 10.3));
  return y + h;
}

function drawSignatures(doc: jsPDF, y: number, printedAt: Date, lineOffset: number, compact: boolean): void {
  const size = compact ? 9.5 : 10.5;
  setFont(doc, 'normal', size);
  textColor(doc, CLR.ink);
  doc.text(`Kandanghaur, ${MID_DATE.format(printedAt)}`, RIGHT, y, { align: 'right' });

  doc.text('Ketua Panitia', XC1, y + (compact ? 10.5 : 12), { align: 'center' });
  doc.text('Saksi', XC2, y + (compact ? 10.5 : 12), { align: 'center' });

  lineColor(doc, CLR.muted);
  doc.setLineWidth(0.3);
  doc.line(XC1 - 23, y + lineOffset, XC1 + 23, y + lineOffset);
  doc.line(XC2 - 23, y + lineOffset, XC2 + 23, y + lineOffset);
}

function drawFooters(doc: jsPDF, printedAt: Date): void {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    lineColor(doc, CLR.blue);
    doc.setLineWidth(0.25);
    doc.line(ML, 285, RIGHT, 285);

    setFont(doc, 'normal', 6.8);
    textColor(doc, CLR.faint);
    doc.text(
      `Dicetak otomatis oleh E-Voting IPM — SMK Muhammadiyah Kandanghaur  •  ${STAMP_DATE.format(printedAt)} ${TIME.format(printedAt)} WIB`,
      ML,
      290.4
    );
    doc.text(`Halaman ${i} dari ${pages}`, RIGHT, 290.4, { align: 'right' });
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
  const compact = ranked.length > 8;
  const style = rowStyleFor(ranked.length);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: 'Berita Acara Pemilihan Ketua IPM',
    subject: `Hasil pemilihan — ${total} suara`,
    author: 'E-Voting IPM — SMK Muhammadiyah Kandanghaur',
    creator: 'E-Voting IPM',
  });

  // Seluruh dokumen sengaja tidak pernah memanggil addPage(). Satu halaman A4.
  let y = drawKop(doc, logoSmk, logoIpm);
  y = drawTitle(doc, y + 7, year);
  y = drawOpening(doc, y, stoppedAt, printedAt);
  y = drawTableHead(doc, y);

  ranked.forEach((c, i) => {
    y = drawCandidateRow(
      doc,
      y,
      c,
      i + 1,
      total,
      winners.some((w) => w.candidate_number === c.candidate_number),
      style
    );
  });

  y = drawTotalRow(doc, y, total);

  // Blok penutup selalu ikut di halaman yang sama.
  y += compact ? 3 : 7;
  if (winners.length > 0) {
    y = drawWinnerBox(doc, y, winners, maxVotes, total, compact);
  }
  y += compact ? 3 : 5;
  y = drawHashBox(doc, y, input.resultsHash, compact);

  y += compact ? 4 : 8;
  const lineOffset = ranked.length > 12 ? 18 : ranked.length > 8 ? 22 : ranked.length > 6 ? 24 : 32;
  const signatureY = Math.max(y, compact ? 250 : 236);
  drawSignatures(doc, signatureY, printedAt, lineOffset, compact);

  drawFooters(doc, printedAt);
  doc.save(`Berita-Acara-IPM-${fileDate(printedAt)}.pdf`);
}
