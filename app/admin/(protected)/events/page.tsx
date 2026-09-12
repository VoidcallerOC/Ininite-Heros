import { ActionForm, DeleteForm } from '@/components/admin-action-form';
import { deleteEvent, saveEvent } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { StoreEvent } from '@/lib/cms';

export const dynamic = 'force-dynamic';

function inputTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter(({ type }) => type !== 'literal').map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function EventForm({ event }: { event?: StoreEvent }) {
  return <ActionForm action={saveEvent}><input type="hidden" name="id" value={event?.id || ''} /><div className="admin-form__grid"><div className="admin-field"><label>Event title<input name="title" maxLength={180} defaultValue={event?.title} required /></label></div><div className="admin-field"><label>Starts (Eastern time)<input name="starts_at" type="datetime-local" defaultValue={inputTime(event?.starts_at || null)} required /></label></div><div className="admin-field"><label>Ends (Eastern time)<input name="ends_at" type="datetime-local" defaultValue={inputTime(event?.ends_at || null)} /></label></div><div className="admin-field"><label>Image URL<input name="image_url" type="url" defaultValue={event?.image_url || ''} /></label></div><div className="admin-field"><label>Registration URL<input name="registration_url" type="url" defaultValue={event?.registration_url || ''} /></label></div></div><div className="admin-field"><label>Description<textarea name="description" maxLength={4000} defaultValue={event?.description || ''} /></label></div><label className="admin-checkbox"><input name="published" type="checkbox" defaultChecked={event?.published ?? true} /> Publish this event</label></ActionForm>;
}

export default async function EventsAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('events').select('*').order('starts_at', { ascending: false });
  const events = (data ?? []) as StoreEvent[];
  return <><header className="admin-header"><div><h1>Events</h1><p>Create and publish shop events. Times are entered as America/New_York and stored as timezone-aware timestamps.</p></div></header><section className="admin-panel"><h2>Add event</h2><EventForm /></section><section className="admin-panel"><h2>Existing events</h2>{events.length === 0 ? <div className="admin-empty">No events have been created.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Event</th><th>Starts</th><th>Status</th><th>Actions</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><strong>{event.title}</strong><br /><small>{event.description}</small></td><td>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(event.starts_at))}</td><td>{event.published ? 'Published' : 'Draft'}</td><td className="actions"><details><summary className="admin-button admin-button--quiet">Edit</summary><div className="admin-panel"><EventForm event={event} /></div></details><DeleteForm action={deleteEvent} id={event.id} /></td></tr>)}</tbody></table></div>}</section></>;
}
