/**
 * SHAFT ARQUITETURA - BOT JULIANA - RAILWAY FIX - NÃO CRASHA MAIS
 * Versão corrigida para Railway - não sai do ar se Groq falhar
 */

const express = require('express');
const axios = require('axios');
let Groq;
try { Groq = require('groq-sdk'); } catch(e){ console.log("Groq SDK não instalado, usando fallback"); }

const app = express();
app.use(express.json());

// CONFIG - Railway Variables
const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || "https://evolution-api-production-4986.up.railway.app").trim().replace(/\/$/, "");
const EVOLUTION_INSTANCE = (process.env.EVOLUTION_INSTANCE || "shaft-arquitetura").trim();
const EVOLUTION_APIKEY = (process.env.EVOLUTION_APIKEY || process.env.AUTHENTICATION_API_KEY || "shaft123").trim();
const PORT = process.env.PORT || 3000;

console.log("=== SHAFT BOT JULIANA START ===");
console.log("PORT:", PORT);
console.log("Evolution URL:", EVOLUTION_API_URL);
console.log("Instance:", EVOLUTION_INSTANCE);
console.log("Groq Key present:", GROQ_API_KEY ? "SIM - " + GROQ_API_KEY.substring(0,10) + "..." : "NAO");
console.log("API Key present:", EVOLUTION_APIKEY ? "SIM" : "NAO");

let groq = null;
if (GROQ_API_KEY && GROQ_API_KEY.startsWith("gsk_") && Groq) {
  try { groq = new Groq({apiKey: GROQ_API_KEY}); console.log("✅ Groq client criado"); }
  catch(e){ console.log("❌ Erro criar Groq client:", e.message); }
} else {
  console.log("⚠️ Sem Groq ou chave inválida - usando fallback sem IA (ainda funciona!)");
}

// Prompt
const promptBase = `Você é Juliana, assistente da Shaft Arquitetura do arquiteto Mateus Carvalho (21) 98631-2911. Foco reformas alto padrão Barra, Leblon, Recreio. Ticket R$120-280k. Objetivo: QUALIFICAR (perguntar m2, bairro, dor, prazo, orçamento) e AGENDAR visita com Mateus. Seja carioca elegante, curta (max 3 linhas), 1 pergunta por vez, humana. Nunca diga que é IA. Mencione Shaft e Mateus.`;

const conversas = {};

// Função fallback SEM IA - funciona mesmo se Groq falhar
function getFallbackResposta(telefone, nome, mensagem, historicoLen){
  const msg = mensagem.toLowerCase();
  if(historicoLen <= 2){
    return `Oi ${nome.split(' ')[0]}! Aqui é a Juliana da Shaft Arquitetura do Mateus Carvalho 😊 Vi seu interesse em reforma na Barra/Leblon. Me conta, é apto ou casa e tem quantos m2?`;
  } else if(historicoLen <= 4){
    if(msg.match(/\d{2,3}/)) return `Perfeito! E o que mais te incomoda nesse imóvel hoje? É planta antiga, acabamento, iluminação?`;
    return `Perfeito! Esse imóvel tem quantos m2 mais ou menos?`;
  } else if(historicoLen <= 6){
    return `Entendi! E quando você pensava em começar essa reforma? Tem um mês ideal?`;
  } else if(historicoLen <= 8){
    return `Anotado! Só pra te direcionar pro Mateus: nossas reformas completas na Shaft ficam entre R$120 e 280k tudo incluso (projeto+gestão+obra+marcenaria). Só projeto a partir de R$12k. Isso tá dentro do que imaginava investir?`;
  } else {
    return `Maravilha! Que tal marcarmos 30min com o Mateus? Ele te mostra um 3D parecido e já te passa prazo e investimento certeiro. Tenho amanhã 10h ou quinta 15h. Qual prefere? Me chama no WhatsApp direto se preferir: https://wa.me/5521986312911`;
  }
}

async function getJulianaResposta(telefone, nome, mensagem){
  const len = (conversas[telefone]?.length || 0);
  
  if(!conversas[telefone]){
    conversas[telefone]=[{role:"system", content: promptBase}];
  }
  conversas[telefone].push({role:"user", content: `${nome}: ${mensagem}`});
  const hist = conversas[telefone].slice(-12);

  // Tenta Groq se tiver
  if(groq){
    try{
      const comp = await groq.chat.completions.create({
        messages: hist,
        model: "llama-3.1-8b-instant",
        temperature: 0.72,
        max_tokens: 350
      });
      const resp = comp.choices[0].message.content;
      conversas[telefone].push({role:"assistant", content: resp});
      console.log(`✅ Groq OK - ${comp.usage?.total_tokens || 0} tokens`);
      return resp;
    }catch(err){
      console.error(`❌ Erro Groq: ${err.message} - usando fallback`);
    }
  }

  // Fallback sem IA
  const fallback = getFallbackResposta(telefone, nome, mensagem, len);
  conversas[telefone].push({role:"assistant", content: fallback});
  return fallback;
}

async function enviarMensagem(telefone, texto){
  try{
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    console.log(`Enviando para ${telefone} via ${url}`);
    await axios.post(url, {
      number: telefone,
      text: texto,
      options: { delay: 1200, presence: "composing" }
    },{
      headers: { apikey: EVOLUTION_APIKEY },
      timeout: 10000
    });
    console.log(`✅ Enviado para ${telefone}`);
  }catch(e){
    console.error("Erro envio Evolution:", e.response?.data || e.message);
  }
}

// Webhook Evolution
app.post('/webhook', async (req,res)=>{
  try{
    const data = req.body;
    console.log("Webhook recebido:", data.event);
    if(data.event !== "messages.upsert") return res.sendStatus(200);
    const msgData = data.data;
    if(!msgData || msgData.key?.fromMe) return res.sendStatus(200);

    const telefone = msgData.key.remoteJid;
    const mensagem = msgData.message?.conversation || msgData.message?.extendedTextMessage?.text || msgData.message?.imageMessage?.caption || "";
    const nome = msgData.pushName || "Cliente";

    if(!mensagem || telefone.includes("@g.us") || telefone.includes("status@broadcast")) return res.sendStatus(200);

    console.log(`\n📩 ${nome} (${telefone}): ${mensagem}`);

    const resposta = await getJulianaResposta(telefone, nome, mensagem);
    console.log(`📤 Juliana: ${resposta}`);

    await new Promise(r=>setTimeout(r, 1000));
    await enviarMensagem(telefone, resposta);

    res.sendStatus(200);
  }catch(err){
    console.error("Erro webhook:", err);
    res.sendStatus(200);
  }
});

// Healthcheck - Railway precisa disso pra não dar "Application failed"
app.get('/', (req,res)=>{
  res.status(200).send(`
    <h1>✅ Shaft Bot Juliana ONLINE</h1>
    <p>Evolution: ${EVOLUTION_INSTANCE} @ ${EVOLUTION_API_URL}</p>
    <p>Groq: ${groq ? "Conectado" : "Fallback (sem IA) - ainda funciona!"}</p>
    <p>Teste: <a href="/teste?msg=Oi, meu apto é na Barra 120m2">/teste?msg=Oi...</a></p>
    <p>Webhook: POST /webhook - Configure na Evolution: ${EVOLUTION_API_URL}/manager > shaft-arquitetura > Webhook</p>
    <p>Hora: ${new Date().toISOString()}</p>
  `);
});

app.get('/teste', async (req,res)=>{
  try{
    const msg = req.query.msg || "Oi, meu apto é na Barra 120m2";
    const resp = await getJulianaResposta("teste", "Cliente Teste", msg);
    res.json({pergunta: msg, resposta: resp, groq: groq ? "ok" : "fallback"});
  }catch(e){
    res.status(500).json({erro: e.message});
  }
});

app.get('/health', (req,res)=>res.status(200).send("OK"));

// Bind em 0.0.0.0 - Railway precisa disso
app.listen(PORT, '0.0.0.0', ()=>{
  console.log(`\n🚀 Bot Juliana Shaft rodando em 0.0.0.0:${PORT}`);
  console.log(`Health: / | Teste: /teste | Webhook: /webhook\n`);
});
