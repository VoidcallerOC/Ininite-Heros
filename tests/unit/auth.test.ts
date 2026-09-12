import assert from 'node:assert/strict';
import test from 'node:test';
import { assertContentAdmin, canManageContent } from '@/lib/authorization';

test('only the admin role can manage CMS content', () => {
  assert.equal(canManageContent('admin'), true);
  assert.equal(canManageContent('editor'), false);
  assert.equal(canManageContent(null), false);
  assert.equal(canManageContent(undefined), false);
});

test('authorization guard rejects non-administrators', () => {
  assert.doesNotThrow(() => assertContentAdmin('admin'));
  assert.throws(() => assertContentAdmin('editor'), /administrator role is required/i);
  assert.throws(() => assertContentAdmin(null), /administrator role is required/i);
});
