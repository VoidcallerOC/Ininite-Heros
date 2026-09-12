'use client';

import { useActionState } from 'react';
import type { ActionState } from '@/lib/cms';
import { initialActionState } from '@/lib/cms';

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, className = 'admin-form' }: Readonly<{ action: ServerAction; children: React.ReactNode; className?: string }>) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return <form action={formAction} className={className}>
    {state.status !== 'idle' && <p role="status" className={`admin-notice admin-notice--${state.status}`}>{state.message}</p>}
    {children}
    <button className="admin-button" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</button>
  </form>;
}

export function DeleteForm({ action, id, label = 'Delete' }: Readonly<{ action: ServerAction; id: string; label?: string }>) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return <form action={formAction} style={{ display: 'inline' }}>
    <input type="hidden" name="id" value={id} />
    <button className="admin-button admin-button--danger" type="submit" disabled={pending}>{pending ? 'Deleting…' : label}</button>
    {state.status === 'error' && <span className="admin-notice admin-notice--error" role="status">{state.message}</span>}
  </form>;
}
