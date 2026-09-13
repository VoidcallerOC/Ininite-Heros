-- Cards page repair: remove comic photography from game-card imagery and navigation.
-- Logo PNGs can be added later through the existing Media Library and Cards CMS.

update public.card_games
set image_url = null,
    image_alt = null,
    cta_label = null,
    cta_href = null
where slug in ('magic', 'pokemon', 'lorcana', 'star-wars', 'yu-gi-oh', 'one-piece', 'flesh-and-blood', 'more');

insert into public.card_games (name, slug, description, image_url, image_alt, cta_label, cta_href, active, sort_order)
values
  ('One Piece', 'one-piece', 'One Piece Card Game releases and the current trading-card scene at Infinite Heroes.', null, null, null, null, true, 60),
  ('Flesh and Blood', 'flesh-and-blood', 'Flesh and Blood cards for players and collectors.', null, null, null, null, true, 70),
  ('More Games', 'more', 'The card scene changes. Ask the shop what just arrived and what is being played next.', null, null, null, null, true, 80)
on conflict (slug) do update set name = excluded.name, image_url = excluded.image_url, image_alt = excluded.image_alt, cta_label = excluded.cta_label, cta_href = excluded.cta_href, sort_order = excluded.sort_order;
