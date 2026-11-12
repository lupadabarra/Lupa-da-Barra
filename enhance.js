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
      const c = el('button', 'pod p' + (i + 1) + (x.sinais ? ' alerta' : '')); c.type = 'button';
      const bar = el('div', 'pbar'); const fill = el('i'); fill.style.width = Math.max(4, x.pct) + '%'; bar.append(fill);
      c.append(el('div', 'pn', String(i + 1)), el('div', 'pname', x.fornecedor), el('div', 'pval', F.brl(x.valor)), bar, el('div', 'ppct', F.pct(x.pct) + ' de tudo o que foi contratado com fornecedores identificados'), x.sinais ? el('span', 'pflag', '⚑ ' + x.sinais + (x.sinais > 1 ? ' alertas' : ' alerta')) : el('span', 'pok', 'sem alerta'));
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
    g.append('stop').attr('offset', 0).attr('stop-color', '#b8c7e3'); g.append('stop').attr('offset', 1).attr('stop-color', '#d6dff0');
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
    const lg = el('div', 'chart-legend'); const a = el('span'); const ai = el('i'); ai.style.background = '#c3d0e8'; a.append(ai, document.createTextNode('Total contratado no mês (sem alerta)'));
    const b = el('span'); const bi = el('i'); bi.style.background = '#ef4444'; b.append(bi, document.createTextNode('Parte com alerta'));
    const semData = contratos().filter(c => !/^2026-\d\d/.test(c.data)).length;
    lg.append(a, b); if (semData) lg.append(el('span', null, semData + ' contrato(s) sem mês de 2026 informado (atas de dez/2025 ainda valendo ou sem data) não entram no gráfico.'));
    box.append(lg, det);
  });

  /* rosca: com ou sem concorrência */
  dash.draw('modDonut', box => {
    box.replaceChildren();
    const L = contratos().filter(c => +c.valor > 0);
    const G = [['Sem concorrência', c => c.modalidade === 'Inexigibilidade' || c.modalidade === 'Dispensa', '#e11d48'], ['Com concorrência', c => /Pregão|Concorrência/.test(c.modalidade), '#a9bde3'], ['Credenciamento', c => c.modalidade === 'Credenciamento', '#f59e0b'], ['Renovações', c => c.modalidade === 'Aditivo', '#c7d2fe'], ['Não informada', c => true, '#e2e8f0']];
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


  /* destaque: gasto com funcionários x limite da lei (últimos 6 meses) */
  const pesData = () => { const d = dash.data('pessoal'); return d.status === 'ok' && d.data && !Array.isArray(d.data) ? d.data : null; };
  const prevPct = () => { const d = dash.data('lrf'); const r = d.status === 'ok' && d.data ? d.data.find(x => x.id === 'pessoal') : null; return r ? r.pct : null; };
  dash.draw('pesHead', box => {
    box.replaceChildren();
    const P = pesData(); const pv = prevPct();
    const reais = P ? P.meses.filter(m => m.pct_rcl != null) : [];
    const k = (cls, n, t) => { const d = el('div', 'pk ' + cls); d.append(el('b', null, n), el('span', null, t)); box.append(d); };
    k('lim', '60%', 'é o máximo que o município (Prefeitura + Câmara) pode gastar com pessoal, sobre a receita corrente líquida. Alerta em 54% e limite prudencial em 57%.');
    if (pv != null) k('prev', F.pct(pv), 'é o que o orçamento de 2026 prevê gastar com pessoal (R$ 40,9 milhões), dentro do limite no papel.');
    k('real', reais.length ? F.pct(reais[reais.length - 1].pct_rcl) : 'sem dado', reais.length ? 'foi o gasto real no último mês publicado.' : 'é o que existe de gasto real publicado em 2026. A folha mês a mês não está aberta ao público.');
    const v = el('div', 'pes-verdict');
    if (reais.length) {
      const last = reais[reais.length - 1].pct_rcl;
      v.innerHTML = last > 60 ? '<strong>Passou do limite da lei.</strong> O gasto com pessoal está acima de 60% da receita.' : last > 57 ? '<strong>Acima do limite prudencial.</strong> A Prefeitura fica proibida de dar aumentos, criar cargos e contratar (LRF, art. 22).' : last > 54 ? '<strong>Acima do limite de alerta.</strong> O Tribunal de Contas deve alertar a Prefeitura (LRF, art. 59).' : '<strong>Dentro do limite</strong> no último mês publicado.';
    } else {
      v.innerHTML = '<strong>Hoje não dá para dizer se a folha passou do limite</strong>, e isso já é um problema. A Prefeitura é obrigada a publicar o Relatório de Gestão Fiscal a cada 4 meses (prazos: 30/05 e 30/09), mostrando o gasto com pessoal mês a mês (LRF, arts. 54 e 55). Esses relatórios de 2026 não foram encontrados em fonte aberta, e a folha mensal só aparece no portal Kalana, que bloqueia a leitura. Deixar de publicar o relatório no prazo é infração punida com multa de 30% dos vencimentos anuais de quem deu causa (Lei 10.028/2000, art. 5º).';
    }
    box.append(v);
  });
  dash.draw('pesChart', box => {
    box.replaceChildren();
    const P = pesData(); if (!P) return; const pv = prevPct();
    const items = [{lab: 'Previsto 2026', pct: pv, prev: true}].concat(P.meses.map(m => ({lab: MESES[+m.mes.slice(5, 7) - 1] + '/26', pct: m.pct_rcl})));
    const W = 720, H = 300, pl = 40, pr = 8, pt = 16, pb = 30;
    const x = d3.scaleBand().domain(items.map(i => i.lab)).range([pl, W - pr]).padding(.3);
    const y = d3.scaleLinear().domain([0, 70]).range([H - pb, pt]);
    const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Gasto com pessoal em relação ao limite da lei, últimos 6 meses');
    [0, 20, 40, 60].forEach(t => { svg.append('line').attr('x1', pl).attr('x2', W - pr).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', '#e9eef8'); svg.append('text').attr('x', pl - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').attr('style', 'font:11px Inter,sans-serif;fill:#7a879f').text(t + '%'); });
    svg.append('rect').attr('x', pl).attr('width', W - pr - pl).attr('y', y(70)).attr('height', y(60) - y(70)).attr('fill', 'rgba(239,68,68,.07)');
    [[60, '#ef4444', 'Máximo 60%', 1], [57, '#f97316', 'Prudencial 57%', .68], [54, '#f59e0b', 'Alerta 54%', .4]].forEach(([v, c, t, fx]) => {
      svg.append('line').attr('x1', pl).attr('x2', W - pr).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', c).attr('stroke-width', 2).attr('stroke-dasharray', v === 60 ? null : '6 5');
      svg.append('text').attr('x', pl + (W - pr - pl) * fx - 4).attr('y', y(v) - 5).attr('text-anchor', 'end').attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 4).attr('style', `font:600 11px Inter,sans-serif;fill:${c}`).text(t);
    });
    items.forEach(i => {
      const bx = x(i.lab), bw = x.bandwidth();
      if (i.pct != null) {
        const col = i.prev ? '#2563eb' : i.pct > 60 ? '#ef4444' : i.pct > 54 ? '#f59e0b' : '#10b981';
        svg.append('rect').attr('x', bx).attr('width', bw).attr('y', y(i.pct)).attr('height', y(0) - y(i.pct)).attr('rx', 8).attr('fill', col).attr('opacity', i.prev ? .9 : 1);
        svg.append('text').attr('x', bx + bw / 2).attr('y', y(i.pct) - 6).attr('text-anchor', 'middle').attr('style', "font:700 13px 'Space Grotesk',sans-serif;fill:#0b1b3a").text(F.pct(i.pct));
      } else {
        svg.append('rect').attr('x', bx).attr('width', bw).attr('y', y(45)).attr('height', y(0) - y(45)).attr('rx', 8).attr('fill', '#f5f8ff').attr('stroke', '#c9d5ee').attr('stroke-dasharray', '5 4');
        svg.append('text').attr('x', bx + bw / 2).attr('y', y(22)).attr('text-anchor', 'middle').attr('style', "font:700 20px 'Space Grotesk',sans-serif;fill:#9aa8c3").text('?');
        svg.append('text').attr('x', bx + bw / 2).attr('y', y(22) + 18).attr('text-anchor', 'middle').attr('style', 'font:10px Inter,sans-serif;fill:#9aa8c3').text('não publicado');
      }
      svg.append('text').attr('x', bx + bw / 2).attr('y', H - 9).attr('text-anchor', 'middle').attr('style', 'font:11px Inter,sans-serif;fill:#55627d').text(i.lab);
    });
    box.append(svg.node());
  });
  dash.draw('pesLegend', box => {
    box.replaceChildren();
    const r = el('div', 'row2');
    [['#ef4444', 'Máximo da lei: 60% (LRF, art. 19)'], ['#f97316', 'Prudencial: 57% (proíbe aumentos e contratações, art. 22)'], ['#f59e0b', 'Alerta: 54% (art. 59)']].forEach(([c, t]) => { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, document.createTextNode(t)); r.append(s); });
    box.append(r);
    box.append(el('span', null, 'Barra azul: o que o orçamento de 2026 prevê. Barras pontilhadas: meses cujo gasto real com funcionários não foi publicado. Quando a Prefeitura publicar, o gráfico se preenche sozinho na atualização automática.'));
    const ul = el('ul', 'plain');
    [['Peça a folha de pagamento mês a mês de maio a outubro de 2026, com o total gasto e o número de servidores efetivos, comissionados e contratados.'], ['Peça os Relatórios de Gestão Fiscal do 1º e 2º quadrimestres de 2026 (Anexo 1 – Despesa com Pessoal).']].forEach(([t]) => ul.append(el('li', null, t)));
    box.append(el('b', null, 'O que pedir pela Lei de Acesso à Informação:'), ul);
    const lk = el('div', 'chips'); [['https://kalana.com.br/transparencia/12263869000108/0000/servidores?m=false', 'Folha no portal Kalana ↗'], ['https://barradesaomiguel.al.gov.br/transparencia/lrf/', 'Página da LRF da Prefeitura ↗']].forEach(([u, t]) => { const a = el('a', 'chip act', t); a.href = u; a.target = '_blank'; a.rel = 'noopener'; lk.append(a); });
    box.append(lk);
  });

  dash.draw('colorKey', box => {
    box.replaceChildren();
    box.append(el('span', 'ck-t', 'Como ler as cores:'));
    [['ck-red', 'Vermelho', 'alerta grave: pede explicação'], ['ck-amb', 'Laranja', 'atenção: precisa conferir'], ['ck-neu', 'Cinza e azul', 'informação, sem problema encontrado']].forEach(([c, t, d]) => { const s = el('span', 'ck ' + c); s.append(el('b', null, t), document.createTextNode(' = ' + d)); box.append(s); });
  });


  /* gastos reais (empenhos e pagamentos) */
  const realData = () => { const d = dash.data('despesas_reais'); return d.status === 'ok' && d.data && !Array.isArray(d.data) ? d.data : null; };
  const brDate = s => s ? s.split('-').reverse().join('/') : '';
  const daysSince = s => Math.floor((Date.now() - new Date(s + 'T12:00:00-03:00').getTime()) / 864e5);
  dash.draw('reaisCamara', box => {
    box.replaceChildren();
    const D = realData(); if (!D || !D.camara) return; const C = D.camara;
    const head = el('div', 'rr-head'); head.append(el('h3', null, 'Câmara: últimos gastos publicados'), el('span', 'rr-sub', (+C.total_registros).toLocaleString('pt-BR') + ' empenhos no portal'));
    box.append(head);
    const late = daysSince(C.ultima_data);
    if (late > 3) {
      const a = el('div', 'rr-alert'); a.append(el('b', null, 'Portal parado há ' + late + ' dias'), document.createTextNode('O último gasto publicado pela Câmara é de ' + brDate(C.ultima_data) + '. A lei manda divulgar cada despesa em tempo real, até o primeiro dia útil depois do registro (LRF, art. 48-A, e Decreto 10.540/2020). Sem isso, ninguém sabe o que a Câmara gastou desde então.'));
      box.append(a);
    }
    const L = C.empenhos.slice().sort((a, b) => b.data.localeCompare(a.data) || b.empenho.localeCompare(a.empenho));
    const grp = d3.rollups(L, v => d3.sum(v, x => +x.valor), x => /folha/i.test(x.credor) ? 'Folha de pessoal' : /INSS/i.test(x.credor) ? 'Encargos (INSS)' : 'Fornecedores e serviços').sort((a, b) => b[1] - a[1]);
    const gs = el('div', 'rr-groups'); grp.forEach(([k, v]) => { const s = el('span'); s.append(document.createTextNode(k + ': '), el('b', null, F.brl(v))); gs.append(s); }); box.append(gs);
    const ul = el('ul', 'rr-list');
    L.forEach(x => { const li = el('li', +x.valor >= 10000 ? 'big' : ''); const cr = el('span', 'cr', x.credor); if (x.cnpj) cr.append(el('small', null, 'CNPJ ' + x.cnpj + ' · empenho ' + x.empenho)); else cr.append(el('small', null, 'empenho ' + x.empenho)); li.append(el('span', 'dt', brDate(x.data)), cr, el('span', 'vl', F.brl(+x.valor))); ul.append(li); });
    box.append(ul);
    const t = el('div', 'rr-tot'); t.append(el('span', null, L.length + ' lançamentos mostrados'), el('b', null, F.brl(d3.sum(L, x => +x.valor)))); box.append(t);
    box.append(el('p', 'note', 'Os lançamentos não trazem a descrição do gasto (o campo "histórico" vem vazio no portal), o que dificulta saber o que foi pago. Todo dia a atualização automática acrescenta os novos lançamentos que aparecerem.'));
    const lk = el('div', 'chips'); const a = el('a', 'chip act', 'Abrir despesas da Câmara ↗'); a.href = C.fonte; a.target = '_blank'; a.rel = 'noopener'; lk.append(a); box.append(lk);
  });
  /* Prefeitura: ranking dos maiores gastos, detalhes para o fiscal e lista completa */
  const NIV = {alerta: ['Alerta', 'nv-alerta'], atencao: ['Atenção', 'nv-atencao'], ok: ['Sem problema encontrado', 'nv-ok']};
  const brl2 = v => (+v).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  function gastoDetalhe(x, a) {
    const d = el('div', 'gd');
    if (a.titulo) d.append(el('div', 'gd-t', a.titulo));
    const row = (k, v) => { if (!v) return; const r = el('div', 'gd-r'); r.append(el('div', 'gd-k', k), el('div', 'gd-v', v)); d.append(r); };
    row('Quem recebe', x.credor + (x.cnpj ? ' (CNPJ ' + x.cnpj + ')' : ''));
    row('Quanto', brl2(x.valor) + ' reservados (empenho) em ' + brDate(x.data) + ' · ' + brl2(x.pago) + ' já pagos');
    row('Existe contrato?', a.contrato);
    row('Como foi contratado', a.como);
    row('O valor confere?', a.confere);
    row('Por que isso importa', a.problema);
    row('O que a lei diz', a.lei);
    if (a.conferir && a.conferir.length) { const r = el('div', 'gd-r'); r.append(el('div', 'gd-k', 'Documentos para pedir à Prefeitura')); const ol = el('ol'); a.conferir.forEach(c => ol.append(el('li', null, c))); const v = el('div', 'gd-v'); v.append(ol); r.append(v); d.append(r); }
    const lk = el('div', 'gd-links');
    (a.fontes || []).forEach((u, i) => { const l = el('a', null, 'Documento no Diário Oficial ' + (i + 1) + ' ↗'); l.href = u; l.target = '_blank'; l.rel = 'noopener'; lk.append(l); });
    if (x.fonte) { const l = el('a', null, 'Portal da Prefeitura (Kalana) ↗'); l.href = x.fonte; l.target = '_blank'; l.rel = 'noopener'; lk.append(l); }
    d.append(lk);
    d.append(el('p', 'gd-note', 'Isto é um sinal para conferir, não uma acusação. Com a Lei de Acesso à Informação (Lei 12.527/2011), qualquer pessoa pode pedir esses documentos à Prefeitura, que tem até 20 dias para responder.'));
    return d;
  }
  function gastoItem(x, a, pos) {
    const li = el('li', 'gi' + (a ? ' ' + NIV[a.nivel][1] : ''));
    const top = el('div', 'gi-top');
    if (pos) top.append(el('span', 'gi-pos', String(pos)));
    const mid = el('div', 'gi-mid');
    mid.append(el('div', 'gi-cr', x.credor));
    mid.append(el('div', 'gi-sub', brDate(x.data) + ' · ' + x.tipo + (x.pago > 0 ? ' · pago ' + F.brl(x.pago) : ' · ainda não pago')));
    top.append(mid, el('span', 'gi-vl', F.brl(x.valor)));
    li.append(top);
    if (a) {
      const bar = el('div', 'gi-bar');
      bar.append(el('span', 'gi-nv', NIV[a.nivel][0]));
      if (a.titulo) bar.append(el('span', 'gi-tt', a.titulo));
      const b = el('button', 'gi-btn', 'Ver detalhes'); b.type = 'button'; b.setAttribute('aria-expanded', 'false');
      let det = null;
      b.addEventListener('click', () => { if (det) { det.remove(); det = null; b.textContent = 'Ver detalhes'; b.setAttribute('aria-expanded', 'false'); return; } det = gastoDetalhe(x, a); li.append(det); b.textContent = 'Fechar detalhes'; b.setAttribute('aria-expanded', 'true'); });
      bar.append(b); li.append(bar);
    }
    return li;
  }
  dash.draw('reaisPref', box => {
    box.replaceChildren();
    const D = realData(); if (!D || !D.prefeitura) return; const P = D.prefeitura;
    const head = el('div', 'rr-head'); head.append(el('h3', null, 'Prefeitura: para onde vai o dinheiro'), el('span', 'rr-sub', P.total_registros ? (+P.total_registros).toLocaleString('pt-BR') + ' gastos registrados em 2026 · dados de ' + brDate(P.consultado_em) : 'portal Kalana')); box.append(head);
    if (!P.ranking || !P.ranking.length) {
      const a = el('div', 'rr-alert amb'); a.append(el('b', null, 'Os pagamentos da Prefeitura não estão abertos'), document.createTextNode('Ainda não foi possível ler os gastos no portal da Prefeitura.')); box.append(a);
    } else {
      if (P.totais_2026) {
        const T = P.totais_2026, g = el('div', 'gt');
        [['Reservado', T.empenhado, 'dinheiro separado para pagar compras, obras e serviços (empenho)'], ['Entregue', T.liquidado, 'o que a Prefeitura diz que já recebeu (liquidado)'], ['Pago', T.pago, 'o que já saiu do cofre da Prefeitura']].forEach(([k, v, n]) => { const c = el('div', 'gt-c'); c.append(el('div', 'gt-k', k + ' em 2026'), el('div', 'gt-v', F.mi(v)), el('div', 'gt-n', n)); g.append(c); });
        box.append(g);
      }
      box.append(el('h4', 'g-h', 'Os 20 maiores gastos do ano'));
      box.append(el('p', 'g-p', 'Cada linha é um gasto registrado pela Prefeitura em 2026, do maior para o menor. Os salários e encargos dos servidores ficam de fora daqui porque aparecem no destaque da folha, mais abaixo. Toque em "Ver detalhes" para saber se existe contrato, como a empresa foi escolhida e se o valor confere.'));
      const nAl = P.ranking.filter(x => x.analise && x.analise.nivel === 'alerta').length, nAt = P.ranking.filter(x => x.analise && x.analise.nivel === 'atencao').length;
      const lg = el('div', 'g-leg'); [['nv-alerta', nAl + ' com alerta'], ['nv-atencao', nAt + ' pedem atenção'], ['nv-ok', (P.ranking.length - nAl - nAt) + ' sem problema encontrado']].forEach(([c, t]) => { const s = el('span', c); s.append(el('i'), document.createTextNode(t)); lg.append(s); }); box.append(lg);
      const ul = el('ol', 'g-list'); P.ranking.forEach(x => ul.append(gastoItem(x, x.analise, x.posicao))); box.append(ul);
      if (P.destaques && P.destaques.length) {
        box.append(el('h4', 'g-h', 'Fora do ranking, mas merece atenção'));
        const u2 = el('ol', 'g-list'); P.destaques.forEach(x => u2.append(gastoItem(x, x.analise))); box.append(u2);
      }
      const more = el('div', 'g-more'); const btn = el('button', 'g-morebtn', 'Ver todos os ' + (+P.total_registros || '').toLocaleString('pt-BR') + ' gastos'); btn.type = 'button'; more.append(btn); box.append(more);
      btn.addEventListener('click', () => {
        btn.disabled = true; btn.textContent = 'Carregando…';
        fetch('data/empenhos_prefeitura_2026.json?v=' + Date.now()).then(r => r.json()).then(J => {
          more.replaceChildren();
          const AN = {}; (J.analises || []).forEach(a => { AN[a.empenho + '|' + a.cnpj + '|' + (+a.valor)] = a; });
          const rows = J.linhas.map(r => ({empenho: r[0], data: r[1], credor: r[2], cnpj: r[3], tipo: r[4], valor: r[5], liquidado: r[6], pago: r[7], fonte: J.fonte}));
          more.append(el('h4', 'g-h', 'Todos os gastos de 2026'));
          const tools = el('div', 'g-tools');
          const q = el('input', 'g-q'); q.type = 'search'; q.placeholder = 'Procurar empresa, pessoa ou tipo de gasto'; q.setAttribute('aria-label', 'Procurar nos gastos');
          const ord = el('select', 'g-ord'); [['valor', 'Maior valor primeiro'], ['data', 'Mais recentes primeiro']].forEach(([v, t]) => { const o = el('option', null, t); o.value = v; ord.append(o); }); ord.setAttribute('aria-label', 'Ordem');
          tools.append(q, ord); more.append(tools);
          const info = el('p', 'g-p'); const list = el('ol', 'g-list all'); const pager = el('button', 'g-morebtn', 'Ver mais'); pager.type = 'button';
          more.append(info, list, pager);
          let cur = [], shown = 0;
          const page = () => { cur.slice(shown, shown + 50).forEach(x => list.append(gastoItem(x, AN[x.empenho + '|' + x.cnpj + '|' + (+x.valor)]))); shown = Math.min(cur.length, shown + 50); pager.style.display = shown < cur.length ? '' : 'none'; pager.textContent = 'Ver mais (' + (cur.length - shown).toLocaleString('pt-BR') + ' restantes)'; };
          const run = () => {
            const t = q.value.trim().toLowerCase();
            cur = rows.filter(x => !t || (x.credor + ' ' + x.tipo + ' ' + x.cnpj + ' ' + x.empenho).toLowerCase().includes(t));
            cur.sort(ord.value === 'data' ? (a, b) => b.data.localeCompare(a.data) || b.valor - a.valor : (a, b) => b.valor - a.valor);
            list.replaceChildren(); shown = 0;
            info.textContent = cur.length.toLocaleString('pt-BR') + ' gastos · soma ' + F.brl(cur.reduce((s, x) => s + x.valor, 0)) + ' reservados, ' + F.brl(cur.reduce((s, x) => s + x.pago, 0)) + ' pagos';
            page();
          };
          let tm; q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(run, 200); }); ord.addEventListener('change', run); pager.addEventListener('click', page);
          run();
        }).catch(() => { btn.disabled = false; btn.textContent = 'Não foi possível carregar. Tentar de novo'; });
      });
      box.append(el('p', 'note', 'Fonte: planilha exportada do portal da transparência da Prefeitura (Kalana), com a Prefeitura e os fundos de Saúde, Educação e Assistência Social. O portal não diz a secretaria nem a descrição de cada gasto; os contratos foram procurados no Diário Oficial dos Municípios de Alagoas.'));
    }
    const lk = el('div', 'chips'); const a = el('a', 'chip act', 'Abrir despesas da Prefeitura (Kalana) ↗'); a.href = P.fonte; a.target = '_blank'; a.rel = 'noopener'; lk.append(a); box.append(lk);
  });

  /* destaque: quanto custa a folha por mês */
  const MESN = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  dash.draw('folhaMes', box => {
    box.replaceChildren();
    const D = realData(); const P = D && D.prefeitura; const M = P && P.folha_mensal; if (!M || !M.length) return;
    const pop = (() => { const m = dash.data('municipio'); return m.status === 'ok' && m.data && m.data[0] ? +m.data[0].populacao : 7944; })();
    const last = M[M.length - 1], mn = MESN[+last.mes.slice(5, 7) - 1];
    const media = M.reduce((s, m) => s + m.total, 0) / M.length;
    const hero = el('div', 'fm-hero');
    const h1 = el('div', 'fm-big'); h1.append(el('div', 'fm-k', 'Custo da folha da Prefeitura em ' + mn + ' de ' + last.mes.slice(0, 4)), el('div', 'fm-v', F.brl(last.total)), el('div', 'fm-n', 'salários, contratos temporários e encargos, num único mês'));
    const side = el('div', 'fm-side');
    [['Por morador, no mês', F.brl(last.total / pop)], ['Média por mês em 2026', F.brl(media)], ['Total de janeiro a ' + mn, F.mi(M.reduce((s, m) => s + m.total, 0))]].forEach(([k, v]) => { const c = el('div', 'fm-s'); c.append(el('div', 'fm-sk', k), el('div', 'fm-sv', v)); side.append(c); });
    hero.append(h1, side); box.append(hero);
    const parts = [['efetivos', 'Servidores efetivos e comissionados', '#2563eb'], ['contratados', 'Contratos temporários', '#f59e0b'], ['encargos', 'Encargos (INSS e previdência)', '#94a3b8'], ['outros', 'Gratificações e outros', '#14b8a6']];
    const legend = el('div', 'fm-leg'); parts.forEach(([, t, c]) => { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, document.createTextNode(t)); legend.append(s); }); box.append(legend);
    const max = Math.max(...M.map(m => m.total));
    const chart = el('div', 'fm-chart');
    M.forEach(m => {
      const col = el('div', 'fm-col'); const stack = el('div', 'fm-stack'); stack.style.height = (m.total / max * 100) + '%';
      parts.forEach(([k, t, c]) => { if (!m[k]) return; const seg = el('i'); seg.style.background = c; seg.style.height = (m[k] / m.total * 100) + '%'; seg.title = t + ': ' + F.brl(m[k]); stack.append(seg); });
      col.title = MESN[+m.mes.slice(5, 7) - 1] + ': ' + F.brl(m.total);
      col.append(el('div', 'fm-cv', (m.total / 1e6).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + ' mi'), stack, el('div', 'fm-cl', MESN[+m.mes.slice(5, 7) - 1].slice(0, 3)));
      chart.append(col);
    });
    box.append(chart);
    const sal = last.efetivos + last.contratados, pt = sal ? last.contratados / sal * 100 : 0;
    if (pt >= 30) {
      const o = el('div', 'fm-obs'); o.append(el('b', null, 'Quase ' + Math.round(pt) + '% dos salários vão para contratos temporários'),
        document.createTextNode('Em ' + mn + ', a Prefeitura gastou ' + F.brl(last.contratados) + ' com contratados temporários e ' + F.brl(last.efetivos) + ' com servidores efetivos e comissionados. A Constituição manda contratar por concurso público; o contrato temporário só é permitido para necessidade passageira e excepcional (art. 37, II e IX). Quando os temporários ficam ano após ano, isso pode indicar que o concurso está sendo evitado. Peça à Prefeitura: a lista de contratados temporários com cargo, data de início e a lei que autorizou cada contratação.'));
      box.append(o);
    }
    const sj = M.filter(m => m.sentencas > 100000);
    if (sj.length) box.append(el('p', 'note', 'Fora da conta acima: ' + sj.map(m => F.brl(m.sentencas) + ' em condenações judiciais ligadas a pessoal em ' + MESN[+m.mes.slice(5, 7) - 1]).join('; ') + '.'));
    box.append(el('p', 'note', 'Como calculamos: soma dos gastos com pessoal registrados a cada mês no portal da Prefeitura (Kalana). O mês atual só aparece depois que a Prefeitura registra a folha. O Relatório de Gestão Fiscal, mais abaixo, usa outra regra (soma de 12 meses) para comparar com o limite da lei.'));
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
