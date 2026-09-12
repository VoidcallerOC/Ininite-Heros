import { ActionForm, DeleteForm } from '@/components/admin-action-form';
import { deleteCardGame, saveCardGame } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { CardGame } from '@/lib/cms';

export const dynamic = 'force-dynamic';

function CardForm({ game }: { game?: CardGame }) {
  return <ActionForm action={saveCardGame}><input type="hidden" name="id" value={game?.id || ''} /><div className="admin-form__grid"><div className="admin-field"><label>Game name<input name="name" maxLength={120} defaultValue={game?.name} required /></label></div><div className="admin-field"><label>URL slug<input name="slug" maxLength={80} defaultValue={game?.slug} required /></label></div><div className="admin-field"><label>Image URL<input name="image_url" type="url" defaultValue={game?.image_url || ''} /></label></div><div className="admin-field"><label>Display order<input name="sort_order" type="number" min="0" max="999" defaultValue={game?.sort_order ?? 0} required /></label></div></div><div className="admin-field"><label>Description<textarea name="description" maxLength={700} defaultValue={game?.description} required /></label></div><label className="admin-checkbox"><input name="active" type="checkbox" defaultChecked={game?.active ?? true} /> Show on the public Cards page</label></ActionForm>;
}

export default async function CardsAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('card_games').select('*').order('sort_order');
  const games = (data ?? []) as CardGame[];
  return <><header className="admin-header"><div><h1>Cards</h1><p>The previously redirect-only Cards URL is now a managed public page. Publish current card games here without exposing inventory promises or design controls.</p></div></header><section className="admin-panel"><h2>Add card game</h2><CardForm /></section><section className="admin-panel"><h2>Current card game listings</h2>{games.length === 0 ? <div className="admin-empty">No card games are published. The public page shows its prepared empty state.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Game</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead><tbody>{games.map((game) => <tr key={game.id}><td><strong>{game.name}</strong><br /><small>{game.description}</small></td><td>{game.active ? 'Public' : 'Hidden'}</td><td>{game.sort_order}</td><td className="actions"><details><summary className="admin-button admin-button--quiet">Edit</summary><div className="admin-panel"><CardForm game={game} /></div></details><DeleteForm action={deleteCardGame} id={game.id} /></td></tr>)}</tbody></table></div>}</section></>;
}
