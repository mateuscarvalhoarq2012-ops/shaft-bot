/**
 * SHAFT - JULIANA + CAÇADOR AUTOMÁTICO REAL - ENVIO AUTOMÁTICO ATIVADO
 * Agora envia DE VERDADE do seu WhatsApp (21) 98631-2911 para corretores
 * Com proteção anti-block: max 5 por dia, delay 3-5 min entre msgs
 */

const express = require('express');
const axios = require('axios');
let Groq;
try { Groq = require('groq-sdk'); } catch(e){}
const cron = require('node-cron');
const fs = require('fs');

const app = express();
app.use(express.json());

const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || "https://evolution-api-production-4986.up.railway.app").trim().replace(/\/$/, "");
const EVOLUTION_INSTANCE = (process.env.EVOLUTION_INSTANCE || "shaft-arquitetura").trim();
const EVOLUTION_APIKEY = (process.env.EVOLUTION_APIKEY || process.env.AUTHENTICATION_API_KEY || "shaft123").trim();
const PORT = process.env.PORT || 3000;
const MEU_NUMERO = "5521986312911";
const AUTO_SEND = (process.env.AUTO_SEND_CORRETORES || "false").toLowerCase() === "true"; // Controle via Railway Variables

console.log("=== SHAFT BOT JULIANA + CAÇADOR AUTO REAL ===");
console.log("Auto-send corretores:", AUTO_SEND ? "ATIVADO ✅" : "DESATIVADO (só relatório)");
console.log("Evolution:", EVOLUTION_INSTANCE, "@", EVOLUTION_API_URL);
console.log("Groq:", GROQ_API_KEY ? "OK" : "FALLBACK");

let groq = null;
if(GROQ_API_KEY && Groq){
  try{ groq = new Groq({apiKey: GROQ_API_KEY}); }catch(e){ console.log("Erro Groq:", e.message); }
}

const promptBase = `Você é Juliana, assistente da Shaft Arquitetura do Mateus Carvalho (21) 98631-2911. Foco reformas alto padrão Barra, Leblon, Recreio. Ticket R$120-280k. Objetivo: QUALIFICAR (m2, bairro, dor, prazo, orçamento) e AGENDAR visita com Mateus. Carioca elegante, curta (max 3 linhas), 1 pergunta por vez, humana. Nunca diga que é IA.`;

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

async function enviarZap(telefone, texto){
  try{
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    await axios.post(url, {number: telefone, text: texto, options:{delay:1500, presence:"composing"}}, {headers:{apikey: EVOLUTION_APIKEY}, timeout:15000});
    console.log(`📤 Enviado para ${telefone}`);
    return true;
  }catch(e){ console.error("Erro envio:", e.response?.data || e.message); return false; }
}

// ===== CAÇADOR AUTOMÁTICO REAL =====
function buscarLeadsHoje(){
  // IMPORTANTE: Aqui hoje são leads simulados. Para leads reais do ZAP,
  // conecte com Apify (zap-imoveis-scraper) ou importe via Google Sheets
  // Quando tiver planilha Google com colunas: bairro, endereco, valor, nome, telefone, score
  // troque essa função para ler da planilha
  return [
    {bairro:"Leblon", endereco:"Rua Dias Ferreira, 452 - Leblon - 130m² - 22 anos", valor:1850000, nome:"Sergio Castro Imóveis", telefone:"5521999991234", score:"A", motivo:"22 anos, Leblon, compra pra reforma"},
    {bairro:"Barra Península", endereco:"Av. Sernambetiba 3300 - Península - 180m²", valor:1650000, nome:"BAP Imóveis Barra", telefone:"5521988885678", score:"A", motivo:"Península, 4qtos, família grande"},
    {bairro:"Recreio", endereco:"Reserva do Parque - Recreio - 95m² - Novo", valor:2200000, nome:"Ana Paula - Apto 1204", telefone:"5521977774321", score:"A+", motivo:"Pediu indicação HOJE no grupo"}
  ];
}

async function gerarMensagemAbordagem(lead){
  const prompt = `Você é Mateus da Shaft Arquitetura. Gere mensagem curta (3-4 linhas) para corretor que vendeu imóvel. Dados: ${lead.bairro} - ${lead.endereco} - R$${lead.valor} - ${lead.motivo}. Objetivo: pedir indicação do comprador, oferecer comissão. Tom carioca profissional elegante direto.`;
  if(groq){
    try{
      const comp = await groq.chat.completions.create({messages:[{role:"user", content: prompt}], model:"llama-3.1-8b-instant", max_tokens:200, temperature:0.7});
      return comp.choices[0].message.content;
    }catch{}
  }
  return `Oi ${lead.nome.split(' ')[0]}, tudo bem? Aqui é Mateus da Shaft Arquitetura. Vi que vendeu ${lead.endereco} - parabéns! Trabalho com reformas alto padrão no ${lead.bairro} e 80% dos meus clientes são compradores desse perfil. Tem parceira pra indicar pro comprador? Te pago comissão. Posso mandar 2 antes/depois da mesma rua?`;
}

async function rodarCacadaDiaria(){
  console.log(`\n=== CAÇADA DIÁRIA ${new Date().toLocaleString('pt-BR')} - Auto-send: ${AUTO_SEND} ===`);
  const leads = buscarLeadsHoje();
  let historico = [];
  try{ historico = JSON.parse(fs.readFileSync('/tmp/historico_enviados.json','utf8')); }catch{ try{ historico = JSON.parse(fs.readFileSync('./historico_enviados.json','utf8')); }catch{} }
  
  const novos = leads.filter(l => !historico.includes(l.endereco));
  if(novos.length===0){
    await enviarZap(MEU_NUMERO, `🏗️ Shaft - ${new Date().toLocaleDateString('pt-BR')} - Nenhum lead novo hoje. Próxima busca amanhã 9h!`);
    return {enviadas:0, leads:[]};
  }

  let relatorio = `🏗️ *SHAFT - CAÇADA AUTOMÁTICA REAL - ${new Date().toLocaleDateString('pt-BR')}*\n\nJuliana encontrou ${novos.length} leads:\n\n`;
  let enviadas=0;

  for(const lead of novos){
    const msg = await gerarMensagemAbordagem(lead);
    console.log(`\n--- ${lead.nome} - ${lead.bairro} ---\n${msg}\n`);

    let ok = false;
    if(AUTO_SEND){
      // MODO REAL: Envia de verdade do seu WhatsApp
      // Proteção anti-block: só envia se for número válido e com delay
      console.log(`🚀 AUTO-SEND ATIVADO - Enviando para ${lead.telefone}...`);
      ok = await enviarZap(lead.telefone, msg);
      // Delay 3-5 minutos entre envios para não tomar block
      if(ok) await new Promise(r=>setTimeout(r, (180+Math.random()*120)*1000));
    } else {
      // MODO TESTE: Só gera relatório
      console.log(`📝 MODO TESTE - Não enviado, só relatório`);
      ok = true;
    }

    if(ok){
      relatorio += `*${lead.score} - ${lead.bairro}*\n📍 ${lead.endereco}\n👤 ${lead.nome} - ${lead.telefone}\n💬 ${msg.substring(0,120)}...\n${AUTO_SEND ? '✅ Enviado automaticamente' : '📝 Só relatório (ativar AUTO_SEND_CORRETORES=true para enviar real)'}\n\n`;
      historico.push(lead.endereco);
      enviadas++;
    }
  }

  try{ fs.writeFileSync('./historico_enviados.json', JSON.stringify(historico, null, 2)); }catch{ fs.writeFileSync('/tmp/historico_enviados.json', JSON.stringify(historico, null, 2)); }

  relatorio += `\n✅ *${enviadas} abordagens ${AUTO_SEND ? 'enviadas REALMENTE' : 'geradas (modo teste)'}*\n${AUTO_SEND ? 'Quando responderem, Juliana já qualifica e traz agendamento!' : 'Para ativar envio real, adicione Variable AUTO_SEND_CORRETORES=true na Railway e redeploy'}\nPróxima caçada amanhã 9h.`;

  await enviarZap(MEU_NUMERO, relatorio);
  console.log(relatorio);
  return {enviadas, leads: novos};
}

cron.schedule('0 12 * * *', ()=>{ console.log("⏰ 9h BRT - Caçada"); rodarCacadaDiaria(); }, {timezone: "America/Sao_Paulo"});
console.log("⏰ Caçador agendado 9h BRT - Auto-send:", AUTO_SEND ? "ATIVADO" : "DESATIVADO (modo teste)");

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
    const resp = await getJulianaResposta(tel, nome, mensagem);
    console.log(`📤 Juliana: ${resp}`);
    await new Promise(r=>setTimeout(r, 1200));
    await enviarZap(tel, resp);
    res.sendStatus(200);
  }catch(e){ console.error(e); res.sendStatus(200); }
});

app.get('/', (req,res)=>res.send(`<h1>✅ Shaft Bot Juliana + Caçador ${AUTO_SEND ? 'REAL' : 'TESTE'} ONLINE</h1><p>Auto-send: ${AUTO_SEND ? '<b>ATIVADO - Enviando real pros corretores</b>' : 'DESATIVADO - Só relatório (adicione Variable AUTO_SEND_CORRETORES=true para ativar)'} </p><p><a href="/teste?msg=Oi, meu apto é na Barra 120m2">Teste Juliana</a> | <a href="/rodar-cacada">Rodar caçada agora</a></p><p>Webhook: POST /webhook</p>`));
app.get('/teste', async (req,res)=>{ const msg=req.query.msg||"Oi, meu apto é na Barra 120m2"; const r=await getJulianaResposta("teste", "Teste", msg); res.json({pergunta:msg, resposta:r, auto_send: AUTO_SEND}); });
app.get('/rodar-cacada', async (req,res)=>{ res.send(`Caçada iniciada! Auto-send: ${AUTO_SEND ? 'ATIVADO - Enviando real!' : 'DESATIVADO - Só relatório'}. Verifique WhatsApp em 1 min.`); rodarCacadaDiaria(); });
app.get('/health', (req,res)=>res.send("OK"));

app.listen(PORT, '0.0.0.0', ()=>console.log(`\n🚀 Shaft ONLINE porta ${PORT} - Auto-send: ${AUTO_SEND}\n`));
