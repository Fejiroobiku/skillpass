import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface RevokeModalProps {
  credentialId: string | null;
  mode: 'revoke' | 'flag';
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function RevokeModal({ credentialId, mode, onClose, onConfirm }: RevokeModalProps) {
  const [reason, setReason] = useState('');
  useEffect(() => setReason(''), [credentialId]);
  const isFlag = mode === 'flag';

  return (
    <Modal open={!!credentialId} title={isFlag ? 'Flag this credential' : 'Revoke credential'} onClose={onClose}>
      <p className="text-sm text-ink-muted">
        {isFlag ?
        'The credential will show as flagged until an administrator reviews the evidence. The issuing trainer is notified.' :
        'The credential stays visible on the verification page, marked as revoked, with your reason. This cannot be undone.'}
      </p>
      <p className="mt-3 font-mono text-sm text-ink">{credentialId}</p>
      <label htmlFor="reason-text" className="mt-4 block text-sm font-semibold text-ink">Reason</label>
      <textarea
        id="reason-text"
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={isFlag ? 'What does not match what you saw?' : 'e.g. Issued in error to the wrong apprentice'}
        className="mt-1.5 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas">Cancel</button>
        <button
          type="button"
          disabled={reason.trim().length < 8}
          onClick={() => onConfirm(reason.trim())}
          className="rounded-xl bg-bad-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-bad-700 disabled:opacity-40">
          
          {isFlag ? 'Send flag' : 'Revoke credential'}
        </button>
      </div>
    </Modal>);

}