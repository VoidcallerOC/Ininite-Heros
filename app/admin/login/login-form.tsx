'use client';

import { useActionState } from 'react';
import { initialActionState } from '@/lib/cms';
import { sendLoginLink } from '@/app/admin/login/actions';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(sendLoginLink, initialActionState);
  return <form action={formAction}><label htmlFor="email">Administrator email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="owner@example.com" />{state.status !== 'idle' && <p className={`admin-notice admin-notice--${state.status}`} role="status">{state.message}</p>}<button className="admin-button" type="submit" disabled={pending}>{pending ? 'Sending link…' : 'Send secure sign-in link'}</button></form>;
}
