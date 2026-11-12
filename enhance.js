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
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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
