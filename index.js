/**
 * SHAFT - JULIANA COMPLETA - ORÇAMENTO + PROPOSTA + CAÇADOR + ATENDIMENTO
 * Agora faz TUDO: atende, caça leads, gera planilha orçamentária e proposta que converte
 * 100% grátis - Groq + Evolution
 */

const express = require('express');
const axios = require('axios');
let Groq, ExcelJS;
try { Groq = require('groq-sdk'); } catch(e){ console.log("Groq SDK não instalado"); }
try { ExcelJS = require('exceljs'); } catch(e){ console.log("ExcelJS não instalado - planilha será texto"); }
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || "https://evolution-api-production-4986.up.railway.app").trim().replace(/\/$/, "");
const EVOLUTION_INSTANCE = (process.env.EVOLUTION_INSTANCE || "shaft-arquitetura").trim();
const EVOLUTION_APIKEY = (process.env.EVOLUTION_APIKEY || "shaft123").trim();
const PORT = process.env.PORT || 3000;
const MEU_NUMERO = "5521986312911";
const AUTO_SEND = (process.env.AUTO_SEND_CORRETORES || "true").toLowerCase() === "true";
const MAX_LEADS_DIA = parseInt(process.env.MAX_LEADS_DIA || "5");

console.log("=== SHAFT JULIANA COMPLETA - ORÇAMENTO + PROPOSTA + CAÇADOR ===");
console.log("Auto-send:", AUTO_SEND, "Max/dia:", MAX_LEADS_DIA);

let groq = null;
if(GROQ_API_KEY && Groq){
  try{ groq = new Groq({apiKey: GROQ_API_KEY}); console.log("✅ Groq OK"); }catch(e){ console.log("❌ Groq erro:", e.message); }
}

// ===== BASE DE CUSTOS SHAFT - Mesma do agente Python =====
const CUSTOS_BASE = {
  demolicao: {valor_m2: 95, desc: "Demolição e remoção entulho"},
  eletrica: {valor_m2: 145, desc: "Elétrica completa"},
  hidraulica: {valor_m2: 125, desc: "Hidráulica"},
  gesso: {valor_m2: 95, desc: "Gesso liso + sancas"},
  pintura: {valor_m2: 75, desc: "Pintura Suvinil"},
  porcelanato_obra: {valor_m2: 110, desc: "Assentamento porcelanato"},
  porcelanato_mat: {valor_m2: 180, desc: "Porcelanato Portobello 90x90"},
  marcenaria: {valor_m2: 750, desc: "Marcenaria completa"},
  bancadas: {valor_un: 2800, desc: "Bancadas quartzo/m linear"},
  iluminacao: {valor_m2: 185, desc: "Iluminação completa"},
  loucas: {valor_un: 4500, desc: "Louças e metais Deca/banheiro"},
  ar: {valor_m2: 90, desc: "Infra ar condicionado"},
  projeto_gestao: {valor_m2: 165, desc: "Projeto 3D + gestão Shaft"}
};
const MULT_BAIRRO = {"Leblon":1.15,"Ipanema":1.15,"Jardim Botânico":1.10,"Barra da Tijuca":1.0,"Barra Península":1.05,"Recreio":0.95,"Lagoa":1.10};

function calcularOrcamento(m2, bairro, escopo, quartos=3, banheiros=2){
  const multBairro = MULT_BAIRRO[bairro] || MULT_BAIRRO["Barra da Tijuca"] || 1.0;
  let multEscopo = 1.0;
  if(escopo && escopo.toLowerCase().includes("cozinha")) multEscopo = 0.35;
  if(escopo && escopo.toLowerCase().includes("banheiro")) multEscopo = 0.15;
  const m2calc = m2 * multEscopo;
  let itens = []; let total=0;
  for(const [k,d] of Object.entries(CUSTOS_BASE)){
    if(d.valor_m2){
      let v = d.valor_m2 * m2calc * multBairro;
      if(k==="marcenaria" && multEscopo<1) v*=0.6;
      itens.push({categoria:d.desc, qtd: Math.round(m2calc*10)/10, unit: Math.round(d.valor_m2*multBairro), total: Math.round(v)});
      total+=v;
    } else {
      let qtd = 1;
      if(k==="bancadas") qtd = m2>100?4:3;
      if(k==="loucas") qtd = banheiros;
      let v = d.valor_un * qtd;
      itens.push({categoria:d.desc, qtd, unit:d.valor_un, total: Math.round(v)});
      total+=v;
    }
  }
  if(multEscopo<1) total = total*multEscopo;
  const totalImprev = total*1.05;
  return {itens, total, totalImprev, multBairro, multEscopo};
}

async function gerarPlanilhaExcel(cliente, m2, bairro, escopo, totalImprev, itens){
  if(!ExcelJS) return null;
  try{
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Orçamento Shaft');
    ws.columns = [{header:'Categoria',key:'cat',width:45},{header:'Qtd',key:'qtd',width:8},{header:'Unit R$',key:'unit',width:12},{header:'Total R$',key:'total',width:15}];
    ws.addRow([`SHAFT - Orçamento ${cliente} - ${m2}m² ${bairro} - ${new Date().toLocaleDateString('pt-BR')}`]);
    ws.addRow([]);
    itens.forEach(it=>ws.addRow({cat:it.categoria, qtd:it.qtd, unit:it.unit, total:it.total}));
    ws.addRow([]);
    ws.addRow({cat:'TOTAL ESTIMADO TUDO INCLUSO', total: Math.round(totalImprev)});
    const filePath = `/tmp/Orcamento_Shaft_${cliente.replace(/\s/g,'_')}_${m2}m2.xlsx`;
    await wb.xlsx.writeFile(filePath);
    return filePath;
  }catch(e){ console.error("Erro gerar Excel:", e.message); return null; }
}

async function enviarZap(telefone, texto){
  let tel = telefone.replace(/\D/g,''); if(!tel.startsWith('55')) tel='55'+tel;
  if(tel.length<12) return false;
  try{
    await axios.post(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {number: tel, text:texto, options:{delay:1200, presence:"composing"}}, {headers:{apikey: EVOLUTION_APIKEY}, timeout:15000});
    console.log(`📤 Enviado para ${tel}`);
    return true;
  }catch(e){ console.error("Erro envio:", e.response?.data||e.message); return false; }
}

async function enviarArquivoZap(telefone, filePath, caption){
  let tel = telefone.replace(/\D/g,''); if(!tel.startsWith('55')) tel='55'+tel;
  try{
    const FormData = require('form-data');
    const form = new FormData();
    form.append('number', tel);
    form.append('mediatype', 'document');
    form.append('media', fs.createReadStream(filePath));
    form.append('caption', caption || '');
    await axios.post(`${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, form, {headers:{...form.getHeaders(), apikey: EVOLUTION_APIKEY}, timeout:30000});
    console.log(`📎 Arquivo enviado para ${tel}: ${filePath}`);
    return true;
  }catch(e){ console.error("Erro enviar arquivo:", e.response?.data||e.message); return false; }
}

// ===== JULIANA =====
const promptBase = `Você é Juliana, assistente da Shaft Arquitetura do Mateus Carvalho (21) 98631-2911. Foco reformas alto padrão Barra, Leblon, Recreio. Ticket R$120-280k. Objetivo: QUALIFICAR (m2, bairro, dor, prazo, orçamento) e AGENDAR visita com Mateus. Se cliente pedir orçamento/valor/preço/quanto custa, colete m2, bairro e escopo e diga que vai gerar planilha detalhada em 2 minutos. Carioca elegante, curta (max 3 linhas), 1 pergunta por vez, humana. Nunca diga que é IA.`;

const conversas = {};

function getFallback(tel, nome, msg, len){
  if(len <=2) return `Oi ${nome.split(' ')[0]}! Aqui é a Juliana da Shaft do Mateus 😊 Vi seu interesse em reforma. Me conta, é apto ou casa e tem quantos m2?`;
  if(len <=4) return msg.toLowerCase().match(/\d{2,3}/) ? `Perfeito! E o que mais te incomoda nesse imóvel?` : `Perfeito! Tem quantos m2 mais ou menos?`;
  if(len <=6) return `Entendi! Quando pensava em começar? Mês ideal?`;
  if(len <=8) return `Anotado! Nossas reformas completas Shaft ficam entre R$120-280k tudo incluso. Só projeto a partir de R$12k. Tá dentro do que imaginava?`;
  return `Maravilha! Que tal marcar 30min com o Mateus? Tenho amanhã 10h ou quinta 15h. Qual prefere?`;
}

async function getJulianaResposta(tel, nome, msg){
  if(!conversas[tel]) conversas[tel]=[{role:"system", content: promptBase}];
  conversas[tel].push({role:"user", content: `${nome}: ${msg}`});
  const hist = conversas[tel].slice(-12);
  if(groq){
    try{
      const comp = await groq.chat.completions.create({messages: hist, model: "llama-3.1-8b-instant", temperature:0.72, max_tokens:350});
      const r = comp.choices[0].message.content;
      conversas[tel].push({role:"assistant", content: r});
      return r;
    }catch(e){ console.error("Groq erro:", e.message); }
  }
  const fb = getFallback(tel, nome, msg, hist.length);
  conversas[tel].push({role:"assistant", content: fb});
  return fb;
}

// Detecta pedido de orçamento e extrai dados
function extrairDadosOrcamento(texto, historico){
  // Junta histórico para pegar m2 e bairro já ditos
  const fullText = (historico.map(h=>h.content).join(' ') + ' ' + texto).toLowerCase();
  const m2Match = fullText.match(/(\d{2,3})\s*m2|(\d{2,3})m²|(\d{2,3}) metros/);
  const m2 = m2Match ? parseInt(m2Match[1]||m2Match[2]||m2Match[3]) : null;
  let bairro = null;
  if(fullText.includes('leblon')) bairro='Leblon';
  else if(fullText.includes('ipanema')) bairro='Ipanema';
  else if(fullText.includes('recreio')) bairro='Recreio';
  else if(fullText.includes('peninsula')||fullText.includes('península')) bairro='Barra Península';
  else if(fullText.includes('barra')) bairro='Barra da Tijuca';
  else if(fullText.includes('jardim')) bairro='Jardim Botânico';
  
  const isPedidoOrcamento = /orçamento|orcamento|quanto custa|valor|preço|preco|planilha/.test(fullText);
  
  let escopo = "completa";
  if(fullText.includes("cozinha")) escopo = "só cozinha";
  if(fullText.includes("banheiro")) escopo = "1 banheiro";
  if(fullText.includes("completa")||fullText.includes("tudo")) escopo = "completa";
  
  return {m2, bairro, escopo, isPedidoOrcamento};
}

async function gerarEEnviarOrcamento(telefone, nome, m2, bairro, escopo){
  const cliente = nome.split(' ')[0];
  const {itens, total, totalImprev} = calcularOrcamento(m2, bairro, escopo, 3, 2);
  
  const textoResumo = `🏗️ *Orçamento Shaft - ${cliente} - ${m2}m² ${bairro} - ${escopo}*\n\n*Total estimado tudo incluso:* R$ ${Math.round(totalImprev).toLocaleString('pt-BR')}\n(obra + marcenaria + projeto + gestão completa Shaft)\n\n*Detalhe rápido:*\n- Obra: R$ ${Math.round(itens.filter(i=>/Elétrica|Hidráulica|Gesso|Demolição/.test(i.categoria)).reduce((s,i)=>s+i.total,0)).toLocaleString('pt-BR')}\n- Marcenaria: R$ ${Math.round(itens.find(i=>/Marcenaria/.test(i.categoria))?.total||0).toLocaleString('pt-BR')}\n- Projeto + Gestão: R$ ${Math.round(itens.find(i=>/Projeto/.test(i.categoria))?.total||0).toLocaleString('pt-BR')}\n\n*Cronograma:* ${Math.floor(m2/10)+3} a ${Math.floor(m2/8)+4} meses\n*Validade:* 15 dias\n\nEstou gerando planilha completa com 3 abas (detalhamento, cronograma, condições) e já te mando aqui!`;

  await enviarZap(telefone, textoResumo);
  
  // Gera Excel e envia como documento
  const filePath = await gerarPlanilhaExcel(cliente, m2, bairro, escopo, totalImprev, itens);
  if(filePath){
    await new Promise(r=>setTimeout(r,2000));
    await enviarArquivoZap(telefone, filePath, `📊 Orçamento Shaft - ${m2}m² ${bairro} - R$ ${Math.round(totalImprev).toLocaleString('pt-BR')} - Validade 15 dias`);
  }
  
  // Mensagem final com CTA para fechar
  setTimeout(async ()=>{
    await enviarZap(telefone, `Quer marcar 30min com o Mateus pra ver 3D de um projeto muito parecido com seu de ${m2}m² no ${bairro} e fechar escopo? Tenho amanhã 10h ou quinta 15h. Qual prefere?\n\nLink direto agenda: https://wa.me/5521986312911?text=Quero%20agendar%20com%20Mateus%20${m2}m2%20${bairro}`);
  }, 3000);

  return {totalImprev, itens};
}

// ===== CAÇADOR MÁXIMO =====
function carregarImobiliarias(){
  const caminhos = ['./lista-imobiliarias-parceiras-Shaft.csv','../05-CRM/lista-imobiliarias-parceiras-Shaft.csv','/app/lista-imobiliarias-parceiras-Shaft.csv','./05-CRM/lista-imobiliarias-parceiras-Shaft.csv'];
  for(const caminho of caminhos){
    try{
      if(fs.existsSync(caminho)){
        const conteudo = fs.readFileSync(caminho,'utf8');
        const linhas = conteudo.split('\n').slice(1).filter(l=>l.trim());
        const lista=[];
        for(const linha of linhas){
          const partes = linha.split(',');
          if(partes.length>=3){
            const nome=partes[0].replace(/"/g,'').trim();
            const bairro=partes[1].replace(/"/g,'').trim();
            const tel=partes[2].replace(/"/g,'').trim();
            if(nome&&tel.match(/\d/)) lista.push({nome,bairro,telefone:tel,endereco:partes[3]||'',score:"A"});
          }
        }
        if(lista.length>0) return lista;
      }
    }catch{}
  }
  return [
    {nome:"JTavares Assessoria", bairro:"Ipanema/Leblon", telefone:"+552132614200", score:"A"},
    {nome:"Francisco Campos Imóveis", bairro:"Barra Península", telefone:"+(55) (21) 3473-9548", score:"A"},
    {nome:"Rio Best Imóveis", bairro:"Barra Península", telefone:"+(55) (21) 96599-1106", score:"A"}
  ];
}

async function gerarMensagemB2B(lead){
  const prompt = `Você é Mateus da Shaft. Gere mensagem curta B2B (max 5 linhas) para imobiliária alto padrão. Dados: ${lead.nome} - ${lead.bairro}. Objetivo: parceria onde imobiliária indica compradores imóveis 15+ anos que precisam reformar (R$120-280k), você paga 5% comissão e indica vendedores. Tom profissional elegante carioca.`;
  if(groq){
    try{
      const comp = await groq.chat.completions.create({messages:[{role:"user", content: prompt}], model:"llama-3.1-8b-instant", max_tokens:250, temperature:0.7});
      return comp.choices[0].message.content;
    }catch{}
  }
  return `Oi ${lead.nome.split(' ')[0]}! Aqui é Mateus da Shaft Arquitetura, especialista reformas alto padrão na ${lead.bairro}. Vi que são referência em ${lead.bairro}. Proposta B2B: vocês indicam compradores imóveis 15+ anos que precisam reformar (ticket R$120-280k), pago 5% comissão projeto e indico vendedores pra vocês. Faz sentido 15min essa semana?`;
}

async function rodarCacadaMaxima(){
  console.log(`\n=== CAÇADA MÁXIMA ${new Date().toLocaleString('pt-BR')} Auto:${AUTO_SEND} Max:${MAX_LEADS_DIA} ===`);
  const imobiliarias = carregarImobiliarias();
  let historico=[]; const histPath='./historico_enviados.json'; const histTmp='/tmp/historico_enviados.json';
  try{ historico=JSON.parse(fs.readFileSync(histPath,'utf8')); }catch{ try{ historico=JSON.parse(fs.readFileSync(histTmp,'utf8')); }catch{} }
  const novos = imobiliarias.filter(l=>!historico.includes(l.nome)).slice(0, MAX_LEADS_DIA);
  if(novos.length===0){ await enviarZap(MEU_NUMERO, `🏗️ Shaft - ${new Date().toLocaleDateString('pt-BR')} - Nenhum lead B2B novo hoje. Lista acabou, resetando ciclo amanhã.`); return; }
  let relatorio = `🏗️ *SHAFT - CAÇADA MÁXIMA - ${new Date().toLocaleDateString('pt-BR')}*\n\nJuliana vai abordar ${novos.length} imobiliárias HOJE (${AUTO_SEND?'REAL':'TESTE'}):\n\n`;
  let enviadas=0;
  for(const lead of novos){
    const msg = await gerarMensagemB2B(lead);
    console.log(`--- ${lead.nome} - ${lead.telefone} ---\n${msg.substring(0,100)}...\n`);
    let ok=false;
    if(AUTO_SEND){
      ok = await enviarZap(lead.telefone, msg);
      if(ok) await new Promise(r=>setTimeout(r, (240+Math.random()*120)*1000));
    } else { ok=true; }
    if(ok){ relatorio+=`*${lead.bairro}* - ${lead.nome}\n📞 ${lead.telefone}\n💬 ${msg.substring(0,100)}...\n${AUTO_SEND?'✅ Enviado REAL':'📝 Teste'}\n\n`; historico.push(lead.nome); enviadas++; }
  }
  try{ fs.writeFileSync(histPath, JSON.stringify(historico,null,2)); }catch{ fs.writeFileSync(histTmp, JSON.stringify(historico,null,2)); }
  relatorio+=`\n✅ *${enviadas} abordagens ${AUTO_SEND?'ENVIADAS REAL':'geradas (teste)'}*\nPróxima caçada amanhã 9h e 15h.`;
  await enviarZap(MEU_NUMERO, relatorio);
  console.log(relatorio);
}

cron.schedule('0 12 * * *', ()=>{ console.log("⏰ 9h BRT - Caçada"); rodarCacadaMaxima(); }, {timezone: "America/Sao_Paulo"});
cron.schedule('0 18 * * *', ()=>{ console.log("⏰ 15h BRT - Caçada tarde"); rodarCacadaMaxima(); }, {timezone: "America/Sao_Paulo"});

// ===== WEBHOOK =====
app.post('/webhook', async (req,res)=>{
  try{
    const data = req.body;
    if(data.event !== "messages.upsert") return res.sendStatus(200);
    const md = data.data;
    if(!md || md.key?.fromMe) return res.sendStatus(200);
    const tel = md.key.remoteJid;
    const mensagem = md.message?.conversation || md.message?.extendedTextMessage?.text || "";
    const nome = md.pushName || "Cliente";
    if(!mensagem || tel.includes("@g.us") || tel.includes("status")) return res.sendStatus(200);
    
    console.log(`\n📩 ${nome} (${tel}): ${mensagem}`);
    
    // Detecta pedido de orçamento
    const historico = conversas[tel] || [];
    const dadosOrc = extrairDadosOrcamento(mensagem, historico);
    
    if(dadosOrc.isPedidoOrcamento && dadosOrc.m2 && dadosOrc.bairro){
      console.log(`💰 Pedido de orçamento detectado: ${dadosOrc.m2}m² ${dadosOrc.bairro} ${dadosOrc.escopo}`);
      const respOrc = `Perfeito! Já vou gerar sua planilha orçamentária detalhada para ${dadosOrc.m2}m² no ${dadosOrc.bairro} - ${dadosOrc.escopo}. Me dá 30 segundos que já te mando aqui com 3 abas (detalhamento, cronograma e condições) + resumo! 😊`;
      await enviarZap(tel, respOrc);
      
      // Gera e envia orçamento
      setTimeout(async ()=>{
        await gerarEEnviarOrcamento(tel, nome, dadosOrc.m2, dadosOrc.bairro, dadosOrc.escopo);
      }, 1500);
      
      // Salva conversa
      if(!conversas[tel]) conversas[tel]=[{role:"system", content: promptBase}];
      conversas[tel].push({role:"user", content: `${nome}: ${mensagem}`});
      conversas[tel].push({role:"assistant", content: respOrc});
      return res.sendStatus(200);
    }
    
    // Fluxo normal Juliana
    const resp = await getJulianaResposta(tel, nome, mensagem);
    console.log(`📤 Juliana: ${resp}`);
    await new Promise(r=>setTimeout(r, 1200));
    await enviarZap(tel, resp);
    res.sendStatus(200);
  }catch(e){ console.error(e); res.sendStatus(200); }
});

function extrairDadosOrcamento(texto, historico){
  const fullText = (historico.map(h=>h.content).join(' ') + ' ' + texto).toLowerCase();
  const m2Match = fullText.match(/(\d{2,3})\s*m2|(\d{2,3})m²|(\d{2,3}) metros/);
  const m2 = m2Match ? parseInt(m2Match[1]||m2Match[2]||m2Match[3]) : null;
  let bairro = null;
  if(fullText.includes('leblon')) bairro='Leblon';
  else if(fullText.includes('ipanema')) bairro='Ipanema';
  else if(fullText.includes('recreio')) bairro='Recreio';
  else if(fullText.includes('peninsula')||fullText.includes('península')) bairro='Barra Península';
  else if(fullText.includes('barra')) bairro='Barra da Tijuca';
  else if(fullText.includes('jardim')) bairro='Jardim Botânico';
  const isPedidoOrcamento = /orçamento|orcamento|quanto custa|valor|preço|preco|planilha/.test(fullText);
  let escopo = "completa";
  if(fullText.includes("cozinha")) escopo = "só cozinha";
  if(fullText.includes("banheiro")) escopo = "1 banheiro";
  return {m2, bairro, escopo, isPedidoOrcamento};
}

app.get('/', (req,res)=>res.send(`<h1>✅ Shaft Juliana COMPLETA ONLINE</h1><p>Orçamento automático + Proposta que converte + Caçador 2x/dia + Atendimento 24h</p><p>Auto-send: ${AUTO_SEND?'REAL':'TESTE'} | Max/dia: ${MAX_LEADS_DIA}</p><p><a href="/teste?msg=Oi, meu apto é na Barra 120m2, quanto custa?">Teste Juliana + Orçamento</a> | <a href="/rodar-cacada">Rodar caçada agora</a> | <a href="/gerar-orcamento?m2=130&bairro=Leblon&escopo=completa&cliente=Ana">Gerar orçamento teste</a></p>`));
app.get('/teste', async (req,res)=>{ const m=req.query.msg||"Oi, meu apto é na Barra 120m2, quanto custa?"; const r=await getJulianaResposta("teste","Teste",m); res.json({pergunta:m, resposta:r}); });
app.get('/gerar-orcamento', async (req,res)=>{
  const m2 = parseInt(req.query.m2||130); const bairro=req.query.bairro||'Leblon'; const escopo=req.query.escopo||'completa'; const cliente=req.query.cliente||'Teste';
  const {totalImprev, itens} = calcularOrcamento(m2,bairro,escopo);
  const filePath = await gerarPlanilhaExcel(cliente,m2,bairro,escopo,totalImprev,itens);
  res.json({cliente,m2,bairro,escopo,total: Math.round(totalImprev), itens: itens.length, arquivo: filePath||'ExcelJS não instalado - modo texto'});
});
app.get('/rodar-cacada', async (req,res)=>{ res.send(`Caçada MÁXIMA iniciada! Modo: ${AUTO_SEND?'REAL':'TESTE'}. Verifique WhatsApp.`); rodarCacadaMaxima(); });
app.get('/health', (req,res)=>res.send("OK"));

app.listen(PORT, '0.0.0.0', ()=>console.log(`\n🚀 Shaft COMPLETA porta ${PORT} - Orçamento + Proposta + Caçador\n`));
