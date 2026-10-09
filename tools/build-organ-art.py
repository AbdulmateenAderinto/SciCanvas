#!/usr/bin/env python3
"""Build src/organart.js: professionally drawn, openly licensed organ illustrations used by the built-in anatomy icons.

The artwork comes from the icon libraries the app already bundles (the "icon-libraries" release, iconpacks.tar.gz):
Servier Medical Art (CC BY 3.0, via Bioicons), Jan Clusmann (CC0, via Bioicons), Reactome (CC BY 4.0) and DBCLS
(CC BY 4.0, via Bioicons). Each drawing is cleaned the way packs.js cleans library icons (no scripts, metadata, editor
attributes or text labels; class styles inlined; ids prefixed per drawing so several icons can share a page), and the
licence and author travel with it so File > Credits can cite it. Geometry is copied exactly.

Usage: python3 tools/build-organ-art.py <path to unpacked iconpacks folder>
"""
import json, re, sys, os
import xml.etree.ElementTree as ET

SVG = 'http://www.w3.org/2000/svg'
XLINK = 'http://www.w3.org/1999/xlink'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', XLINK)

# key: (pack, name in pack.json, strip labels?)
ART = {
    'heart': ('bioicons', 'heart', False),
    'heart-vessels': ('bioicons', 'heart vascularization', False),
    'heart-interior': ('bioicons', 'heart interior 1', False),
    'lung': ('bioicons', 'lung', False),
    'lung-pleura': ('bioicons', 'healthy lung', False),
    'lung-cancer': ('bioicons', 'lung cancer', True),
    'emphysema': ('bioicons', 'emphysema', False),
    'trachea-bronchi': ('bioicons', 'trachea bronchi', False),
    'brain': ('bioicons', 'brain 2', False),
    'brain-coronal': ('bioicons', 'Frontal plane of the brain hippocampus', False),
    'brain-regions-coronal': ('bioicons', 'Frontal plane of the brain amygdala', False),
    'liver': ('bioicons', 'healthy liver', False),
    'liver-cirrhotic': ('bioicons', 'cirrhotic liver', False),
    'liver-hcc': ('bioicons', 'liver with hcc', False),
    'liver-3d': ('bioicons', 'liver 3d', False),
    'kidney': ('bioicons', 'kidney 1', False),
    'kidney-2': ('bioicons', 'kidney 2', False),
    'stomach': ('bioicons', 'stomach', False),
    'stomach-ulcer': ('bioicons', 'stomach ulcer', False),
    'small-intestine': ('bioicons', 'small intestine', False),
    'colon': ('bioicons', 'colon', True),
    'colon-polyp': ('bioicons', 'polyp colon 3d', True),
    'pancreas': ('bioicons', 'pancreas', False),
    'spleen': ('bioicons', 'spleen 1', False),
    'bladder': ('bioicons', 'bladder', False),
    'gallstones': ('bioicons', 'bile lithiasis big calculi', False),
    'digestive-system': ('bioicons', 'digestive system', False),
    'crohns': ('bioicons', 'crohns disease', False),
    'bronchus': ('bioicons', 'healthy bronchus crosssection', False),
    'bronchus-inflamed': ('bioicons', 'inflamed bronchus crossection', False),
    'gallbladder': ('reactome', 'Gallbladder', False),
    'oesophagus': ('bioicons', 'reflux disease closed sphincter', False),
    'ear': ('bioicons', 'ear', False),
    'tongue': ('bioicons', 'tongue', True),
    'tooth': ('bioicons', 'tooth', True, {'fills': {'#4d4d4d'}}),  # label arrows are dark grey filled shapes
    'eye': ('bioicons', 'eye crosssection', False),
    'cataract': ('bioicons', 'cataract', False),
    'retinopathy': ('bioicons', 'diabetic retinopathy retina', False),
    'skin': ('bioicons', 'skin', False),
    'burn': ('bioicons', 'skin third degree burn', False),
    'melanoma': ('bioicons', 'melanoma 1', False),
    'thymus': ('reactome', 'Thymus gland', False),
    'lymph-node': ('reactome', 'Lymph node', False),
    'knee': ('bioicons', 'Anterior view of knee joint', False),
    'rib-cage': ('bioicons', 'view of thoracic skelton', False),
    'pelvis': ('bioicons', 'Anterior view of male pelvis', False),
    'hand-bones': ('bioicons', 'Anterior view of bones of right hand', False),
    'muscle': ('reactome', 'Muscle', False),
    'muscle-fibre': ('bioicons', 'muscle fiber', False),
    'artery-wall': ('bioicons', 'vascular tunic artery', False),
    'vein-valve': ('bioicons', 'vene valve open', False),
    'varicose-vein': ('bioicons', 'varicose vein', False),
    'capillaries': ('bioicons', 'capillaries', False),
    'villi': ('bioicons', 'intestinal villi', True),
    'alveolus': ('reactome', 'Alveolus', False),
    'liver-lobule': ('bioicons', 'liver lobule', True),
    'islet': ('bioicons', 'langerhans islet pancreas', False),
    'spinal-cord': ('bioicons', 'spinal cord anterior horn cells motor nerves muscles', False, {'fills': {'#4a5b77'}}),  # without the drawn motor pathway
    'uterus-ovaries': ('reactome', 'Female reproductive system', False),
    'femur': ('reactome', 'Femur', False),
    # Enlarged, nodular thyroid: the Servier thyroid-cancer drawing without the tumour (its four red tones).
    'goitre': ('bioicons', 'thyroid cancer', False, {'fills': {'#a04c48', '#d37467', '#e58a80', '#cc6f5f'}}),
    'larynx': ('bioicons', 'larynx', False),
    'aorta': ('bioicons', 'aorta', False),
    'dvt': ('bioicons', 'venous thrombosis 5', False),
    'heart-conduction': ('bioicons', 'heart conduction 1', False),
    'pulmonary-embolism': ('bioicons', 'pulmonary embolism', False),
    'brain-horizontal': ('bioicons', 'Horizontal plane of the brain', False),
}
ATTRIBUTION = {
    'Servier': 'Servier Medical Art (smart.servier.com)',
    'Jan-Clusmann': 'Jan Clusmann',
    'DBCLS': 'DBCLS (togotv.dbcls.jp)',
}

LABEL_INK = {'#0070c0', '#b2b2b2'}
NUM = re.compile(r'-?\d*\.\d+(?:e-?\d+)?|-?\d+(?:e-?\d+)?')


def rnd(s, nd=1):
    def r(m):
        t = m.group(0)
        if 'e' in t:
            return t
        v = round(float(t), nd)
        out = ('%.' + str(nd) + 'f') % v
        out = out.rstrip('0').rstrip('.') if '.' in out else out
        return '0' if out in ('-0', '') else out
    return NUM.sub(r, s)


TOK = re.compile(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')
ARGS = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'C': 6, 'S': 4, 'Q': 4, 'T': 2, 'A': 7, 'Z': 0}


def tenths(v):
    return int(round(v * 10))


def num(t):
    """A value in tenths as compact text: 12 -> 1.2, -5 -> -.5, 30 -> 3."""
    neg, t = t < 0, abs(t)
    whole, frac = divmod(t, 10)
    txt = (str(whole) if whole else '') + ('.' + str(frac) if frac else '')
    return ('-' if neg else '') + (txt or '0')


def join_nums(vals):
    out = ''
    for k, v in enumerate(vals):
        if k and not v.startswith('-') and not (v.startswith('.') and '.' in vals[k - 1]):
            out += ' '
        out += v
    return out


def compact_path(d):
    """Rewrite path data with every point rounded to 0.1 and written as a step from the previous ROUNDED point, so
    rounding never accumulates (rounding the original relative steps would make long paths drift)."""
    toks, cmd, argn = [], None, 0
    for m in TOK.finditer(d):
        t = m.group(0)
        if t.isalpha():
            cmd, argn = t, 0
            toks.append(t)
            continue
        if cmd and cmd.upper() == 'A' and argn % 7 in (3, 4) and len(t) > 1 and t[0] in '01':
            # Arc flags are single digits and may be written without separators ("a5 5 0 01.2 3" = flags 0, 1, x .2).
            toks.append(t[0]); argn += 1
            rest = t[1:]
            if argn % 7 == 4 and rest and rest[0] in '01':
                toks.append(rest[0]); argn += 1; rest = rest[1:]
            if rest:
                toks.append(rest); argn += 1
            continue
        toks.append(t); argn += 1
    i, x, y, sx, sy, cur = 0, 0.0, 0.0, 0.0, 0.0, None
    rx = ry = rsx = rsy = 0  # rounded current point and subpath start, in tenths
    out, last = [], None

    def emit(c, vals):
        nonlocal last
        out.append(('' if c == last else c) + join_nums(vals) if c != last or not vals else ' ' + join_nums(vals) if not vals[0].startswith('-') else join_nums(vals))
        last = 'l' if c == 'm' else c

    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cur = t; i += 1
            if cur in 'Zz':
                out.append('z'); last = 'z'; x, y, rx, ry = sx, sy, rsx, rsy
                continue
        if cur is None:
            raise ValueError('path data starts without a command')
        C, rel = cur.upper(), cur.islower()
        n = ARGS[C]
        if i + n > len(toks) or any(tk.isalpha() for tk in toks[i:i + n]):
            raise ValueError('bad path data')
        v = [float(tk) for tk in toks[i:i + n]]
        i += n
        ab = lambda k: (x + v[k], y + v[k + 1]) if rel else (v[k], v[k + 1])
        if C in 'ML':
            nx, ny = ab(0)
            tx, ty = tenths(nx), tenths(ny)
            emit('m' if C == 'M' else 'l', [num(tx - rx), num(ty - ry)])
            x, y, rx, ry = nx, ny, tx, ty
            if C == 'M':
                sx, sy, rsx, rsy = nx, ny, tx, ty
                cur = 'l' if rel else 'L'
        elif C == 'H':
            nx = x + v[0] if rel else v[0]
            tx = tenths(nx); emit('h', [num(tx - rx)]); x, rx = nx, tx
        elif C == 'V':
            ny = y + v[0] if rel else v[0]
            ty = tenths(ny); emit('v', [num(ty - ry)]); y, ry = ny, ty
        elif C in 'CSQT':
            pts = [ab(k) for k in range(0, n, 2)]
            emit(C.lower(), [num(tenths(c) - (rx if j % 2 == 0 else ry)) for p in pts for j, c in enumerate(p)])
            x, y = pts[-1]; rx, ry = tenths(x), tenths(y)
        elif C == 'A':
            nx, ny = ab(5)
            tx, ty = tenths(nx), tenths(ny)
            emit('a', [num(tenths(v[0])), num(tenths(v[1])), num(tenths(v[2])), str(int(v[3])), str(int(v[4])), num(tx - rx), num(ty - ry)])
            x, y, rx, ry = nx, ny, tx, ty
    return ''.join(out)


def local(tag):
    return tag.split('}')[-1]


def clean(path, key, strip_labels, drops=None):
    drops = drops or {}
    drop_fills, drop_lines = drops.get('fills', set()), drops.get('lines', set())
    tree = ET.parse(path)
    root = tree.getroot()
    # Class rules from <style> elements, inlined below.
    rules = {}
    for st in list(root.iter(f'{{{SVG}}}style')):
        css = re.sub(r'/\*.*?\*/', '', st.text or '', flags=re.S)
        for sels, body in re.findall(r'([^{}]+)\{([^}]*)\}', css):
            for sel in sels.split(','):
                sel = sel.strip()
                if re.fullmatch(r'\.[\w-]+', sel):
                    rules[sel[1:]] = rules.get(sel[1:], '') + body.strip().rstrip(';') + ';'
    # Labels in some drawings: text and the thin leader lines in the label colour.
    label_colours = set()
    if strip_labels:
        for el in root.iter():
            if local(el.tag) in ('text', 'tspan'):
                for k in ('fill', 'stroke'):
                    v = (el.get(k) or '').lower()
                    if v.startswith('#'):
                        label_colours.add(v)
                m = re.search(r'fill:\s*(#[0-9a-fA-F]{3,6})', el.get('style') or '')
                if m:
                    label_colours.add(m.group(1).lower())

    def walk(parent):
        for el in list(parent):
            name = local(el.tag)
            drop = name in ('script', 'foreignObject', 'iframe', 'metadata', 'title', 'desc', 'style') or ':' in el.tag.split('}')[-1]
            if el.tag.startswith('{') and not el.tag.startswith(f'{{{SVG}}}'):
                drop = True  # editor (Inkscape, Sodipodi, Illustrator) elements
            if strip_labels and name in ('text', 'tspan'):
                drop = True
            if drop_fills and not drop:
                css = ''.join(rules.get(c, '') for c in (el.get('class') or '').split()) + (el.get('style') or '')
                m = re.search(r'fill:\s*(#[0-9a-fA-F]{6})', css)
                fill = (el.get('fill') or (m.group(1) if m else '')).lower()
                if fill in drop_fills:
                    drop = True
            if drop_lines and not drop and name in ('path', 'line', 'polyline'):
                d = el.get('d') or ''
                if (el.get('stroke') or '').lower() in drop_lines and (el.get('fill') or 'none') == 'none' and len(re.findall(r'[A-Za-z]', d)) <= 3:
                    drop = True
            if strip_labels and name in ('path', 'line', 'polyline', 'polygon') and not drop:
                stroke = (el.get('stroke') or '').lower()
                fill = (el.get('fill') or 'none').lower()
                # Leader lines and arrows: the label blue (Servier uses #0070c0) or grey (#b2b2b2) strokes.
                if fill in LABEL_INK or (stroke in LABEL_INK and fill in ('none', '', *LABEL_INK)) or (stroke in label_colours and fill in ('none', '')):
                    drop = True
            if name == 'image' and not (el.get(f'{{{XLINK}}}href') or el.get('href') or '').startswith('data:image/'):
                drop = True
            if drop:
                parent.remove(el)
                continue
            for a in list(el.attrib):
                an = a.split('}')[-1]
                ns = a[1:].split('}')[0] if a.startswith('{') else ''
                if an.startswith('on') or (ns and ns not in (XLINK,)) or an in ('data-name', 'enable-background', 'space', 'version', 'overflow'):
                    del el.attrib[a]
            cls = el.attrib.pop('class', None)
            if cls:
                css = ''.join(rules.get(c, '') for c in cls.split())
                if css:
                    el.set('style', css + (el.get('style') or ''))
            walk(el)
    walk(root)
    # View box.
    vb = root.get('viewBox')
    if not vb:
        vb = f"0 0 {float(re.sub('[^0-9.]', '', root.get('width', '100')))} {float(re.sub('[^0-9.]', '', root.get('height', '100')))}"
    vb = [float(x) for x in re.split(r'[\s,]+', vb.strip())]
    # Gradients flattened to their middle colour where a drawing must stay recolourable per layer.
    if drops.get('flat'):
        grads = {}
        for el in root.iter():
            if local(el.tag) in ('linearGradient', 'radialGradient') and el.get('id'):
                grads[el.get('id')] = el
        def stops(g, depth=0):
            st = [c for c in g if local(c.tag) == 'stop']
            ref = (g.get(f'{{{XLINK}}}href') or g.get('href') or '').lstrip('#')
            return st if st or depth > 4 or ref not in grads else stops(grads[ref], depth + 1)
        def colour(g):
            st = stops(g)
            if not st:
                return '#cccccc'
            mid = st[len(st) // 2]
            m = re.search(r'stop-color:\s*(#[0-9a-fA-F]{3,6})', mid.get('style') or '')
            return (mid.get('stop-color') or (m.group(1) if m else '#cccccc')).lower()
        solid = {gid: colour(g) for gid, g in grads.items()}
        for el in root.iter():
            for attr in ('fill', 'stroke'):
                v = (el.get(attr) or '').replace(' ', '')
                m = re.fullmatch(r"url\(['\"]?#([^'\")]+)['\"]?\)", v)
                if m and m.group(1) in solid:
                    el.set(attr, solid[m.group(1)])
            st = el.get('style')
            if st:
                el.set('style', re.sub(r"url\(['\"]?#([^'\")]+)['\"]?\)", lambda m: solid.get(m.group(1), m.group(0)), st))
        for parent in root.iter():
            for g in list(parent):
                if local(g.tag) in ('linearGradient', 'radialGradient'):
                    parent.remove(g)
    # Clips that only cut to the artboard (a rectangle over most of the drawing) do nothing visible: drop them, so the
    # art stays free of clip paths where possible (Ungroup and Warp handle plain shapes best).
    board = vb[2] * vb[3]
    for parent in root.iter():
        for cp in list(parent):
            if local(cp.tag) != 'clipPath':
                continue
            kids = list(cp)
            box = None
            if len(kids) == 1 and local(kids[0].tag) == 'rect':
                r = kids[0]
                box = float(r.get('width', 0)) * float(r.get('height', 0))
            elif len(kids) == 1 and local(kids[0].tag) == 'path':
                nums = [float(v) for v in re.findall(r'-?\d*\.?\d+', kids[0].get('d', ''))]
                cmds = re.sub(r'[^A-Za-z]', '', kids[0].get('d', ''))
                if cmds.lower() in ('mhvhz', 'mhvh', 'mvhvz') and len(nums) >= 5:
                    box = abs(nums[2] - (nums[0] if cmds[1] == 'H' else 0)) * abs(nums[3] - (nums[1] if cmds[2] == 'V' else 0)) if cmds[1] == 'H' else abs(nums[2]) * abs(nums[3])
            if box is not None and box >= 0.85 * board:
                cid = cp.get('id')
                parent.remove(cp)
                for el in root.iter():
                    if (el.get('clip-path') or '').replace(' ', '') in (f'url(#{cid})', f"url('#{cid}')"):
                        del el.attrib['clip-path']
                    st = el.get('style')
                    if st and f'#{cid}' in st:
                        el.set('style', re.sub(r'clip-path:\s*url\([^)]*\);?', '', st))
    carry = {k: root.get(k) for k in ('fill', 'stroke', 'stroke-width', 'style', 'opacity', 'fill-rule', 'stroke-linecap', 'stroke-linejoin', 'transform') if root.get(k)}
    inner = ''.join(ET.tostring(ch, encoding='unicode') for ch in root)
    inner = re.sub(r'\sxmlns(:\w+)?="[^"]*"', '', inner)
    inner = inner.replace('xlink:href=', 'href=').replace('ns0:', '').replace('ns1:', '')
    # Ids nothing refers to are dropped; the rest are made unique to this drawing.
    used = set(re.findall(r'url\(\s*[\'"]?#([^\'")\s]+)', inner)) | set(re.findall(r'href="#([^"]+)"', inner))
    inner = re.sub(r'\sid="([^"]+)"', lambda m: m.group(0) if m.group(1) in used else '', inner)
    ids = sorted(set(re.findall(r'\sid="([^"]+)"', inner)), key=len, reverse=True)
    pre = f'oa-{key}-'
    for i in ids:
        e = re.escape(i)
        inner = re.sub(rf'\sid="{e}"', f' id="{pre}{i}"', inner)
        inner = re.sub(rf'url\(\s*[\'"]?#{e}[\'"]?\s*\)', f'url(#{pre}{i})', inner)
        inner = re.sub(rf'href="#{e}"', f'href="#{pre}{i}"', inner)
    # Path data: absolute coordinates rounded to 0.1 (transform matrices and everything else are left exact).
    def squeeze(m):
        try:
            return f' d="{compact_path(m.group(1))}"'
        except (ValueError, IndexError):
            return m.group(0)
    inner = re.sub(r'\sd="([^"]*)"', squeeze, inner)
    if carry:
        inner = '<g ' + ' '.join(f'{k}="{v}"' for k, v in carry.items()) + '>' + inner + '</g>'
    inner = re.sub(r'#([0-9a-fA-F]{6})\b', lambda m: '#' + m.group(1).lower(), inner)
    return vb, inner


def main_colour(svg):
    counts = {}
    for c in re.findall(r'fill="(#[0-9a-f]{6})"', svg) + re.findall(r'fill:\s*(#[0-9a-f]{6})', svg) + re.findall(r'stop-color="(#[0-9a-f]{6})"', svg):
        r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
        if max(r, g, b) - min(r, g, b) < 18 and (r > 225 or r < 40):
            continue  # skip near-white/near-black and greys
        counts[c] = counts.get(c, 0) + 1
    return max(counts, key=counts.get) if counts else '#cccccc'


def main():
    packs_dir = sys.argv[1]
    meta = {pk: json.load(open(os.path.join(packs_dir, pk, 'pack.json')))['icons'] for pk in ('bioicons', 'reactome')}
    out = {}
    for key, spec in ART.items():
        pk, name, strip = spec[:3]
        drops = spec[3] if len(spec) > 3 else None
        entry = next(i for i in meta[pk] if i['name'] == name)
        folder = os.path.join(packs_dir, pk, 'svg')
        path = os.path.join(folder, entry['file'])
        if not os.path.exists(path):
            want = re.sub(r'[^a-z0-9]', '', entry['file'].lower())
            path = next(os.path.join(folder, f) for f in os.listdir(folder) if re.sub(r'[^a-z0-9]', '', f.lower()) == want)
        vb, svg = clean(path, key, strip, drops)
        author = entry.get('author', '')
        out[key] = {
            'vb': [round(v, 2) for v in vb], 'svg': svg, 'colour': main_colour(svg),
            'credit': {'name': entry['name'], 'author': author, 'license': entry.get('license', ''), 'pack': pk,
                       'attribution': ATTRIBUTION.get(author, author)},
        }
        print(f'{key:24} {len(svg) / 1024:6.1f} KB  {entry["license"]:10} {author}')
    js = ('// Generated by tools/build-organ-art.py from the bundled icon libraries. Do not edit by hand.\n'
          '// Professionally drawn organ illustrations (Servier Medical Art CC BY 3.0, Reactome CC BY 4.0, DBCLS CC BY 4.0,\n'
          '// Jan Clusmann CC0) used by the built-in anatomy icons; each entry carries its licence for File > Credits.\n'
          'globalThis.ORGAN_ART = ' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
    dest = os.path.join(os.path.dirname(__file__), '..', 'src', 'organart.js')
    open(dest, 'w').write(js)
    print('wrote', os.path.relpath(dest), f'{len(js) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
