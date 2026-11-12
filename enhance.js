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


  /* manchetes do que não aparece */
  dash.draw('ocHead', box => {
    box.replaceChildren();
    const L = contratos(); if (!L.length) return;
    const n = L.length, semV = L.filter(c => /^Não identificado/.test(c.fornecedor || '')).length;
    const semVal = L.filter(c => !(+c.valor > 0)).length;
    const semObj = L.filter(c => /não descrit/i.test((c.objeto || '') + (c.alerta || ''))).length;
    const semObjV = d3.sum(L.filter(c => /não descrit/i.test((c.objeto || '') + (c.alerta || ''))), c => +c.valor);
    const card = (num, txt) => { const d = el('div', 'big'); d.append(el('b', null, num), el('span', null, txt)); box.append(d); };
    card(Math.round(semV / n * 100) + '%', 'dos ' + n + ' contratos encontrados não dizem quem ganhou (' + semV + ' contratos). O povo paga e não sabe a quem.');
    if (semObj) card(F.mi(semObjV), 'comprometidos em ' + semObj + ' contratos cuja publicação nem diz o que foi comprado.');
    if (semVal) card(String(semVal), semVal === 1 ? 'contrato publicado sem dizer quanto custa.' : 'contratos ou renovações publicados sem dizer quanto custam.');
  });

  /* busca e filtros na lista de contratos */
  dash.draw('ctrFilter', box => {
    box.replaceChildren();
    const inp = el('input'); inp.type = 'search'; inp.placeholder = 'Buscar: empresa, CNPJ, objeto, valor…'; inp.setAttribute('aria-label', 'Buscar contratos');
    const F_ = [['Todos', () => true], ['Com alerta', c => !!c.alerta], ['Sem concorrência', c => c.modalidade === 'Inexigibilidade' || c.modalidade === 'Dispensa'], ['Câmara', c => c.orgao === 'Câmara'], ['Sem vencedor', c => /^Não identificado/.test(c.fornecedor || '')]];
    let cur = 0;
    const cnt = el('div', 'cnt');
    const btns = F_.map(([t], i) => { const b = el('button', i ? '' : 'on', t); b.type = 'button'; b.addEventListener('click', () => { cur = i; btns.forEach((x, j) => x.classList.toggle('on', j === i)); apply(); }); return b; });
    const norm = s => String(s || '').toLowerCase().replace(/[()]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '');
    function apply() {
      const q = norm(inp.value).trim(); const byId = new Map(contratos().map(c => [c.id, c]));
      let shown = 0, tot = 0;
      document.querySelectorAll('#rank-contratacoes tbody tr.clk').forEach(tr => {
        const c = byId.get(tr.dataset.key); if (!c) return;
        const hay = norm([c.objeto, c.fornecedor, c.cnpj, c.categoria, c.modalidade, c.orgao, c.valor, F.brl(+c.valor || 0), c.alerta].join(' '));
        const ok = F_[cur][1](c) && (!q || q.split(/\s+/).every(w => hay.includes(w)));
        tr.style.display = ok ? '' : 'none';
        const nx = tr.nextElementSibling; if (nx && nx.classList.contains('detrow')) nx.style.display = ok ? '' : 'none';
        if (ok) { shown++; tot += +c.valor || 0; }
      });
      cnt.textContent = shown + ' contrato(s) · ' + F.brl(tot);
    }
    inp.addEventListener('input', apply);
    box.append(inp, ...btns, cnt);
    setTimeout(apply, 0);
  });

  /* baixar os dados */
  dash.draw('downloads', box => {
    box.replaceChildren();
    const csvBtn = el('button', 'chip act', 'Planilha de contratos (CSV) ↓'); csvBtn.type = 'button';
    csvBtn.addEventListener('click', () => {
      const cols = ['id', 'orgao', 'objeto', 'fornecedor', 'cnpj', 'categoria', 'modalidade', 'valor', 'tipo_valor', 'situacao', 'data', 'alerta', 'fonte'];
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const csv = '﻿' + cols.join(';') + '\n' + contratos().map(c => cols.map(k => q(k === 'valor' ? String(c[k]).replace('.', ',') : c[k])).join(';')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'})); a.download = 'lupa-da-barra-contratos.csv'; document.body.append(a); a.click(); a.remove();
    });
    box.append(csvBtn);
    [['data/contratacoes.json', 'Contratos (JSON)'], ['data/vereadores.json', 'Vereadores (JSON)'], ['data/orgao.json', 'Orçamento por secretaria (JSON)']].forEach(([u, t]) => { const a = el('a', 'chip act', t + ' ↓'); a.href = u; a.download = ''; box.append(a); });
  });


  /* gráfico mês a mês */
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  dash.draw('timeline', box => {
    box.replaceChildren();
    const L = contratos().filter(c => /^2026-\d\d/.test(c.data) && +c.valor > 0);
    const now = new Date(); const last = now.getFullYear() === 2026 ? now.getMonth() : 11;
    const rows = MESES.slice(0, last + 1).map((m, i) => { const mm = L.filter(c => +c.data.slice(5, 7) === i + 1); return {m, i, tot: d3.sum(mm, c => +c.valor), al: d3.sum(mm.filter(c => c.alerta), c => +c.valor), list: mm}; });
    const W = 720, H = 260, pl = 8, pr = 8, pt = 26, pb = 26;
    const x = d3.scaleBand().domain(rows.map(r => r.m)).range([pl, W - pr]).padding(.28);
    const y = d3.scaleLinear().domain([0, d3.max(rows, r => r.tot) || 1]).nice().range([H - pb, pt]);
    const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Valor contratado por mês em 2026');
    const defs = svg.append('defs'); const g = defs.append('linearGradient').attr('id', 'gb').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    g.append('stop').attr('offset', 0).attr('stop-color', '#2563eb'); g.append('stop').attr('offset', 1).attr('stop-color', '#06b6d4');
    y.ticks(4).forEach(t => svg.append('line').attr('x1', pl).attr('x2', W - pr).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', '#e9eef8'));
    const det = el('div', 'chart-det');
    const bars = svg.append('g');
    rows.forEach(r => {
      const gg = bars.append('g').attr('class', 'bar').attr('tabindex', 0).attr('role', 'button').attr('aria-label', r.m + ': ' + F.brl(r.tot));
      gg.append('rect').attr('x', x(r.m)).attr('width', x.bandwidth()).attr('y', y(r.tot)).attr('height', Math.max(0, y(0) - y(r.tot))).attr('rx', 6).attr('fill', 'url(#gb)');
      if (r.al > 0) gg.append('rect').attr('x', x(r.m)).attr('width', x.bandwidth()).attr('y', y(r.al)).attr('height', Math.max(0, y(0) - y(r.al))).attr('rx', 6).attr('fill', '#ef4444');
      if (r.tot > 0) gg.append('text').attr('class', 'vl').attr('x', x(r.m) + x.bandwidth() / 2).attr('y', y(r.tot) - 6).attr('text-anchor', 'middle').text(r.tot >= 1e6 ? (r.tot / 1e6).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + ' mi' : Math.round(r.tot / 1e3) + ' mil');
      gg.append('text').attr('class', 'axis').attr('x', x(r.m) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').append('tspan').attr('style', 'font-size:11px;fill:#7a879f').text(r.m);
      const open = () => { det.replaceChildren(); if (!r.list.length) { det.append(el('p', 'note', 'Nenhum contrato com data neste mês.')); return; } det.append(el('div', 'k', r.m + '/2026 · ' + r.list.length + ' contrato(s) · ' + F.brl(r.tot))); det.append(contractList(r.list)); };
      gg.on('click', open).on('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } });
    });
    box.append(svg.node());
    const lg = el('div', 'chart-legend'); const a = el('span'); const ai = el('i'); ai.style.background = 'linear-gradient(#2563eb,#06b6d4)'; a.append(ai, document.createTextNode('Total contratado no mês'));
    const b = el('span'); const bi = el('i'); bi.style.background = '#ef4444'; b.append(bi, document.createTextNode('Parte com alerta'));
    const semData = contratos().filter(c => !/^2026-\d\d/.test(c.data)).length;
    lg.append(a, b); if (semData) lg.append(el('span', null, semData + ' contrato(s) sem mês de 2026 informado (atas de dez/2025 ainda valendo ou sem data) não entram no gráfico.'));
    box.append(lg, det);
  });

  /* rosca: com ou sem concorrência */
  dash.draw('modDonut', box => {
    box.replaceChildren();
    const L = contratos().filter(c => +c.valor > 0);
    const G = [['Sem concorrência', c => c.modalidade === 'Inexigibilidade' || c.modalidade === 'Dispensa', '#ef4444'], ['Com concorrência', c => /Pregão|Concorrência/.test(c.modalidade), '#2563eb'], ['Credenciamento', c => c.modalidade === 'Credenciamento', '#06b6d4'], ['Renovações', c => c.modalidade === 'Aditivo', '#7c3aed'], ['Não informada', c => true, '#94a3b8']];
    const used = new Set(); const parts = G.map(([n, f, col]) => { const list = L.filter(c => !used.has(c.id) && f(c)); list.forEach(c => used.add(c.id)); return {n, col, list, v: d3.sum(list, c => +c.valor)}; }).filter(p => p.v > 0);
    const tot = d3.sum(parts, p => p.v);
    const S = 220, R = S / 2, svg = d3.create('svg').attr('viewBox', `0 0 ${S} ${S}`).attr('role', 'img').attr('aria-label', 'Divisão do valor contratado por forma de contratação');
    const arc = d3.arc().innerRadius(R * .62).outerRadius(R - 4).cornerRadius(6).padAngle(.02);
    const pie = d3.pie().value(p => p.v).sort(null);
    const gg = svg.append('g').attr('transform', `translate(${R},${R})`);
    const det = el('div', 'chart-det'); const list = el('div', 'dlist'); const btns = [];
    const sel = (i) => { btns.forEach((b, j) => b.classList.toggle('on', j === i)); gg.selectAll('path').attr('opacity', (d, j) => i == null || j === i ? 1 : .35); det.replaceChildren(); if (i != null) det.append(contractList(parts[i].list)); };
    gg.selectAll('path').data(pie(parts)).join('path').attr('d', arc).attr('fill', d => d.data.col).style('cursor', 'pointer').on('click', (ev, d) => sel(d.index));
    gg.append('text').attr('text-anchor', 'middle').attr('y', -4).attr('style', "font:700 22px 'Space Grotesk',sans-serif;fill:#0b1b3a").text(F.mi(tot));
    gg.append('text').attr('text-anchor', 'middle').attr('y', 16).attr('style', 'font:12px Inter,sans-serif;fill:#7a879f').text('contratados');
    parts.forEach((p, i) => { const b = el('button'); b.type = 'button'; const ic = el('i'); ic.style.background = p.col; b.append(ic, el('span', null, p.n + ' · ' + p.list.length), el('b', null, F.pct(p.v / tot * 100))); b.addEventListener('click', () => sel(btns[i].classList.contains('on') ? null : i)); btns.push(b); list.append(b); });
    const wrap = el('div', 'donut-wrap'); wrap.append(svg.node(), list); box.append(wrap, det);
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
    document.querySelectorAll('.hstat .hv, .sumline b, .ochead .big b').forEach(countUp);
    /* link direto para um alerta abre a análise */
    const hh = location.hash.slice(1);
    if (/^inc-/.test(hh)) { const t = document.getElementById(hh); if (t) setTimeout(() => { t.scrollIntoView({block: 'start'}); if (t.getAttribute('aria-expanded') !== 'true') t.click(); }, 300); }

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
