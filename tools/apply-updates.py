from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
keys = {
 'index.html': [('A comic shop worth the stop.', 'data-content-key="home.heroTitle"'), ('New issues, wall books, collectibles, and a counter where someone can point you to the next great read.', 'data-content-key="home.heroCopy"')],
 'comics.html': [('Comics live here.', 'data-content-key="comics.heroTitle"'), ('Wednesday new comics, DC and Marvel runs, and the books that stay on the wall.', 'data-content-key="comics.heroCopy"')],
 'collectibles.html': [('Bring fandom home.', 'data-content-key="collectibles.heroTitle"'), ('Figures and statues next to the comics — pieces you can take off the shelf.', 'data-content-key="collectibles.heroCopy"')],
 'about.html': [('Built for the love of comics.', 'data-content-key="about.heroTitle"'), ('An independent shop run by someone who already spent a career inside the books.', 'data-content-key="about.heroCopy"')],
 'visit.html': [('1098 Main Street.', 'data-content-key="visit.heroTitle"'), ('Watertown’s comic shop. Hours on this page. A phone that rings the counter.', 'data-content-key="visit.heroCopy"')],
}
for name, replacements in keys.items():
    p = root / name; s = p.read_text()
    for text, attr in replacements:
        s = s.replace(f'>{text}<', f' {attr}>{text}<', 1)
    s = s.replace('</body>', '  <script src="assets/js/content.js"></script>\n</body>')
    p.write_text(s)
# Target each numbered list item directly, making anchor IDs stable on desktop and mobile.
for name, prefix in [('comics.html','comics'), ('collectibles.html','collectibles'), ('about.html','about')]:
    p = root / name; s = p.read_text()
    for n, slug in [(1,'new'),(2,'core'),(3,'long')]:
        old = f'<span class="feature-list__number">0{n}</span>'
        new = f'<a class="feature-list__number" href="#{prefix}-{slug}" aria-label="Jump to {prefix} section {n}">0{n}</a>'
        s = s.replace(old, new, 1)
    li = re.findall(r'<li><a class="feature-list__number" href="#([^\"]+)"[^>]*>0[1-3]</a>', s)
    for target in li:
        s = s.replace(f'<li><a class="feature-list__number" href="#{target}"', f'<li id="{target}"><a class="feature-list__number" href="#{target}"', 1)
    p.write_text(s)
# Existing verified social handles are preserved, but public links become hideable if the admin clears them.
p = root / 'index.html'; s = p.read_text()
s = s.replace('href="https://www.facebook.com/infiniteheroescomics/"', 'data-social="facebook" href="https://www.facebook.com/infiniteheroescomics/"', 2)
s = s.replace('href="https://www.instagram.com/infiniteheroescomics/"', 'data-social="instagram" href="https://www.instagram.com/infiniteheroescomics/"', 2)
p.write_text(s)
