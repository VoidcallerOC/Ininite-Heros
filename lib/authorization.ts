import type { Role } from '@/lib/cms';

export function canManageContent(role: Role | null | undefined): boolean {
  return role === 'admin';
}

export function assertContentAdmin(role: Role | null | undefined): asserts role is 'admin' {
  if (!canManageContent(role)) throw new Error('Forbidden: an administrator role is required.');
}
