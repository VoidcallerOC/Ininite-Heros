import Link from 'next/link';
import { LoginForm } from '@/app/admin/login/login-form';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return <main className="admin-login"><section className="admin-login__panel"><Link href="/"><img className="admin-login__logo" src="/assets/images/infinite-heroes-logo.webp" width="620" height="394" alt="Infinite Heroes Comics" /></Link><h1>Admin sign in</h1><p>Use a passwordless sign-in link. Access requires a Supabase account that has explicitly been assigned the <strong>admin</strong> role.</p>{message && <p className="admin-notice admin-notice--error" role="status">{message}</p>}<LoginForm /><p><Link href="/">Return to the public site</Link></p></section></main>;
}
