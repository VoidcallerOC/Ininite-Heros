-- Remove the generic More Games placeholder from the public cards page.
delete from public.card_games
where slug = 'more';
