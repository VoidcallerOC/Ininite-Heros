import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = process.env.CMS_INTEGRATION_TESTS === '1' && Boolean(url && anonKey && serviceRoleKey);

const options = { skip: !enabled ? 'Set CMS_INTEGRATION_TESTS=1 with Supabase credentials to run live connectivity and CRUD checks.' : undefined };

test('Supabase anonymous connection can read public seeded CMS records', options, async () => {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.from('site_settings').select('key,value').eq('key', 'business_name').single();
  assert.equal(error, null);
  assert.equal(data?.value, 'Infinite Heroes Comics');
});

test('RLS prevents anonymous writes and permits administrator CRUD', options, async () => {
  const admin = createClient(url!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const slug = `cms-test-${randomUUID().slice(0, 8)}`;
  const email = `cms-test-${randomUUID().slice(0, 8)}@example.invalid`;
  const password = `Safe-${randomUUID()}-A1!`;
  let userId: string | undefined;
  let pageId: string | undefined;
  try {
    const anonymousWrite = await anon.from('pages').insert({ slug, title: 'Anonymous write', published: false });
    assert.notEqual(anonymousWrite.error, null, 'anonymous writes must be denied by RLS');

    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.equal(createError, null);
    userId = createdUser.user.id;
    const { error: promoteError } = await admin.from('profiles').update({ role: 'admin' }).eq('id', userId);
    assert.equal(promoteError, null);

    const authorized = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: signInError } = await authorized.auth.signInWithPassword({ email, password });
    assert.equal(signInError, null);
    const inserted = await authorized.from('pages').insert({ slug, title: 'Integration CRUD page', published: false }).select('id,title').single();
    assert.equal(inserted.error, null);
    pageId = inserted.data?.id;
    assert.equal(inserted.data?.title, 'Integration CRUD page');

    const updated = await authorized.from('pages').update({ title: 'Updated Integration CRUD page' }).eq('id', pageId!).select('title').single();
    assert.equal(updated.error, null);
    assert.equal(updated.data?.title, 'Updated Integration CRUD page');

    const deleted = await authorized.from('pages').delete().eq('id', pageId!);
    assert.equal(deleted.error, null);
    pageId = undefined;
  } finally {
    if (pageId) await admin.from('pages').delete().eq('id', pageId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
