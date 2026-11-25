import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import s from './home.module.css';

function Bolt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M39 4 6 57h20l-3 39 35-56H37L39 4Z"
        fill="currentColor"
        stroke="#131313"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const trustItems = [
  { icon: ShieldCheck, label: 'Tanpa HP pribadi' },
  { icon: LockKeyhole, label: 'Suara terenkripsi' },
  { icon: Activity, label: 'Hasil real-time' },
];

const barHeights = ['42%', '68%', '100%', '58%', '82%'];

export default function Home() {
  return (
    <main className={s.page}>
      <div className={s.grain} aria-hidden="true" />
      <div className={s.dots} aria-hidden="true" />

      <div className={s.shell}>
        <header className={s.header}>
          <Link href="/" className={s.brand} aria-label="E-Voting IPM — beranda">
            <span className={s.brandMark}>
              <Image
                src="/images/logo-smk-sm.webp"
                alt="Logo SMK Muhammadiyah Kandanghaur"
                width={96}
                height={96}
                priority
                unoptimized
              />
            </span>
            <span>
              <span className={s.brandKicker}>SMK Muhammadiyah Kandanghaur</span>
              <span className={s.brandName}>E-Voting IPM</span>
            </span>
          </Link>

          <div className={s.headerRight}>
            <span className={s.yearPill}>
              <span className={s.liveDot} aria-hidden="true" />
              Pemilihan 2026/2027
            </span>
            <Link href="/admin/login" className={s.headerLink} prefetch={false}>
              Command Center
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <div className={s.ticker} aria-hidden="true">
          <div className={s.tickerTrack}>
            {Array.from({ length: 4 }).map((_, i) => (
              <span className={s.tickerItem} key={i}>
                Pemilihan Ketua IPM 2026/2027
                <i className={s.tickerDot} />
                Bilik aman &amp; terenkripsi
                <i className={s.tickerDot} />
                Hasil live
                <i className={s.tickerDot} />
                Tanpa HP pribadi
                <i className={s.tickerDot} />
              </span>
            ))}
          </div>
        </div>

        <section className={s.hero} aria-labelledby="hero-title">
          <div className={s.copy}>
            <p className={s.eyebrow}>
              <span className={s.eyebrowIcon}>
                <Zap className="h-3 w-3" fill="currentColor" aria-hidden="true" />
              </span>
              Pemilihan Ketua IPM · 2026/2027
            </p>

            <h1 id="hero-title" className={s.title}>
              <span className={s.titleLine}>Satu suara,</span>
              <span className={s.titleLine}>
                <span className={s.highlight}>arah baru</span>
              </span>
              <span className={s.titleLine}>
                untuk IPM<span className={s.titleDot}>.</span>
              </span>
            </h1>

            <p className={s.lede}>
              Bilik suara digital yang aman, cepat, dan transparan. Pilih pemimpin
              terbaikmu, lalu saksikan <strong>hasilnya live</strong> — satu suara,
              satu langkah untuk IPM yang lebih baik.
            </p>

            <div className={s.actions}>
              <Link href="/kiosk/login" className={s.primaryCta}>
                Masuk Bilik Suara
                <span className={s.ctaIcon}>
                  <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                </span>
              </Link>
              <Link href="/admin/login" className={s.secondaryCta} prefetch={false}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Command Center
              </Link>
            </div>

            <ul className={s.trust} aria-label="Keunggulan sistem">
              {trustItems.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <Icon aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className={s.stageWrap}>
            <div className={s.orbit} aria-hidden="true" />

            <Bolt className={s.bolt} />

            <div className={s.stage} aria-hidden="true">
              <div className={s.sunrays} />
              <div className={s.stageRing} />

              <div className={s.logoPlate}>
                <Image
                  src="/images/logo-ipm.png"
                  alt=""
                  width={330}
                  height={639}
                  priority
                  unoptimized
                />
              </div>
            </div>

            <div className={s.ribbon} aria-hidden="true">
              Satu suara · satu arah · untuk IPM
            </div>

            <div className={`${s.floatCard} ${s.cardSafe}`} aria-hidden="true">
              <span className={s.cardSafeIcon}>
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span>
                <span className={s.cardLabel}>Bilik suara</span>
                <span className={s.cardValue}>Aman &amp; terenkripsi</span>
              </span>
            </div>

            <div className={`${s.floatCard} ${s.cardLive}`} aria-hidden="true">
              <div className={s.cardLiveHead}>
                <span>Hasil live</span>
                <span className={s.liveDot} />
              </div>
              <div className={s.bars}>
                {barHeights.map((height, index) => (
                  <span key={index} style={{ height }} />
                ))}
              </div>
              <div className={s.cardLiveFoot}>
                <Activity className="h-2.5 w-2.5" />
                Update otomatis
              </div>
            </div>

            <div className={s.sticker} aria-hidden="true">
              <span>
                <span className={s.stickerNumber}>01</span>
                <span className={s.stickerLabel}>Suara</span>
              </span>
            </div>
          </div>
        </section>

        <footer className={s.footer}>
          <span>SMK Muhammadiyah Kandanghaur</span>
          <span>
            Bilik aman <i className={s.footerDot} aria-hidden="true" />
            Hasil live <i className={s.footerDot} aria-hidden="true" />
            Berita acara digital
          </span>
          <span className={s.footerRight}>
            <Zap className="h-3 w-3" fill="currentColor" aria-hidden="true" />
            IPM 2026
          </span>
        </footer>
      </div>
    </main>
  );
}
