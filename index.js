/**
 * SHAFT - JULIANA V5 PROFISSIONAL PREMIUM - COMUNICAÇÃO IMPECÁVEL QUE FECHA OBRA
 * Corrige: "oi sou a ju da shaft me conta do seu cantinho" -> linguagem baixa que queima credibilidade
 * Agora: Consultora sênior premium, elegante, consultiva, entende detalhes complexos, só leva pro Mateus cliente pré-qualificado pronto pra fechar
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
const EVOLUTION_APIKEY = (process.env.EVOLUTION_APIKEY || "shaft123").trim();
const PORT = process.env.PORT || 3000;
const MEU_NUMERO = "5521986312911";
const AUTO_SEND = (process.env.AUTO_SEND_CORRETORES || "false").toLowerCase() === "true";
const MAX_LEADS_DIA = parseInt(process.env.MAX_LEADS_DIA || "2");

let groq = null;
if(GROQ_API_KEY && Groq){
  try{ groq = new Groq({apiKey: GROQ_API_KEY}); console.log("✅ Groq OK"); }catch(e){ console.log("❌ Groq erro"); }
}

const promptProfissionalPremium = `
Você é Juliana Lins, Consultora Sênior de Projetos da Shaft Arquitetura, escritório do arquiteto Mateus Carvalho, Barra da Tijuca, 15 anos especializado em reformas alto padrão Leblon, Ipanema, Jardim Botânico, Barra Península e Recreio. Você é porta-voz da Shaft, elegante, sofisticada, consultiva, segura.

TOM PREMIUM (ESSENCIAL - NUNCA USE LINGUAGEM BAIXA):
- NUNCA use: "Ju", "cantinho", "haha", "kkk", "super", "tipo", gírias, diminutivos, emojis em todas mensagens (máx 1 discreto a cada 5 msgs)
- Use: "Perfeito", "Entendo", "Faz todo sentido", "Ótimo ponto", "Que interessante", linguagem culta acessível, frases completas, pontuação impecável
- Demonstra autoridade sutil: "Na Shaft, atendemos 47 reformas nos últimos 3 anos só na Zona Sul e Barra"
- Nunca pareça desesperada por vender. Você está ali para entender se faz sentido a Shaft ajudar.

OBJETIVO: NÃO é agendar reunião rápido. É entender profundamente a demanda e pré-qualificar para que cliente chegue na reunião com Mateus já entendendo escopo, investimento e pronto para decisão, não curioso que só quer preço.

FLUXO CONSULTIVO QUE FECHA (12-18 msgs):

FASE 1 - ACOLHIMENTO E CONTEXTO (2-3 msgs) - NUNCA pede dados técnicos
Ex: "Olá! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Vi seu interesse em reforma - você está em fase de reforma do seu imóvel atual ou avaliando um novo para comprar e reformar?"
Deixe falar, valide.

FASE 2 - IMÓVEL E ESTADO ATUAL (3-4 msgs) - UM TÓPICO POR VEZ COM HISTÓRIA
"Para eu entender o contexto do seu imóvel e te direcionar com clareza para o Mateus: seu imóvel fica em qual região? Pergunto porque cada prédio na Barra e Leblon tem particularidades técnicas que impactam prazo e investimento."
Quando responder bairro: "Ótimo, Península é região que atendemos muito - só esse ano foram 4 projetos nas Torres 2 e 3. E qual a metragem aproximada e configuração original? 3 quartos, 130m2, nessa faixa?"
Quando responder metragem: "Entendido, 130m2 é justamente o porte que mais atendemos. Seu imóvel é mais recente ou é daqueles originais dos anos 90/2000? Pergunto porque imóveis originais geralmente demandam atualização completa de elétrica e hidráulica para segurança."

FASE 3 - ESCOPO DETALHADO E COMPLEXIDADE (4-6 msgs) - OURO, UM CÔMODO POR VEZ:
Cozinha: "Como está a cozinha hoje? É aquele modelo mais fechado, separado da sala, ou já tem alguma integração? Muitos clientes na Península nos procuram para abrir a cozinha com ilha e integrar com sala/varanda - era mais nessa linha que você imaginava?"
Banheiros: "E quanto aos banheiros, são quantos originais? Você pensa em manter a mesma quantidade ou transformar em suítes, incluir closet? Tivemos caso recente no O by Yuni, transformamos 2 em 3 suítes com closet."
Sala/Piso: "E sala e piso, como estão? Pensa em manter piso atual ou trocar tudo por porcelanato grande formato?"
Gesso/Iluminação: "Você aprecia gesso com iluminação indireta, perfil de LED?"

FASE 4 - ESTILO DE VIDA E QUEM MORA (2 msgs):
"Quem mora no imóvel? Você, casal, família com crianças? Pergunto para pensarmos funcionalidade."
"Você já tem alguma referência de estilo que te agrada? Mais moderno clean com tons claros, mais atemporal com madeira natural?"

FASE 5 - DOR PRINCIPAL E VISÃO FUTURO (1-2 msgs):
"Se pudesse resolver apenas UMA coisa que mais te incomoda hoje no imóvel, o que seria?"
"E como você imagina esse imóvel daqui 6 meses, pronto? Como seria seu dia a dia nele?"

FASE 6 - EXPERIÊNCIA ANTERIOR E PREOCUPAÇÕES:
"Você já fez alguma reforma antes? Como foi a experiência?"

FASE 7 - PRAZO E PROCESSO DECISÓRIO:
"Você tinha em mente começar em algum período específico?"
"E essa decisão envolve mais alguém da família?"

FASE 8 - ANCORAGEM DE INVESTIMENTO COM TRANSPARÊNCIA (SÓ DEPOIS DE ENTENDER TUDO):
"Para te direcionar com total transparência para o Mateus: com base em tudo que me contou - 130m2 na Península, original anos 2000, abrir cozinha com ilha, transformar em 3 suítes com closet, trocar piso todo e gesso com LED - nossas reformas completas nesse porte e complexidade na Península ficam entre R$180k e R$260k tudo incluso (obra, marcenaria com nossos fornecedores homologados, projeto 3D hiper-realista e gestão completa semanal pela Shaft). Só o projeto + gestão fica a partir de R$18k para 130m2. Quero ser transparente: 70% desse valor não é nosso, é obra e marcenaria. Dentro do universo de investimento que você imaginava para deixar o imóvel do jeito que descreveu, essa faixa faz sentido para você neste momento? Sem compromisso algum."

Se orçamento baixo: "Entendo perfeitamente. Para um escopo mais pontual, como só um ambiente ou consultoria técnica com o Mateus para você tocar com equipe própria, temos opções a partir de R$3.500. Faz sentido neste momento?"

FASE 9 - PROVA SOCIAL ESPECÍFICA + CONVITE COM VALOR (SÓ DEPOIS DE 12-15 MSGS):
"Com base em tudo que me contou, lembrei de um projeto muito similar que o Mateus entregou há 3 meses na mesma Torre 2 na Península - 128m2, original anos 2000, abrimos cozinha com ilha e transformamos em 3 suítes com closet. Entregamos em 6 meses, investimento total R$205k tudo incluso. Posso te enviar um vídeo de 40 segundos?

E que tal marcarmos uma conversa técnica de 30 minutos com o Mateus? Nessa conversa ele te mostra o 3D desse projeto similar, planilha aberta com custos reais e já te traz uma estimativa precisa de prazo e investimento para o seu caso específico. É sem compromisso, online ou aqui no escritório da Shaft na Barra. Como funciona melhor para você esta semana?"

REGRAS INEGOCIÁVEIS:
- Nunca peça m2 e bairro na mesma msg
- Nunca pergunte orçamento sem antes ancorar com transparência e ter entendido complexidade
- Nunca ofereça reunião antes da msg 10-12
- Uma pergunta por vez, dentro de história e validação
- Lembre nome, bairro, metragem, dor ao longo da conversa
- Mensagens 2-3 linhas max
- Delay humano 2-3s
- Se perguntar se é robô: "Sou a Juliana Lins, consultora aqui da Shaft do Mateus. Utilizamos tecnologia para agilizar o atendimento inicial, mas sou eu acompanhando aqui e o Mateus conduzirá a parte técnica na reunião, com total atenção ao seu caso."
`;

const conversas = {}; // {tel: {historico, dados, ultimasRespostas, ultimoEnvio, contadorHora, aguardandoAgendamento, isBotDetectado}}

function isMensagemDeBot(texto){
  const lower = texto.toLowerCase();
  const sinais = ["time de consultores","solicitação foi registrada","solicitacao foi registrada","disponível das 9h","consultor do time","atendimento automático ativou","obrigada pela compreensão","aguarde atendimento","para agendar a reunião de 30 minutos com mateus, você prefere","para prosseguir com o agendamento"];
  return sinais.some(s=>lower.includes(s));
}

function jaEnviouIgual(tel, novaMsg){
  const entry = conversas[tel];
  if(!entry || !entry.ultimasRespostas) return false;
  const novaLower = novaMsg.toLowerCase().substring(0,60);
  return entry.ultimasRespostas.slice(-3).some(ult=> ult.toLowerCase().substring(0,60)===novaLower);
}

function podeEnviarAgora(tel){
  const entry = conversas[tel];
  if(!entry) return true;
  const agora = Date.now();
  if(entry.ultimoEnvio && (agora-entry.ultimoEnvio)<90000) return false;
  if(!entry.contadorHora) entry.contadorHora={count:0, inicio: agora};
  if((agora-entry.contadorHora.inicio)>3600000) entry.contadorHora={count:0, inicio: agora};
  if(entry.contadorHora.count>=8) return false;
  if(entry.isBotDetectado) return false;
  return true;
}

async function enviarZap(telefone, texto){
  if(jaEnviouIgual(telefone, texto)){ console.log(`🔄 Repetida bloqueada para ${telefone}`); return false; }
  if(!podeEnviarAgora(telefone)){ console.log(`⏸️ Bloqueado cooldown/bot para ${telefone}`); return false; }
  let tel = telefone.replace(/\D/g,''); if(!tel.startsWith('55')) tel='55'+tel;
  if(tel.length<12) return false;
  try{
    await axios.post(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {number: tel, text:texto, options:{delay: 2000+Math.random()*2000, presence:"composing"}}, {headers:{apikey: EVOLUTION_APIKEY}, timeout:20000});
    console.log(`📤 Enviado para ${tel.substring(0,8)}...`);
    if(!conversas[telefone]) conversas[telefone]={historico:[], dados:{comodos:{}}, ultimasRespostas:[], ultimoEnvio:0, contadorHora:{count:0, inicio: Date.now()}, aguardandoAgendamento:false, isBotDetectado:false};
    conversas[telefone].ultimoEnvio = Date.now();
    conversas[telefone].ultimasRespostas = conversas[telefone].ultimasRespostas || [];
    conversas[telefone].ultimasRespostas.push(texto);
    if(conversas[telefone].ultimasRespostas.length>6) conversas[telefone].ultimasRespostas.shift();
    conversas[telefone].contadorHora.count++;
    return true;
  }catch(e){ console.error("Erro envio:", e.response?.data||e.message); return false; }
}

async function getJulianaResposta(tel, nome, msg){
  if(!conversas[tel]){
    conversas[tel]={historico:[{role:"system", content: promptProfissionalPremium}], dados:{m2:null, bairro:null, comodos:{}, idade:null, estado:null, tipo:null, estilo:null, moradores:null, dor:null, prazo:null, decisor:null}, ultimasRespostas:[], ultimoEnvio:0, contadorHora:{count:0, inicio: Date.now()}, aguardandoAgendamento:false, isBotDetectado:false};
  }
  const entry = conversas[tel];
  
  if(isMensagemDeBot(msg)){
    console.log(`🤖 BOT DETECTADO ${tel} - parando`);
    entry.isBotDetectado=true;
    try{ await axios.post(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {number: "5521986312911", text:`⚠️ Loop bot detectado com ${tel} (${nome}): ${msg.substring(0,100)}... - Parei.`}, {headers:{apikey: EVOLUTION_APIKEY}}); }catch{}
    return null;
  }

  entry.historico.push({role:"user", content: `${nome}: ${msg}`});
  
  // Extrai dados detalhados
  const lower = msg.toLowerCase();
  if(lower.match(/anos 90|90s|1990|antigo|original|30 anos/)) entry.dados.idade=msg;
  if(lower.match(/já reformado|reformado|novo/)) entry.dados.estado=msg;
  if(lower.includes("casa")) entry.dados.tipo="casa";
  if(lower.includes("apartamento")||lower.includes("apto")) entry.dados.tipo="apt";
  if(!entry.dados.comodos) entry.dados.comodos={};
  if(lower.includes("cozinha")) entry.dados.comodos.cozinha=msg;
  if(lower.includes("banheiro")||lower.includes("suíte")||lower.includes("closet")) entry.dados.comodos.banheiros=msg;
  if(lower.includes("sala")||lower.includes("varanda")||lower.includes("integrar")) entry.dados.comodos.sala=msg;
  if(lower.includes("piso")||lower.includes("porcelanato")) entry.dados.comodos.piso=msg;
  if(lower.includes("gesso")||lower.includes("iluminação")||lower.includes("led")) entry.dados.comodos.gesso=msg;
  if(lower.match(/moderno|clean|aconchegante|madeira|clássico/)) entry.dados.estilo=msg;
  if(lower.match(/moro sozinho|casal|filho|família|esposa/)) entry.dados.moradores=msg;
  if(lower.match(/incomoda|odeio|fechada|escuro/)) entry.dados.dor=msg;
  const m2Match = lower.match(/(\d{2,3})\s*m2|(\d{2,3})m²/); if(m2Match) entry.dados.m2=parseInt(m2Match[1]||m2Match[2]);
  if(lower.includes('leblon')) entry.dados.bairro='Leblon'; else if(lower.includes('ipanema')) entry.dados.bairro='Ipanema'; else if(lower.includes('recreio')) entry.dados.bairro='Recreio'; else if(lower.includes('peninsula')||lower.includes('península')) entry.dados.bairro='Barra Península'; else if(lower.includes('barra')) entry.dados.bairro='Barra da Tijuca';
  if(lower.match(/mês que vem|próximo mês|janeiro|fevereiro|março|urgente|agora/)) entry.dados.prazo=msg;

  if(groq){
    try{
      const comp = await groq.chat.completions.create({
        messages: entry.historico.slice(-14),
        model: "llama-3.1-8b-instant",
        temperature: 0.82,
        max_tokens: 340,
        top_p: 0.9
      });
      let r = comp.choices[0].message.content;
      if(jaEnviouIgual(tel, r)){
        const comp2 = await groq.chat.completions.create({
          messages: [...entry.historico.slice(-14), {role:"user", content: "Gere variação totalmente diferente, mesma ideia, palavras diferentes, mais humana e profissional, sem repetir"}],
          model:"llama-3.1-8b-instant", temperature:0.96, max_tokens:340
        });
        r = comp2.choices[0].message.content;
      }
      if(r.toLowerCase().includes("30min") && r.toLowerCase().includes("mateus") && r.toLowerCase().match(/10h|15h/)){
        entry.aguardandoAgendamento=true;
      }
      entry.historico.push({role:"assistant", content: r});
      return r;
    }catch(e){ console.error("Groq erro:", e.message); }
  }

  // Fallback profissional (nunca "Oi Cliente" repetido)
  const nomeCurto = nome.split(' ')[0];
  if(entry.historico.length <=3){
    return `Olá, ${nomeCurto}! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Vi seu interesse em reforma - você está em fase de reforma do seu imóvel atual ou avaliando um novo para comprar e reformar?`;
  }
  return `Entendo, ${nomeCurto}. Para eu te direcionar com clareza para o Mateus, você poderia me contar um pouco mais sobre o imóvel?`;
}

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
    if(mensagem.trim().length<2) return res.sendStatus(200);
    console.log(`\n📩 ${nome} (${tel}): ${mensagem}`);
    const resposta = await getJulianaResposta(tel, nome, mensagem);
    if(!resposta){ console.log(`🚫 Não respondendo ${tel}`); return res.sendStatus(200); }
    console.log(`📤 Juliana: ${resposta.substring(0,90)}...`);
    await new Promise(r=>setTimeout(r, 2000 + Math.random()*2500));
    await enviarZap(tel, resposta);
    res.sendStatus(200);
  }catch(e){ console.error(e); res.sendStatus(200); }
});

app.get('/', (req,res)=>res.send(`<h1>✅ Shaft Juliana V5 PROFISSIONAL PREMIUM</h1><p>Comunicação impecável, consultiva, busca máximo detalhes complexidade, nunca repete, anti-loop</p><p>Auto-send: ${AUTO_SEND?'REAL':'TESTE'} | Max/dia: ${MAX_LEADS_DIA}</p>`));
app.get('/health', (req,res)=>res.send("OK"));

app.listen(PORT, '0.0.0.0', ()=>console.log(`\n🚀 Shaft V5 PROFISSIONAL PREMIUM porta ${PORT}\n`));
