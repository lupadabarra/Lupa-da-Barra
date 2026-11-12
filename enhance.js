/* Lupa da Barra: recursos visuais extras (faixa de alertas, pódio, contadores, animações) */
(function () {
  const F = window.bsmFmt;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const contratos = () => { const d = dash.data('contratacoes'); return d.status === 'ok' ? d.data : []; };

  /* faixa corrida com os maiores alertas */
  dash.draw('ticker', box => {
    box.replaceChildren();
    const list = contratos().filter(c => c.alerta).sort((a, b) => +b.valor - +a.valor).slice(0, 14);
    if (!list.length) return;
    const track = el('div', 'tk-track');
    const make = () => list.forEach(c => {
      const a = el('a', 'tk-item'); a.href = '#inc-' + c.id;
      a.append(el('b', null, +c.valor > 0 ? F.mi(+c.valor).replace(' mi', ' mi') : 'valor oculto'), el('span', null, c.objeto.length > 70 ? c.objeto.slice(0, 68) + '…' : c.objeto));
      a.addEventListener('click', e => { e.preventDefault(); const t = document.getElementById('inc-' + c.id); if (t) { t.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'}); if (t.getAttribute('aria-expanded') !== 'true') t.click(); } });
      track.append(a);
    });
    make(); make();
    track.style.setProperty('--dur', (list.length * 6) + 's');
    const lbl = el('div', 'tk-label'); lbl.append(el('i'), el('span', null, 'Alertas'));
    box.append(lbl, track);
  });

  /* pódio dos 3 fornecedores que mais recebem */
  dash.draw('podium', box => {
    box.replaceChildren();
    const r = dash.data('rank_fornecedor');
    if (r.status !== 'ok' || !r.data || !r.data.length) return;
    r.data.slice(0, 3).forEach((x, i) => {
      const c = el('button', 'pod p' + (i + 1)); c.type = 'button';
      const bar = el('div', 'pbar'); const fill = el('i'); fill.style.width = Math.max(4, x.pct) + '%'; bar.append(fill);
      c.append(el('div', 'pn', String(i + 1)), el('div', 'pname', x.fornecedor), el('div', 'pval', F.brl(x.valor)), bar, el('div', 'ppct', F.pct(x.pct) + ' de tudo o que foi pago a fornecedores identificados' + (x.sinais ? ' · ⚑ tem alerta' : '')));
      c.addEventListener('click', () => {
        const row = [...document.querySelectorAll('#rank-fornecedores tbody tr.clk')].find(t => t.dataset.key === x.fornecedor);
        if (row) { row.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'}); if (row.getAttribute('aria-expanded') !== 'true') row.click(); }
      });
      box.append(c);
    });
  });

  /* contadores animados */
  function countUp(node) {
    const txt = node.textContent; const m = txt.match(/^(.*?)(\d{1,3}(?:\.\d{3})*(?:,\d+)?)(.*)$/);
    if (!m || reduce) return;
    const dec = (m[2].split(',')[1] || '').length;
    const target = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
    if (!isFinite(target) || target === 0) return;
    const t0 = performance.now(), dur = 1200;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      node.textContent = m[1] + (target * e).toLocaleString('pt-BR', {minimumFractionDigits: dec, maximumFractionDigits: dec}) + m[3];
      if (k < 1) requestAnimationFrame(step); else node.textContent = txt;
    };
    requestAnimationFrame(step);
  }

  dash.onData(() => {
    document.querySelectorAll('.hstat .hv, .sumline b').forEach(countUp);

    /* revelar ao rolar */
    const targets = document.querySelectorAll('.bsm .part, .bsm .card, .bsm .spot, .bsm .lrf, .bsm .ver, .bsm .inc, .bsm .tiles > *, .pod');
    if ('IntersectionObserver' in window && !reduce) {
      document.documentElement.classList.add('rv-on');
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), {rootMargin: '0px 0px -8% 0px'});
      targets.forEach((t, i) => { t.classList.add('rv'); t.style.transitionDelay = (i % 4) * 60 + 'ms'; io.observe(t); });
    }

    /* barra de progresso, menu ativo e botão de voltar ao topo */
    const bar = document.querySelector('.progress i'), top = document.querySelector('.totop');
    const links = [...document.querySelectorAll('.tb-nav a')];
    const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const onScroll = () => {
      const h = document.documentElement, p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (top) top.classList.toggle('show', h.scrollTop > 900);
      document.querySelector('.topbar').classList.toggle('solid', h.scrollTop > 40);
      let cur = null; secs.forEach(s => { if (s.getBoundingClientRect().top < 140) cur = s; });
      links.forEach(a => a.classList.toggle('on', cur && a.getAttribute('href') === '#' + cur.id));
      const on = links.find(a => a.classList.contains('on'));
      if (on && on !== window.__lastOn) { window.__lastOn = on; const nav = on.parentElement; nav.scrollTo({left: on.offsetLeft - nav.clientWidth / 2 + on.clientWidth / 2, behavior: 'smooth'}); }
    };
    addEventListener('scroll', onScroll, {passive: true}); onScroll();
    if (top) top.addEventListener('click', () => scrollTo({top: 0, behavior: reduce ? 'auto' : 'smooth'}));
  });
})();
