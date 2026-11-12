const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
window.bsmFmt = {
  brl: v => BRL.format(v),
  mi: v => 'R$ ' + (v/1e6).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + ' mi',
  pct: v => v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + '%'
};
const F = window.bsmFmt;

/* ---------- cálculos ---------- */
dash.calc('resumo', {
  title: 'Indicadores do orçamento 2026',
  description: 'Total fixado e participação de áreas selecionadas no total.',
  inputs: ['funcao'],
  fn: (funcao) => {
    const rows = funcao.map(r => ({funcao: r.funcao, total: +r.total}));
    const total = d3.sum(rows, r => r.total);
    const val = n => (rows.find(r => r.funcao === n) || {total: 0}).total;
    const pct = v => total ? Math.round(v / total * 1000) / 10 : 0;
    const top3 = rows.slice().sort((a, b) => b.total - a.total).slice(0, 3);
    return [
      {indicador: 'total', valor: total},
      {indicador: 'educacao_pct', valor: pct(val('Educação'))},
      {indicador: 'saude_pct', valor: pct(val('Saúde'))},
      {indicador: 'lazer_pct', valor: pct(val('Desporto e Lazer') + val('Cultura') + val('Comércio e Serviços'))},
      {indicador: 'top3_pct', valor: pct(d3.sum(top3, r => r.total))},
      {indicador: 'top3_nomes', valor: top3.map(r => r.funcao).join('|')}
    ];
  }
});

dash.calc('orgao_share', {
  title: 'Participação de cada órgão',
  description: 'Percentual de cada órgão na despesa total fixada.',
  inputs: ['orgao'],
  fn: (orgao) => {
    const total = d3.sum(orgao, r => +r.total);
    return orgao.map(r => ({orgao: r.orgao, pct: total ? Math.round(+r.total / total * 1000) / 10 : 0}));
  }
});

dash.calc('lrf', {
  title: 'Indicadores da Lei de Responsabilidade Fiscal (previsto 2026)',
  description: 'Percentuais previstos na LOA 2026 comparados aos limites legais. Receita corrente usada como aproximação da Receita Corrente Líquida.',
  inputs: ['loa'],
  fn: (loa) => {
    const v = (k) => { const r = loa.find(x => x.item === k); return r ? +r.valor : 0; };
    const rc = v('receitas_correntes');
    const base = v('impostos') + v('transferencias_correntes');
    const p = (a, b) => b ? Math.round(a / b * 1000) / 10 : null;
    return [
      {id: 'pessoal', indicador: 'Salários e encargos dos servidores', pct: p(v('pessoal'), rc), limite: 60, alerta: 54, sentido: 'max',
       regra: 'Município (Prefeitura + Câmara): máximo 60% da Receita Corrente Líquida. Alerta em 54% e limite prudencial em 57% (LRF, arts. 19, 20 e 59).',
       conta: 'Pessoal e encargos previstos ÷ receitas correntes previstas', numerador: v('pessoal'), denominador: rc},
      {id: 'educacao', indicador: 'Educação (mínimo obrigatório)', pct: p(v('educacao'), base), limite: 25, sentido: 'min',
       regra: 'Aplicar no mínimo 25% da receita de impostos e transferências em manutenção e desenvolvimento do ensino (Constituição, art. 212).',
       conta: 'Função Educação ÷ (impostos + transferências correntes). Aproximação: a conta oficial usa só impostos e transferências constitucionais.', numerador: v('educacao'), denominador: base},
      {id: 'saude', indicador: 'Saúde (mínimo obrigatório)', pct: p(v('saude'), base), limite: 15, sentido: 'min',
       regra: 'Aplicar no mínimo 15% da receita de impostos e transferências em ações e serviços públicos de saúde (LC 141/2012).',
       conta: 'Função Saúde ÷ (impostos + transferências correntes). Aproximação: inclui recursos federais do SUS, que não contam para o mínimo.', numerador: v('saude'), denominador: base},
      {id: 'camara', indicador: 'Dinheiro repassado à Câmara', pct: p(v('camara'), base), limite: 7, sentido: 'max',
       regra: 'Municípios com até 100 mil habitantes: a Câmara pode receber no máximo 7% da receita tributária e de transferências do ano anterior (Constituição, art. 29-A).',
       conta: 'Orçamento da Câmara ÷ (impostos + transferências correntes previstos para 2026)', numerador: v('camara'), denominador: base},
      {id: 'regra_ouro', indicador: 'Empréstimos', pct: p(v('operacoes_credito'), v('despesas_capital')), limite: 100, sentido: 'max',
       regra: 'Empréstimos (operações de crédito) não podem superar as despesas de capital (Constituição, art. 167, III).',
       conta: 'Operações de crédito previstas ÷ despesas de capital', numerador: v('operacoes_credito'), denominador: v('despesas_capital')},
      {id: 'transferencias', indicador: 'Dinheiro que vem de fora (União e Estado)', pct: p(v('transferencias_correntes') + v('receitas_capital'), v('receita_total')), limite: null, sentido: 'info',
       regra: 'Não é limite legal. Mostra quanto do orçamento depende de repasses da União e do Estado.',
       conta: '(Transferências correntes + transferências de capital) ÷ receita total', numerador: v('transferencias_correntes') + v('receitas_capital'), denominador: v('receita_total')},
      {id: 'reserva', indicador: 'Reserva para emergências', pct: p(v('reserva'), rc), limite: null, sentido: 'info',
       regra: 'Não há percentual fixo na LRF; o valor é definido pela LDO. Serve para cobrir riscos e despesas imprevistas.',
       conta: 'Reserva de contingência ÷ receitas correntes', numerador: v('reserva'), denominador: rc},
      {id: 'suplementacao', indicador: 'Quanto o prefeito pode mudar sem a Câmara', pct: v('suplementacao_pct'), limite: null, sentido: 'info',
       regra: 'A LOA autoriza o Prefeito a remanejar até este percentual das dotações por decreto, sem voltar à Câmara. Quanto maior, menos o orçamento aprovado amarra o gasto real.',
       conta: 'Percentual previsto no art. 4º da Lei 795/2026', numerador: null, denominador: null},
      {id: 'execucao', indicador: 'Prestação de contas de 2026', pct: null, limite: null, sentido: 'semdado',
       regra: 'A LRF obriga a publicar o RREO a cada 2 meses e o RGF a cada 4 meses (arts. 52 a 55). São eles que mostram se os limites foram cumpridos na prática.',
       conta: 'A página de LRF do site da Prefeitura não exibiu relatórios na consulta feita para este painel.', numerador: null, denominador: null}
    ].map(r => {
      let status = 'info';
      if (r.sentido === 'semdado') status = 'semdado';
      else if (r.sentido === 'max' && r.pct != null) status = r.pct <= (r.alerta != null ? r.alerta : r.limite) ? 'ok' : (r.pct <= r.limite ? 'atencao' : 'ruim');
      else if (r.sentido === 'min' && r.pct != null) status = r.pct >= r.limite ? 'ok' : 'ruim';
      return Object.assign(r, {status});
    });
  }
});

dash.calc('ctr_resumo', {
  title: 'Resumo das contratações levantadas',
  description: 'Soma dos valores, parcela sem licitação e soma dos dois contratos de materiais de construção.',
  inputs: ['contratacoes'],
  fn: (contratacoes) => {
    const total = d3.sum(contratacoes, c => +c.valor);
    const sem = d3.sum(contratacoes.filter(c => c.modalidade === 'Inexigibilidade' || c.modalidade === 'Dispensa'), c => +c.valor);
    const marq = d3.sum(contratacoes.filter(c => c.categoria === 'Materiais de construção'), c => +c.valor);
    return [
      {indicador: 'total', valor: total},
      {indicador: 'qtd', valor: contratacoes.length},
      {indicador: 'sem_licit', valor: sem},
      {indicador: 'sem_licit_pct', valor: total ? Math.round(sem / total * 1000) / 10 : 0},
      {indicador: 'marques', valor: marq}
    ];
  }
});

dash.calc('rank_fornecedor', {
  title: 'Ranking de fornecedores identificados',
  description: 'Soma dos valores por fornecedor com nome publicado.',
  inputs: ['contratacoes'],
  fn: (contratacoes) => {
    const ok = contratacoes.filter(c => c.fornecedor && !/^(Não identificado|Em licitação|Em credenciamento|Postos credenciados|Proprietário não|Vários|Netword)|,/.test(c.fornecedor));
    const total = d3.sum(ok, c => +c.valor);
    return d3.rollups(ok, v => ({contratos: v.length, valor: d3.sum(v, c => +c.valor), cnpj: v.map(c => c.cnpj).filter(Boolean)[0] || '', orgaos: Array.from(new Set(v.map(c => c.orgao || 'Prefeitura'))).join(' e '), sinais: v.filter(c => c.alerta).length}), c => c.fornecedor)
      .map(([fornecedor, x]) => ({fornecedor, cnpj: x.cnpj, contratos: x.contratos, valor: x.valor, pct: total ? Math.round(x.valor / total * 1000) / 10 : 0, orgaos: x.orgaos, sinais: x.sinais}))
      .sort((a, b) => b.valor - a.valor);
  }
});

dash.calc('rank_categoria', {
  title: 'Valor por tipo de serviço ou compra',
  description: 'Soma dos valores das contratações levantadas por categoria.',
  inputs: ['contratacoes'],
  fn: (contratacoes) => d3.rollups(contratacoes, v => d3.sum(v, c => +c.valor), c => c.categoria)
    .map(([categoria, valor]) => ({categoria, valor})).sort((a, b) => b.valor - a.valor)
});

dash.calc('rank_modalidade', {
  title: 'Valor por modalidade de contratação',
  description: 'Soma dos valores das contratações levantadas por modalidade.',
  inputs: ['contratacoes'],
  fn: (contratacoes) => d3.rollups(contratacoes, v => d3.sum(v, c => +c.valor), c => c.modalidade)
    .map(([modalidade, valor]) => ({modalidade, valor})).sort((a, b) => b.valor - a.valor)
});


dash.calc('inc_resumo', {
  title: 'Resumo dos gastos incomuns',
  description: 'Soma e quantidade das contratações com ponto de atenção, parcela no total levantado e quantas foram sem licitação.',
  inputs: ['contratacoes'],
  fn: (contratacoes) => {
    const inc = contratacoes.filter(c => c.alerta);
    const total = d3.sum(inc, c => +c.valor), all = d3.sum(contratacoes, c => +c.valor);
    return [
      {indicador: 'total', valor: total},
      {indicador: 'qtd', valor: inc.length},
      {indicador: 'pct', valor: all ? Math.round(total / all * 1000) / 10 : 0},
      {indicador: 'sem', valor: inc.filter(c => c.modalidade === 'Inexigibilidade' || c.modalidade === 'Dispensa').length}
    ];
  }
});

dash.calc('lrf_resumo', {
  title: 'Limites da LRF cumpridos (previsto)',
  description: 'Quantos dos limites legais testados ficam dentro da regra no orçamento de 2026.',
  inputs: ['lrf'],
  fn: (lrf) => {
    const t = (lrf || []).filter(r => r.sentido === 'max' || r.sentido === 'min');
    return [{indicador: 'ok', valor: t.filter(r => r.status === 'ok').length + ' de ' + t.length}, {indicador: 'testados', valor: t.length}];
  }
});

dash.calc('ocultos', {
  title: 'Falhas de transparência nos extratos',
  description: 'Contratações cujo extrato publicado não traz o valor, fornecedores nomeados sem CNPJ, valores que não batem entre documentos e contratações sem vencedor publicado.',
  inputs: ['contratacoes'],
  fn: (contratacoes) => {
    const named = (c) => c.fornecedor && !/^(Não identificado|Em licitação|Em credenciamento|Postos credenciados|Proprietário não|Vários|Netword)|,/.test(c.fornecedor);
    return [
      {id: 'sem_valor', qtd: contratacoes.filter(c => !(+c.valor > 0)).length},
      {id: 'sem_cnpj', qtd: contratacoes.filter(c => named(c) && !c.cnpj).length},
      {id: 'divergente', qtd: contratacoes.filter(c => /não bate|não confere|grafado/i.test(c.alerta || '')).length},
      {id: 'sem_vencedor', qtd: contratacoes.filter(c => /^Não identificado/.test(c.fornecedor || '')).length}
    ];
  }
});

/* ---------- ajudantes ---------- */
const E = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const kv = (pairs) => {
  const dl = E('dl', 'kv');
  pairs.filter(p => p[1] != null && p[1] !== '').forEach(([k, val]) => {
    dl.append(E('dt', null, k));
    const dd = E('dd');
    if (val instanceof Node) dd.append(val); else dd.textContent = String(val);
    dl.append(dd);
  });
  return dl;
};
const link = (href, text) => { const a = E('a', null, text); a.href = href; if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; } return a; };
const contratos = () => { const d = dash.data('contratacoes'); return d.status === 'ok' ? d.data : []; };
const money = (c) => +c.valor > 0 ? F.brl(+c.valor) : 'Valor não publicado';
const MODL = {'Inexigibilidade': 'Sem concorrência (inexigibilidade)', 'Dispensa': 'Sem concorrência (dispensa)', 'Pregão eletrônico': 'Com concorrência (pregão)', 'Concorrência': 'Com concorrência', 'Credenciamento': 'Credenciamento (vários fornecedores)', 'Aditivo': 'Renovação de contrato (aditivo)'};
const modl = (m) => MODL[m] || m;
const isSem = (c) => c.modalidade === 'Inexigibilidade' || c.modalidade === 'Dispensa';

/* torna um elemento clicável e acessível; build() devolve o nó de detalhe */
function expandable(trigger, build, place) {
  trigger.tabIndex = 0;
  trigger.setAttribute('role', 'button');
  trigger.setAttribute('aria-expanded', 'false');
  let det = null;
  const toggle = (e) => {
    if (e && e.target && e.target.closest && e.target.closest('a')) return;
    if (det && e && e.target && det.contains(e.target)) return;
    if (det) { det.remove(); det = null; trigger.setAttribute('aria-expanded', 'false'); return; }
    det = build(); place(det); trigger.setAttribute('aria-expanded', 'true');
  };
  trigger.addEventListener('click', toggle);
  trigger.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
}

function contractDetail(c) {
  const box = E('div', 'det');
  box.append(E('div', 'dt', c.objeto));
  box.append(kv([
    ['Valor', +c.valor > 0 ? F.brl(+c.valor) + ' (' + c.tipo_valor.toLowerCase() + ')' : 'Não publicado no extrato'],
    ['Órgão', c.orgao || 'Prefeitura'],
    ['Fornecedor', c.fornecedor],
    ['CNPJ', c.cnpj],
    ['Tipo', c.categoria],
    ['Como foi contratado', modl(c.modalidade)],
    ['Situação', c.situacao],
    ['Data', c.data],
    ['Fonte', link(c.fonte, 'abrir documento ↗')]
  ]));
  if (c.alerta) box.append(fiscalBox(c));
  return box;
}

/* ---------- análise para o fiscal ---------- */
const POP = () => { const m = dash.data('municipio'); return m.status === 'ok' && m.data[0] ? +m.data[0].populacao : 7944; };
const ORC = () => { const v = get('resumo', 'total'); return v || 0; };
const LIM_DISP_OBRA = 130984.20, LIM_DISP_COMPRA = 65492.11;
const GEN = {
  sem: {p: 'O contrato foi feito sem disputa entre empresas. A regra é licitar; contratar direto só é permitido em casos que a lei lista, e a Prefeitura precisa provar que o caso se encaixa.', l: 'Lei 14.133/2021, arts. 72, 74 e 75.', d: ['Processo completo da contratação direta, com justificativa e parecer jurídico', 'Pesquisa de preços que justificou o valor', 'Razão da escolha deste fornecedor']},
  oculto: {p: 'O extrato não informa o valor. Sem valor publicado, ninguém consegue saber quanto dinheiro público está comprometido.', l: 'Lei 14.133/2021, art. 94 (publicação no PNCP) e LAI, art. 8º, § 1º, IV.', d: ['Valor do contrato ou do aditivo', 'Empenhos e pagamentos feitos']},
  cnpj: {p: 'O fornecedor aparece só pelo nome, sem CNPJ, o que impede checar quem é a empresa, seus sócios e sua atividade.', l: 'Lei 14.133/2021, art. 94 e art. 174.', d: ['CNPJ ou CPF do contratado', 'Contrato completo']},
  diverg: {p: 'Documentos do mesmo processo trazem valores diferentes. Só a documentação diz qual é o valor certo e quanto foi pago.', l: 'LAI, art. 6º, II (informação íntegra e autêntica).', d: ['Homologação, ata e contrato lado a lado', 'Empenhos e pagamentos']},
  alto: {p: 'O valor é alto para o tamanho do município. Isso não é ilegal por si só, mas exige que a necessidade e o preço estejam bem justificados.', l: 'Lei 14.133/2021, arts. 18 e 23.', d: ['Estudo técnico com a necessidade e as quantidades', 'Pesquisa de preços', 'Notas fiscais e comprovantes de entrega']}
};
function genFor(c) {
  const k = [];
  if (isSem(c)) k.push('sem');
  if (!(+c.valor > 0)) k.push('oculto');
  if (NAMED(c) && !c.cnpj) k.push('cnpj');
  if (/não bate|não confere|grafado/i.test(c.alerta || '')) k.push('diverg');
  if (!k.length) k.push('alto');
  return k.map(x => GEN[x]);
}
function fiscalBox(c) {
  const an = c.analise || {};
  const g = genFor(c);
  const box = E('div', 'fis');
  box.append(E('div', 'fh', '⚑ Análise para o fiscal'));
  const sec = (t, body) => { const s = E('div', 'fs'); s.append(E('div', 'ft', t)); if (body instanceof Node) s.append(body); else s.append(E('p', null, body)); box.append(s); };
  sec('1. O que encontramos', an.oque || c.alerta);
  sec('2. Por que isso é um problema', an.problema || g.map(x => x.p).join(' '));
  sec('3. O que a lei exige', an.lei || g.map(x => x.l).join(' '));
  const v = +c.valor, nums = [];
  if (v > 0) {
    nums.push('Equivale a ' + F.brl(v / POP()) + ' por morador (' + POP().toLocaleString('pt-BR') + ' habitantes, IBGE 2022).');
    if (ORC()) nums.push('Representa ' + F.pct(v / ORC() * 100) + ' de todo o orçamento da Prefeitura em 2026.');
    if (isSem(c)) { const obra = /obra|engenharia|reforma/i.test(c.objeto); const lim = obra ? LIM_DISP_OBRA : LIM_DISP_COMPRA; const x = v / lim; nums.push('O limite para comprar sem disputa só por causa do valor é ' + F.brl(lim) + (x > 1 ? '. Este contrato é ' + x.toLocaleString('pt-BR', {maximumFractionDigits: 1}) + ' vezes esse limite, por isso só se sustenta se houver uma justificativa especial (exclusividade ou notória especialização).' : '.')); }
  } else nums.push('Sem valor publicado, não é possível calcular o impacto. Este é, por si só, o primeiro ponto a cobrar.');
  const ul = E('ul', 'fl'); nums.forEach(t => ul.append(E('li', null, t))); sec('4. Números para ter noção', ul);
  const docs = an.conferir || [...new Set(g.flatMap(x => x.d))];
  const ol = E('ol', 'fl'); docs.forEach(t => ol.append(E('li', null, t))); sec('5. Documentos para pedir e conferir', ol);
  const org = c.orgao === 'Câmara' ? 'Câmara Municipal' : 'Prefeitura';
  const how = E('ol', 'fl');
  [['Peça os documentos acima pela Lei de Acesso à Informação, no e-SIC ou na Ouvidoria da ' + org + '. O prazo de resposta é de 20 dias, prorrogáveis por mais 10 (Lei 12.527/2011, art. 11). Guarde o protocolo.'],
   ['Se não responderem, ou se a resposta confirmar o problema, apresente denúncia ao Tribunal de Contas de Alagoas e ao Ministério Público de Alagoas. A denúncia pode ser anônima.'],
   ['Leve o caso aos vereadores: a Câmara tem o dever de fiscalizar a Prefeitura (Constituição, art. 31).']]
    .forEach(([t]) => how.append(E('li', null, t)));
  sec('6. Como cobrar', how);
  const lk = E('div', 'chips'); [['https://www.tceal.tc.br', 'TCE-AL ↗'], ['https://www.mpal.mp.br', 'MP-AL ↗'], [c.fonte, 'Documento original ↗']].forEach(([u, t]) => { const l = link(u, t); l.className = 'chip'; lk.append(l); }); box.append(lk);
  const pedido = 'À ' + (c.orgao === 'Câmara' ? 'Câmara Municipal' : 'Prefeitura Municipal') + ' de Barra de São Miguel/AL\n\nCom base na Lei de Acesso à Informação (Lei 12.527/2011), solicito cópia dos seguintes documentos referentes a: ' + c.objeto + (c.fornecedor && !/^Não identificado/.test(c.fornecedor) ? ' (fornecedor: ' + c.fornecedor + (c.cnpj ? ', CNPJ ' + c.cnpj : '') + ')' : '') + '.\n\n' + docs.map((d, i) => (i + 1) + '. ' + d).join('\n') + '\n\nPeço resposta no prazo do art. 11 da Lei 12.527/2011.\n\nNome:\nCPF ou e-mail para resposta:';
  const pb = E('div', 'fs'); pb.append(E('div', 'ft', '7. Pedido pronto para copiar'));
  const pre = E('pre', 'pedido', pedido); pb.append(pre);
  const acts = E('div', 'chips');
  const cp = E('button', 'chip act', 'Copiar pedido'); cp.type = 'button';
  cp.addEventListener('click', (e) => { e.stopPropagation(); const done = () => { cp.textContent = 'Copiado ✓'; setTimeout(() => { cp.textContent = 'Copiar pedido'; }, 2000); }; if (navigator.clipboard) navigator.clipboard.writeText(pedido).then(done, () => {}); });
  const url = (typeof location !== 'undefined' && /^https?:/.test(location.href)) ? location.origin + location.pathname + '#inc-' + c.id : '';
  const msg = '⚑ Lupa da Barra: ' + c.objeto + ' — ' + money(c) + '. ' + (an.problema ? an.problema.split('. ')[0] + '.' : c.alerta) + (url ? ' Veja: ' + url : '');
  const wa = link('https://wa.me/?text=' + encodeURIComponent(msg), 'Compartilhar no WhatsApp ↗'); wa.className = 'chip act wa';
  acts.append(cp, wa); pb.append(acts); box.append(pb);
  box.append(E('p', 'fn', 'Isto é um sinal para checagem baseado nos documentos publicados, não uma acusação. A ' + org + ' pode ter documentos que expliquem o caso; se tiver, deve publicá-los.'));
  return box;
}

function contractList(list) {
  const ul = E('ul', 'sublist');
  list.slice().sort((a, b) => +b.valor - +a.valor).forEach(c => {
    const li = E('li');
    const row = E('div', 'row');
    const lbl = E('div', 'lbl');
    lbl.append(E('span', null, '▸ ' + c.objeto), E('span', 'amt', money(c)));
    row.append(lbl);
    li.append(row);
    expandable(row, () => contractDetail(c), (d) => li.append(d));
    ul.append(li);
  });
  if (!list.length) ul.append(E('li', 'note', 'Nenhuma contratação levantada para este item.'));
  return ul;
}

/* barras clicáveis: rows = [{k, segs:[{v,color}], v, detail: () => Node}] */
function barList(el, rows, fmt) {
  el.replaceChildren();
  const total = d3.sum(rows, r => r.v), max = d3.max(rows, r => r.v) || 1;
  const tip = E('div', 'tip'); tip.hidden = true;
  rows.forEach(r => {
    const wrap = E('div');
    const row = E('div', 'row');
    const lbl = E('div', 'lbl');
    const name = E('span'); name.append(E('span', 'chev', '▸'), document.createTextNode(r.k));
    lbl.append(name, E('span', 'amt', `${fmt(r.v)} · ${F.pct(total ? r.v / total * 100 : 0)}`));
    const track = E('div', 'track');
    (r.segs || [{v: r.v, color: dash.colors[0]}]).forEach(s => { const sg = E('div', 'seg'); sg.style.width = (s.v / max * 100) + '%'; sg.style.background = s.color; track.append(sg); });
    row.append(lbl, track);
    row.addEventListener('mousemove', (e) => {
      tip.replaceChildren(E('div', 't', r.k), E('div', null, fmt(r.v)), E('div', null, F.pct(total ? r.v / total * 100 : 0) + ' do total'), E('div', null, 'Clique para detalhes'));
      tip.hidden = false;
      const box = el.getBoundingClientRect(), rb = row.getBoundingClientRect();
      tip.style.left = Math.min(Math.max(0, e.clientX - box.left + 12), Math.max(0, el.clientWidth - tip.offsetWidth)) + 'px';
      tip.style.top = (rb.bottom - box.top + 4) + 'px';
    });
    row.addEventListener('mouseleave', () => { tip.hidden = true; });
    expandable(row, () => { tip.hidden = true; return r.detail(); }, (d) => wrap.append(d));
    row.addEventListener('click', () => { const c = row.querySelector('.chev'); if (c) c.textContent = row.getAttribute('aria-expanded') === 'true' ? '▾' : '▸'; });
    wrap.append(row);
    el.append(wrap);
  });
  el.append(tip);
}

function tableRows(tb, items, cols, ncols, detail) {
  tb.replaceChildren();
  items.forEach(it => {
    const tr = E('tr', 'clk');
    if (it.__key) tr.dataset.key = it.__key;
    cols(it).forEach(v => { const td = E('td'); if (v instanceof Node) td.append(v); else td.textContent = v; tr.append(td); });
    tb.append(tr);
    expandable(tr, () => { const dr = E('tr', 'detrow'); const td = E('td'); td.colSpan = ncols; td.append(detail(it)); dr.append(td); return dr; }, (d) => tr.after(d));
  });
}

/* ---------- textos e números ---------- */
const get = (src, k) => {
  const r = dash.data(src);
  if (r.status !== 'ok' || !r.data) return null;
  const row = r.data.find(x => x.indicador === k);
  return row ? row.valor : null;
};
const fill = (name, fn) => dash.draw(name, el => { const v = fn(); el.textContent = v == null ? '—' : v; });

fill('h_total', () => { const v = get('resumo', 'total'); return v == null ? null : F.mi(v); });
fill('h_inc', () => { const v = get('inc_resumo', 'total'); return v == null ? null : F.mi(v); });
fill('h_inc_qtd', () => get('inc_resumo', 'qtd'));
fill('h_sem', () => { const v = get('ctr_resumo', 'sem_licit'); return v == null ? null : F.mi(v); });
fill('h_lrf', () => get('lrf_resumo', 'ok'));
fill('i_total', () => { const v = get('inc_resumo', 'total'); return v == null ? null : F.brl(v); });
fill('i_pct', () => { const v = get('inc_resumo', 'pct'); return v == null ? null : F.pct(v); });
fill('i_sem', () => { const v = get('inc_resumo', 'sem'); const q = get('inc_resumo', 'qtd'); return v == null ? null : v + ' de ' + q; });
fill('t_edu', () => { const v = get('resumo', 'educacao_pct'); return v == null ? null : F.pct(v); });
fill('t_sau', () => { const v = get('resumo', 'saude_pct'); return v == null ? null : F.pct(v); });
fill('t_laz', () => { const v = get('resumo', 'lazer_pct'); return v == null ? null : F.pct(v); });
fill('top3pct', () => { const v = get('resumo', 'top3_pct'); return v == null ? null : F.pct(v); });
fill('top3nomes', () => {
  const v = get('resumo', 'top3_nomes'); if (v == null) return null;
  const n = v.split('|'); return n.length === 3 ? `${n[0]}, ${n[1]} e ${n[2]}` : n.join(', ');
});
fill('c_total', () => { const v = get('ctr_resumo', 'total'); return v == null ? null : F.brl(v); });
fill('c_qtd', () => get('ctr_resumo', 'qtd'));
fill('c_sem', () => { const v = get('ctr_resumo', 'sem_licit'); return v == null ? null : F.brl(v); });
fill('c_sem_pct', () => { const v = get('ctr_resumo', 'sem_licit_pct'); return v == null ? null : F.pct(v); });
fill('f_top', () => { const r = dash.data('rank_fornecedor'); if (r.status !== 'ok' || !r.data || !r.data.length) return null; return r.data[0].fornecedor; });
fill('f_top_pct', () => { const r = dash.data('rank_fornecedor'); if (r.status !== 'ok' || !r.data || !r.data.length) return null; return F.pct(r.data[0].pct); });
fill('f_top3_pct', () => { const r = dash.data('rank_fornecedor'); if (r.status !== 'ok' || !r.data) return null; return F.pct(Math.round(d3.sum(r.data.slice(0, 3), x => x.pct) * 10) / 10); });
fill('c_marq', () => { const v = get('ctr_resumo', 'marques'); return v == null ? null : F.brl(v); });

const cell = (ds, keyCol, key, col) => {
  const d = dash.data(ds); if (d.status !== 'ok') return null;
  const r = d.data.find(x => x[keyCol] === key); return r ? F.brl(+r[col]) : null;
};
fill('o_esp', () => cell('orgao', 'orgao', 'Sec. de Esportes Cultura e Eventos', 'total'));
fill('o_soc', () => cell('orgao', 'orgao', 'Sec. de Desenv. Social Trabalho e Habitação', 'total'));
fill('o_cam', () => cell('orgao', 'orgao', 'Câmara Municipal', 'total'));
fill('f_urb', () => cell('funcao', 'funcao', 'Urbanismo', 'total'));

['sw0', 'sw0b'].forEach(n => dash.draw(n, el => { el.style.background = dash.colors[0]; }));
['sw1', 'sw1b'].forEach(n => dash.draw(n, el => { el.style.background = dash.colors[1]; }));

/* ---------- LRF ---------- */
const STATUS_TXT = {ok: 'Dentro do limite', atencao: 'Acima do alerta', ruim: 'Fora do limite', info: 'Informativo', semdado: 'Sem dado publicado'};
dash.draw('lrfCards', el => {
  const d = dash.data('lrf');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { el.textContent = '—'; return; }
  d.data.forEach(r => {
    const card = E('div', 'lrf ' + r.status);
    card.id = 'lrf-' + r.id;
    card.append(E('div', 'k', r.indicador));
    const val = E('div', 'v', r.pct == null ? '—' : F.pct(r.pct));
    if (r.pct != null) { val.dataset.source = 'lrf'; val.dataset.field = 'pct'; val.dataset.where = 'id=' + r.id; }
    card.append(val);
    if (r.limite != null && r.pct != null) {
      const g = E('div', 'gauge');
      const scale = Math.max(r.limite * 1.6, r.pct * 1.1);
      const fb = E('div', 'fillb'); fb.style.width = Math.min(100, r.pct / scale * 100) + '%';
      fb.style.background = r.status === 'ok' ? 'var(--color-ok)' : r.status === 'atencao' ? 'var(--color-warn)' : 'var(--color-bad)';
      const mk = E('div', 'mark'); mk.style.left = (r.limite / scale * 100) + '%';
      g.append(fb, mk); card.append(g);
      card.append(E('div', 'n', (r.sentido === 'min' ? 'Mínimo exigido: ' : 'Máximo permitido: ') + F.pct(r.limite)));
    }
    card.append(E('div', 'st', (r.sentido === 'min' && r.status === 'ok' ? 'Cumpre o mínimo (previsto)' : r.status === 'ok' ? 'Dentro do limite (previsto)' : STATUS_TXT[r.status]) + ' ▸'));
    expandable(card, () => {
      const box = E('div', 'det');
      box.append(kv([
        ['Regra', r.regra],
        ['Como foi calculado', r.conta],
        ['Valor de cima', r.numerador != null ? F.brl(r.numerador) : null],
        ['Valor de baixo', r.denominador != null ? F.brl(r.denominador) : null],
        ['Fonte', r.id === 'execucao' ? link('https://barradesaomiguel.al.gov.br/transparencia/lrf/', 'página LRF da Prefeitura ↗') : link('https://www-storage.voxtecnologia.com.br/?f=9878&i=publicado_115232_2026-02-02_f1e002484767a38742f539c636c0abce.pdf&m=sigpub.publicacao', 'LOA 2026 no Diário Oficial ↗')]
      ]));
      return box;
    }, (dd) => card.append(dd));
    el.append(card);
  });
});

/* ---------- barras do orçamento ---------- */
const ORG_CAT = {
  'Sec. de Saúde': ['Saúde'], 'Sec. de Educação': ['Educação'],
  'Sec. de Esportes Cultura e Eventos': ['Turismo e eventos'], 'Sec. de Turismo e Desenv. Econômico': ['Turismo e eventos'],
  'Sec. de Infraestrutura e Acessibilidade': ['Materiais de construção', 'Obras e habitação'],
  'Sec. de Urbanismo Transportes e Serv. Públicos': ['Materiais e equipamentos', 'Manutenção', 'Combustível', 'Locação de veículos', 'Limpeza urbana', 'Frota e veículos'],
  'Sec. de Desenv. Social Trabalho e Habitação': ['Alimentação', 'Obras e habitação'],
  'Gabinete do Prefeito': ['Gabinete'], 'Câmara Municipal': ['Câmara Municipal'], 'Superintendência de Trânsito': ['Transporte'],
  'Sec. de Administração Finanças e Planejamento': ['Consultoria', 'Material de expediente']
};
function budgetBars(el, id, keyCol) {
  const d = dash.data(id);
  if (d.status === 'error') { el.replaceChildren(E('div', 'k', 'Falha ao carregar')); return; }
  if (d.status !== 'ok') { el.replaceChildren(); el.textContent = '—'; return; }
  const all = d3.sum(d.data, r => +r.total);
  const rows = d.data.map(r => ({k: r[keyCol], f: +r.fiscal, s: +r.seguridade, v: +r.total})).sort((a, b) => b.v - a.v)
    .map(r => Object.assign(r, {
      segs: [{v: r.f, color: dash.colors[0]}, {v: r.s, color: dash.colors[1]}],
      detail: () => {
        const box = E('div', 'det');
        box.append(E('div', 'dt', r.k));
        box.append(kv([['Total previsto', F.brl(r.v)], ['Recursos gerais', F.brl(r.f)], ['Saúde e assistência social', F.brl(r.s)], ['Parte do orçamento', F.pct(r.v / all * 100)], ['Por mês (média)', F.brl(r.v / 12)], ['Fonte', link('https://www-storage.voxtecnologia.com.br/?f=9878&i=publicado_115232_2026-02-02_f1e002484767a38742f539c636c0abce.pdf&m=sigpub.publicacao', 'LOA 2026 ↗')]]));
        if (id === 'orgao') {
          const cats = ORG_CAT[r.k] || [];
          const list = contratos().filter(c => cats.includes(c.categoria));
          box.append(E('div', 'k', list.length ? 'Contratações de 2026 ligadas a esta área:' : 'Nenhuma contratação levantada para esta secretaria.'));
          if (list.length) box.append(contractList(list));
        }
        return box;
      }
    }));
  barList(el, rows, F.mi);
}
dash.draw('barsFuncao', el => budgetBars(el, 'funcao', 'funcao'));
dash.draw('barsOrgao', el => budgetBars(el, 'orgao', 'orgao'));

dash.draw('tabOrgao', tb => {
  const d = dash.data('orgao'), s = dash.data('orgao_share');
  if (d.status !== 'ok') { tb.replaceChildren(); return; }
  const share = new Map((s.status === 'ok' && s.data ? s.data : []).map(r => [r.orgao, r.pct]));
  const all = d3.sum(d.data, r => +r.total);
  const items = d.data.slice().sort((a, b) => +b.total - +a.total).map(r => Object.assign({}, r, {__key: r.orgao}));
  tableRows(tb, items, r => ['▸ ' + r.orgao, F.brl(+r.fiscal), F.brl(+r.seguridade), F.brl(+r.total), share.has(r.orgao) ? F.pct(share.get(r.orgao)) : '—'], 5, r => {
    const box = E('div', 'det');
    box.append(kv([['Órgão', r.orgao], ['Total previsto', F.brl(+r.total)], ['Por mês (média)', F.brl(+r.total / 12)], ['Parte do orçamento', F.pct(+r.total / all * 100)]]));
    const cats = ORG_CAT[r.orgao] || [];
    const list = contratos().filter(c => cats.includes(c.categoria));
    if (list.length) { box.append(E('div', 'k', 'Contratações ligadas:')); box.append(contractList(list)); }
    return box;
  });
});

/* ---------- contratações ---------- */
const incTags = (c) => {
  const t = [];
  if (!(+c.valor > 0)) t.push(['Valor oculto', 'c-bad']);
  if (/não bate|não confere|grafado/i.test(c.alerta || '')) t.push(['Valores divergentes', 'c-bad']);
  if (isSem(c)) t.push(['Sem concorrência', 'c-bad']);
  if (/pessoa física/i.test(c.alerta || '')) t.push(['Fornecedor pessoa física', 'c-bad']);
  if (/incomum|atípic|alto|mais que/i.test(c.alerta || '')) t.push(['Fora do padrão', '']);
  return t;
};
const incSev = (c) => (isSem(c) || !(+c.valor > 0) || /pessoa física|não bate|sem CNPJ/i.test(c.alerta || '')) ? 3 : 2;
dash.draw('incomuns', el => {
  const list = contratos().filter(c => c.alerta).sort((a, b) => +b.valor - +a.valor);
  el.replaceChildren();
  if (!list.length) { el.textContent = '—'; return; }
  const max = +list[0].valor || 1;
  list.forEach((c, i) => {
    const card = E('article', 'inc sev' + incSev(c) + (i === 0 ? ' feat' : ''));
    card.id = 'inc-' + c.id;
    const chips = E('div', 'chips');
    incTags(c).forEach(([t, cl]) => chips.append(E('span', 'chip ' + cl, t)));
    const meter = E('div', 'meter'); const bar = E('i'); bar.style.width = Math.max(2, +c.valor / max * 100) + '%'; meter.append(bar);
    card.append(E('div', 'rank', '#' + (i + 1) + ' · ' + c.categoria), E('div', 'iv', money(c)), meter, E('div', 'io', c.objeto), E('div', 'ir', c.alerta), chips, E('div', 'im', modl(c.modalidade) + ' · ' + c.fornecedor + ' · Ver detalhes ▸'));
    expandable(card, () => contractDetail(c), (d) => card.append(d));
    el.append(card);
  });
});

dash.draw('barsCat', el => {
  const d = dash.data('rank_categoria');
  if (d.status !== 'ok' || !d.data) { el.replaceChildren(); el.textContent = '—'; return; }
  barList(el, d.data.map(r => ({k: r.categoria, v: +r.valor, detail: () => contractList(contratos().filter(c => c.categoria === r.categoria))})), F.mi);
});
dash.draw('barsMod', el => {
  const d = dash.data('rank_modalidade');
  if (d.status !== 'ok' || !d.data) { el.replaceChildren(); el.textContent = '—'; return; }
  barList(el, d.data.map(r => ({k: modl(r.modalidade), v: +r.valor, detail: () => contractList(contratos().filter(c => c.modalidade === r.modalidade))})), F.mi);
});
dash.draw('barsPncp', el => {
  const d = dash.data('modalidades');
  if (d.status !== 'ok') { el.replaceChildren(); el.textContent = '—'; return; }
  barList(el, d.data.map(r => ({k: modl(r.modalidade), v: +r.processos, detail: () => {
    const box = E('div', 'det');
    box.append(kv([['Modalidade', r.modalidade], ['Processos no PNCP', r.processos], ['Período', 'mar/2024 a jul/2026'], ['Fonte', link('https://www.licinexus.com.br/licitacoes/orgao/municipio-de-barra-de-sao-miguel/', 'Licinexus (dados do PNCP) ↗')]]));
    return box;
  }})), v => v + ' processos');
});

dash.draw('tabForn', tb => {
  const r = dash.data('rank_fornecedor');
  if (r.status !== 'ok' || !r.data) { tb.replaceChildren(); return; }
  const items = r.data.map((x, i) => Object.assign({}, x, {__i: i + 1, __key: x.fornecedor}));
  tableRows(tb, items, x => [String(x.__i), '▸ ' + x.fornecedor + (x.sinais ? ' ⚑' : ''), x.orgaos, String(x.contratos), x.valor > 0 ? F.brl(x.valor) : 'não publicado', x.valor > 0 ? F.pct(x.pct) : '—'], 6, x => {
    const box = E('div', 'det');
    box.append(kv([['Fornecedor', x.fornecedor], ['CNPJ', x.cnpj || 'não publicado no extrato'], ['Contrata com', x.orgaos], ['Total contratado', x.valor > 0 ? F.brl(x.valor) : 'não publicado'], ['Parte do total com fornecedor identificado', x.valor > 0 ? F.pct(x.pct) : null], ['Contratos com ponto de atenção', x.sinais || null], ['Consultar CNPJ', x.cnpj ? link('https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp', 'Receita Federal ↗') : null]]));
    box.append(contractList(contratos().filter(c => c.fornecedor === x.fornecedor)));
    return box;
  });
});

dash.draw('tabCtr', tb => {
  const list = contratos();
  if (!list.length) { tb.replaceChildren(); return; }
  const items = list.slice().sort((a, b) => +b.valor - +a.valor).map(c => Object.assign({}, c, {__key: c.id}));
  tableRows(tb, items, c => {
    const tg = E('span', 'tag' + (isSem(c) ? ' inx' : ''), modl(c.modalidade));
    return ['▸ ' + c.objeto, c.orgao || 'Prefeitura', tg, money(c), c.situacao];
  }, 5, c => contractDetail(c));
  tb.querySelectorAll('tr.clk').forEach((tr, i) => { if (items[i] && items[i].alerta) tr.classList.add('flag'); });
});

/* abre a seção do link copiado */
dash.onData(() => {
  const h = (typeof location !== 'undefined' && location.hash) ? location.hash.slice(1) : '';
  if (h && !window.__bsmJumped) { const t = document.getElementById(h); if (t) { window.__bsmJumped = true; t.scrollIntoView(); } }
});

/* ---------- o que não aparece ---------- */
const NAMED = (c) => c.fornecedor && !/^(Não identificado|Em licitação|Em credenciamento|Postos credenciados|Proprietário não|Vários|Netword)|,/.test(c.fornecedor);
const OC = {
  sem_valor: {t: 'Contratos sem valor publicado', d: 'O extrato no Diário Oficial não informa quanto será pago.', f: (c) => !(+c.valor > 0), x: 'Estes contratos ou renovações foram publicados sem dizer quanto custam. Assim o cidadão não sabe quanto dinheiro foi comprometido, não consegue comparar com o mercado e não tem como conferir os pagamentos.', l: 'Lei 14.133/2021, art. 94: a publicação no PNCP, com os dados do contrato, é condição para o contrato valer. LAI, art. 8º, § 1º, IV: contratos devem estar disponíveis por inteiro.'},
  sem_cnpj: {t: 'Fornecedor sem CNPJ no extrato', d: 'A empresa aparece só pelo nome; não dá para checar quem é na Receita.', f: (c) => NAMED(c) && !c.cnpj, x: 'O contratado aparece só pelo nome. Sem CNPJ não dá para ver na Receita quem são os sócios, desde quando a empresa existe, qual é a atividade dela, nem se tem ligação com agentes públicos.', l: 'Lei 14.133/2021, arts. 94 e 174: o PNCP deve identificar o contratado. Art. 14: há impedimentos que só podem ser checados sabendo quem é a empresa.'},
  divergente: {t: 'Valores que não batem', d: 'O mesmo processo traz valores diferentes em documentos diferentes.', f: (c) => /não bate|não confere|grafado/i.test(c.alerta || ''), x: 'Documentos do mesmo processo mostram valores diferentes, ou o valor em números não confere com o valor por extenso. Pode ser erro de digitação, mas também pode abrir espaço para pagar mais do que o contratado. Só a comparação dos documentos originais resolve.', l: 'LAI, art. 6º, II: a informação pública deve ser íntegra e autêntica. Lei 14.133/2021, art. 94: os dados publicados devem corresponder ao contrato.'},
  sem_vencedor: {t: 'Contratações sem vencedor publicado', d: 'O vencedor não aparece nas fontes abertas consultadas.', f: (c) => /^Não identificado/.test(c.fornecedor || ''), x: 'Nas fontes abertas não aparece quem venceu ou quem foi contratado. Sem o nome do vencedor não há como saber quem está recebendo o dinheiro público.', l: 'Lei 14.133/2021, art. 94 e LRF, art. 48-A: cada pagamento deve ser divulgado com o nome de quem recebeu.'}
};
dash.draw('ocultos', el => {
  const d = dash.data('ocultos');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { el.textContent = '—'; return; }
  d.data.forEach(r => {
    const o = OC[r.id]; if (!o) return;
    const card = E('div', 'lrf ' + (r.qtd > 0 ? 'ruim' : 'ok'));
    card.id = 'oc-' + r.id;
    const v = E('div', 'v', String(r.qtd)); v.dataset.source = 'ocultos'; v.dataset.field = 'qtd'; v.dataset.where = 'id=' + r.id;
    card.append(E('div', 'k', o.t), v, E('div', 'n', o.d), E('div', 'st', r.qtd > 0 ? 'Ver quais ▸' : 'Nenhum caso'));
    expandable(card, () => { const w = E('div', 'fis'); w.append(E('div', 'fh', '⚑ O que está errado'), E('p', null, o.x), E('div', 'ft', 'O que a lei exige'), E('p', null, o.l), E('div', 'ft', 'Casos encontrados (toque em cada um para a análise completa)'), contractList(contratos().filter(o.f))); return w; }, (x) => card.append(x));
    el.append(card);
  });
});
const EXTRA = [
  ['Folha de servidores, diárias e horas extras', 'só no portal Kalana, sem acesso aberto a ferramentas externas.', 'https://www.kalana.com.br/transparencia/12263869000108/0000/diarias'],
  ['Relatórios fiscais RREO e RGF de 2026', 'a página de LRF do site da Prefeitura não exibiu relatórios na consulta.', 'https://barradesaomiguel.al.gov.br/transparencia/lrf/'],
  ['Resumo da folha e padrões salariais', 'as tabelas do site da Prefeitura aparecem sem nenhuma linha.', 'https://www.barradesaomiguel.al.gov.br/transparencia/servidores/outrasinformacoes/resumos/'],
  ['Pagamentos por credor', 'quanto cada fornecedor efetivamente recebeu só aparece no Kalana.', 'https://www.kalana.com.br/transparencia/12263869000108/0000/despesas?m=false']
];
dash.draw('ocultosExtra', ul => {
  ul.replaceChildren();
  EXTRA.forEach(([t, d, u]) => { const li = E('li'); li.append(E('b', null, t + ': '), document.createTextNode(d + ' '), link(u, 'abrir ↗')); ul.append(li); });
});

/* ---------- top 20 servidores ---------- */
dash.draw('topServ', el => {
  const d = dash.data('servidores');
  el.replaceChildren();
  if (d.status === 'ok' && Array.isArray(d.data) && d.data.length) {
    const num = (v) => +String(v == null ? '' : v).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.') || 0;
    const key = (r, ks) => { for (const k of ks) if (r[k] != null && r[k] !== '') return r[k]; return ''; };
    const rows = d.data.map(r => ({nome: key(r, ['nome', 'servidor', 'Nome']), cargo: key(r, ['cargo', 'Cargo', 'funcao']), lot: key(r, ['secretaria', 'lotacao', 'Lotação', 'orgao']), vinc: key(r, ['vinculo', 'Vínculo']), bruto: num(key(r, ['bruto', 'remuneracao_bruta', 'Bruto', 'total'])), extra: num(key(r, ['horas_extras', 'extra'])), diarias: num(key(r, ['diarias']))}))
      .sort((a, b) => b.bruto - a.bruto).slice(0, 20);
    const tw = E('div', 'tw'); const t = E('table'); t.dataset.source = 'servidores';
    const th = E('thead'); const hr = E('tr'); ['#', 'Servidor', 'Cargo', 'Lotação', 'Bruto'].forEach(h => hr.append(E('th', null, h))); th.append(hr);
    const tb = E('tbody'); t.append(th, tb); tw.append(t); el.append(tw);
    tableRows(tb, rows.map((r, i) => Object.assign(r, {__i: i + 1})), r => [String(r.__i), '▸ ' + r.nome, r.cargo, r.lot, F.brl(r.bruto)], 5, r => { const box = E('div', 'det'); box.append(kv([['Servidor', r.nome], ['Cargo', r.cargo], ['Vínculo', r.vinc], ['Lotação', r.lot], ['Bruto', F.brl(r.bruto)], ['Horas extras', r.extra ? F.brl(r.extra) : null], ['Diárias', r.diarias ? F.brl(r.diarias) : null]])); return box; });
    return;
  }
  const kn = dash.data('servidores_conhecidos');
  if (kn.status === 'ok' && kn.data && kn.data.length) {
    el.append(E('div', 'k', 'Registros conhecidos (fora da folha oficial):'));
    const ul = E('ul', 'sublist'); ul.style.margin = 'var(--cds-gap-xs) 0 var(--cds-gap-lg)';
    kn.data.forEach(s => { const li = E('li', 'n'); li.append(E('b', null, s.nome + ' — ' + F.brl(+s.bruto) + '/mês'), document.createTextNode(' · ' + s.cargo + ' · ' + s.referencia + '. ' + s.obs + '. '), link(s.fonte, 'fonte ↗')); ul.append(li); });
    el.append(ul);
  }
  const p = E('p', 'lead'); p.style.marginTop = '0';
  p.textContent = 'Ranking ainda sem a folha completa. A folha da Prefeitura está no portal Kalana, que bloqueia leitura externa, e a da Câmara tem 2.810 registros que ainda não foram extraídos. Quando a folha entrar, aqui aparecem os 20 maiores salários brutos, com cargo, lotação, horas extras e diárias.';
  const ul = E('ul', 'plain'); ul.style.marginTop = 'var(--cds-gap-sm)';
  [['Folha nominal no Kalana ↗', 'https://kalana.com.br/transparencia/12263869000108/0000/servidores?m=false'], ['Diárias no Kalana ↗', 'https://www.kalana.com.br/transparencia/12263869000108/0000/diarias'], ['Despesas e credores no Kalana ↗', 'https://www.kalana.com.br/transparencia/12263869000108/0000/despesas?m=false']].forEach(([t, u]) => { const li = E('li'); li.append(link(u, t)); ul.append(li); });
  el.append(p, ul);
});

/* ---------- acima do teto ---------- */
dash.calc('tetos', {
  title: 'Gastos comparados aos tetos legais',
  description: 'Quanto de cada limite legal já foi usado: dispensas de licitação (Decreto 12.807/2025), soma de dispensas da mesma natureza no ano (fracionamento), despesa com pessoal e repasse à Câmara (previstos na LOA 2026).',
  inputs: ['contratacoes', 'lrf'],
  fn: (contratacoes, lrf) => {
    const LIM_OBRA = 130984.20, LIM_COMPRA = 65492.11;
    const out = [];
    const disp = contratacoes.filter(c => c.modalidade === 'Dispensa' && +c.valor > 0 && String(c.data).startsWith('2026'));
    disp.forEach(c => {
      const obra = /obra|engenharia|reforma/i.test(c.objeto);
      const teto = obra ? LIM_OBRA : LIM_COMPRA;
      out.push({id: 'disp-' + c.id, item: 'Sem concorrência: ' + c.objeto, area: c.categoria, valor: +c.valor, teto, uso: Math.round(+c.valor / teto * 1000) / 10, tipo: 'Contrato sem concorrência',
        regra: 'Contrato sem concorrência só é permitido até R$ ' + teto.toLocaleString('pt-BR', {minimumFractionDigits: 2}) + ' em 2026 (Lei 14.133, art. 75, e Decreto 12.807/2025).'});
    });
    d3.rollups(disp, v => ({n: v.length, s: d3.sum(v, c => +c.valor)}), c => c.categoria).filter(([, x]) => x.n > 1).forEach(([cat, x]) => { const soma = x.s;
      out.push({id: 'frac-' + cat, item: 'Compras sem concorrência somadas no ano: ' + cat, area: cat, valor: soma, teto: LIM_COMPRA, uso: Math.round(soma / LIM_COMPRA * 1000) / 10, tipo: 'Compras divididas (fracionamento)',
        regra: 'Dispensas de mesma natureza no mesmo ano são somadas; dividir compras para caber no limite é proibido (Lei 14.133, art. 75, § 1º).'});
    });
    (lrf || []).filter(r => r.id === 'pessoal' || r.id === 'camara').forEach(r => {
      out.push({id: 'lrf-' + r.id, item: r.id === 'pessoal' ? 'Despesa com pessoal (Prefeitura + Câmara)' : 'Repasse à Câmara', area: r.id === 'pessoal' ? 'Folha' : 'Câmara Municipal', valor: r.numerador, teto: r.denominador * r.limite / 100, uso: Math.round(r.pct / r.limite * 1000) / 10, tipo: 'Limite constitucional/LRF', regra: r.regra});
    });
    return out.map(r => Object.assign(r, {status: r.uso > 100 ? 'acima' : r.uso >= 90 ? 'perto' : 'dentro'})).sort((a, b) => b.uso - a.uso);
  }
});
const PEND = [
  ['Salário acima do teto', 'Nenhum servidor pode ganhar mais que o prefeito (Constituição, art. 37, XI). Precisa da folha nominal.'],
  ['Contratados temporários por secretaria', 'Peso dos contratos temporários e comissionados em cada área, comparado aos efetivos. Precisa da folha com vínculo e lotação.'],
  ['Horas extras e diárias por secretaria', 'Quem recebe acima do padrão e em quais áreas. Precisa da folha e do cadastro de diárias.'],
  ['Aditivos acima de 25%', 'Contratos não podem crescer mais de 25% por aditivo (Lei 14.133, art. 125). Os extratos encontrados não trazem o percentual.']
];
dash.draw('tetos', el => {
  const d = dash.data('tetos');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { el.textContent = '—'; return; }
  const acima = d.data.filter(r => r.status === 'acima').length;
  const head = E('p', 'lead'); head.style.margin = '0 0 var(--cds-gap-md)';
  head.textContent = acima ? acima + ' item(ns) acima do teto nos dados disponíveis.' : 'Nenhum dos limites checáveis foi ultrapassado nos dados disponíveis. Abaixo, o quanto de cada teto já foi usado.';
  el.append(head);
  const list = E('div', 'bars'); list.style.minHeight = '0';
  d.data.forEach(r => {
    const wrap = E('div'); const row = E('div', 'row');
    const lbl = E('div', 'lbl'); lbl.append(E('span', null, '▸ ' + r.item), E('span', 'amt', F.pct(r.uso) + ' do teto'));
    const track = E('div', 'track'); track.style.position = 'relative'; track.style.overflow = 'visible';
    const fill = E('div', 'seg'); fill.style.width = Math.min(100, r.uso / 1.2) + '%'; fill.style.borderRadius = '5px';
    fill.style.background = r.status === 'acima' ? 'var(--color-bad)' : r.status === 'perto' ? 'var(--color-warn)' : 'var(--color-ok)';
    const mk = E('div', 'mark'); mk.style.cssText = 'position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--cds-chart-reference);left:' + (100 / 1.2) + '%';
    track.append(fill, mk); row.append(lbl, track); wrap.append(row);
    expandable(row, () => { const box = E('div', 'det'); box.append(kv([['Tipo', r.tipo], ['Área', r.area], ['Valor', F.brl(r.valor)], ['Teto', F.brl(r.teto)], ['Uso do teto', F.pct(r.uso)], ['Regra', r.regra]])); return box; }, (x) => wrap.append(x));
    list.append(wrap);
  });
  el.append(list);
  const note = E('p', 'note'); note.textContent = 'A linha vertical marca 100% do teto.'; el.append(note);
  const h = E('div', 'k'); h.style.margin = 'var(--cds-gap-md) 0 var(--cds-gap-xs)'; h.textContent = 'Ainda não dá para checar (dependem da folha e dos pagamentos):'; el.append(h);
  const g = E('div', 'lrfgrid');
  PEND.forEach(([t, dsc]) => { const c = E('div', 'lrf semdado'); c.style.cursor = 'auto'; c.append(E('div', 'k', t), E('div', 'n', dsc), E('div', 'st', 'Sem dado publicado')); g.append(c); });
  el.append(g);
});

/* ---------- status e Câmara ---------- */
fill('lastUpd', () => {
  const d = dash.data('status'); if (d.status !== 'ok' || !d.data || !d.data[0]) return null;
  const dt = new Date(d.data[0].atualizado_em); if (isNaN(dt)) return null;
  return dt.toLocaleString('pt-BR', {timeZone: 'America/Maceio', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
});
fill('h_cam', () => { const d = dash.data('orgao'); if (d.status !== 'ok') return null; const r = d.data.find(x => x.orgao === 'Câmara Municipal'); return r ? F.mi(+r.total) : null; });

dash.draw('camRegs', el => {
  const d = dash.data('camara_registros');
  el.replaceChildren();
  if (d.status !== 'ok') { el.textContent = '—'; return; }
  d.data.forEach(r => {
    const a = E('a', 'card'); a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
    const v = E('div', 'v', (+r.qtd).toLocaleString('pt-BR')); v.dataset.source = 'camara_registros'; v.dataset.field = 'qtd'; v.dataset.where = 'id=' + r.id;
    a.append(E('div', 'k', r.rotulo), v, E('div', 'n', 'publicados no portal da Câmara ↗'));
    el.append(a);
  });
});

const initials = (s) => s.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase();
dash.draw('vereadores', el => {
  const d = dash.data('vereadores');
  el.replaceChildren();
  if (d.status !== 'ok') { el.textContent = '—'; return; }
  const am = dash.data('camara_amostras'); const amostras = am.status === 'ok' ? am.data : [];
  d.data.forEach(v => {
    const card = E('article', 'ver');
    const top = E('div', 'top'); const av = E('div', 'av', initials(v.nome));
    const info = E('div'); info.append(E('div', 'nm', v.curto), E('div', 'rl', [v.partido, v.votos ? (+v.votos).toLocaleString('pt-BR') + ' votos em 2024' : ''].filter(Boolean).join(' · ') || '—'));
    top.append(av, info); card.append(top);
    if (v.cargo) card.append(E('div', 'role', v.cargo));
    const mine = amostras.filter(a => a.quem === v.nome);
    card.append(E('div', 'n', mine.length ? mine.length + ' repasse(s) de verba de gabinete já lido(s) · Ver detalhes ▸' : 'Ver detalhes ▸'));
    expandable(card, () => {
      const box = E('div', 'det');
      box.append(kv([['Nome', v.nome], ['Partido', v.partido || 'não informado no portal'], ['Cargo na Mesa', v.cargo || '—'], ['Votos em 2024', v.votos ? (+v.votos).toLocaleString('pt-BR') : null]]));
      if (mine.length) {
        box.append(E('div', 'k', 'Repasses de verba de gabinete lidos no portal:'));
        const ul = E('ul', 'sublist');
        mine.forEach(a => { const li = E('li', 'n'); li.textContent = a.competencia + ' — ' + F.brl(+a.valor) + ' (repasse em ' + a.data.split('-').reverse().join('/') + ')'; ul.append(li); });
        box.append(ul);
      }
      box.append(E('div', 'n', 'Totais de verba de gabinete, diárias e cursos por vereador entram aqui quando a extração completa do portal da Câmara for feita.'));
      const links = E('div', 'chips');
      [[v.perfil, 'Perfil ↗'], [v.verba, 'Verba de gabinete ↗'], [v.diarias, 'Diárias ↗']].forEach(([u, t]) => { const l = link(u, t); l.className = 'chip'; links.append(l); });
      box.append(links);
      return box;
    }, (x) => card.append(x));
    el.append(card);
  });
});

dash.draw('camGastos', el => {
  el.replaceChildren();
  const list = contratos().filter(c => c.orgao === 'Câmara');
  const tot = d3.sum(list, c => +c.valor);
  el.append(E('p', 'lead', list.length + ' contratações da Câmara levantadas, somando ' + F.brl(tot) + '.'));
  el.lastChild.style.margin = '0 0 var(--cds-gap-sm)';
  el.append(contractList(list));
  const am = dash.data('camara_amostras');
  const pays = am.status === 'ok' ? am.data.filter(a => !/^Verba/.test(a.tipo)) : [];
  if (pays.length) {
    el.append(E('div', 'k', 'Pagamentos recentes lidos no portal:'));
    el.lastChild.style.marginTop = 'var(--cds-gap-md)';
    const ul = E('ul', 'sublist');
    pays.forEach(a => { const li = E('li', 'n'); li.append(document.createTextNode(a.tipo + ' — ' + a.quem + ' — ' + F.brl(+a.valor) + ' · '), link(a.fonte, 'fonte ↗')); ul.append(li); });
    el.append(ul);
  }
});

dash.draw('camTetos', el => {
  const d = dash.data('lrf');
  el.replaceChildren();
  const cam = d.status === 'ok' && d.data ? d.data.find(r => r.id === 'camara') : null;
  const g = E('div', 'lrfgrid');
  const card = (cls, t, v, n, st) => { const c = E('div', 'lrf ' + cls); c.style.cursor = 'auto'; c.append(E('div', 'k', t)); if (v != null) c.append(E('div', 'v', v)); c.append(E('div', 'n', n), E('div', 'st', st)); g.append(c); };
  if (cam) card(cam.status, 'Repasse à Câmara (máx. 7%)', F.pct(cam.pct), 'Orçamento da Câmara sobre impostos e transferências previstos (Constituição, art. 29-A).', cam.status === 'ok' ? 'Dentro do limite (previsto)' : 'Acima do limite');
  card('semdado', 'Folha da Câmara (máx. 70% do repasse)', null, 'A Câmara não pode gastar mais de 70% do que recebe com folha, incluindo subsídios (art. 29-A, § 1º).', 'Aguardando extração da folha');
  card('semdado', 'Subsídio do vereador (máx. 20% do deputado estadual)', null, 'Em municípios com até 10 mil habitantes (art. 29, VI, a).', 'Aguardando extração da folha');
  card('semdado', 'Gasto total com vereadores (máx. 5% da receita)', null, 'Soma dos subsídios dos vereadores frente à receita do município (art. 29, VII).', 'Aguardando extração da folha');
  el.append(g);
});

fill('h_pc', () => { const v = get('resumo', 'total'); const m = dash.data('municipio'); if (v == null || m.status !== 'ok' || !m.data[0]) return null; return F.brl(v / +m.data[0].populacao); });
