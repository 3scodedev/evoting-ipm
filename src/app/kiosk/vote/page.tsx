'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BallotSkeleton } from '@/components/skeletons/BallotSkeleton';

export default function KioskVotePage() {
  const r = useRouter();
  useEffect(() => { r.push('/kiosk/ballot'); }, [r]);
  return <BallotSkeleton />;
}
