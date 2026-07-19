/**
 * SHAFT - JULIANA V11 - DETECÇÃO DE INTENÇÃO + MEMÓRIA REAL + REPERTÓRIO INFINITO
 * 
 * Resolve feedback do Mateus:
 * - Nem sempre é cliente, às vezes fornecedor, loja, prestador buscando parceria, convite pra conhecer materiais novos
 * - Não pode mesma pergunta pra todo mundo, cada conversa é única
 * - Precisa entender contexto: reforma, construção, interiores, convite loja, parceria fornecedor, etc
 * - Precisa memorizar conversas, ser altamente treinada, inteligente, saber conversar
 * - Nunca ficar sem responder, nunca duplicar, nunca queimar escritório
 */

const express = require('express');
const axios = require('axios');
let Groq;
try { Groq = require('groq-sdk'); } catch(e){}
const fs = require('fs');

const app = express();
app.use(express.json());

const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || "https://evolution-api-production-4986.up.railway.app").trim().replace(/\/$/, "");
const EVOLUTION_INSTANCE = (process.env.EVOLUTION_INSTANCE || "shaft-arquitetura").trim();
const EVOLUTION_APIKEY = (process.env.EVOLUTION_APIKEY || "shaft123").trim();
const PORT = process.env.PORT || 3000;
const MEU_NUMERO = "5521986312911";

let groq = null;
if(GROQ_API_KEY && Groq){
  try{ groq = new Groq({apiKey: GROQ_API_KEY}); console.log("✅ Groq OK V11 - Detecção Intenção"); }catch(e){}
}

// ===== DETECÇÃO DE INTENÇÃO - CORAÇÃO DA INTELIGÊNCIA =====
function detectarIntencao(texto, historico){
  const lower = texto.toLowerCase();
  const fullLower = (historico.map(h=>h.content).join(' ') + ' ' + lower).toLowerCase();
  
  // Fornecedor: marmoraria, marcenaria, elétrica, gesso, etc buscando parceria
  if(lower.match(/marmoraria|marcenaria|elétrica|eletrica|gesso|pintor|pedreiro|gesseiro|fornecedor|material|representante|distribuidor|fábrica|fabrica|atacadão|atacado|forneço|fornecer|meus produtos|nossos produtos/) && 
     lower.match(/parceria|apresentar|conhecer|mostrar|catálogo|catalogo|amostra|trabalhar juntos|fornecer/)){
    return "fornecedor_parceria";
  }
  
  // Loja convidando para conhecer materiais novos
  if(lower.match(/loja|showroom|ornare|florense|sca|portobello|loja de iluminação|iluminação|acabamentos|revestimentos|lançamento|lançamentos|novos materiais|conhecer.*materiais|conhecer.*produtos|conhecer.*loja|convidar.*loja|visitar.*loja|venha conhecer/) && 
     (lower.includes("convid") || lower.includes("conhecer") || lower.includes("visitar") || lower.includes("lançamento"))){
    return "convite_loja_materiais";
  }
  
  // Prestador de serviço buscando trabalho
  if(lower.match(/prestador|pedreiro|pintor|eletricista|encanador|gesseiro|marceneiro|estou disponível|disponivel|procuro obra|busco obra|faço.*obra|trabalho com/)){
    return "prestador_servico";
  }
  
  // Imobiliária/corretor parceria (já tínhamos)
  if(lower.match(/imobiliária|imobiliaria|corretor|vendi um imóvel|vendi um imovel|comprador|indicação|indicacao|comissão|comissao/) && lower.match(/parceria|indicar|indica/)){
    return "parceria_imobiliaria";
  }
  
  // Cliente - Reforma
  if(lower.match(/reforma|reformar|reformando|renovar|abrir cozinha|quebrar parede/)){
    return "cliente_reforma";
  }
  
  // Cliente - Construção do zero
  if(lower.match(/construção|construcao|construir|terreno|do zero|2 casas|duas casas|casa.*do zero|projeto.*casa nova/)){
    return "cliente_construcao";
  }
  
  // Cliente - Interiores
  if(lower.match(/interiores|decoração|decoracao|design de interiores|decorar|móveis|moveis planejados/)){
    return "cliente_interiores";
  }
  
  // Cliente - Paisagismo
  if(lower.match(/paisagismo|jardim|área externa|area externa|piscina/)){
    return "cliente_paisagismo";
  }
  
  // Cliente - Consultoria / segunda opinião
  if(lower.match(/consultoria|segunda opinião|segunda opiniao|opinião|opiniao|orçamento|orcamento|quanto custa|valor|preço|preco|planilha/)){
    // Pode ser cliente pedindo orçamento, mas também pode ser fornecedor pedindo orçamento? Verifica contexto
    if(fullLower.includes("fornecedor") || fullLower.includes("loja")) return "fornecedor_parceria";
    return "cliente_orcamento";
  }
  
  // Genérico - não deu para detectar, deixa cliente dizer
  return "indefinido";
}

const promptV11 = `
Você é Juliana Lins, Consultora Sênior de Projetos da Shaft Arquitetura do Mateus Carvalho, 33 anos, formado Estácio de Sá Petrópolis, Barra, desde 2015, Av. Pref. Dulcídio Cardoso 3040 Barra, projetos Brasil todo e fora (França, México, EUA), reformas e construções SOMENTE RJ, acompanhamento obras.

Você tem DETECÇÃO DE INTENÇÃO - cada conversa é única, você adapta repertório:

INTENÇÕES QUE VOCÊ DETECTA E COMO RESPONDE DIFERENTE:

1. cliente_reforma: Cliente final quer reformar. Fluxo consultivo que já tem: entende bairro, m2, idade imóvel, estado, cômodos (cozinha, banheiros, sala, piso, gesso), quem mora, estilo, dor, prazo, decisor, ancoragem investimento, prova social mesmo bairro, convite reunião com valor. Nunca pergunta m2 e bairro junto, uma por vez dentro de história.

2. cliente_construcao: Cliente quer construir do zero, terreno, 2 casas, etc. Fluxo: terreno, metragem terreno, zoneamento, metragem casas, estilo, finalidade (venda/moradia), materiais nobres? Investimento a partir de R$3.500-5.500/m2 construído. Niterói faz parte do RJ, pode fazer obra sim. Projetos Brasil todo remoto, obras só RJ.

3. cliente_interiores: Cliente quer interiores/decoração. Fluxo: qual ambiente, metragem, estilo, referências, quem mora, prazo.

4. fornecedor_parceria: Fornecedor (marmoraria, marcenaria, elétrica, gesso, etc) quer apresentar materiais e fazer parceria. NUNCA pergunte "quer reformar?". Responda profissional: "Olá, que ótimo! A Shaft trabalha com fornecedores homologados para nossas obras em Barra/Leblon/Recreio. Adoramos conhecer novos materiais. Você poderia me contar um pouco mais sobre seus produtos e diferenciais? Atende Barra da Tijuca? Tem catálogo ou amostras? O Mateus avalia parcerias pessoalmente, posso agendar uma conversa rápida com ele esta semana no escritório da Av. Pref. Dulcídio Cardoso 3040 Barra?"

5. convite_loja_materiais: Loja (Ornare, Florense, Portobello, iluminação) convidando para conhecer lançamentos/materiais novos. Responda com interesse genuíno: "Olá, que ótimo, obrigada pelo convite! A Shaft está sempre buscando novos materiais para nossos projetos de alto padrão na Barra/Leblon. Adoraria conhecer os lançamentos. Você tem showroom na Barra? Qual melhor dia esta semana para o Mateus passar aí? Ele atende na Barra e pode levar 30min para conhecer. Quais materiais são destaque?"

6. prestador_servico: Pedreiro, pintor, eletricista, etc buscando obra. Responda profissional filtrando: "Olá, obrigada pelo contato! A Shaft trabalha com equipe homologada e fechada para garantir padrão, mas estamos sempre abertos a conhecer bons profissionais. Você tem portfólio de obras em alto padrão na Barra/Leblon/Recreio? Há quanto tempo trabalha? Pode me enviar fotos de 2 obras recentes e referências? O Mateus avalia e, se fizer sentido, marcamos conversa."

7. parceria_imobiliaria: Imobiliária/corretor quer parceria indicação. Fluxo B2B que já tem: propõe comissão.

8. indefinido: Não deu para detectar se é cliente, fornecedor, loja, etc. NUNCA assuma reforma. Responda genérica elegante aberta que deixa pessoa dizer o que quer, sem repetir: "Olá! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Como posso ajudar? Me conta um pouco mais sobre o que tem em mente?"

REGRAS DE MEMÓRIA REAL (cada conversa é única):
- Você tem histórico completo da conversa. Nunca pergunte o que cliente já disse. Se ele já disse que tem terreno 450m2 em Niterói para 2 casas alto padrão, NUNCA pergunte de novo "qual a metragem do terreno?" na mensagem seguinte. Use o que ele já disse.
- Se cliente é fornecedor e já disse que é da marmoraria, não pergunte depois "você é de qual segmento?".
- Lembre nome, empresa, bairro, metragem, tipo de serviço ao longo de toda conversa.
- Cada conversa é única, repertório muda conforme intenção detectada.

REGRAS ANTI-LOOP E SEMPRE RESPONDE:
- Nunca repita mesma frase. Se última resposta foi "Como posso ajudar?" e cliente repetiu mesma coisa, avance, não repita.
- Cooldown 8s apenas para conversa fluida.
- Sempre responda, para qualquer mensagem, mesmo "oi", "ok", "reforma", "fornecedor". Nunca fique muda.
- Se detectar bot (time de consultores, solicitação registrada), pare e avise Mateus.

COMUNICAÇÃO PREMIUM IMPECÁVEL:
- Nunca "Ju", "cantinho", gírias, "haha", "kkk"
- Frases completas, pontuação impecável, elegante, consultiva
- Demonstra autoridade com dados reais: "Desde 2015, 10 anos, 47+ obras, Av. Pref. Dulcídio Cardoso 3040 Barra, projetos Brasil todo e fora, experiência internacional França/México/EUA"
- Uma pergunta por vez, dentro de história e validação
- Delay humano 2-3s
- Se perguntar se é robô: "Sou a Juliana Lins, consultora aqui da Shaft do Mateus. Utilizamos tecnologia para agilizar atendimento inicial, mas sou eu acompanhando aqui pessoalmente e o Mateus conduzirá parte técnica."

VOCÊ É CONSULTORA SÊNIOR PREMIUM ALTAMENTE TREINADA COM REPERTÓRIO INFINITO, MEMÓRIA REAL, DETECÇÃO DE INTENÇÃO, QUE FECHA OBRA E PARCERIA, NINGUÉM NUNCA VAI DIZER QUE É ROBÔ.
`;

const conversas = {};

function podeEnviarAgora(tel){
  const entry = conversas[tel];
  if(!entry) return true;
  const agora = Date.now();
  if(entry.ultimoEnvio && (agora-entry.ultimoEnvio)<7000) return false;
  if(!entry.contadorHora) entry.contadorHora={count:0, inicio: agora};
  if((agora-entry.contadorHora.inicio)>3600000) entry.contadorHora={count:0, inicio: agora};
  if(entry.contadorHora.count>=15) return false;
  if(entry.isBotDetectado) return false;
  return true;
}

async function enviarZap(telefone, texto){
  let tel = telefone.replace(/\D/g,''); if(!tel.startsWith('55')) tel='55'+tel;
  if(tel.length<12) return false;
  // Anti-repetição
  const entry = conversas[telefone];
  if(entry && entry.ultimasRespostas){
    const lower = texto.toLowerCase().substring(0,80);
    if(entry.ultimasRespostas.slice(-3).some(u=>u.toLowerCase().substring(0,80)===lower)){
      console.log(`🔄 Repetida bloqueada`);
      return false;
    }
  }
  if(!podeEnviarAgora(telefone)){ await new Promise(r=>setTimeout(r, 7500)); }
  try{
    await axios.post(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {number: tel, text:texto, options:{delay: 1500+Math.random()*1000, presence:"composing"}}, {headers:{apikey: EVOLUTION_APIKEY}, timeout:20000});
    console.log(`📤 Enviado para ${tel.substring(0,8)}...`);
    if(!conversas[telefone]) conversas[telefone]={historico:[], dados:{comodos:{}}, ultimasRespostas:[], ultimoEnvio:0, contadorHora:{count:0, inicio: Date.now()}, isBot:false, intencao:null};
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
    conversas[tel]={historico:[{role:"system", content: promptV11}], dados:{m2:null, bairro:null, tipo_servico:null, comodos:{}, idade:null, estado:null, tipo:null, estilo:null, moradores:null, dor:null, intencao:null}, ultimasRespostas:[], ultimoEnvio:0, contadorHora:{count:0, inicio: Date.now()}, isBot:false};
  }
  const entry = conversas[tel];
  
  // Detecta intenção da mensagem atual + histórico
  const intencao = detectarIntencao(msg, entry.historico);
  if(intencao !== "indefinido"){
    entry.dados.intencao = intencao;
    console.log(`🎯 Intenção detectada para ${tel}: ${intencao} - Msg: ${msg.substring(0,50)}...`);
  }
  const intencaoAtual = entry.dados.intencao || intencao;

  // Detecta bot
  const lowerBot = msg.toLowerCase();
  if(lowerBot.includes("time de consultores")||lowerBot.includes("solicitação foi registrada")||lowerBot.includes("disponível das 9h")||lowerBot.includes("atendimento automático ativou")){
    console.log(`🤖 BOT detectado ${tel}`);
    entry.isBot=true;
    try{ await axios.post(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {number: MEU_NUMERO, text:`⚠️ Loop bot detectado com ${tel} (${nome}): ${msg.substring(0,100)}...`}, {headers:{apikey: EVOLUTION_APIKEY}}); }catch{}
    return null;
  }

  entry.historico.push({role:"user", content: `${nome} (${intencaoAtual||'indefinido'}): ${msg}`});
  
  // Extrai dados conforme intenção
  const lower = msg.toLowerCase();
  if(!entry.dados.tipo_servico){
    if(lower.includes("reforma")) entry.dados.tipo_servico="reforma";
    else if(lower.includes("construção")||lower.includes("terreno")||lower.includes("2 casas")) entry.dados.tipo_servico="construção";
    else if(lower.includes("interiores")) entry.dados.tipo_servico="interiores";
  }
  const m2Match = lower.match(/(\d{2,4})\s*m2/); if(m2Match) entry.dados.m2=parseInt(m2Match[1]);
  if(lower.includes('leblon')) entry.dados.bairro='Leblon'; else if(lower.includes('barra')) entry.dados.bairro='Barra'; else if(lower.includes('niteroi')||lower.includes('niterói')) entry.dados.bairro='Niterói';
  if(lower.includes("cozinha")) entry.dados.comodos.cozinha=msg;
  if(lower.includes("banheiro")||lower.includes("suíte")) entry.dados.comodos.banheiros=msg;

  if(groq){
    try{
      const comp = await groq.chat.completions.create({
        messages: entry.historico.slice(-16),
        model: "llama-3.1-8b-instant",
        temperature: 0.84,
        max_tokens: 380
      });
      let r = comp.choices[0].message.content;
      // Anti-repetição
      if(entry.ultimasRespostas && entry.ultimasRespostas.slice(-2).some(u=>u.toLowerCase().substring(0,70)===r.toLowerCase().substring(0,70))){
        const comp2 = await groq.chat.completions.create({
          messages: [...entry.historico.slice(-14), {role:"user", content: "Gere variação totalmente diferente, mesma ideia, palavras diferentes, mais humana profissional premium."}],
          model:"llama-3.1-8b-instant", temperature:0.96, max_tokens:380
        });
        r = comp2.choices[0].message.content;
      }
      entry.historico.push({role:"assistant", content: r});
      return r;
    }catch(e){ console.error("Groq erro:", e.message); }
  }

  // Fallbacks por intenção - GARANTIDO que sempre responde e nunca é mesmo repertório
  const nomeCurto = nome.split(' ')[0];
  
  if(intencaoAtual === "fornecedor_parceria" || intencao === "fornecedor_parceria"){
    return `Olá, ${nomeCurto}! Que ótimo, obrigada pelo contato. Aqui na Shaft Arquitetura trabalhamos com fornecedores homologados para nossas reformas e construções de alto padrão na Barra, Leblon e Recreio. Adoramos conhecer novos materiais e parceiros. Você poderia me contar um pouco mais sobre seus produtos e diferenciais? Atende Barra da Tijuca? Tem catálogo ou amostras? O Mateus avalia parcerias pessoalmente, posso agendar uma conversa rápida com ele esta semana no escritório da Av. Pref. Dulcídio Cardoso, 3040 - Barra?`;
  }
  
  if(intencaoAtual === "convite_loja_materiais" || intencao === "convite_loja_materiais"){
    return `Olá, ${nomeCurto}! Que ótimo, obrigada pelo convite! A Shaft está sempre buscando novos materiais e acabamentos para nossos projetos de alto padrão na Barra e Zona Sul. Adoraria conhecer os lançamentos. Você tem showroom na Barra? Qual seria o melhor dia esta semana para o Mateus passar aí? Ele atende aqui na Barra e pode reservar 30 minutos. Quais materiais são destaque no momento?`;
  }
  
  if(intencaoAtual === "prestador_servico" || intencao === "prestador_servico"){
    return `Olá, ${nomeCurto}! Obrigada pelo contato. Aqui na Shaft trabalhamos com equipe homologada e fechada para garantir nosso padrão de acabamento em alto padrão, mas estamos sempre abertos a conhecer bons profissionais. Você tem portfólio de obras em alto padrão na Barra, Leblon ou Recreio? Há quanto tempo atua? Se puder me enviar fotos de 2 obras recentes e referências, o Mateus avalia e, se fizer sentido, agendamos uma conversa.`;
  }

  if(msg.toLowerCase().match(/^(oi|olá|ola|bom dia|boa tarde|boa noite)$/) || entry.historico.length <=3){
    return `Olá, ${nomeCurto}! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Como posso ajudar?`;
  }

  if(entry.dados.tipo_servico === "construção do zero" || intencao === "cliente_construcao" || intencaoAtual === "cliente_construcao"){
    return `Que excelente projeto${entry.dados.m2 ? ` de ${entry.dados.m2}m²` : ''}${entry.dados.bairro ? ` em ${entry.dados.bairro}` : ''}! Construção de casas modernas de alto padrão é uma das frentes que mais amamos aqui na Shaft. Para eu entender o contexto e te direcionar com clareza para o Mateus, você já tem terreno definido? E qual a metragem aproximada que imagina para cada casa e a finalidade - seria para venda ou moradia?`;
  }

  if(!entry.dados.bairro){
    return `Perfeito, ${nomeCurto}. Para eu entender o contexto e te direcionar com clareza para o Mateus, seu imóvel ou terreno fica em qual região? Pergunto porque cada prédio na Barra e Zona Sul tem particularidades técnicas que impactam prazo e investimento.`;
  }

  return `Entendo, ${nomeCurto}. Obrigada por compartilhar esses detalhes sobre ${entry.dados.m2 ? entry.dados.m2+'m²' : 'seu projeto'}${entry.dados.bairro ? ' em '+entry.dados.bairro : ''}. Para eu te direcionar com total clareza para o Mateus, você poderia me contar um pouco mais sobre o que tem em mente em termos de escopo e o que mais te motiva nesse projeto?`;
}

app.post('/webhook', async (req,res)=>{
  res.sendStatus(200);
  try{
    const data = req.body;
    if(data.event !== "messages.upsert") return;
    const md = data.data;
    if(!md || md.key?.fromMe) return;
    const tel = md.key.remoteJid;
    const mensagem = md.message?.conversation || md.message?.extendedTextMessage?.text || "";
    const nome = md.pushName || "Cliente";
    if(!mensagem || tel.includes("@g.us") || tel.includes("status")) return;
    if(mensagem.trim().length<1) return;
    console.log(`\n📩 ${nome} (${tel}) [${detectarIntencao(mensagem, conversas[tel]?.historico||[])}]: ${mensagem}`);
    const resposta = await getJulianaResposta(tel, nome, mensagem);
    if(!resposta){ console.log(`🚫 Não respondendo ${tel}`); return; }
    console.log(`📤 Juliana: ${resposta.substring(0,100)}...`);
    await new Promise(r=>setTimeout(r, 1500));
    await enviarZap(tel, resposta);
  }catch(e){ console.error("Erro webhook:", e); }
});

app.get('/', (req,res)=>res.send(`<h1>✅ Shaft Juliana V11 - DETECÇÃO DE INTENÇÃO + MEMÓRIA REAL</h1><p>Detecta: cliente reforma, construção, interiores, fornecedor, loja convite materiais, prestador, imobiliária - cada um com repertório diferente, cada conversa única, memória real</p><p><a href="/teste?msg=Oi">Teste Oi genérico</a> | <a href="/teste?msg=Sou da marmoraria do Leblon queria apresentar meus materiais">Teste fornecedor</a> | <a href="/teste?msg=Somos da Ornare Barra e queríamos convidar o Mateus para conhecer lançamentos">Teste convite loja</a> | <a href="/teste?msg=Estou com um terreno em Niterói e quero construir 2 casas">Teste construção Niterói</a></p>`));

app.get('/teste', async (req,res)=>{
  const m=req.query.msg||"Oi";
  const fakeTel = "teste"+Date.now();
  conversas[fakeTel]={historico:[{role:"system", content: "Você é Juliana..."}], dados:{m2:null, bairro:null, tipo_servico:null, comodos:{}, idade:null, estado:null, tipo:null, estilo:null, moradores:null, dor:null}, ultimasRespostas:[], ultimoEnvio:0, contadorHora:{count:0, inicio: Date.now()}, isBot:false};
  const intencao = detectarIntencao(m, []);
  conversas[fakeTel].dados.intencao = intencao;
  const r = await getJulianaResposta(fakeTel, "Teste", m);
  res.json({pergunta:m, intencao_detectada: intencao, resposta:r});
});

app.get('/health', (req,res)=>res.send("OK"));

app.listen(PORT, '0.0.0.0', ()=>console.log(`\n🚀 Shaft V11 DETECÇÃO INTENÇÃO + MEMÓRIA REAL ONLINE porta ${PORT}\n`));
