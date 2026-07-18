/**
 * SHAFT ARQUITETURA - BOT JULIANA - RAILWAY + EVOLUTION API - 100% GRATIS
 * Mateus Carvalho - (21) 98631-2911
 * 
 * Esse bot roda na Railway (mesmo projeto da Evolution)
 * Conecta via Webhook - quando mensagem chega na Evolution, ela chama esse bot
 * Bot chama Groq (grátis) e responde via Evolution
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Groq = require('groq-sdk');
const fs = require('fs');

const app = express();
app.use(express.json());

// CONFIG - Vem das Variables da Railway
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "https://evolution-api-production-4986.up.railway.app";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "shaft-arquitetura";
const EVOLUTION_APIKEY = process.env.EVOLUTION_APIKEY || process.env.AUTHENTICATION_API_KEY || "shaft123";
const PORT = process.env.PORT || 3000;

console.log("=== SHAFT BOT JULIANA ===");
console.log("Evolution URL:", EVOLUTION_API_URL);
console.log("Instance:", EVOLUTION_INSTANCE);
console.log("Groq Key:", GROQ_API_KEY ? GROQ_API_KEY.substring(0,10)+"..." : "❌ FALTANDO");
console.log("API Key:", EVOLUTION_APIKEY ? "Configurada" : "❌ FALTANDO");

if(!GROQ_API_KEY){
  console.error("❌ GROQ_API_KEY não configurada nas Variables da Railway!");
  process.exit(1);
}

const groq = new Groq({apiKey: GROQ_API_KEY});

// Prompt Shaft
let promptBase = `Você é Juliana, assistente da Shaft Arquitetura do Mateus Carvalho (21) 98631-2911. Foco reformas alto padrão Barra, Leblon, Recreio. Ticket R$120-280k. Objetivo: QUALIFICAR (m2, bairro, dor, prazo, orçamento) e AGENDAR visita com Mateus. Carioca elegante, curta (max 3 linhas), 1 pergunta por vez, humana. Nunca diga que é IA. Mencione Shaft e Mateus.`;
try{
  if(fs.existsSync('./prompts/prompt-whatsapp-SHAFT.txt')){
    promptBase = fs.readFileSync('./prompts/prompt-whatsapp-SHAFT.txt','utf8');
  }
} catch{}

const conversas = {};

async function getJulianaResposta(telefone, nome, mensagem){
  if(!conversas[telefone]){
    conversas[telefone]=[{role:"system", content: promptBase}];
  }
  conversas[telefone].push({role:"user", content: `${nome}: ${mensagem}`});
  const hist = conversas[telefone].slice(-12);

  const comp = await groq.chat.completions.create({
    messages: hist,
    model: "llama-3.1-8b-instant",
    temperature: 0.72,
    max_tokens: 350
  });

  const resp = comp.choices[0].message.content;
  conversas[telefone].push({role:"assistant", content: resp});
  return resp;
}

async function enviarMensagem(telefone, texto){
  try{
    // Evolution API v2 endpoint: /message/sendText/{instance}
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    await axios.post(url, {
      number: telefone,
      text: texto,
      options: { delay: 1200, presence: "composing" }
    },{
      headers: { apikey: EVOLUTION_APIKEY }
    });
    console.log(`✅ Enviado para ${telefone}: ${texto.substring(0,60)}...`);
  }catch(e){
    console.error("Erro envio:", e.response?.data || e.message);
  }
}

// Webhook que Evolution chama quando chega mensagem
app.post('/webhook', async (req,res)=>{
  try{
    const data = req.body;
    // Evolution envia event messages.upsert
    if(data.event !== "messages.upsert") return res.sendStatus(200);
    const msgData = data.data;
    if(msgData.key.fromMe) return res.sendStatus(200);

    const telefone = msgData.key.remoteJid; // 5521...@s.whatsapp.net
    const mensagem = msgData.message?.conversation || msgData.message?.extendedTextMessage?.text || "";
    const nome = msgData.pushName || "Cliente";

    if(!mensagem || telefone.includes("@g.us")) return res.sendStatus(200);

    console.log(`\n📩 ${nome} (${telefone}): ${mensagem}`);

    const resposta = await getJulianaResposta(telefone, nome, mensagem);
    console.log(`📤 Juliana: ${resposta}`);

    // Delay humano 1-2s
    await new Promise(r=>setTimeout(r, 1200 + Math.random()*800));
    await enviarMensagem(telefone, resposta);

    res.sendStatus(200);
  }catch(err){
    console.error("Erro webhook:", err);
    res.sendStatus(200);
  }
});

// Teste sem WhatsApp
app.get('/teste', async (req,res)=>{
  const msg = req.query.msg || "Oi, meu apto é na Barra 120m2";
  const resp = await getJulianaResposta("teste", "Cliente Teste", msg);
  res.json({pergunta: msg, resposta: resp});
});

app.get('/', (req,res)=>{
  res.send(`
    <h1>Shaft - Bot Juliana ONLINE ✅</h1>
    <p>Evolution: ${EVOLUTION_INSTANCE} - ${EVOLUTION_API_URL}</p>
    <p>Teste: <a href="/teste?msg=Oi, meu apto é na Barra 120m2">/teste?msg=Oi...</a></p>
    <p>Webhook: POST /webhook</p>
    <p>Configure na Evolution: Integrations > Webhook > URL: https://${req.get('host')}/webhook > Events: messages.upsert</p>
  `);
});

app.listen(PORT, ()=>console.log(`🚀 Bot Juliana Shaft rodando na porta ${PORT} - Webhook /webhook`));
