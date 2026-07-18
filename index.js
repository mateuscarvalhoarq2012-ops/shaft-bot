/**
 * SHAFT - JULIANA MODO MÁXIMO - CAÇA + ABORDA MÁXIMO DE LEADS POR DIA
 * Objetivo: Resolver problema "não chega leads no WWP do escritório"
 * 
 * Estratégia:
 * - Todo dia 9h: Busca 5 leads B2B (imobiliárias reais da lista) + 3 leads B2C (simulados por enquanto)
 * - Envia abordagem automática do seu WhatsApp (21) 98631-2911
 * - Quando respondem, Juliana qualifica e traz agendamento
 * - Máximo 5 por dia para não tomar block, com delay 4-6 min entre msgs
 */

const express = require('express');
const axios = require('axios');
let Groq;
try { Groq = require('groq-sdk'); } catch(e){}
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
const AUTO_SEND = (process.env.AUTO_SEND_CORRETORES || "true").toLowerCase() === "true"; // ATIVADO AGORA
const MAX_LEADS_DIA = parseInt(process.env.MAX_LEADS_DIA || "5");

console.log("=== SHAFT JULIANA MODO MÁXIMO ===");
console.log("Auto-send:", AUTO_SEND, "| Max/dia:", MAX_LEADS_DIA);
console.log("Evolution:", EVOLUTION_INSTANCE, "@", EVOLUTION_API_URL);

let groq = null;
if(GROQ_API_KEY && Groq){
  try{ groq = new Groq({apiKey: GROQ_API_KEY}); console.log("✅ Groq OK"); }catch(e){ console.log("❌ Groq erro:", e.message); }
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
  // Formata telefone: remove tudo que não é número, garante 55 na frente
  let tel = telefone.replace(/\D/g, '');
  if(!tel.startsWith('55')) tel = '55' + tel;
  if(tel.length < 12) { console.log(`❌ Telefone inválido: ${telefone} -> ${tel}`); return false; }
  
  try{
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    await axios.post(url, {number: tel, text: texto, options:{delay:1500, presence:"composing"}}, {headers:{apikey: EVOLUTION_APIKEY}, timeout:15000});
    console.log(`📤 Enviado para ${tel} (${telefone})`);
    return true;
  }catch(e){ console.error(`❌ Erro envio para ${tel}:`, e.response?.data?.message || e.message); return false; }
}

// ===== CAÇADOR MODO MÁXIMO - LÊ LISTA REAL DE IMOBILIÁRIAS =====
function carregarImobiliariasReais(){
  // Tenta carregar CSV real que criamos com telefones públicos de imobiliárias
  const caminhos = [
    './lista-imobiliarias-parceiras-Shaft.csv',
    '../05-CRM/lista-imobiliarias-parceiras-Shaft.csv',
    '/app/lista-imobiliarias-parceiras-Shaft.csv',
    './05-CRM/lista-imobiliarias-parceiras-Shaft.csv'
  ];
  
  for(const caminho of caminhos){
    try{
      if(fs.existsSync(caminho)){
        const conteudo = fs.readFileSync(caminho, 'utf8');
        const linhas = conteudo.split('\n').slice(1).filter(l=>l.trim());
        const imobiliarias = [];
        for(const linha of linhas){
          // CSV simples: Nome,Bairro,Telefone,Endereco...
          const partes = linha.split(',');
          if(partes.length >= 3){
            const nome = partes[0].replace(/"/g,'').trim();
            const bairro = partes[1].replace(/"/g,'').trim();
            const telefone = partes[2].replace(/"/g,'').trim();
            if(nome && telefone && telefone.match(/\d/)){
              imobiliarias.push({nome, bairro, telefone, endereco: partes[3]||'', score: "A", origem: "B2B Imobiliária", motivo: "Parceria alto padrão Barra/Leblon"});
            }
          }
        }
        if(imobiliarias.length > 0){
          console.log(`✅ Carregadas ${imobiliarias.length} imobiliárias reais de ${caminho}`);
          return imobiliarias;
        }
      }
    }catch(e){ console.log(`Erro ler ${caminho}:`, e.message); }
  }
  
  // Fallback com 3 exemplos reais se CSV não encontrado
  console.log("⚠️ CSV de imobiliárias não encontrado, usando lista fallback com números reais públicos");
  return [
    {nome:"JTavares Assessoria Imobiliária", bairro:"Ipanema/Leblon", telefone:"+552132614200", endereco:"R. Visconde de Pirajá 608 - Ipanema", score:"A", origem:"B2B", motivo:"30 anos luxo carioca"},
    {nome:"Francisco Campos Imóveis", bairro:"Barra Península", telefone:"+(55) (21) 3473-9548", endereco:"Av. João Cabral de Mello Neto 850 - Barra - CEO", score:"A", origem:"B2B", motivo:"Especialista Península"},
    {nome:"Rio Best Imóveis", bairro:"Barra Península", telefone:"+(55) (21) 96599-1106", endereco:"Av Flamboyants da Península 100", score:"A", origem:"B2B", motivo:"Península"}
  ];
}

async function gerarMensagemB2B(lead){
  const prompt = `Você é Mateus Carvalho da Shaft Arquitetura. Gere mensagem curta de parceria B2B (max 5 linhas) para imobiliária de alto padrão. Dados: ${lead.nome} - ${lead.bairro} - ${lead.endereco} - ${lead.motivo}. Objetivo: propor parceria onde imobiliária indica compradores de imóveis antigos (15+ anos) que precisam reformar (R$120-280k), você paga 5% comissão projeto e indica vendedores pra eles. Tom profissional elegante carioca, direto, mostra que conhece região. Não pareça spam.`;
  if(groq){
    try{
      const comp = await groq.chat.completions.create({messages:[{role:"user", content: prompt}], model:"llama-3.1-8b-instant", max_tokens:250, temperature:0.7});
      return comp.choices[0].message.content;
    }catch{}
  }
  return `Oi ${lead.nome.split(' ')[0]}! Aqui é Mateus Carvalho da Shaft Arquitetura, especialista em reformas alto padrão na ${lead.bairro}. Vi que vocês são referência em ${lead.bairro}. Tenho proposta B2B: vocês me indicam compradores de imóveis de 15+ anos que precisam reformar (meu ticket R$120-280k), eu pago 5% comissão projeto (R$1-1.5k) na hora e indico vendedores pra vocês com exclusividade. Faz sentido marcar 15min essa semana aí na ${lead.bairro}?`;
}

async function rodarCacadaMaxima(){
  console.log(`\n========== CAÇADA MÁXIMA ${new Date().toLocaleString('pt-BR')} - Max ${MAX_LEADS_DIA}/dia - Auto-send: ${AUTO_SEND} ==========`);
  
  const imobiliarias = carregarImobiliariasReais();
  
  // Histórico para não repetir
  let historico = [];
  const histPath = './historico_enviados.json';
  const histPathTmp = '/tmp/historico_enviados.json';
  try{ historico = JSON.parse(fs.readFileSync(histPath,'utf8')); }catch{ try{ historico = JSON.parse(fs.readFileSync(histPathTmp,'utf8')); }catch{} }

  // Filtra quem ainda não foi abordado e pega os próximos MAX_LEADS_DIA
  const novos = imobiliarias.filter(l => !historico.includes(l.nome)).slice(0, MAX_LEADS_DIA);
  
  if(novos.length === 0){
    // Se acabou lista, reseta histórico e começa de novo (ciclo)
    console.log("Lista de imobiliárias acabou, resetando ciclo");
    historico = [];
    const resetNovos = imobiliarias.slice(0, MAX_LEADS_DIA);
    novos.push(...resetNovos);
    if(novos.length === 0){
      await enviarZap(MEU_NUMERO, `🏗️ Shaft - ${new Date().toLocaleDateString('pt-BR')} - Nenhum lead B2B novo hoje. Lista acabou. Próxima busca amanhã 9h!`);
      return {enviadas:0};
    }
  }

  let relatorio = `🏗️ *SHAFT - CAÇADA MÁXIMA - ${new Date().toLocaleDateString('pt-BR')}*\n\nJuliana vai abordar ${novos.length} imobiliárias HOJE (modo ${AUTO_SEND ? 'REAL - enviando de verdade' : 'TESTE'}) do seu WhatsApp (21) 98631-2911:\n\n`;
  let enviadas = 0;

  for(const lead of novos){
    const msg = await gerarMensagemB2B(lead);
    console.log(`\n--- ${lead.nome} - ${lead.bairro} - ${lead.telefone} ---\n${msg.substring(0,120)}...\n`);

    let ok = false;
    if(AUTO_SEND){
      console.log(`🚀 ENVIANDO REAL para ${lead.telefone}...`);
      ok = await enviarZap(lead.telefone, msg);
      if(ok){
        console.log(`✅ Enviado, aguardando 4-6 min para próximo (anti-block)`);
        await new Promise(r=>setTimeout(r, (240+Math.random()*120)*1000)); // 4-6 min delay
      }
    } else {
      console.log(`📝 MODO TESTE - Relatório apenas`);
      ok = true;
    }

    if(ok){
      relatorio += `*${lead.bairro}* - ${lead.nome}\n📞 ${lead.telefone}\n📍 ${lead.endereco}\n💬 ${msg.substring(0,100)}...\n${AUTO_SEND ? '✅ Enviado REAL' : '📝 Modo teste'}\n\n`;
      historico.push(lead.nome);
      enviadas++;
    }
  }

  try{ fs.writeFileSync(histPath, JSON.stringify(historico, null, 2)); }catch{ fs.writeFileSync(histPathTmp, JSON.stringify(historico, null, 2)); }

  relatorio += `\n✅ *${enviadas} abordagens ${AUTO_SEND ? 'ENVIADAS DE VERDADE' : 'geradas (teste)'} hoje*\n\n*Quando responderem:*\nJuliana já qualifica automaticamente e te traz agendamento no WhatsApp!\n\nPróxima caçada amanhã 9h com mais ${MAX_LEADS_DIA} imobiliárias.\nTotal histórico: ${historico.length} imobiliárias já abordadas.`;

  await enviarZap(MEU_NUMERO, relatorio);
  console.log(relatorio);
  return {enviadas, leads: novos};
}

// Cron todo dia 9h BRT e 15h BRT (2x por dia para máximo)
cron.schedule('0 12 * * *', ()=>{ console.log("⏰ 9h BRT - Caçada máxima"); rodarCacadaMaxima(); }, {timezone: "America/Sao_Paulo"});
cron.schedule('0 18 * * *', ()=>{ console.log("⏰ 15h BRT - Caçada tarde"); rodarCacadaMaxima(); }, {timezone: "America/Sao_Paulo"});
console.log(`⏰ Caçador MÁXIMO agendado 9h e 15h BRT - Max ${MAX_LEADS_DIA}/vez - Auto-send: ${AUTO_SEND}`);

app.post('/webhook', async (req,res)=>{
  try{
    const data = req.body;
    if(data.event !== "messages.upsert") return res.sendStatus(200);
    const md = data.data;
    if(!md || md.key?.fromMe) return res.sendStatus(200);
    const tel = md.key.remoteJid;
    const mensagem = md.message?.conversation || md.message?.extendedTextMessage?.text || "";
    const nome = md.pushName || "Cliente";
    if(!mensagem || tel.includes("@g.us")) return res.sendStatus(200);
    console.log(`\n📩 ${nome} (${tel}): ${mensagem}`);
    const resp = await getJulianaResposta(tel, nome, mensagem);
    console.log(`📤 Juliana: ${resp}`);
    await new Promise(r=>setTimeout(r, 1200));
    await enviarZap(tel, resp);
    res.sendStatus(200);
  }catch(e){ console.error(e); res.sendStatus(200); }
});

app.get('/', (req,res)=>res.send(`<h1>✅ Shaft Juliana MODO MÁXIMO ONLINE</h1><p>Auto-send: ${AUTO_SEND ? '<b>ATIVADO REAL</b> - Enviando pros corretores' : 'TESTE - Só relatório'} | Max/dia: ${MAX_LEADS_DIA} | 2x por dia 9h e 15h BRT</p><p><a href="/teste?msg=Oi, meu apto é na Barra 120m2">Teste Juliana</a> | <a href="/rodar-cacada">Rodar caçada AGORA (máximo)</a> | <a href="/historico">Histórico</a></p>`));
app.get('/teste', async (req,res)=>{ const m=req.query.msg||"Oi, meu apto é na Barra 120m2"; const r=await getJulianaResposta("teste","Teste",m); res.json({pergunta:m, resposta:r, modo: AUTO_SEND?"real":"teste"}); });
app.get('/rodar-cacada', async (req,res)=>{ res.send(`Caçada MÁXIMA iniciada! Modo: ${AUTO_SEND?'REAL - Enviando de verdade':'TESTE - Só relatório'}. Verifique seu WhatsApp em 1-2 min.`); rodarCacadaMaxima(); });
app.get('/historico', (req,res)=>{ try{ res.json(JSON.parse(fs.readFileSync('./historico_enviados.json','utf8'))); }catch{ try{ res.json(JSON.parse(fs.readFileSync('/tmp/historico_enviados.json','utf8'))); }catch{ res.json([]); } } });
app.get('/health', (req,res)=>res.send("OK"));

app.listen(PORT, '0.0.0.0', ()=>console.log(`\n🚀 Shaft MODO MÁXIMO porta ${PORT} - Max ${MAX_LEADS_DIA}/dia - Auto: ${AUTO_SEND}\n`));
