'use client';

import { useActionState } from 'react';
import { initialActionState } from '@/lib/cms';
import { signInWithPassword } from '@/app/admin/login/actions';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialActionState);
  return <form action={formAction}><label htmlFor="email">Administrator email</label><input id="email" name="email" type="email" autoComplete="username" required placeholder="owner@example.com" /><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required />{state.status !== 'idle' && <p className={`admin-notice admin-notice--${state.status}`} role="alert">{state.message}</p>}<button className="admin-button" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign In'}</button></form>;
}
