/* Auto Shine — gestão de estética automotiva no celular (PWA).
 * Os dados ficam no aparelho (localStorage). Para vários usuários/aparelhos
 * com os mesmos dados, troque a camada "db" por um backend (ex.: Supabase).
 */

// ---------- Utilidades ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataBR = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const diaISO = (d = new Date()) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const iniciais = (nome) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
const porNome = (a, b) => a.nome.localeCompare(b.nome);
const vazio = (msg) => `<div class="vazio">${msg}</div>`;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

async function hash(texto) {
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) | 0;
  return 'x' + h;
}

// Número no formato do WhatsApp (55 + DDD + número)
function foneWhats(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length <= 11 ? '55' + d : d;
}
const linkWhats = (tel, texto) => `https://wa.me/${foneWhats(tel)}?text=${encodeURIComponent(texto)}`;

// ---------- Banco de dados (localStorage) ----------
const db = {
  get(k, padrao = []) { try { return JSON.parse(localStorage.getItem('ag_' + k)) ?? padrao; } catch { return padrao; } },
  set(k, v) { localStorage.setItem('ag_' + k, JSON.stringify(v)); },
  salvar(k, item) {
    const lista = db.get(k);
    const i = lista.findIndex((x) => x.id === item.id);
    if (i >= 0) lista[i] = item; else lista.push(item);
    db.set(k, lista);
  },
  remover(k, id) { db.set(k, db.get(k).filter((x) => x.id !== id)); },
  achar(k, id) { return db.get(k).find((x) => x.id === id); },
};
const CHAVES_BACKUP = ['clientes', 'produtos', 'vendas', 'agenda', 'empresa', 'usuarios'];

function semearDadosDemo() {
  if (localStorage.getItem('ag_semeado')) return;
  const c1 = uid(), c2 = uid(), lav = uid(), pol = uid();
  db.set('clientes', [
    { id: c1, nome: 'Carlos Silva', telefone: '(11) 98888-1234', veiculo: 'Toyota Corolla prata', placa: 'ABC1D23', obs: '' },
    { id: c2, nome: 'Mariana Souza', telefone: '(11) 97777-5678', veiculo: 'Jeep Compass preto', placa: 'XYZ9E87', obs: 'Prefere atendimento pela manhã' },
  ]);
  db.set('produtos', [
    { id: lav, nome: 'Lavagem completa', tipo: 'servico', custo: 15, despesas: 10, margem: 50, preco: 80 },
    { id: pol, nome: 'Polimento técnico', tipo: 'servico', custo: 90, despesas: 10, margem: 45, preco: 450 },
    { id: uid(), nome: 'Higienização interna', tipo: 'servico', custo: 40, despesas: 10, margem: 45, preco: 250 },
    { id: uid(), nome: 'Vitrificação de pintura', tipo: 'servico', custo: 250, despesas: 10, margem: 45, preco: 1200 },
    { id: uid(), nome: 'Cera de carnaúba 300g', tipo: 'produto', custo: 45, despesas: 10, margem: 35, preco: 82, estoque: 6, minimo: 3, unidade: 'un' },
    { id: uid(), nome: 'Aromatizante automotivo', tipo: 'produto', custo: 8, despesas: 10, margem: 40, preco: 16, estoque: 2, minimo: 5, unidade: 'un' },
  ]);
  db.set('agenda', [
    { id: uid(), clienteId: c1, servicoId: lav, data: diaISO(), hora: '09:00', obs: '', status: 'agendado' },
    { id: uid(), clienteId: c2, servicoId: pol, data: diaISO(), hora: '14:30', obs: 'Buscar o carro às 18h', status: 'agendado' },
  ]);
  localStorage.setItem('ag_semeado', '1');
}

// ---------- Folhas (dialogs) + botão "voltar" do Android ----------
// Cada folha aberta ganha uma entrada no histórico, assim o botão voltar fecha a folha.
let voltando = false;
let aposVoltar = null;

function abrir(dlg) {
  if (voltando) { aposVoltar = () => abrir(dlg); return; }
  dlg.returnValue = '';
  dlg.showModal();
  if (!history.state?.folha) history.pushState({ folha: 1 }, '');
}

$$('dialog').forEach((dlg) => {
  dlg.addEventListener('close', () => {
    if (history.state?.folha && !$('dialog[open]')) { voltando = true; history.back(); }
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close('cancel'); });
});

window.addEventListener('popstate', () => {
  if (voltando) {
    voltando = false;
    const f = aposVoltar; aposVoltar = null; f?.();
    return;
  }
  $$('dialog[open]').pop()?.close('cancel');
});

// ---------- Login ----------
function prepararLogin() {
  const primeiro = db.get('usuarios').length === 0;
  $('#login-sub').textContent = primeiro ? 'Primeiro acesso: crie seu usuário e senha' : 'Entre para acessar o sistema';
  $('#btn-login').textContent = primeiro ? 'Criar e entrar' : 'Entrar';
}

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const usuario = f.get('usuario').trim().toLowerCase();
  const senhaHash = await hash(usuario + ':' + f.get('senha'));
  const lista = db.get('usuarios');

  if (lista.length === 0) {
    db.set('usuarios', [{ usuario, senhaHash }]);
  } else if (!lista.some((u) => u.usuario === usuario && u.senhaHash === senhaHash)) {
    $('#login-erro').textContent = 'Usuário ou senha incorretos.';
    return;
  }
  // No celular o login fica lembrado até tocar em "Sair".
  localStorage.setItem('ag_sessao', usuario);
  e.target.reset();
  $('#login-erro').textContent = '';
  entrar();
});

function sair() {
  if (!confirm('Sair do aplicativo?')) return;
  localStorage.removeItem('ag_sessao');
  $('#app').classList.add('hidden');
  $('#tela-login').classList.remove('hidden');
  prepararLogin();
}

function entrar() {
  $('#usuario-logado').textContent = 'Conectado como ' + localStorage.getItem('ag_sessao');
  $('#tela-login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  navegar();
}

// ---------- Navegação ----------
const TELAS = {
  inicio: { titulo: 'Início' },
  agenda: { titulo: 'Agenda' },
  vender: { titulo: 'Nova venda' },
  clientes: { titulo: 'Clientes' },
  mais: { titulo: 'Mais' },
  produtos: { titulo: 'Serviços e produtos', pai: 'mais' },
  estoque: { titulo: 'Estoque', pai: 'mais' },
  historico: { titulo: 'Histórico de vendas', pai: 'mais' },
};
const renders = {};

function navegar() {
  let tela = (location.hash || '#inicio').slice(1);
  if (!TELAS[tela]) tela = 'inicio';
  const cfg = TELAS[tela];
  $$('.view').forEach((v) => v.classList.toggle('ativa', v.id === 'view-' + tela));
  $$('.abas a').forEach((a) => a.classList.toggle('ativo', a.dataset.aba === (cfg.pai || tela)));
  $('#titulo').textContent = cfg.titulo;
  $('#btn-voltar').classList.toggle('hidden', !cfg.pai);
  $('#btn-voltar').onclick = () => { location.hash = '#' + cfg.pai; };
  window.scrollTo(0, 0);
  renders[tela]?.();
}
window.addEventListener('hashchange', () => localStorage.getItem('ag_sessao') && navegar());

// ---------- Início ----------
renders.inicio = () => {
  const vendas = db.get('vendas');
  const agora = new Date();
  const hoje = diaISO();
  const doMes = vendas.filter((v) => { const d = new Date(v.data); return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear(); });
  const deHoje = vendas.filter((v) => diaISO(new Date(v.data)) === hoje);
  const soma = (l, f) => l.reduce((s, v) => s + f(v), 0);

  const h = agora.getHours();
  const empresa = db.get('empresa', {}).nome;
  $('#saudacao').textContent = (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + (empresa ? ` · ${empresa}` : '') +
    ' · ' + agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#st-hoje').textContent = brl(soma(deHoje, (v) => v.total));
  $('#st-hoje-qtd').textContent = deHoje.length === 1 ? '1 venda' : `${deHoje.length} vendas`;
  $('#st-mes').textContent = brl(soma(doMes, (v) => v.total));
  $('#st-lucro').textContent = brl(soma(doMes, (v) => v.total - v.custoTotal));

  const ags = db.get('agenda').filter((a) => a.data === hoje).sort((a, b) => a.hora.localeCompare(b.hora));
  $('#inicio-agenda').innerHTML = ags.length ? ags.map(cardAgendamento).join('') : vazio('Nenhum agendamento para hoje.');

  const baixos = db.get('produtos').filter((p) => p.tipo === 'produto' && p.estoque <= p.minimo);
  $('#inicio-estoque').innerHTML = baixos.length
    ? baixos.map((p) => `<a href="#estoque" class="item"><div class="corpo"><strong>${esc(p.nome)}</strong><small>Mínimo: ${p.minimo} ${esc(p.unidade)}</small></div>
        <span class="tag ${p.estoque <= 0 ? 'zero' : 'baixo'}">${p.estoque} ${esc(p.unidade)}</span></a>`).join('')
    : vazio('Tudo certo com o estoque. ✅');
};

// ---------- Agenda ----------
let diaSel = diaISO();

function cardAgendamento(a) {
  const c = db.achar('clientes', a.clienteId);
  const s = db.achar('produtos', a.servicoId);
  const feito = a.status === 'concluido';
  const lembrete = `Olá ${c?.nome?.split(' ')[0] || ''}! Lembrando do seu agendamento de ${s?.nome || 'serviço'} ` +
    `em ${new Date(a.data + 'T12:00').toLocaleDateString('pt-BR')} às ${a.hora}. Até lá! 🚗✨`;
  return `<div class="item coluna ${feito ? 'concluido' : ''}">
      <button class="topo-item" style="all:unset;display:flex;gap:.8rem;align-items:center;cursor:pointer" data-editar-ag="${a.id}">
        <span class="hora">${esc(a.hora)}</span>
        <span class="corpo"><strong>${esc(c?.nome || 'Cliente removido')}</strong>
          <small>${esc(s?.nome || 'Serviço removido')}${c?.veiculo ? ' · ' + esc(c.veiculo) : ''}${c?.placa ? ' · ' + esc(c.placa) : ''}</small>
          ${a.obs ? `<small>📝 ${esc(a.obs)}</small>` : ''}</span>
        ${feito ? '<span class="tag ok">Concluído</span>' : ''}
      </button>
      ${feito ? '' : `<div class="ag-acoes">
        ${c?.telefone ? `<a class="btn whats small" target="_blank" rel="noopener" href="${linkWhats(c.telefone, lembrete)}">Lembrete</a>` : ''}
        <button class="btn primary small" data-concluir-ag="${a.id}">Concluir e cobrar</button>
      </div>`}
    </div>`;
}

renders.agenda = () => {
  const agenda = db.get('agenda');
  const comAg = new Set(agenda.map((a) => a.data));
  const base = new Date();
  const dias = [];
  for (let i = -3; i < 28; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i);
    const iso = diaISO(d);
    dias.push(`<button class="dia ${iso === diaSel ? 'ativo' : ''} ${comAg.has(iso) ? 'tem' : ''}" data-dia="${iso}">
      <small>${i === 0 ? 'hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small><strong>${d.getDate()}</strong></button>`);
  }
  $('#dias').innerHTML = dias.join('');
  $('#dias .ativo')?.scrollIntoView({ inline: 'center', block: 'nearest' });

  const doDia = agenda.filter((a) => a.data === diaSel).sort((a, b) => a.hora.localeCompare(b.hora));
  const titulo = new Date(diaSel + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#lista-agenda').innerHTML = `<p class="muted" style="margin:0">${titulo}</p>` +
    (doDia.length ? doDia.map(cardAgendamento).join('') : vazio('Nenhum agendamento neste dia.<br>Toque em + para agendar.'));
};

function abrirAgendamento(a = {}) {
  const clientes = db.get('clientes').sort(porNome);
  const servicos = db.get('produtos').filter((p) => p.tipo === 'servico').sort(porNome);
  if (!clientes.length) return toast('Cadastre um cliente primeiro');
  if (!servicos.length) return toast('Cadastre um serviço primeiro');
  $('#ag-cliente').innerHTML = clientes.map((c) => `<option value="${c.id}">${esc(c.nome)}${c.placa ? ' · ' + esc(c.placa) : ''}</option>`).join('');
  $('#ag-servico').innerHTML = servicos.map((s) => `<option value="${s.id}">${esc(s.nome)} — ${brl(s.preco)}</option>`).join('');
  const f = $('#form-agendamento');
  f.reset();
  const dados = { data: diaSel, hora: '09:00', ...a };
  for (const [k, v] of Object.entries(dados)) if (f.elements[k]) f.elements[k].value = v;
  $('#btn-excluir-ag').classList.toggle('hidden', !a.id);
  abrir($('#modal-agendamento'));
}

$('#modal-agendamento').addEventListener('close', () => {
  const r = $('#modal-agendamento').returnValue;
  const d = Object.fromEntries(new FormData($('#form-agendamento')));
  if (r === 'excluir') {
    if (!confirm('Excluir este agendamento?')) return;
    db.remover('agenda', d.id);
    toast('Agendamento excluído');
  } else if (r === 'ok') {
    const antigo = d.id ? db.achar('agenda', d.id) : null;
    db.salvar('agenda', { ...antigo, ...d, id: d.id || uid(), status: antigo?.status || 'agendado' });
    diaSel = d.data;
    toast('Agendamento salvo');
  } else return;
  atualizarTela();
});

function concluirAgendamento(id) {
  const a = db.achar('agenda', id);
  const s = db.achar('produtos', a?.servicoId);
  if (!a || !s) return toast('Serviço não encontrado');
  carrinho = [{ id: s.id, nome: s.nome, preco: s.preco, custo: s.custo, tipo: s.tipo, qtd: 1 }];
  vendaCliente = a.clienteId;
  vendaAgId = a.id;
  location.hash = '#vender';
}

// ---------- Clientes ----------
renders.clientes = () => {
  const q = $('#busca-clientes').value.toLowerCase();
  const lista = db.get('clientes').filter((c) => [c.nome, c.telefone, c.placa, c.veiculo].join(' ').toLowerCase().includes(q)).sort(porNome);
  $('#lista-clientes').innerHTML = lista.length
    ? lista.map((c) => `<button class="item" data-ver-cliente="${c.id}">
        <span class="avatar">${esc(iniciais(c.nome))}</span>
        <span class="corpo"><strong>${esc(c.nome)}</strong><small>${esc([c.veiculo, c.placa].filter(Boolean).join(' · ') || c.telefone || '—')}</small></span>›</button>`).join('')
    : vazio(q ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda.<br>Toque em + para cadastrar.');
};
$('#busca-clientes').addEventListener('input', renders.clientes);

function abrirCliente(c = {}) {
  const f = $('#form-cliente');
  f.reset();
  for (const [k, v] of Object.entries(c)) if (f.elements[k]) f.elements[k].value = v;
  abrir($('#modal-cliente'));
}

$('#modal-cliente').addEventListener('close', () => {
  if ($('#modal-cliente').returnValue !== 'ok') return;
  const d = Object.fromEntries(new FormData($('#form-cliente')));
  d.id ||= uid();
  d.placa = d.placa.toUpperCase();
  d.nome = d.nome.trim();
  db.salvar('clientes', d);
  toast('Cliente salvo');
  atualizarTela();
});

let clienteAberto = null;
function verCliente(id) {
  const c = db.achar('clientes', id);
  if (!c) return;
  clienteAberto = c;
  const vendas = db.get('vendas').filter((v) => v.clienteId === id).reverse();
  $('#vc-nome').textContent = c.nome;
  $('#vc-info').innerHTML = [c.telefone, c.veiculo, c.placa].filter(Boolean).map(esc).join(' · ') + (c.obs ? `<br>📝 ${esc(c.obs)}` : '');
  $('#vc-whats').href = linkWhats(c.telefone, `Olá ${c.nome.split(' ')[0]}! `);
  $('#vc-ligar').href = 'tel:' + String(c.telefone || '').replace(/\D/g, '');
  $('#vc-whats').classList.toggle('hidden', !c.telefone);
  $('#vc-ligar').classList.toggle('hidden', !c.telefone);
  $('#vc-total').textContent = brl(vendas.reduce((s, v) => s + v.total, 0));
  $('#vc-visitas').textContent = vendas.length;
  $('#vc-historico').innerHTML = vendas.length
    ? vendas.slice(0, 10).map((v) => `<div class="item"><span class="corpo"><strong>${esc(v.itens.map((i) => i.nome).join(', '))}</strong><small>${dataBR(v.data)}</small></span><span class="valor">${brl(v.total)}</span></div>`).join('')
    : vazio('Ainda sem compras.');
  abrir($('#modal-ver-cliente'));
}
$('#vc-editar').addEventListener('click', () => { $('#modal-ver-cliente').close(); abrirCliente(clienteAberto); });
$('#vc-excluir').addEventListener('click', () => {
  if (!confirm(`Excluir ${clienteAberto.nome}? O histórico de vendas é mantido.`)) return;
  db.remover('clientes', clienteAberto.id);
  $('#modal-ver-cliente').close();
  toast('Cliente excluído');
  atualizarTela();
});

// ---------- Produtos e precificação ----------
// Preço = custo ÷ (1 − (taxas% + margem%)). Assim a margem é calculada sobre o preço de venda.
const precoSugerido = (custo, despesas, margem) => {
  const divisor = 1 - (Number(despesas) + Number(margem)) / 100;
  return divisor > 0 ? Number(custo) / divisor : 0;
};
const margemReal = (preco, custo, despesas) => (preco > 0 ? ((preco - custo - preco * (despesas / 100)) / preco) * 100 : 0);
const corMargem = (m) => (m < 15 ? 'zero' : m < 30 ? 'baixo' : 'ok');

renders.produtos = () => {
  const q = $('#busca-produtos').value.toLowerCase();
  const lista = db.get('produtos').filter((p) => p.nome.toLowerCase().includes(q))
    .sort((a, b) => a.tipo.localeCompare(b.tipo) * -1 || porNome(a, b));
  $('#lista-produtos').innerHTML = lista.length
    ? lista.map((p) => {
        const m = margemReal(p.preco, p.custo, p.despesas);
        return `<button class="item" data-editar-produto="${p.id}">
          <span class="corpo"><strong>${esc(p.nome)}</strong>
            <small><span class="tag ${p.tipo === 'servico' ? 'serv' : 'ok'}">${p.tipo === 'servico' ? 'Serviço' : 'Produto'}</span>
            custo ${brl(p.custo)} · margem <span class="tag ${corMargem(m)}">${m.toFixed(0)}%</span></small></span>
          <span class="valor">${brl(p.preco)}</span></button>`;
      }).join('')
    : vazio('Nenhum item cadastrado.<br>Toque em + para cadastrar.');
};
$('#busca-produtos').addEventListener('input', renders.produtos);

const formProd = $('#form-produto');
function atualizarSugestao() {
  const e = formProd.elements;
  $('#preco-sugerido').textContent = brl(precoSugerido(e.custo.value, e.despesas.value, e.margem.value));
  $('.so-produto').classList.toggle('hidden', e.tipo.value !== 'produto');
  const m = margemReal(+e.preco.value, +e.custo.value, +e.despesas.value);
  $('#margem-real').textContent = +e.preco.value > 0 ? `Com esse preço sua margem real é de ${m.toFixed(1)}% (${brl(+e.preco.value - +e.custo.value - +e.preco.value * e.despesas.value / 100)} de lucro por unidade).` : '';
}
formProd.addEventListener('input', atualizarSugestao);
$('#btn-usar-sugerido').addEventListener('click', () => {
  const e = formProd.elements;
  e.preco.value = precoSugerido(e.custo.value, e.despesas.value, e.margem.value).toFixed(2);
  atualizarSugestao();
});

function abrirProduto(p = { tipo: 'servico' }) {
  formProd.reset();
  for (const [k, v] of Object.entries(p)) if (formProd.elements[k]) formProd.elements[k].value = v;
  $('#btn-excluir-produto').classList.toggle('hidden', !p.id);
  atualizarSugestao();
  abrir($('#modal-produto'));
}

$('#modal-produto').addEventListener('close', () => {
  const r = $('#modal-produto').returnValue;
  const d = Object.fromEntries(new FormData(formProd));
  if (r === 'excluir') {
    if (!confirm(`Excluir "${d.nome}"?`)) return;
    db.remover('produtos', d.id);
    toast('Item excluído');
  } else if (r === 'ok') {
    const item = { id: d.id || uid(), nome: d.nome.trim(), tipo: d.tipo, custo: +d.custo, despesas: +d.despesas, margem: +d.margem, preco: +d.preco };
    if (item.tipo === 'produto') Object.assign(item, { estoque: +d.estoque, minimo: +d.minimo, unidade: d.unidade || 'un' });
    db.salvar('produtos', item);
    toast('Item salvo');
  } else return;
  atualizarTela();
});

// ---------- Estoque ----------
renders.estoque = () => {
  const lista = db.get('produtos').filter((p) => p.tipo === 'produto').sort((a, b) => (a.estoque - a.minimo) - (b.estoque - b.minimo));
  $('#lista-estoque').innerHTML = lista.length
    ? lista.map((p) => {
        const sit = p.estoque <= 0 ? ['zero', 'Sem estoque'] : p.estoque <= p.minimo ? ['baixo', 'Baixo'] : ['ok', 'OK'];
        return `<div class="item"><span class="corpo"><strong>${esc(p.nome)}</strong>
            <small><span class="tag ${sit[0]}">${sit[1]}</span> mínimo ${p.minimo} ${esc(p.unidade)}</small></span>
          <div class="stepper"><button data-estoque="${p.id}" data-delta="-1" aria-label="Saída">−</button>
            <span>${p.estoque}</span><button class="mais" data-estoque="${p.id}" data-delta="1" aria-label="Entrada">+</button></div></div>`;
      }).join('')
    : vazio('Cadastre itens do tipo "Produto" em Mais › Serviços e produtos para controlar o estoque.');
};

function movimentar(id, delta) {
  const p = db.achar('produtos', id);
  p.estoque += delta;
  db.salvar('produtos', p);
  renders.estoque();
}

// ---------- Vender ----------
let carrinho = [];
let vendaCliente = '';
let vendaAgId = null;

renders.vender = () => {
  const clientes = db.get('clientes').sort(porNome);
  $('#venda-cliente').innerHTML = '<option value="">Cliente avulso</option>' +
    clientes.map((c) => `<option value="${c.id}">${esc(c.nome)}${c.placa ? ' · ' + esc(c.placa) : ''}</option>`).join('');
  $('#venda-cliente').value = vendaCliente;
  desenharItensVenda();
};
$('#venda-cliente').addEventListener('change', (e) => { vendaCliente = e.target.value; });
$('#busca-venda').addEventListener('input', () => desenharItensVenda());

function desenharItensVenda() {
  const q = $('#busca-venda').value.toLowerCase();
  const itens = db.get('produtos').filter((p) => p.nome.toLowerCase().includes(q))
    .sort((a, b) => a.tipo.localeCompare(b.tipo) * -1 || porNome(a, b));
  $('#venda-itens').innerHTML = itens.length
    ? itens.map((p) => {
        const qtd = carrinho.find((i) => i.id === p.id)?.qtd || 0;
        const semEstoque = p.tipo === 'produto' && qtd >= p.estoque;
        return `<div class="item"><span class="corpo"><strong>${esc(p.nome)}</strong>
            <small>${brl(p.preco)}${p.tipo === 'produto' ? ` · estoque ${p.estoque}` : ''}</small></span>
          <div class="stepper">${qtd ? `<button data-qtd="${p.id}" data-delta="-1" aria-label="Remover">−</button><span>${qtd}</span>` : ''}
            <button class="mais" data-qtd="${p.id}" data-delta="1" ${semEstoque ? 'disabled style="opacity:.35"' : ''} aria-label="Adicionar">+</button></div></div>`;
      }).join('')
    : vazio('Nenhum serviço ou produto encontrado.');
  desenharCarrinho();
}

function alterarQtd(id, delta) {
  const p = db.achar('produtos', id);
  let it = carrinho.find((i) => i.id === id);
  if (!it && delta > 0) carrinho.push(it = { id: p.id, nome: p.nome, preco: p.preco, custo: p.custo, tipo: p.tipo, qtd: 0 });
  if (!it) return;
  if (delta > 0 && p.tipo === 'produto' && it.qtd >= p.estoque) return toast(`Só há ${p.estoque} em estoque`);
  it.qtd += delta;
  if (it.qtd <= 0) carrinho = carrinho.filter((i) => i !== it);
  if (!carrinho.length) vendaAgId = null;
  desenharItensVenda();
}

function totaisVenda() {
  const sub = carrinho.reduce((s, it) => s + it.preco * it.qtd, 0);
  const desconto = Math.min(Math.max(+$('#venda-desconto').value || 0, 0), sub);
  return { sub, desconto, total: sub - desconto };
}

function desenharCarrinho() {
  const qtd = carrinho.reduce((s, i) => s + i.qtd, 0);
  const { sub, total } = totaisVenda();
  $('#carrinho-barra').classList.toggle('hidden', !carrinho.length);
  $('#cb-qtd').textContent = qtd === 1 ? '1 item' : `${qtd} itens`;
  $('#cb-total').textContent = brl(sub);
  $('#carrinho').innerHTML = carrinho.map((it) => `<div class="item"><span class="corpo"><strong>${esc(it.nome)}</strong>
      <small>${it.qtd} × ${brl(it.preco)}</small></span><span class="valor">${brl(it.qtd * it.preco)}</span></div>`).join('');
  $('#v-subtotal').textContent = brl(sub);
  $('#v-total').textContent = brl(total);
}
$('#venda-desconto').addEventListener('input', desenharCarrinho);
$('#btn-ver-carrinho').addEventListener('click', () => { desenharCarrinho(); abrir($('#modal-carrinho')); });

$('#btn-finalizar').addEventListener('click', () => {
  if (!carrinho.length) return;
  const { sub, desconto, total } = totaisVenda();
  const cliente = db.achar('clientes', vendaCliente);

  const produtos = db.get('produtos');
  for (const it of carrinho) {
    const p = produtos.find((x) => x.id === it.id);
    if (p?.tipo === 'produto') p.estoque -= it.qtd;
  }
  db.set('produtos', produtos);

  const venda = {
    id: uid(), data: new Date().toISOString(),
    clienteId: cliente?.id || null, clienteNome: cliente?.nome || 'Cliente avulso',
    itens: carrinho, subtotal: sub, desconto, total,
    custoTotal: carrinho.reduce((s, it) => s + it.custo * it.qtd, 0),
    pagamento: $('#venda-pagto').value, obs: $('#venda-obs').value,
    vendedor: localStorage.getItem('ag_sessao'),
  };
  db.salvar('vendas', venda);

  if (vendaAgId) {
    const a = db.achar('agenda', vendaAgId);
    if (a) db.salvar('agenda', { ...a, status: 'concluido', vendaId: venda.id });
  }

  carrinho = []; vendaCliente = ''; vendaAgId = null;
  $('#venda-desconto').value = 0;
  $('#venda-obs').value = '';
  $('#busca-venda').value = '';

  $('#recibo-total').textContent = brl(total);
  $('#recibo-whats').classList.toggle('hidden', !cliente?.telefone);
  if (cliente?.telefone) $('#recibo-whats').href = linkWhats(cliente.telefone, textoRecibo(venda));
  $('#modal-carrinho').close();
  abrir($('#modal-recibo'));
  renders.vender();
});

function textoRecibo(v) {
  const emp = db.get('empresa', {});
  return [
    `*${emp.nome || 'Recibo'}*`,
    `Recibo · ${dataBR(v.data)}`,
    `Cliente: ${v.clienteNome}`,
    '',
    ...v.itens.map((i) => `${i.qtd}x ${i.nome} — ${brl(i.preco * i.qtd)}`),
    v.desconto ? `Desconto: −${brl(v.desconto)}` : null,
    `*Total: ${brl(v.total)}*`,
    `Pagamento: ${v.pagamento}`,
    emp.pix ? `Chave Pix: ${emp.pix}` : null,
    '',
    'Obrigado pela preferência! 🚗✨',
  ].filter((l) => l !== null).join('\n');
}

// ---------- Histórico ----------
let periodo = 'mes';

renders.historico = () => {
  const agora = new Date();
  const filtro = {
    hoje: (d) => diaISO(d) === diaISO(),
    7: (d) => agora - d < 7 * 864e5,
    mes: (d) => d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear(),
    tudo: () => true,
  }[periodo];
  const vendas = db.get('vendas').filter((v) => filtro(new Date(v.data))).reverse();
  const total = vendas.reduce((s, v) => s + v.total, 0);
  const lucro = vendas.reduce((s, v) => s + v.total - v.custoTotal, 0);
  $$('#filtro-periodo button').forEach((b) => b.classList.toggle('ativo', b.dataset.periodo === periodo));
  $('#resumo-periodo').innerHTML = `${vendas.length} venda(s) · <strong>${brl(total)}</strong> · lucro ${brl(lucro)}`;
  $('#lista-historico').innerHTML = vendas.length
    ? vendas.map((v) => `<div class="item coluna"><div class="topo-item">
          <span class="corpo"><strong>${esc(v.clienteNome)}</strong>
            <small>${v.itens.map((i) => `${i.qtd}× ${esc(i.nome)}`).join(', ')}</small>
            <small>${dataBR(v.data)} · ${esc(v.pagamento)}</small></span>
          <span class="valor">${brl(v.total)}${v.desconto ? `<small>desc. ${brl(v.desconto)}</small>` : ''}</span></div>
          <div class="ag-acoes"><button class="btn danger small" data-cancelar-venda="${v.id}">Cancelar venda</button></div></div>`).join('')
    : vazio('Nenhuma venda neste período.');
};

function cancelarVenda(id) {
  const venda = db.achar('vendas', id);
  if (!venda || !confirm('Cancelar esta venda? Os produtos voltam para o estoque.')) return;
  const produtos = db.get('produtos');
  for (const it of venda.itens) {
    const p = produtos.find((x) => x.id === it.id);
    if (p?.tipo === 'produto') p.estoque += it.qtd;
  }
  db.set('produtos', produtos);
  db.remover('vendas', id);
  const ag = db.get('agenda').find((a) => a.vendaId === id);
  if (ag) db.salvar('agenda', { ...ag, status: 'agendado', vendaId: null });
  toast('Venda cancelada');
  renders.historico();
}

// ---------- Empresa e backup ----------
function abrirEmpresa() {
  const f = $('#form-empresa');
  const emp = db.get('empresa', {});
  f.elements.nome.value = emp.nome || '';
  f.elements.pix.value = emp.pix || '';
  abrir($('#modal-empresa'));
}
$('#modal-empresa').addEventListener('close', () => {
  if ($('#modal-empresa').returnValue !== 'ok') return;
  db.set('empresa', Object.fromEntries(new FormData($('#form-empresa'))));
  toast('Dados salvos');
});

async function exportar() {
  const dados = { app: 'AutoShine', versao: 2, criadoEm: new Date().toISOString() };
  for (const k of CHAVES_BACKUP) dados[k] = db.get(k, null);
  const nome = `autoshine-backup-${diaISO()}.json`;
  const arquivo = new File([JSON.stringify(dados, null, 2)], nome, { type: 'application/json' });
  // No celular, abre o menu de compartilhar (Drive, WhatsApp, e-mail…)
  if (navigator.canShare?.({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: 'Backup Auto Shine' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(arquivo);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Backup salvo em Downloads');
}

$('#arquivo-backup').addEventListener('change', async (e) => {
  const arq = e.target.files[0];
  e.target.value = '';
  if (!arq) return;
  try {
    const dados = JSON.parse(await arq.text());
    if (!['AutoShine', 'EstetiApp', 'AutoGestor'].includes(dados.app) || !Array.isArray(dados.clientes)) throw new Error();
    if (!confirm(`Restaurar backup de ${dataBR(dados.criadoEm)}? Os dados atuais deste aparelho serão substituídos.`)) return;
    for (const k of CHAVES_BACKUP) if (dados[k] != null) db.set(k, dados[k]);
    localStorage.setItem('ag_semeado', '1');
    toast('Backup restaurado');
    location.hash = '#inicio';
  } catch {
    toast('Arquivo de backup inválido');
  }
});

// ---------- Cliques (delegação) ----------
function atualizarTela() { navegar(); }

document.addEventListener('click', (e) => {
  const b = e.target.closest('button, [data-fechar]');
  if (!b) return;
  const d = b.dataset;
  if ('fechar' in d) b.closest('dialog')?.close();
  else if (d.novo === 'cliente') abrirCliente();
  else if (d.novo === 'produto') abrirProduto();
  else if (d.novo === 'agendamento') abrirAgendamento();
  else if (d.verCliente) verCliente(d.verCliente);
  else if (d.editarProduto) abrirProduto(db.achar('produtos', d.editarProduto));
  else if (d.editarAg) abrirAgendamento(db.achar('agenda', d.editarAg));
  else if (d.concluirAg) concluirAgendamento(d.concluirAg);
  else if (d.dia) { diaSel = d.dia; renders.agenda(); }
  else if (d.estoque) movimentar(d.estoque, +d.delta);
  else if (d.qtd) alterarQtd(d.qtd, +d.delta);
  else if (d.cancelarVenda) cancelarVenda(d.cancelarVenda);
  else if (d.periodo) { periodo = d.periodo; renders.historico(); }
  else if (d.acao === 'empresa') abrirEmpresa();
  else if (d.acao === 'exportar') exportar();
  else if (d.acao === 'importar') $('#arquivo-backup').click();
  else if (d.acao === 'sair') sair();
});

// ---------- Instalação como app (PWA) ----------
let pedidoInstalacao = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pedidoInstalacao = e;
  $('#btn-instalar').classList.remove('hidden');
});
$('#btn-instalar').addEventListener('click', async () => {
  if (!pedidoInstalacao) return;
  pedidoInstalacao.prompt();
  await pedidoInstalacao.userChoice;
  pedidoInstalacao = null;
  $('#btn-instalar').classList.add('hidden');
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js');
}

// ---------- Início ----------
semearDadosDemo();
if (localStorage.getItem('ag_sessao')) entrar();
else prepararLogin();
