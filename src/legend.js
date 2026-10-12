// Figure legends (v1.9). Each page can carry its legend (Properties › Page › Figure legend), and the Check tab
// compares it with the figure: panel letters the legend mentions that aren't on the page, panels on the page the
// legend never describes, and panel letters out of reading order. The legend goes into the deposit bundle README.
(() => {
  const plain = (t) => String(t || '').replace(/\{[^|{}]*\||\}|[\^_]\{/g, '');
  // Panel letters on the page: lone capital letters (optionally with ")" or ".") set bold or large.
  function panelLetters(p) {
    const texts = p.objects.filter((o) => o.type === 'text' && !o.hidden);
    const sizes = texts.map((o) => o.fontSize || 16).sort((a, b) => a - b), median = sizes[Math.floor(sizes.length / 2)] || 16;
    return texts.map((o) => ({ o, m: /^\s*([A-Z])[).]?\s*$/.exec(plain(o.text)) })).filter(({ o, m }) => m && (o.bold || (o.fontSize || 16) >= median * 1.25)).map(({ o, m }) => ({ letter: m[1], o }));
  }
  // Letters the legend refers to: "(A)", "(B, C)", "(D and E)", "(F–H)", "(A,B)".
  function legendLetters(text) {
    const out = new Set();
    for (const m of String(text || '').matchAll(/\(([A-Z](?:\s*(?:[–—-]|,|and|&)\s*[A-Z])*)\)/g)) {
      const parts = m[1].split(/\s*(?:,|and|&)\s*/);
      for (const part of parts) {
        const r = /^([A-Z])\s*[–—-]\s*([A-Z])$/.exec(part.trim());
        if (r) for (let c = r[1].charCodeAt(0); c <= r[2].charCodeAt(0); c++) out.add(String.fromCharCode(c));
        else if (/^[A-Z]$/.test(part.trim())) out.add(part.trim());
      }
    }
    return out;
  }
  if (typeof checkFigure === 'function') {
    const prevCheck = checkFigure;
    checkFigure = async function (p = page()) {
      const r = await prevCheck(p);
      const panels = panelLetters(p), onPage = new Set(panels.map((x) => x.letter));
      if (p.legend && p.legend.trim()) {
        const mentioned = legendLetters(p.legend);
        for (const L of [...mentioned].sort()) if (!onPage.has(L) && onPage.size) r.issues.push({ sev: 'warn', kind: 'Legend', msg: `The legend describes (${L}) but there is no panel ${L} on this page.` });
        for (const { letter, o } of panels) if (!mentioned.has(letter) && mentioned.size) r.issues.push({ sev: 'warn', kind: 'Legend', id: o.id, msg: `Panel ${letter} isn't described in the legend.` });
      }
      // Reading order: rows top to bottom (letters within half a letter-height share a row), then left to right.
      const ordered = [...panels].sort((a, b) => (Math.abs(a.o.y - b.o.y) < Math.max(a.o.h, b.o.h) * 0.5 ? a.o.x - b.o.x : a.o.y - b.o.y)).map((x) => x.letter);
      const sorted = [...ordered].sort();
      if (ordered.length > 1 && ordered.join('') !== sorted.join('')) r.issues.push({ sev: 'info', kind: 'Legend', msg: `Panel letters read ${ordered.join(', ')} (top to bottom, left to right); journals expect ${sorted.join(', ')}.` });
      return r;
    };
  }
  const prevPageProps = renderPageProps;
  renderPageProps = function (P) {
    prevPageProps(P);
    const p = page();
    const ta = el('textarea', { rows: 6, placeholder: 'Figure 1. Title sentence. (A) … (B) …', value: p.legend || '', style: 'width:100%', oninput: (e) => { checkpoint('page:legend'); p.legend = e.target.value || undefined; markDirty(); } });
    P.append(sect('Figure legend', ta, el('div', { class: 'btnrow', style: 'margin-top:6px' }, btn('Copy', () => { navigator.clipboard.writeText(p.legend || ''); toast('Legend copied'); })),
      el('div', { class: 'note', textContent: 'The Check tab compares the legend with the panel letters on the page.' })));
  };
  if (typeof buildDepositBundle === 'function') {
    const prevBundle = buildDepositBundle;
    globalThis.buildDepositBundle = async (...a) => {
      const r = await prevBundle(...a);
      const legends = state.doc.pages.map((p, i) => (p.legend ? `### Page ${i + 1}${p.name ? ` (${p.name})` : ''}\n\n${p.legend.trim()}\n` : '')).filter(Boolean);
      if (legends.length) { const readme = await r.zip.file('README.md').async('string'); r.zip.file('README.md', readme + '\n## Figure legends\n\n' + legends.join('\n')); }
      return r;
    };
  }
  Object.assign(globalThis, { panelLetters, legendLetters });
})();
