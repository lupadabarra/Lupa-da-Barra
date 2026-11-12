/* Lupa da Barra: recursos visuais extras (faixa de alertas, pódio, contadores, animações) */
(function () {
  const F = window.bsmFmt;
  const ANO = window.LUPA_ANO || new Date().getFullYear();
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
    const L = contratos().filter(c => new RegExp('^' + ANO + '-\\d\\d').test(c.data) && +c.valor > 0);
    const now = new Date(); const last = now.getFullYear() === ANO ? now.getMonth() : 11;
    const rows = MESES.slice(0, last + 1).map((m, i) => { const mm = L.filter(c => +c.data.slice(5, 7) === i + 1); return {m, i, tot: d3.sum(mm, c => +c.valor), al: d3.sum(mm.filter(c => c.alerta), c => +c.valor), list: mm}; });
    const W = 720, H = 260, pl = 8, pr = 8, pt = 26, pb = 26;
    const x = d3.scaleBand().domain(rows.map(r => r.m)).range([pl, W - pr]).padding(.28);
    const y = d3.scaleLinear().domain([0, d3.max(rows, r => r.tot) || 1]).nice().range([H - pb, pt]);
    const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Valor contratado por mês em ' + ANO);
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
      const open = () => { det.replaceChildren(); if (!r.list.length) { det.append(el('p', 'note', 'Nenhum contrato com data neste mês.')); return; } det.append(el('div', 'k', r.m + '/' + ANO + ' · ' + r.list.length + ' contrato(s) · ' + F.brl(r.tot))); det.append(contractList(r.list)); };
      gg.on('click', open).on('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } });
    });
    box.append(svg.node());
    const lg = el('div', 'chart-legend'); const a = el('span'); const ai = el('i'); ai.style.background = '#c3d0e8'; a.append(ai, document.createTextNode('Total contratado no mês (sem alerta)'));
    const b = el('span'); const bi = el('i'); bi.style.background = '#ef4444'; b.append(bi, document.createTextNode('Parte com alerta'));
    const semData = contratos().filter(c => !new RegExp('^' + ANO + '-\\d\\d').test(c.data)).length;
    lg.append(a, b); if (semData) lg.append(el('span', null, semData + ' contrato(s) sem mês de ' + ANO + ' informado (de anos anteriores ainda valendo ou sem data) não entram no gráfico.'));
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
    if (pv != null) k('prev', F.pct(pv), 'é o que o orçamento de ' + ANO + ' prevê gastar com pessoal (R$ 40,9 milhões), dentro do limite no papel.');
    k('real', reais.length ? F.pct(reais[reais.length - 1].pct_rcl) : 'sem dado', reais.length ? 'foi o gasto real no último mês publicado.' : 'é o que existe de gasto real publicado em ' + ANO + '. A folha mês a mês não está aberta ao público.');
    const v = el('div', 'pes-verdict');
    if (reais.length) {
      const last = reais[reais.length - 1].pct_rcl;
      v.innerHTML = last > 60 ? '<strong>Passou do limite da lei.</strong> O gasto com pessoal está acima de 60% da receita.' : last > 57 ? '<strong>Acima do limite prudencial.</strong> A Prefeitura fica proibida de dar aumentos, criar cargos e contratar (LRF, art. 22).' : last > 54 ? '<strong>Acima do limite de alerta.</strong> O Tribunal de Contas deve alertar a Prefeitura (LRF, art. 59).' : '<strong>Dentro do limite</strong> no último mês publicado.';
    } else {
      v.innerHTML = '<strong>Hoje não dá para dizer se a folha passou do limite</strong>, e isso já é um problema. A Prefeitura é obrigada a publicar o Relatório de Gestão Fiscal a cada 4 meses (prazos: 30/05 e 30/09), mostrando o gasto com pessoal mês a mês (LRF, arts. 54 e 55). Esses relatórios do ano não foram encontrados em fonte aberta, e a folha mensal só aparece no portal Kalana, que bloqueia a leitura. Deixar de publicar o relatório no prazo é infração punida com multa de 30% dos vencimentos anuais de quem deu causa (Lei 10.028/2000, art. 5º).';
    }
    box.append(v);
  });
  dash.draw('pesChart', box => {
    box.replaceChildren();
    const P = pesData(); if (!P) return; const pv = prevPct();
    const items = [{lab: 'Previsto ' + ANO, pct: pv, prev: true}].concat(P.meses.map(m => ({lab: MESES[+m.mes.slice(5, 7) - 1] + '/' + m.mes.slice(2, 4), pct: m.pct_rcl})));
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
    box.append(el('span', null, 'Barra azul: o que o orçamento de ' + ANO + ' prevê. Barras pontilhadas: meses cujo gasto real com funcionários não foi publicado. Quando a Prefeitura publicar, o gráfico se preenche sozinho na atualização automática.'));
    const ul = el('ul', 'plain');
    [['Peça a folha de pagamento mês a mês de ' + (P && P.meses && P.meses.length ? MESES[+P.meses[0].mes.slice(5, 7) - 1].toLowerCase() + '/' + P.meses[0].mes.slice(0, 4) + ' a ' + MESES[+P.meses[P.meses.length - 1].mes.slice(5, 7) - 1].toLowerCase() + '/' + P.meses[P.meses.length - 1].mes.slice(0, 4) : 'os últimos 6 meses') + ', com o total gasto e o número de servidores efetivos, comissionados e contratados.'], ['Peça os Relatórios de Gestão Fiscal dos quadrimestres de ' + ANO + ' (Anexo 1 – Despesa com Pessoal).']].forEach(([t]) => ul.append(el('li', null, t)));
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
  const CAMX = [[/folha/i, 'Salários pagos pela Câmara (vereadores e servidores). O portal da Câmara divide a folha do mês em vários lançamentos, por isso aparecem valores diferentes no mesmo dia.', 'A Constituição proíbe a Câmara de gastar mais de 70% do que recebe com folha (art. 29-A, § 1º).'],
    [/INSS|seguro social/i, 'Contribuição que a Câmara paga ao INSS sobre os salários. É obrigatória.', 'Atraso nessa contribuição gera multa e juros pagos com dinheiro público.'],
    [/banco do brasil/i, 'Tarifa cobrada pelo banco onde a Câmara tem conta.', 'Valor pequeno; vale conferir se a Câmara negociou isenção de tarifas.'],
    [/equatorial|energia/i, 'Conta de energia elétrica do prédio da Câmara.', ''],
    [/telecom|veloo/i, 'Internet da Câmara (P S Telecom / Veloo Telecom). O contrato foi feito sem licitação em 2023 e prorrogado pela 3ª vez em outubro de 2026, sem o valor publicado no aditivo.', 'Internet é serviço comum, oferecido por várias empresas. Veja o alerta deste contrato na lista de contratos da Câmara.'],
    [/vereadores|UVEAL/i, 'Contribuição à União dos Vereadores do Estado de Alagoas, associação que reúne vereadores do estado.', 'Pagar associação com dinheiro público precisa de autorização em lei e de benefício claro para a Câmara.']];
  function camExplain(x, C) {
    const m = CAMX.find(([r]) => r.test(x.credor)) || [null, 'Gasto registrado pela Câmara com este credor.', ''];
    return {t: x.credor, v: F.brl(+x.valor), o: m[1], c: ['Empenho nº ' + x.empenho + ', registrado em ' + brDate(x.data) + '.', x.cnpj ? 'CNPJ do credor: ' + x.cnpj + '.' : 'O portal não informa CNPJ para este credor.', 'O portal da Câmara deixa vazio o campo "histórico", que deveria dizer para que foi o gasto.'], p: m[2] || 'A lei manda publicar cada gasto em tempo real e com a descrição do que foi pago (LRF, art. 48-A).', f: 'Portal da transparência da Câmara Municipal.', link: C.fonte, linkT: 'Abrir o portal da Câmara ↗'};
  }
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
    const GEXP = {'Folha de pessoal': 'Salários de vereadores e servidores da Câmara. O portal da Câmara divide a folha do mês em vários lançamentos.', 'Encargos (INSS)': 'Contribuição obrigatória da Câmara ao INSS sobre os salários que paga.', 'Fornecedores e serviços': 'Pagamentos a empresas e entidades: internet, energia, tarifas do banco, associações etc.'};
    const gs = el('div', 'rr-groups'); grp.forEach(([k, v]) => { const s = el('span'); s.append(document.createTextNode(k + ': '), el('b', null, F.brl(v))); xpd(s, {t: k + ' (Câmara)', v: F.brl(v), o: GEXP[k], c: 'Soma dos lançamentos desse tipo entre os ' + L.length + ' mostrados abaixo (os mais recentes publicados no portal da Câmara).', f: 'Portal da transparência da Câmara Municipal.', link: C.fonte, linkT: 'Abrir o portal da Câmara ↗'}); gs.append(s); }); box.append(gs);
    const ul = el('ul', 'rr-list');
    L.forEach(x => { const li = el('li', +x.valor >= 10000 ? 'big' : ''); const cr = el('span', 'cr', x.credor); if (x.cnpj) cr.append(el('small', null, 'CNPJ ' + x.cnpj + ' · empenho ' + x.empenho)); else cr.append(el('small', null, 'empenho ' + x.empenho)); li.append(el('span', 'dt', brDate(x.data)), cr, el('span', 'vl', F.brl(+x.valor))); xpd(li, () => camExplain(x, C)); ul.append(li); });
    box.append(ul);
    const t = el('div', 'rr-tot'); t.append(el('span', null, L.length + ' lançamentos mostrados'), el('b', null, F.brl(d3.sum(L, x => +x.valor)))); xpd(t, {t: 'Total dos lançamentos mostrados', v: F.brl(d3.sum(L, x => +x.valor)), o: 'Soma dos ' + L.length + ' gastos mais recentes que o portal da Câmara mostra na primeira página.', c: 'O portal da Câmara tem ' + (+C.total_registros).toLocaleString('pt-BR') + ' gastos registrados desde 2023, mas só mostra 10 de cada vez, sem permitir baixar tudo. Por isso aqui aparecem só os mais recentes de ' + ANO + '.', f: 'Portal da transparência da Câmara Municipal.', link: C.fonte, linkT: 'Abrir o portal da Câmara ↗'}); box.append(t);
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
  const TIPOX = [[/obras e instala/i, 'Construção ou reforma (obra).'], [/material de consumo/i, 'Compra de materiais que se gastam com o uso: combustível, remédios, alimentos, material de escritório, peças.'], [/outros servi.os de terceiros - pessoa jur/i, 'Serviço prestado por uma empresa: locação, manutenção, shows, transporte, consultoria etc.'], [/pessoa f.sica/i, 'Serviço prestado por uma pessoa física (sem empresa).'], [/consultoria/i, 'Contratação de consultoria ou assessoria.'], [/subven/i, 'Dinheiro repassado a uma entidade sem fins lucrativos (associação, instituto) para um serviço de interesse público.'], [/equipamento|permanente/i, 'Compra de equipamentos e móveis que duram anos.'], [/exerc.cios anteriores/i, 'Dívida de anos anteriores paga agora (despesa que não foi registrada no ano em que aconteceu).'], [/obriga..es tribut/i, 'Pagamento de impostos e contribuições.'], [/distribui..o gratuita/i, 'Compra de bens para doar à população (cestas, kits, materiais).'], [/tecnologia da informa/i, 'Sistemas, internet e serviços de informática.'], [/d.vida/i, 'Pagamento de dívida da Prefeitura.'], [/im.ve/i, 'Compra ou desapropriação de imóvel.'], [/aux.lio/i, 'Ajuda em dinheiro paga a pessoas (benefícios sociais).']];
  function gastoSimples(x) {
    const tp = (TIPOX.find(([r]) => r.test(x.tipo)) || [null, ''])[1];
    return {t: x.credor, v: F.brl(x.valor), o: 'Tipo de gasto: ' + x.tipo + '.' + (tp ? ' ' + tp : ''), c: ['Reservado (empenho) em ' + brDate(x.data) + ': ' + F.brl(x.valor) + '.', 'Dado como entregue (liquidado): ' + F.brl(x.liquidado) + '.', 'Já pago: ' + F.brl(x.pago) + '.', 'Número do empenho: ' + x.empenho + (x.cnpj ? ' · CNPJ ' + x.cnpj : '') + '.'], p: x.pago < x.liquidado ? 'Há ' + F.brl(x.liquidado - x.pago) + ' entregues e ainda não pagos: é dinheiro que a Prefeitura deve ao credor.' : 'Ainda não analisamos este gasto em detalhe. Se achar estranho, peça à Prefeitura a nota de empenho e o contrato, com base na Lei de Acesso à Informação.', f: 'Portal da transparência da Prefeitura (Kalana).', link: x.fonte || KALANA, linkT: 'Abrir o portal da Prefeitura ↗'};
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
    if (!a) xpd(top, () => gastoSimples(x));
    if (a) {
      const bar = el('div', 'gi-bar');
      bar.append(el('span', 'gi-nv', NIV[a.nivel][0]));
      if (a.titulo) bar.append(el('span', 'gi-tt', a.titulo));
      const b = el('button', 'gi-btn', 'Ver detalhes'); b.type = 'button'; b.setAttribute('aria-expanded', 'false');
      let det = null;
      b.addEventListener('click', () => { if (det) { det.remove(); det = null; b.textContent = 'Ver detalhes'; b.setAttribute('aria-expanded', 'false'); return; } det = gastoDetalhe(x, a); li.append(det); b.textContent = 'Fechar detalhes'; b.setAttribute('aria-expanded', 'true'); });
      bar.append(b); li.append(bar);
      top.classList.add('xp'); top.tabIndex = 0; top.setAttribute('role', 'button'); top.setAttribute('aria-label', x.credor + ', ' + F.brl(x.valor) + '. Toque para ver os detalhes.');
      top.addEventListener('click', () => b.click()); top.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } });
    }
    return li;
  }
  dash.draw('reaisPref', box => {
    box.replaceChildren();
    const D = realData(); if (!D || !D.prefeitura) return; const P = D.prefeitura;
    const head = el('div', 'rr-head'); head.append(el('h3', null, 'Prefeitura: para onde vai o dinheiro'), el('span', 'rr-sub', P.total_registros ? (+P.total_registros).toLocaleString('pt-BR') + ' gastos registrados em ' + ANO + ' · dados de ' + brDate(P.consultado_em) : 'portal Kalana')); box.append(head);
    if (!P.ranking || !P.ranking.length) {
      const a = el('div', 'rr-alert amb'); a.append(el('b', null, 'Os pagamentos da Prefeitura não estão abertos'), document.createTextNode('Ainda não foi possível ler os gastos no portal da Prefeitura.')); box.append(a);
    } else {
      if (P.totais_ano || P.totais_2026) {
        const T = P.totais_ano || P.totais_2026, g = el('div', 'gt');
        [['Reservado', T.empenhado, 'dinheiro separado para pagar compras, obras e serviços (empenho)'], ['Entregue', T.liquidado, 'o que a Prefeitura diz que já recebeu (liquidado)'], ['Pago', T.pago, 'o que já saiu do cofre da Prefeitura']].forEach(([k, v, n]) => { const c = el('div', 'gt-c'); c.append(el('div', 'gt-k', k + ' em ' + ANO), el('div', 'gt-v', F.mi(v)), el('div', 'gt-n', n));
          const XPT = {Reservado: {o: 'Empenho é a reserva do dinheiro: antes de comprar ou contratar, a Prefeitura separa o valor no orçamento. É o primeiro passo do gasto.', c: 'Soma da coluna "valor empenhado" de todos os gastos de ' + ANO + '.'}, Entregue: {o: 'Liquidação é quando a Prefeitura confere e declara que recebeu o produto, a obra ou o serviço. Só depois disso pode pagar.', c: 'Soma da coluna "valor liquidado" de todos os gastos de ' + ANO + '.'}, Pago: {o: 'É o dinheiro que de fato saiu da conta da Prefeitura para o fornecedor, o servidor ou o órgão.', c: 'Soma da coluna "valor pago" de todos os gastos de ' + ANO + '.'}}[k];
          xpd(c, {t: k + ' em ' + ANO, v: F.brl(v), o: XPT.o, c: XPT.c + ' São ' + (+P.total_registros).toLocaleString('pt-BR') + ' gastos de janeiro até ' + brDate(P.ultima_data) + ', da Prefeitura e dos fundos de Saúde, Educação e Assistência Social.', p: 'A diferença entre reservado e pago mostra quanto ainda está para ser pago. Gasto entregue e não pago pode virar dívida com o fornecedor.', f: 'Portal da transparência da Prefeitura (Kalana).', link: KALANA, linkT: 'Abrir o portal da Prefeitura ↗'});
          g.append(c); });
        box.append(g);
      }
      box.append(el('h4', 'g-h', 'Os 20 maiores gastos do ano'));
      box.append(el('p', 'g-p', 'Cada linha é um gasto registrado pela Prefeitura em ' + ANO + ', do maior para o menor. Os salários e encargos dos servidores ficam de fora daqui porque aparecem no destaque da folha, mais abaixo. Toque em "Ver detalhes" para saber se existe contrato, como a empresa foi escolhida e se o valor confere.'));
      const nAl = P.ranking.filter(x => x.analise && x.analise.nivel === 'alerta').length, nAt = P.ranking.filter(x => x.analise && x.analise.nivel === 'atencao').length;
      const lg = el('div', 'g-leg'); [['nv-alerta', nAl + ' com alerta'], ['nv-atencao', nAt + ' pedem atenção'], ['nv-ok', (P.ranking.length - nAl - nAt) + ' sem problema encontrado']].forEach(([c, t]) => { const s = el('span', c); s.append(el('i'), document.createTextNode(t)); xpd(s, {t: 'O que significam as cores', o: ['Vermelho (alerta): encontramos algo que não confere ou que a lei exige e não foi publicado, como contrato não localizado, número de contrato trocado ou empenho feito depois do serviço.', 'Laranja (atenção): o contrato existe, mas tem um ponto que vale acompanhar, como obra com muitos aditivos, parte da obra repassada a outra empresa ou objeto muito amplo.', 'Verde (sem problema encontrado): o contrato existe, foi por concorrência ou é uma obrigação legal, e o valor confere.'], p: 'As cores são sinais para conferir, não acusações. Toque em "Ver detalhes" em cada gasto para ver o motivo.'}); lg.append(s); }); box.append(lg);
      const ul = el('ol', 'g-list'); P.ranking.forEach(x => ul.append(gastoItem(x, x.analise, x.posicao))); box.append(ul);
      if (P.destaques && P.destaques.length) {
        box.append(el('h4', 'g-h', 'Fora do ranking, mas merece atenção'));
        const u2 = el('ol', 'g-list'); P.destaques.forEach(x => u2.append(gastoItem(x, x.analise))); box.append(u2);
      }
      const more = el('div', 'g-more'); const btn = el('button', 'g-morebtn', 'Ver todos os ' + (+P.total_registros || '').toLocaleString('pt-BR') + ' gastos'); btn.type = 'button'; more.append(btn); box.append(more);
      btn.addEventListener('click', () => {
        btn.disabled = true; btn.textContent = 'Carregando…';
        fetch((P.arquivo_empenhos || ('data/empenhos_prefeitura_' + ANO + '.json')) + '?v=' + Date.now()).then(r => r.json()).then(J => {
          more.replaceChildren();
          const AN = {}; (J.analises || []).forEach(a => { AN[a.empenho + '|' + a.cnpj + '|' + (+a.valor)] = a; });
          const rows = J.linhas.map(r => ({empenho: r[0], data: r[1], credor: r[2], cnpj: r[3], tipo: r[4], valor: r[5], liquidado: r[6], pago: r[7], fonte: J.fonte}));
          more.append(el('h4', 'g-h', 'Todos os gastos de ' + ANO));
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
  window.lupaFolhaMes = (m, pop) => { const mn = MESN[+m.mes.slice(5, 7) - 1]; return {t: 'Folha de ' + mn + ' de ' + m.mes.slice(0, 4), v: F.brl(m.total), o: 'Quanto a Prefeitura gastou com quem trabalha para ela neste mês.', c: [F.brl(m.efetivos) + ' com servidores efetivos e comissionados', F.brl(m.contratados) + ' com contratados temporários', F.brl(m.encargos) + ' de encargos (INSS e previdência)', F.brl(m.outros) + ' de gratificações e outros', 'Total: ' + F.brl(m.total) + ' (' + F.brl(m.total / pop) + ' por morador). Já pago: ' + F.brl(m.pago) + '.'].concat(m.sentencas ? ['Fora da conta: ' + F.brl(m.sentencas) + ' de condenações judiciais ligadas a pessoal.'] : []), f: 'Portal da transparência da Prefeitura (Kalana), gastos de pessoal registrados no mês.', link: KALANA, linkT: 'Abrir o portal da Prefeitura ↗'}; };
  const lupaFolhaMes = (m, pop) => window.lupaFolhaMes(m, pop);
  dash.draw('folhaMes', box => {
    box.replaceChildren();
    const D = realData(); const P = D && D.prefeitura; const M = P && P.folha_mensal; if (!M || !M.length) return;
    const pop = (() => { const m = dash.data('municipio'); return m.status === 'ok' && m.data && m.data[0] ? +m.data[0].populacao : 7944; })();
    const last = M[M.length - 1], mn = MESN[+last.mes.slice(5, 7) - 1];
    const media = M.reduce((s, m) => s + m.total, 0) / M.length;
    const hero = el('div', 'fm-hero');
    const h1 = el('div', 'fm-big'); h1.append(el('div', 'fm-k', 'Custo da folha da Prefeitura em ' + mn + ' de ' + last.mes.slice(0, 4)), el('div', 'fm-v', F.brl(last.total)), el('div', 'fm-n', 'salários, contratos temporários e encargos, num único mês'));
    const side = el('div', 'fm-side');
    [['Por morador, no mês', F.brl(last.total / pop)], ['Média por mês em ' + ANO, F.brl(media)], ['Total de janeiro a ' + mn, F.mi(M.reduce((s, m) => s + m.total, 0))]].forEach(([k, v]) => { const c = el('div', 'fm-s'); c.append(el('div', 'fm-sk', k), el('div', 'fm-sv', v)); side.append(c); });
    const L0 = last; xpd(h1, () => lupaFolhaMes(L0, pop));
    [...side.children].forEach((c, i) => xpd(c, i === 0 ? {t: 'Folha por morador', v: F.brl(last.total / pop), o: 'O custo da folha do mês dividido pelo número de moradores.', c: F.brl(last.total) + ' ÷ ' + pop.toLocaleString('pt-BR') + ' moradores (IBGE, Censo 2022).', p: 'Ajuda a comparar com outras cidades do mesmo tamanho.'} : i === 1 ? {t: 'Média por mês em ' + ANO, v: F.brl(media), o: 'Quanto a folha custou, em média, a cada mês do ano.', c: 'Soma da folha de ' + M.length + ' meses ÷ ' + M.length + '.', p: 'Meses com 13º, férias ou pagamento de encargos atrasados ficam acima da média (janeiro e maio, por exemplo).'} : {t: 'Folha de janeiro a ' + mn, v: F.brl(M.reduce((s, m) => s + m.total, 0)), o: 'Tudo o que a Prefeitura gastou com pessoal no ano até agora.', c: 'Soma da folha de cada mês, de janeiro a ' + mn + '.', f: 'Portal da transparência da Prefeitura (Kalana).'}));
    hero.append(h1, side); box.append(hero);
    const parts = [['efetivos', 'Servidores efetivos e comissionados', '#2563eb'], ['contratados', 'Contratos temporários', '#f59e0b'], ['encargos', 'Encargos (INSS e previdência)', '#94a3b8'], ['outros', 'Gratificações e outros', '#14b8a6']];
    const PEXP = {efetivos: 'Salário de quem entrou por concurso (efetivo) e de quem ocupa cargo de confiança indicado pelo prefeito (comissionado). No portal aparece como "vencimentos e vantagens fixas".', contratados: 'Salário de quem foi contratado por tempo determinado, sem concurso. A Constituição só permite isso para necessidade passageira e excepcional (art. 37, IX).', encargos: 'Contribuição que a Prefeitura, como patrão, paga ao INSS ou ao regime de previdência sobre os salários. É obrigatória.', outros: 'Gratificações, horas extras, adicionais e outras despesas variáveis com pessoal.'};
    const legend = el('div', 'fm-leg'); parts.forEach(([k, t, c]) => { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, document.createTextNode(t)); xpd(s, {t: t, v: F.brl(last[k]) + ' em ' + mn, o: PEXP[k], c: 'Soma dos gastos desse tipo registrados em ' + mn + '. No gráfico, é a parte desta cor em cada barra.', f: 'Portal da transparência da Prefeitura (Kalana).'}); legend.append(s); }); box.append(legend);
    const max = Math.max(...M.map(m => m.total));
    const chart = el('div', 'fm-chart');
    M.forEach(m => {
      const col = el('div', 'fm-col'); const stack = el('div', 'fm-stack'); stack.style.height = (m.total / max * 100) + '%';
      parts.forEach(([k, t, c]) => { if (!m[k]) return; const seg = el('i'); seg.style.background = c; seg.style.height = (m[k] / m.total * 100) + '%'; seg.title = t + ': ' + F.brl(m[k]); stack.append(seg); });
      col.title = MESN[+m.mes.slice(5, 7) - 1] + ': ' + F.brl(m.total); const mm = m; xpd(col, () => lupaFolhaMes(mm, pop)); col.setAttribute('aria-label', 'Folha de ' + MESN[+m.mes.slice(5, 7) - 1] + ': ' + F.brl(m.total) + '. Toque para ver a composição.');
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

  /* ================= tudo clicável: janela "o que é este número?" ================= */
  const POPN = () => { const m = dash.data('municipio'); return m.status === 'ok' && m.data && m.data[0] ? +m.data[0].populacao : 7944; };
  const PREF = () => { const D = realData(); return D && D.prefeitura ? D.prefeitura : null; };
  let sheet = null, lastFocus = null;
  function closeSheet() { if (!sheet) return; sheet.remove(); sheet = null; document.body.classList.remove('xp-open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  window.lupaExplain = function (x) {
    closeSheet(); lastFocus = document.activeElement;
    sheet = el('div', 'xp-ov'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', x.t || 'Explicação');
    const card = el('div', 'xp-card');
    const close = el('button', 'xp-x', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Fechar'); close.addEventListener('click', closeSheet);
    card.append(close, el('div', 'xp-k', x.t || ''));
    if (x.v) card.append(el('div', 'xp-v', x.v));
    const sec = (k, v) => { if (!v) return; const d = el('div', 'xp-s'); d.append(el('div', 'xp-sk', k)); if (Array.isArray(v)) { const ul = el('ul'); v.forEach(i => ul.append(el('li', null, i))); d.append(ul); } else d.append(el('p', null, v)); card.append(d); };
    sec('O que é', x.o); sec('Como chegamos a este número', x.c); sec('Por que importa', x.p); sec('De onde vem', x.f);
    const act = el('div', 'xp-act');
    if (x.link) { const a = el('a', 'xp-b2', x.linkT || 'Abrir a fonte ↗'); a.href = x.link; a.target = '_blank'; a.rel = 'noopener'; act.append(a); }
    if (x.go) { const b = el('button', 'xp-b', x.goT || 'Ver os detalhes'); b.type = 'button'; b.addEventListener('click', () => { closeSheet(); openSection(x.go, true); }); act.append(b); }
    const ok = el('button', 'xp-b2', 'Entendi'); ok.type = 'button'; ok.addEventListener('click', closeSheet); act.append(ok);
    card.append(act); sheet.append(card);
    sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
    document.body.append(sheet); document.body.classList.add('xp-open'); close.focus();
  };
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  const txt = n => (n && n.textContent || '').trim();
  const KALANA = 'https://www.kalana.com.br/transparencia/12263869000108/0000/despesas?m=false';
  const FONTE_CTR = 'Extratos do Diário Oficial dos Municípios de Alagoas, Portal Nacional de Contratações Públicas (por meio de agregadores) e imprensa. Cada contrato tem o link do documento na lista de contratos.';
  const FONTE_LOA = 'Lei Orçamentária Anual (LOA) ' + ANO + ' do município, aprovada pela Câmara.';
  const EXPL = {
    lastUpd: n => ({t: 'Última atualização', v: txt(n), o: 'Data e hora em que o Lupa da Barra buscou os dados pela última vez.', c: 'Todo dia, de manhã cedo, uma rotina automática consulta os portais da Prefeitura e da Câmara, o Diário Oficial e o Tesouro Nacional e atualiza o site.', f: 'Portais oficiais listados na seção "Fontes e palavras".', go: '#fontes', goT: 'Ver as fontes'}),
    h_pago: n => { const P = PREF(); const T = P && (P.totais_ano || P.totais_2026); return {t: 'Prefeitura já pagou em ' + ANO, v: txt(n), o: 'Todo o dinheiro que já saiu do cofre da Prefeitura em ' + ANO + ' para pagar fornecedores, obras, serviços, salários e encargos.', c: T ? 'Somamos a coluna "valor pago" de ' + (+P.total_registros).toLocaleString('pt-BR') + ' gastos registrados de janeiro até ' + brDate(P.ultima_data) + '. Além disso, ' + F.mi(T.empenhado) + ' já foram reservados (empenhados) e ' + F.mi(T.liquidado) + ' foram dados como entregues.' : '', p: 'É o gasto de verdade, diferente do orçamento (que é só a previsão). Equivale a ' + (T ? F.brl(T.pago / POPN()) : '—') + ' por morador.', f: 'Portal da transparência da Prefeitura (Kalana), planilha de despesas de ' + ANO + '.', link: KALANA, linkT: 'Abrir o portal da Prefeitura ↗', go: '#gastos-reais', goT: 'Ver os maiores gastos'}; },
    h_folha: n => { const P = PREF(); const M = P && P.folha_mensal; const L = M && M[M.length - 1]; return {t: 'Folha da Prefeitura no mês', v: txt(n), o: 'Quanto a Prefeitura gastou num único mês com quem trabalha para ela: servidores efetivos e comissionados, contratados temporários e os encargos (INSS e previdência).', c: L ? 'Somamos os gastos de pessoal registrados em ' + MESN[+L.mes.slice(5, 7) - 1] + ': ' + F.brl(L.efetivos) + ' com efetivos e comissionados, ' + F.brl(L.contratados) + ' com temporários, ' + F.brl(L.encargos) + ' de encargos e ' + F.brl(L.outros) + ' de gratificações e outros.' : '', p: 'É o maior gasto fixo da Prefeitura. A lei limita quanto pode ser gasto com pessoal.', f: 'Portal da transparência da Prefeitura (Kalana).', link: KALANA, linkT: 'Abrir o portal da Prefeitura ↗', go: '#pessoal', goT: 'Ver a folha mês a mês'}; },
    h_inc: n => ({t: 'Contratos com alerta', v: txt(n), o: 'Soma dos contratos da Prefeitura e da Câmara que marcamos com um sinal de alerta: sem concorrência para serviço comum, valor alto para uma cidade de 8 mil moradores, valor não publicado, fornecedor pessoa física ou valores que não conferem.', c: 'Somamos o valor de cada contrato marcado com alerta na lista de contratos. Contratos sem valor publicado entram com zero.', p: 'Não é prova de irregularidade: são os casos que a Prefeitura e a Câmara precisam explicar.', f: FONTE_CTR, go: '#incomuns', goT: 'Ver os alertas'}),
    h_inc_qtd: n => ({t: 'Quantidade de contratos com alerta', v: txt(n), o: 'Número de contratos marcados com algum sinal de alerta.', c: 'Contamos os contratos da lista que têm um alerta.', f: FONTE_CTR, go: '#incomuns', goT: 'Ver os alertas'}),
    h_cam: n => ({t: 'Câmara: orçamento ' + ANO, v: txt(n), o: 'Quanto a Câmara de Vereadores pode gastar em ' + ANO + ', segundo o orçamento. O dinheiro vem da Prefeitura, em parcelas mensais (o chamado duodécimo).', c: 'Valor fixado para a Câmara Municipal na lei do orçamento.', p: 'A Constituição limita esse repasse (art. 29-A) e manda a Câmara gastar no máximo 70% dele com folha.', f: FONTE_LOA, go: '#camara', goT: 'Ver a Câmara'}),
    h_total: n => ({t: 'Orçamento da Prefeitura em ' + ANO, v: txt(n), o: 'Quanto a Prefeitura pode gastar no ano, segundo a lei do orçamento. É uma previsão, não o gasto real.', c: 'Soma de todas as áreas de governo (saúde, educação, urbanismo etc.) na lei do orçamento.', f: FONTE_LOA, go: '#prefeitura', goT: 'Ver para onde vai'}),
    h_pc: n => ({t: 'Orçamento por morador', v: txt(n), o: 'O orçamento dividido pelo número de moradores.', c: 'Orçamento total ÷ ' + POPN().toLocaleString('pt-BR') + ' moradores (IBGE, Censo 2022).', f: FONTE_LOA + ' População: IBGE.'}),
    h_sem: n => ({t: 'Contratado sem concorrência', v: txt(n), o: 'Valor dos contratos feitos sem disputa entre empresas (dispensa ou inexigibilidade de licitação).', c: 'Soma dos contratos com modalidade "Dispensa" ou "Inexigibilidade".', p: 'A regra é licitar. Contratar direto só vale nos casos que a Lei 14.133/2021 lista, com justificativa.', f: FONTE_CTR, go: '#contratacoes', goT: 'Ver os contratos'}),
    i_total: n => EXPL.h_inc(n),
    i_pct: n => ({t: 'Parte do dinheiro com alerta', v: txt(n), o: 'Quanto do valor de todos os contratos levantados está nos contratos com alerta.', c: 'Valor dos contratos com alerta ÷ valor de todos os contratos levantados × 100.', f: FONTE_CTR}),
    i_sem: n => ({t: 'Alertas sem concorrência', v: txt(n), o: 'Entre os contratos com alerta, quantos foram feitos sem disputa entre empresas.', c: 'Contamos os contratos com alerta cuja modalidade é dispensa ou inexigibilidade.', f: FONTE_CTR}),
    c_qtd: n => ({t: 'Contratos encontrados', v: txt(n), o: 'Quantos contratos, atas, aditivos e editais de ' + ANO + ' (ou de anos anteriores ainda valendo) encontramos para a Prefeitura e a Câmara.', c: 'Contagem da lista de contratos. Registros vencidos ou repetidos são retirados.', f: FONTE_CTR, go: '#contratacoes', goT: 'Ver a lista'}),
    c_total: n => ({t: 'Valor dos contratos encontrados', v: txt(n), o: 'Soma dos valores de todos os contratos levantados.', c: 'Soma da lista de contratos. Quando parte de um credenciamento já virou contrato, só o saldo é contado, para não contar o mesmo dinheiro duas vezes.', p: 'Contrato não é pagamento: é o máximo que pode ser gasto. O que foi pago de fato está em "Gastos da Prefeitura".', f: FONTE_CTR}),
    c_sem: n => EXPL.h_sem(n),
    c_sem_pct: n => ({t: 'Parte sem concorrência', v: txt(n), o: 'Quanto do dinheiro contratado foi sem disputa entre empresas.', c: 'Valor dos contratos por dispensa ou inexigibilidade ÷ valor total dos contratos × 100.', f: FONTE_CTR}),
    f_top: n => ({t: 'Fornecedor que mais recebe', v: txt(n), o: 'A empresa com o maior valor somado de contratos identificados.', c: 'Somamos os contratos de cada fornecedor e ordenamos do maior para o menor.', f: FONTE_CTR, go: '#contratacoes', goT: 'Ver o ranking'}),
    f_top_pct: n => ({t: 'Parte do fornecedor que mais recebe', v: txt(n), o: 'Quanto do valor contratado com fornecedores identificados ficou com o primeiro colocado.', c: 'Valor do primeiro ÷ valor de todos os fornecedores identificados × 100.', f: FONTE_CTR}),
    f_top3_pct: n => ({t: 'Parte dos três que mais recebem', v: txt(n), o: 'Quanto do valor contratado ficou com os três maiores fornecedores juntos.', c: 'Soma dos três primeiros ÷ total dos fornecedores identificados × 100.', p: 'Quando poucos fornecedores ficam com quase tudo, vale perguntar se houve concorrência de verdade.', f: FONTE_CTR}),
    t_laz: n => ({t: 'Esporte, cultura, turismo e comércio', v: txt(n), o: 'Parte do orçamento de ' + ANO + ' reservada para esporte e lazer, cultura e comércio e serviços (onde entram turismo e eventos).', c: 'Soma dessas três áreas ÷ orçamento total × 100.', f: FONTE_LOA}),
    o_esp: n => ({t: 'Secretaria de Esportes, Cultura e Eventos', v: txt(n), o: 'Quanto o orçamento de ' + ANO + ' reserva para essa secretaria.', c: 'Valor fixado para a secretaria na lei do orçamento.', f: FONTE_LOA}),
    o_soc: n => ({t: 'Assistência social', v: txt(n), o: 'Quanto o orçamento de ' + ANO + ' reserva para a Secretaria de Desenvolvimento Social, Trabalho e Habitação.', c: 'Valor fixado para a secretaria na lei do orçamento.', p: 'Comparar as duas ajuda a ver as prioridades da Prefeitura.', f: FONTE_LOA}),
    f_urb: n => ({t: 'Urbanismo', v: txt(n), o: 'Quanto o orçamento de ' + ANO + ' reserva para urbanismo (ruas, praças, iluminação, obras urbanas).', c: 'Valor fixado para a área na lei do orçamento.', f: FONTE_LOA})
  };
  const XP_DRAWS = Object.keys(EXPL);
  function markScalars() {
    XP_DRAWS.forEach(k => document.querySelectorAll('[data-draw="' + k + '"]').forEach(n => {
      if (n.closest('[data-xp]') && n.closest('[data-xp]') !== n) return;
      if (n.closest('a')) { const a = n.closest('a'); if (!a.dataset.xp) { a.dataset.xp = k; } return; }
      n.dataset.xp = k;
    }));
    document.querySelectorAll('[data-xp]').forEach(n => { if (n.__xpOk) return; n.__xpOk = true; n.classList.add('xp'); if (!/^(A|BUTTON)$/.test(n.tagName)) { n.tabIndex = 0; n.setAttribute('role', 'button'); } n.setAttribute('aria-label', (n.getAttribute('aria-label') || txt(n)) + ' — toque para entender'); });
  }
  const xpFor = n => { if (n.__xp) return typeof n.__xp === 'function' ? n.__xp() : n.__xp; const k = n.dataset.xp; const f = EXPL[k]; if (!f) return null; const val = n.querySelector('[data-draw="' + k + '"]') || n.querySelector('.hv') || n; const r = f(val); if (n.dataset.go && !r.go) r.go = n.dataset.go; return r; };
  document.addEventListener('click', e => {
    const n = e.target.closest('[data-xp], .xpd');
    if (!n || e.target.closest('.xp-ov')) return;
    if (e.target.closest('a[href]:not([data-xp])') && !n.matches('a')) return;
    const x = xpFor(n); if (!x) return;
    e.preventDefault(); e.stopPropagation(); lupaExplain(x);
  }, true);
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-xp], .xpd')) { const x = xpFor(e.target); if (x) { e.preventDefault(); lupaExplain(x); } } });
  /* torna um elemento gerado aqui explicável */
  const xpd = (n, x) => { n.classList.add('xpd', 'xp'); n.__xp = x; n.tabIndex = 0; n.setAttribute('role', 'button'); return n; };
  window.lupaXp = xpd;

  /* números novos do topo */
  dash.draw('h_pago', n => { const P = PREF(); const T = P && (P.totais_ano || P.totais_2026); n.textContent = T ? F.mi(T.pago) : '—'; });
  dash.draw('h_folha', n => { const P = PREF(); const M = P && P.folha_mensal; n.textContent = M && M.length ? F.mi(M[M.length - 1].total) : '—'; });
  dash.draw('h_folha_mes', n => { const P = PREF(); const M = P && P.folha_mensal; if (M && M.length) { const L = M[M.length - 1]; n.textContent = MESN[+L.mes.slice(5, 7) - 1] + ' de ' + L.mes.slice(0, 4) + ' · toque para entender'; } });

  /* ================= seções que abrem e fecham ================= */
  const ORDER = ['incomuns', 'gastos-reais', 'pessoal', 'camara', 'contratacoes', 'prefeitura', 'lrf', 'ocultos', 'fontes'];
  const SUM = {incomuns: 'Contratos que merecem explicação, do maior para o menor', 'gastos-reais': 'Os 20 maiores gastos de ' + ANO + ', com detalhes, e a lista completa', pessoal: 'Quanto a folha custa por mês e se cabe no limite da lei', camara: 'Os 9 vereadores, os gastos e os contratos da Câmara', contratacoes: 'Quem recebe, quanto e se houve concorrência', prefeitura: 'Como o orçamento de ' + ANO + ' está dividido', lrf: 'Se a Prefeitura respeita os limites que a lei impõe', ocultos: 'O que a Prefeitura deveria publicar e não publica', fontes: 'De onde vêm os dados e o que as palavras significam'};
  function sectionize() {
    if (window.__lupaSec) return; window.__lupaSec = true;
    const host = document.getElementById('incomuns') && document.getElementById('incomuns').parentElement;
    if (!host) return;
    const anchor = document.getElementById('fontes') ? document.getElementById('fontes').nextSibling : null;
    ORDER.forEach(id => { const s = document.getElementById(id); if (s) host.insertBefore(s, anchor); });
    const ck = document.querySelector('[data-draw="colorKey"]'); if (ck) { /* legenda de cores fica dentro de Alertas */ }
    ORDER.forEach(id => {
      const s = document.getElementById(id); if (!s) return;
      const part = s.querySelector(':scope > .part'); if (!part) return;
      const body = el('div', 'sec-body'); body.id = id + '-corpo';
      [...s.children].filter(c => c !== part).forEach(c => body.append(c));
      s.append(body); s.classList.add('fold');
      const nb = part.querySelector('.num'); if (nb) nb.textContent = String(ORDER.indexOf(id) + 1).padStart(2, '0');
      const hd = el('button', 'sec-head'); hd.type = 'button'; hd.setAttribute('aria-expanded', 'false'); hd.setAttribute('aria-controls', body.id);
      part.parentNode.insertBefore(hd, part); hd.append(part);
      hd.append(el('span', 'sec-sum', SUM[id] || ''), el('span', 'sec-cta', 'Abrir'));
      body.hidden = true;
      hd.addEventListener('click', () => toggleSection(s, body.hidden));
    });
    if (id0()) openSection('#' + id0(), false);
  }
  const id0 = () => (location.hash || '').slice(1);
  function toggleSection(s, open) {
    const body = s.querySelector(':scope > .sec-body'), hd = s.querySelector(':scope > .sec-head'); if (!body) return;
    body.hidden = !open; hd.setAttribute('aria-expanded', String(open)); hd.querySelector('.sec-cta').textContent = open ? 'Fechar' : 'Abrir'; s.classList.toggle('is-open', open);
    if (open) { body.querySelectorAll('[data-draw]').forEach(n => { const k = n.dataset.draw; if (k) dash.draw(k); }); markScalars(); body.querySelectorAll('.rv').forEach(t => t.classList.add('in')); }
  }
  function openSection(hash, scroll) {
    const t = document.querySelector(hash); if (!t) return;
    const s = t.closest('section.sec') || t; if (s.classList.contains('fold') && !s.classList.contains('is-open')) toggleSection(s, true);
    if (scroll) requestAnimationFrame(() => (t === s ? s : t).scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}));
  }
  window.lupaOpen = openSection;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a || a.closest('.xp-ov')) return;
    const h = a.getAttribute('href'); if (h.length < 2) return; const t = document.querySelector(h); if (!t) return;
    const s = t.closest('section.sec'); if (!s || !s.classList.contains('fold')) return;
    e.preventDefault(); openSection(h, true); history.replaceState(null, '', h);
  });
  dash.onData(() => { sectionize(); markScalars(); });
})();
