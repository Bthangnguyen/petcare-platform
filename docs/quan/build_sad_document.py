"""Render the standalone SAD 5–6 Markdown handoff as an offline HTML document."""
from html import escape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent

def inline(text):
    tokens = []
    def hold(html):
        tokens.append(html)
        return f'\x00{len(tokens)-1}\x00'
    text = re.sub(r'`([^`]+)`', lambda m: hold('<code>' + escape(m[1]) + '</code>'), text)
    text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', lambda m: hold('<figure><img src="' + escape(m[2], quote=True) + '" alt="' + escape(m[1], quote=True) + '"><figcaption>' + escape(m[1]) + '</figcaption></figure>'), text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: hold('<a href="' + escape(m[2], quote=True) + '">' + escape(m[1]) + '</a>'), text)
    text = escape(text)
    return re.sub(r'\x00(\d+)\x00', lambda m: tokens[int(m[1])], text)

def build():
    lines = (ROOT / 'SAD_Sections_5_6.md').read_text(encoding='utf-8').splitlines()
    body = []
    toc = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith('```'):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code.append(lines[i])
                i += 1
            body.append('<pre><code>' + escape('\n'.join(code)) + '</code></pre>')
            i += 1
        elif line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', c) for c in cells):
                    rows.append(cells)
                i += 1
            header = '<tr>' + ''.join('<th scope="col">' + inline(c) + '</th>' for c in rows[0]) + '</tr>'
            content = ''.join('<tr>' + ''.join('<td>' + inline(c) + '</td>' for c in r) + '</tr>' for r in rows[1:])
            body.append('<div class="table-wrap"><table><thead>' + header + '</thead><tbody>' + content + '</tbody></table></div>')
        elif re.match(r'^#{1,3} ', line):
            level = len(line) - len(line.lstrip('#'))
            title = line[level:].strip()
            anchor = 'section-' + str(i)
            if level > 1:
                toc.append((anchor, title))
            body.append(f'<h{level} id="{anchor}">' + escape(title) + f'</h{level}>')
            i += 1
        else:
            paragraph = [line]
            i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].startswith(('#', '|', '```')):
                paragraph.append(lines[i])
                i += 1
            content = inline(' '.join(paragraph))
            body.append(content if content.startswith('<figure>') else '<p>' + content + '</p>')
    nav = '<nav aria-label="Mục lục">' + ''.join('<a href="#' + a + '">' + escape(t) + '</a>' for a, t in toc) + '</nav>'
    html = '''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SAD mục 5 và 6 Pet Care Platform PA04</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f5f6;color:#18232c;font:16px/1.65 system-ui,Segoe UI,sans-serif}main{max-width:1100px;padding:40px;margin:auto;background:#fff}h1,h2,h3{color:#111;line-height:1.3}h1{font-size:32px}h2{margin-top:48px}h3{margin-top:30px}nav{display:flex;flex-wrap:wrap;gap:8px 20px;margin:24px 0}a{color:#14634e}code{font-family:Consolas,monospace;font-size:.9em;overflow-wrap:anywhere}pre{white-space:pre;overflow:auto;padding:18px;background:#f5f6f7}table{width:100%;border-collapse:collapse;margin:24px 0;table-layout:fixed}th,td{border:1px solid #d9d9d9;padding:12px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#e9edf0;color:#111}figure{margin:24px 0}img{display:block;max-width:100%;height:auto;margin:auto}figcaption{font-size:14px;color:#52616a;text-align:center}h2,h3{scroll-margin-top:20px}@media(max-width:600px){main{padding:20px}h1{font-size:26px}.table-wrap{overflow:auto}table{min-width:640px}}@media print{body{background:white}main{padding:0;max-width:none}nav{display:none}h2,h3{break-after:avoid}figure,tr{break-inside:avoid}thead{display:table-header-group}img{max-height:225mm}pre{font-size:10px;white-space:pre-wrap}a{color:inherit;text-decoration:none}}
</style></head><body><main>'''
    # Keep the title and summary before the navigation.
    html += body[0] + '<p>PA04 · Group 12 · Nguyễn Minh Quân · Bản riêng để bàn giao</p>' + nav + ''.join(body[1:]) + '</main></body></html>'
    (ROOT / 'SAD_Sections_5_6.html').write_text(html, encoding='utf-8')
    print('Built SAD_Sections_5_6.html')

if __name__ == '__main__':
    build()
