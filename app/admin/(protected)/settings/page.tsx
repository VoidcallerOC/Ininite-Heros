import { ActionForm, DeleteForm } from '@/components/admin-action-form';
import { deleteSocial, saveHour, saveSetting, saveSocial } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { BusinessHour, SiteSetting, SocialLink } from '@/lib/cms';

export const dynamic = 'force-dynamic';

function SettingForm({ setting }: { setting: SiteSetting }) {
  return <ActionForm action={saveSetting}><input type="hidden" name="key" value={setting.key} /><input type="hidden" name="label" value={setting.label} /><div className="admin-field"><label>{setting.label}<input name="value" defaultValue={setting.value} required /></label></div></ActionForm>;
}
function SocialForm({ social }: { social?: SocialLink }) {
  return <ActionForm action={saveSocial}><input type="hidden" name="id" value={social?.id || ''} /><div className="admin-form__grid"><div className="admin-field"><label>Platform<input name="platform" defaultValue={social?.platform} required /></label></div><div className="admin-field"><label>Label<input name="label" defaultValue={social?.label} required /></label></div><div className="admin-field"><label>URL<input name="url" type="url" defaultValue={social?.url} required /></label></div><div className="admin-field"><label>Order<input name="sort_order" type="number" min="0" max="999" defaultValue={social?.sort_order ?? 0} required /></label></div></div><label className="admin-checkbox"><input name="active" type="checkbox" defaultChecked={social?.active ?? true} /> Show publicly</label></ActionForm>;
}
function HourForm({ hour }: { hour: BusinessHour }) {
  return <ActionForm action={saveHour}><input type="hidden" name="id" value={hour.id} /><div className="admin-form__grid"><div className="admin-field"><label>Day<label><input name="label" defaultValue={hour.label} required /></label></label></div><div className="admin-field"><label>Open time<input name="open_time" type="time" defaultValue={hour.open_time?.slice(0, 5) || ''} /></label></div><div className="admin-field"><label>Close time<input name="close_time" type="time" defaultValue={hour.close_time?.slice(0, 5) || ''} /></label></div></div><label className="admin-checkbox"><input name="is_closed" type="checkbox" defaultChecked={hour.is_closed} /> Closed all day</label></ActionForm>;
}

export default async function SettingsAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [settingsResult, hoursResult, socialResult] = await Promise.all([supabase.from('site_settings').select('*').order('key'), supabase.from('business_hours').select('*').order('sort_order'), supabase.from('social_links').select('*').order('sort_order')]);
  const settings = (settingsResult.data ?? []) as SiteSetting[];
  const hours = (hoursResult.data ?? []) as BusinessHour[];
  const socials = (socialResult.data ?? []) as SocialLink[];
  return <><header className="admin-header"><div><h1>Site settings</h1><p>Manage business information, hours, and social links. Brand color, fonts, layout, and visual system are intentionally not configurable.</p></div></header><section className="admin-panel"><h2>Business information</h2>{settings.length === 0 ? <div className="admin-empty">No settings were seeded.</div> : <div className="admin-grid">{settings.map((setting) => <div className="admin-card" key={setting.key}><SettingForm setting={setting} /></div>)}</div>}</section><section className="admin-panel"><h2>Business hours</h2><div className="admin-grid">{hours.map((hour) => <div className="admin-card" key={hour.id}><HourForm hour={hour} /></div>)}</div></section><section className="admin-panel"><h2>Social links</h2><SocialForm />{socials.length > 0 && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Platform</th><th>URL</th><th>Status</th><th>Actions</th></tr></thead><tbody>{socials.map((social) => <tr key={social.id}><td>{social.label}</td><td><a href={social.url} target="_blank" rel="noopener">{social.url}</a></td><td>{social.active ? 'Public' : 'Hidden'}</td><td className="actions"><details><summary className="admin-button admin-button--quiet">Edit</summary><div className="admin-panel"><SocialForm social={social} /></div></details><DeleteForm action={deleteSocial} id={social.id} /></td></tr>)}</tbody></table></div>}</section></>;
}
