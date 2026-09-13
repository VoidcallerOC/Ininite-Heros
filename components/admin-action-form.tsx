'use client';

import { useActionState } from 'react';
import type { ActionState } from '@/lib/cms';
import { initialActionState } from '@/lib/cms';

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, className = 'admin-form', submitLabel = 'Save changes' }: Readonly<{ action: ServerAction; children: React.ReactNode; className?: string; submitLabel?: string }>) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return <form action={formAction} className={className}>
    {state.status !== 'idle' && <p role="status" className={`admin-notice admin-notice--${state.status}`}>{state.message}</p>}
    {children}
    <div className="admin-toolbar"><button className="admin-button admin-button--quiet" type="reset" disabled={pending}>Cancel</button><button className="admin-button" type="submit" disabled={pending}>{pending ? 'Working…' : submitLabel}</button></div>
  </form>;
}

export function DeleteForm({ action, id, label = 'Delete' }: Readonly<{ action: ServerAction; id: string; label?: string }>) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return <form action={formAction} style={{ display: 'inline' }} onSubmit={(event) => { if (!window.confirm('Delete this item? This cannot be undone.')) event.preventDefault(); }}>
    <input type="hidden" name="id" value={id} />
    <button className="admin-button admin-button--danger" type="submit" disabled={pending}>{pending ? 'Deleting…' : label}</button>
    {state.status !== 'idle' && <span className={`admin-notice admin-notice--${state.status}`} role="status">{state.message}</span>}
  </form>;
}
