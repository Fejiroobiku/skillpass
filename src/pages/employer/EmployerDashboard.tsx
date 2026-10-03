import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, FlagIcon, SearchIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { CredentialRecord } from '../../components/CredentialRecord';
import { RevokeModal } from '../../components/RevokeModal';
import { StarRating } from '../../components/StarRating';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';

export function EmployerDashboard() {
  const { user } = useAuth();
  const { credentials, employers, skills, nameOf, cosign, raiseFlag, recordVerification, rateVerification } = useSkillPass();
  const me = employers.find((e) => e.id === user?.id);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [trust, setTrust] = useState(0);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const startRef = useRef<number | null>(null);

  const credential = searched ? credentials.find((c) => c.id === searched) : undefined;
  const requests = credentials.filter((c) => c.status === 'pending_cosign' && c.cosignRequestedFrom === user?.id);

  const runVerify = (id: string) => {
    const started = startRef.current ?? performance.now();
    const secs = Math.max(1, Math.round((performance.now() - started) / 1000));
    startRef.current = null;
    setSearched(id);
    setNotice(null);
    setTrust(0);
    const found = credentials.find((c) => c.id === id);
    if (found) {
      setElapsed(secs);
      setEventId(recordVerification(id, secs));
    } else {
      setElapsed(null);
      setEventId(null);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = query.trim().toUpperCase();
    if (id) runVerify(id);
  };

  return (
    <>
      <PageHeader title="Verify & Co-sign" subtitle={`${me?.company ?? ''} · Check what a worker can actually do before you hire them.`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <form onSubmit={submit} role="search" className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-2 sm:flex-row">
            <label htmlFor="verify-id" className="sr-only">Credential ID</label>
            <input
              id="verify-id"
              value={query}
              onChange={(e) => {
                if (startRef.current === null) startRef.current = performance.now();
                setQuery(e.target.value);
              }}
              placeholder="Enter credential ID, e.g. SP-2BNC-8QPE"
              className="min-w-0 flex-1 rounded-xl px-4 py-3 font-mono text-base uppercase text-ink placeholder:font-sans placeholder:normal-case placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand-100" />
            
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors duration-150 hover:bg-brand-700">
              <SearchIcon className="h-4 w-4" /> Verify
            </button>
          </form>

          {!searched &&
          <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
              <p className="font-semibold text-ink">No credential checked yet</p>
              <p className="mt-1 text-sm text-ink-muted">Ask the worker for their SkillPass link or the ID on their printed passport.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
                {['SP-2BNC-8QPE', 'SP-3WLA-9KDS', 'SP-2DVS-8LQJ'].map((id) =>
              <button key={id} type="button" onClick={() => {setQuery(id);runVerify(id);}} className="rounded-lg bg-canvas px-3 py-1.5 font-mono text-brand-700 transition-colors duration-150 hover:bg-brand-50">{id}</button>
              )}
              </div>
            </div>
          }

          {searched && !credential &&
          <div role="alert" className="rounded-2xl border border-bad-200 bg-bad-50 p-6">
              <p className="font-semibold text-bad-700">No credential found for {searched}</p>
              <p className="mt-1 text-sm text-bad-700">Treat this skill claim as unverified.</p>
            </div>
          }

          {credential &&
          <>
              {notice && <p role="status" className="rounded-xl bg-ok-50 p-4 text-sm font-medium text-ok-700">{notice}</p>}
              <CredentialRecord credential={credential} />
              <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 md:flex-row md:items-center">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">How much do you trust this credential?</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted"><ClockIcon className="h-3.5 w-3.5" /> Verified in {elapsed}s · your answer helps evaluate the pilot</p>
                </div>
                {trust ?
              <p className="text-sm font-medium text-ok-700">Thanks — recorded {trust}/5</p> :

              <StarRating value={trust} onChange={(v) => {setTrust(v);if (eventId) rateVerification(eventId, v);}} size="lg" />
              }
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/employer/feedback" className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">Rate work after a job</Link>
                {credential.status === 'valid' &&
              <button type="button" onClick={() => setFlagging(credential.id)} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-bad-700 transition-colors duration-150 hover:bg-bad-50">
                    <FlagIcon className="h-4 w-4" /> Flag as suspicious
                  </button>
              }
              </div>
            </>
          }
        </div>

        <Panel title="Co-sign requests" description={me?.approved ? 'Advanced skills where a trainer asked you to confirm the work.' : 'Approved employers can co-sign advanced skills.'} className="self-start">
          {!me?.approved ?
          <p className="rounded-xl bg-warn-50 p-4 text-sm text-warn-700">Your employer account is awaiting administrator approval.</p> :
          requests.length === 0 ?
          <p className="rounded-xl bg-canvas p-4 text-sm text-ink-muted">No requests waiting.</p> :

          <ul className="space-y-3">
              {requests.map((c) =>
            <li key={c.id} className="rounded-xl border border-line p-4">
                  <p className="text-sm font-semibold text-ink">{skills.find((s) => s.id === c.skillId)?.name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{nameOf(c.apprenticeId)} · by {nameOf(c.trainerId)}</p>
                  <div className="mt-3 flex gap-2">
                    <Link to={`/verify/${c.id}`} className="flex-1 rounded-lg border border-line px-3 py-2 text-center text-sm font-medium text-ink hover:bg-canvas">Evidence</Link>
                    <button type="button" onClick={() => user && cosign(c.id, user.id)} className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">Co-sign</button>
                  </div>
                </li>
            )}
            </ul>
          }
        </Panel>
      </div>

      <RevokeModal
        mode="flag"
        credentialId={flagging}
        onClose={() => setFlagging(null)}
        onConfirm={(reason) => {
          if (flagging && user) raiseFlag(flagging, reason, user.id);
          setFlagging(null);
          setNotice('Flag sent. An administrator will review the evidence and the trainer will be notified.');
        }} />
      
    </>);

}