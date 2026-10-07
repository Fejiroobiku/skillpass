import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FlagIcon, LockIcon, SearchIcon } from 'lucide-react';
import { PublicHeader } from '../../components/PublicHeader';
import { CredentialRecord } from '../../components/CredentialRecord';
import { NoticeBanner } from '../../components/NoticeBanner';
import { RevokeModal } from '../../components/RevokeModal';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { useVerifiedCredential } from '../../api/usePublic';

export function PublicVerify() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { credentials, raiseFlag, cosign } = useSkillPass();
  const [query, setQuery] = useState(id ?? '');
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const verified = useVerifiedCredential(id ?? null);
  const credential = verified.data;

  // Co-sign requests are private to the person asked, so they come from the signed-in store, not the public view.
  const mine = credential ? credentials.find((c) => c.id === credential.id) : undefined;
  const canFlag = !!user && ['trainer', 'employer', 'admin'].includes(user.role) && credential?.status === 'valid' && credential.trainer.id !== user.id;
  const canCosign = !!user && mine?.status === 'pending_cosign' && mine.cosignRequestedFrom === user.id;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toUpperCase();
    if (q) {
      setFlagged(false);
      navigate(`/verify/${q}`);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col bg-canvas">
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-6 md:py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Verify a skill credential</h1>
        <p className="mt-1 text-ink-muted">No login needed. Enter the ID printed on the passport, or open the shared link.</p>

        <form onSubmit={submit} role="search" className="no-print mt-6 flex gap-2">
          <label htmlFor="cred-id" className="sr-only">Credential ID</label>
          <input id="cred-id" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="SP-XXXX-XXXX" className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-3 font-mono text-base uppercase text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white transition-colors duration-150 hover:bg-brand-700">
            <SearchIcon className="h-4 w-4" /> Verify
          </button>
        </form>

        <div className="mt-8 space-y-4">
          <NoticeBanner />
          {!id &&
          <p className="text-sm text-ink-muted">Enter a credential ID above, for example <span className="font-mono">SP-4KQ7-L2MX</span>.</p>
          }
          {id && verified.status === 'loading' && !credential && <p className="text-sm text-ink-muted" role="status">Checking {id.toUpperCase()}…</p>}
          {id && verified.status === 'missing' &&
          <div role="alert" className="rounded-2xl border border-bad-200 bg-bad-50 p-6">
              <p className="font-semibold text-bad-700">No credential found for {id.toUpperCase()}</p>
              <p className="mt-1 text-sm text-bad-700">Check the ID for typos. SkillPass IDs look like SP-4KQ7-L2MX. If someone showed you this ID, treat the claim as unverified.</p>
            </div>
          }
          {id && verified.status === 'error' && <p role="alert" className="rounded-2xl border border-bad-200 bg-bad-50 p-6 text-sm font-medium text-bad-700">{verified.error}</p>}
          {flagged && <p role="status" className="rounded-xl bg-ok-50 p-4 text-sm font-medium text-ok-700">Flag sent. An administrator will review it.</p>}
          {credential && <CredentialRecord credential={credential} />}
          {credential && (canFlag || canCosign) &&
          <div className="no-print flex flex-wrap gap-3">
              {canCosign && user &&
            <button type="button" onClick={async () => {if (await cosign(credential.id, user.id)) void verified.reload();}} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">Co-sign this credential</button>
            }
              {canFlag &&
            <button type="button" onClick={() => setFlagging(credential.id)} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-bad-700 transition-colors duration-150 hover:bg-bad-50">
                  <FlagIcon className="h-4 w-4" /> Flag as suspicious
                </button>
            }
            </div>
          }
        </div>
      </main>

      <footer className="border-t border-line bg-white px-6 py-4 text-center text-sm text-ink-muted">
        <p className="inline-flex items-center gap-2"><LockIcon className="h-4 w-4" /> Only the fields above are public. Apprentice contact details are never shown.</p>
      </footer>

      <RevokeModal
        mode="flag"
        credentialId={flagging}
        onClose={() => setFlagging(null)}
        onConfirm={async (reason) => {
          const target = flagging;
          setFlagging(null);
          if (target && user && (await raiseFlag(target, reason, user.id))) {
            setFlagged(true);
            void verified.reload();
          }
        }} />
      
    </div>);

}
