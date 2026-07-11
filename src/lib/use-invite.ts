// Data + actions for the public invite page: loads the invite by token,
// and handles the guest's own birth-data submission.
import { useEffect, useState } from 'react';
import {
  fetchInviteInfo, submitInvite, type Big3, type InviteInfo,
} from '@/lib/api';
import type { BirthDataValues } from '@/components/birth-data-form';

export type InvitePhase = 'landing' | 'form' | 'reveal' | 'locked';

export function useInvite(token: string | undefined) {
  const [phase, setPhase] = useState<InvitePhase>('landing');
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notActive, setNotActive] = useState(false); // 404 or missing token
  const [loadError, setLoadError] = useState('');

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [big3, setBig3] = useState<Big3 | null>(null);
  const [inviterName, setInviterName] = useState('');
  const [timeKnown, setTimeKnown] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setNotActive(true); setLoading(false); return; }
      try {
        const data = await fetchInviteInfo(token);
        if (!active) return;
        if (!data) { setNotActive(true); return; }
        setInfo(data);
        setInviterName(data.inviter_name);
      } catch (e: any) {
        if (active) setLoadError(e.message ?? 'Couldn’t load this invite.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  async function handleSubmit(v: BirthDataValues) {
    if (!token) return;
    setBusy(true); setSubmitError('');
    try {
      const result = await submitInvite(token, {
        name: v.name, date: v.date, time: v.time, lat: v.lat, lng: v.lng,
      });
      setBig3(result.big3);
      setInviterName(result.inviter_name);
      setTimeKnown(v.time !== null);
      setPhase('reveal');
    } catch (e: any) {
      setSubmitError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return {
    phase, setPhase, info, loading, notActive, loadError,
    busy, submitError, big3, inviterName, timeKnown, handleSubmit,
  };
}
