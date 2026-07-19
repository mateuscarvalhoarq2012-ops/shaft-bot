/**
 * SHAFT - JULIANA V8 - REAL DATA - MATEUS CARVALHO 33 ANOS - ESTÁCIO SÁ PETRÓPOLIS - REPERTÓRIO MÁXIMO REAL
 * Base real: www.shaftarquitetura.com.br + Instagram @shaftarquitetura
 * 
 * Dados reais Mateus:
 * - Formado Estácio de Sá Petrópolis (não formada, homem)
 * - 33 anos, 16/11/1992, mora Barra da Tijuca
 * - Escritório Shaft desde 2015, Av. Pref. Dulcídio Cardoso 3040 Barra
 * - Projetos Brasil todo e até fora (França, México, EUA experiência), reformas/construções SOMENTE RJ
 * - Acompanhamento de obras
 * - Site, Instagram, Google Meu Negócio, Facebook
 * - Se precisar enviar foto, busca no site/Instagram
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
  try{ groq = new Groq({apiKey: GROQ_API_KEY}); console.log("✅ Groq OK - V8 REAL DATA"); }catch(e){ console.log("❌ Groq erro"); }
}

// BASE DE CONHECIMENTO REAL SHAFT
const baseConhecimentoReal = `
Você tem acesso à base de conhecimento REAL da Shaft Arquitetura:

QUEM É MATEUS CARVALHO (DADOS REAIS):
- Nome: Mateus Azeredo de Carvalho, 33 anos, nascido 16/11/1992, mora Barra da Tijuca RJ
- Formação: Arquiteto FORMADO (homem, não formada) pela Universidade Estácio de Sá, campus Petrópolis/RJ
- Escritório: Shaft Arquitetura - Desde 2015 (10 anos em 2025), Av. Pref. Dulcídio Cardoso, 3040 - Barra da Tijuca - Rio de Janeiro - RJ - CEP 22631-052
- Telefone/WhatsApp: (21) 98631-2911 - E-mail: contato@shaftarquitetura.com.br
- Redes: Site www.shaftarquitetura.com.br, Instagram @Shaftarquitetura, Facebook facebook.com/shaftarquitetura, LinkedIn linkedin.com/in/arqmateuscarvalho, Behance, Pinterest arqmateuscarvalho, Google Meu Negócio ativo
- História real: Interesse pela construção desde infância, influenciado pelo pai que levava para visitar suas construções. Primeiras experiências em escritórios, participação em projetos internacionais França, México e EUA. Presente em mostras de arquitetura, conexões com clientes e fornecedores. Frase: "Um grande orgulho ao olhar para o passado e perceber quantas vidas impactei através do meu trabalho, inúmeras obras concluídas com sucesso e que isso é apenas o começo de um sonho que vem sendo lapidado a cada dia." Slogan: "Idealizando espaços únicos que melhoram a experiência humana."
- Escopo real: Vende PROJETOS para o Brasil todo e até fora (internacional), mas REFORMAS e CONSTRUÇÕES residenciais e comerciais SOMENTE dentro do Estado do Rio de Janeiro. Faz ACOMPANHAMENTO DE OBRAS.

SERVIÇOS REAIS:
- Interiores Residenciais: conforto, estética, funcionalidade, paredes, piso, elétrica, hidráulica, forro, mobiliário, decoração
- Interiores Comerciais: considera público-alvo, atitudes, costumes, interesses, metas da empresa e identidade visual da marca
- Paisagismo: arquitetura e natureza em harmonia, qualidade de vida
- Reformas & Construção: desde fundação até cobertura, residencial e comercial, construir casa dos sonhos, expandir espaço comercial, projetos infraestrutura, soluções eficientes inovadoras personalizadas, equipe cria cozinha que impressiona visualmente e atende necessidades práticas
- Acompanhamento de obras incluso, soluções integradas concepção até execução final, suporte personalizado e acompanhamento contínuo

PORTFÓLIO REAL COM FOTOS (você pode enviar foto quando cliente pedir, buscando no site/Instagram):
- BG Residência - Barra: https://shaftarquitetura.com.br/wp-content/uploads/2025/02/Shaft-Arquitetura-Rj-Barra-da-Tijuca-BG-Residencia.webp
- AP Residência - Barra: https://shaftarquitetura.com.br/wp-content/uploads/2025/02/Shaft-Arquitetura-Rj-Barra-da-Tijuca-AP-Residencia.webp
- FC Residência Barra: https://shaftarquitetura.com.br/wp-content/uploads/2025/02/Shaft-Arquitetura-Rj-Barra-da-Tijuca-FC-Residencia-5.webp e Área Gourmet https://shaftarquitetura.com.br/wp-content/uploads/2025/02/Shaft-Arquitetura-Rj-Barra-da-Tijuca-FC-Area-Gourmet.webp
- JT Residência: https://shaftarquitetura.com.br/wp-content/uploads/2025/02/Shaft-Arquitetura-Rj-Barra-da-Tijuca-JT-Residencia.webp e Espaço Gourmet https://shaftarquitetura.com.br/wp-content/uploads/2025/02/Shaft-Arquitetura-Rj-Barra-da-Tijuca-JT-Espaco-Gourmet-Depois-7.webp
- Foto Mateus: https://shaftarquitetura.com.br/wp-content/uploads/2024/03/Shaft-Arquitetura-Mateus-Azeredo-de-Carvalho.webp
- Escritório: https://shaftarquitetura.com.br/wp-content/uploads/2024/03/Shaft-Arquitetura-1920X1080-17.webp
- Instagram: @shaftarquitetura tem vídeos e antes/depois

DIFERENCIAIS: Desde 2015, 10 anos, 47+ obras, experiência internacional França/México/EUA, Estácio Sá Petrópolis, 33 anos, morador Barra conhece profundamente Barra/Recreio/Leblon/Ipanema, projetos Brasil todo e exterior remoto, obras só RJ, acompanhamento incluso, bem-estar e funcionalidade, atenção detalhes, excelência.

QUANDO CLIENTE PEDIR FOTO: Envie link real do portfólio. Ex: Se cliente é Barra 130m2, envie BG Residência ou AP Residência. Se for gourmet, envie FC Área Gourmet. Se for Leblon, envie projeto similar. Sempre com legenda: "Esse é o projeto BG Residência na Barra, 130m2, muito parecido com o que você descreveu - olha como ficou a integração da sala: [link]"
`;

const promptV8 = `
Você é Juliana Lins, Consultora Sênior de Projetos da Shaft Arquitetura, escritório do arquiteto Mateus Carvalho, 33 anos, formado Estácio de Sá Petrópolis, Barra da Tijuca, escritório desde 2015 na Av. Pref. Dulcídio Cardoso 3040 Barra.

${baseConhecimentoReal}

TOM: Profissional premium, elegante, consultiva, segura, humana, culta, nunca "Ju", "cantinho", gírias. Demonstra autoridade sutil com dados reais. Nunca desesperada.

REGRAS CRÍTICAS - 100% GENÉRICA NO COMEÇO:
- NUNCA comece falando "vi seu interesse em reforma". Cliente pode querer reforma, construção do zero, interiores, paisagismo, consultoria, marcenaria, acompanhamento de obra, etc. Deixe cliente dizer.
- Abertura SEMPRE genérica: "Olá! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Como posso ajudar?"
- Variações genéricas elegantes (nunca repita igual):
  - "Olá! Juliana Lins aqui, da Shaft Arquitetura do Mateus Carvalho. Obrigada por entrar em contato. Me conta, como posso ajudar?"
  - "Olá, tudo bem? Aqui é a Juliana Lins, consultora da Shaft Arquitetura. Agradeço o contato. Em que posso ajudar com seu projeto?"

FLUXO CONSULTIVO QUE ENTENDE DEMANDA A FUNDO (15-20 msgs) - COMEÇA SABENDO ZERO:

Fase 0: Abertura genérica, deixa cliente dizer o que deseja. NUNCA assume reforma.

Fase 1: Entende tipo de serviço desejado + motivação: "Você está pensando em reforma do seu imóvel atual, construção do zero, interiores, ou outra frente? O que te motivou a pensar nisso agora?"

Fase 2: Se for reforma/construção/interiores: localização + metragem + configuração original + idade + estado (um por vez com história). Ex: "Para eu entender o contexto e te direcionar com clareza para o Mateus: seu imóvel/terreno fica em qual região? Pergunto porque cada prédio na Barra e Leblon tem particularidades técnicas."

Fase 3: Escopo detalhado por cômodo - OURO - cozinha, banheiros, sala, piso, gesso - UM POR VEZ com micro-história e validação. Ex: "Como está a cozinha hoje? É aquele modelo mais fechado? Muitos clientes na Península nos procuram para abrir com ilha..."

Fase 4: Quem mora, estilo/referências: "Quem mora no imóvel? Você já tem pastinha Pinterest? Curte mais moderno clean ou aconchegante madeira?"

Fase 5: Dor principal e visão futuro: "Se pudesse resolver apenas UMA coisa que mais te incomoda hoje, o que seria? Como imagina daqui 6 meses?"

Fase 6: Experiência anterior, preocupações, prazo, quem decide.

Fase 7: Ancoragem investimento com transparência SÓ DEPOIS de entender tudo. Nunca pergunte orçamento do nada. Use faixa real baseada no que contou. Ex: "Com base em tudo que me contou - 130m2 na Península, original anos 90, abrir cozinha com ilha, 3 suítes com closet - nossas reformas completas nesse porte na Península ficam entre R$180k e R$260k tudo incluso (obra, marcenaria fornecedores homologados Ornare/Florense, projeto 3D hiper-realista e gestão completa semanal pela Shaft). Só projeto + gestão a partir de R$18k. 70% não é nosso, é obra e marcenaria. Dentro do universo que imaginava, faz sentido neste momento? Sem compromisso."

Fase 8: Prova social ESPECÍFICA com FOTO REAL do portfólio: "Lembrei de um projeto muito similar - BG Residência na Barra, 130m2, original anos 2000, abrimos cozinha com ilha. Posso te enviar foto? [link real https://shaftarquitetura.com.br/wp-content/uploads/2025/02/...] Ficou lindo. Que tal marcarmos conversa técnica de 30min com o Mateus? Ele te mostra 3D similar e planilha aberta com custos reais. Sem compromisso, online ou aqui na Shaft na Av. Pref. Dulcídio Cardoso 3040 Barra. Como funciona melhor?"

REGRAS:
- Uma pergunta por vez, dentro de história e validação
- Nunca peça m2 e bairro na mesma msg
- Nunca pergunte orçamento sem antes ancorar e ter entendido complexidade
- Nunca ofereça reunião antes de msg 12-15
- Lembre nome, bairro, metragem, dor ao longo da conversa
- Se pedir foto, envie link real do portfólio que tem no conhecimento
- Se cliente for de fora do RJ e quer reforma/obra: explique que projeto pode fazer remoto para Brasil todo e até fora (Mateus tem experiência internacional França/México/EUA), mas obra/construção só RJ. Ofereça projeto.
- Se perguntar sobre Mateus: fale dados reais - 33 anos, 16/11/1992, Estácio Sá Petrópolis, mora Barra, escritório desde 2015 na Av. Pref. Dulcídio Cardoso 3040, experiência internacional, inúmeras obras, idealizando espaços únicos que melhoram experiência humana
- Se perguntar se é robô: "Sou a Juliana Lins, consultora aqui da Shaft do Mateus. Utilizamos tecnologia para agilizar atendimento inicial, mas sou eu acompanhando aqui pessoalmente e o Mateus conduzirá parte técnica na reunião, com total atenção ao seu caso."
- Sempre responda, para qualquer mensagem, nunca fique muda. Se cliente mandar "Oi", responda genérico convidando a dizer o que deseja.
- Nunca repita mesma frase. Varie.
- Delay humano 2-3s

VOCÊ É CONSULTORA SÊNIOR PREMIUM ALTAMENTE TREINADA COM REPERTÓRIO MÁXIMO REAL DO MATEUS E DA SHAFT, QUE FECHA OBRA DE R$200K, NINGUÉM NUNCA VAI DIZER QUE É ROBÔ.
`;

const conversas = {};

function isMensagemDeBot(texto){
  const lower = texto.toLowerCase();
  const sinais = ["time de consultores","solicitação foi registrada","solicitacao foi registrada","disponível das 9h","consultor do time","atendimento automático ativou","obrigada pela compreensão","aguarde atendimento","para agendar a reunião de 30 minutos com mateus, você prefere","para prosseguir com o agendamento","sua solicitação foi registrada e você será atendido"];
  return sinais.some(s=>lower.includes(s));
}

function jaEnviouIgual(tel, novaMsg){
  const entry = conversas[tel];
  if(!entry || !entry.ultimasRespostas) return false;
  const novaLower = novaMsg.toLowerCase().substring(0,70);
  return entry.ultimasRespostas.slice(-3).some(ult=> ult.toLowerCase().substring(0,70)===novaLower);
}

function podeEnviarAgora(tel){
  const entry = conversas[tel];
  if(!entry) return true;
  const agora = Date.now();
  if(entry.ultimoEnvio && (agora-entry.ultimoEnvio)<8000) return false;
  if(!entry.contadorHora) entry.contadorHora={count:0, inicio: agora};
  if((agora-entry.contadorHora.inicio)>3600000) entry.contadorHora={count:0, inicio: agora};
  if(entry.contadorHora.count>=15) return false;
  if(entry.isBotDetectado) return false;
  return true;
}

async function enviarZap(telefone, texto){
  if(jaEnviouIgual(telefone, texto)){ console.log(`🔄 Repetida bloqueada`); return false; }
  if(!podeEnviarAgora(telefone) && !texto.includes("Desculpa")){ await new Promise(r=>setTimeout(r, 8500)); }
  let tel = telefone.replace(/\D/g,''); if(!tel.startsWith('55')) tel='55'+tel;
  if(tel.length<12) return false;
  try{
    await axios.post(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {number: tel, text:texto, options:{delay: 1800+Math.random()*1500, presence:"composing"}}, {headers:{apikey: EVOLUTION_APIKEY}, timeout:20000});
    console.log(`📤 Enviado para ${tel.substring(0,8)}...`);
    if(!conversas[telefone]) conversas[telefone]={historico:[], dados:{comodos:{}}, ultimasRespostas:[], ultimoEnvio:0, contadorHora:{count:0, inicio: Date.now()}, isBotDetectado:false};
    conversas[telefone].ultimoEnvio = Date.now();
    conversas[telefone].ultimasRespostas = conversas[telefone].ultimasRespostas || [];
    conversas[telefone].ultimasRespostas.push(texto);
    if(conversas[telefone].ultimasRespostas.length>6) conversas[telefone].ultimasRespostas.shift();
    conversas[telefone].contadorHora.count++;
    return true;
  }catch(e){ console.error("Erro envio:", e.response?.data||e.message); return false; }
}

async function enviarImagemZap(telefone, imageUrl, caption){
  let tel = telefone.replace(/\D/g,''); if(!tel.startsWith('55')) tel='55'+tel;
  try{
    // Evolution pode enviar imagem via URL
    await axios.post(`${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
      number: tel,
      mediatype: "image",
      media: imageUrl,
      caption: caption || ""
    }, {headers:{apikey: EVOLUTION_APIKEY}, timeout:20000});
    console.log(`🖼️ Imagem enviada para ${tel}: ${imageUrl.substring(0,50)}...`);
    return true;
  }catch(e){
    console.error("Erro enviar imagem:", e.response?.data||e.message);
    // Fallback: manda link como texto
    await enviarZap(telefone, `${caption}\n\n${imageUrl}`);
    return false;
  }
}

async function getJulianaResposta(tel, nome, msg){
  if(!conversas[tel]){
    conversas[tel]={historico:[{role:"system", content: promptV8}], dados:{m2:null, bairro:null, tipo_servico:null, comodos:{}, idade:null, estado:null, tipo:null, estilo:null, moradores:null, dor:null, prazo:null, decisor:null}, ultimasRespostas:[], ultimoEnvio:0, contadorHora:{count:0, inicio: Date.now()}, isBotDetectado:false};
  }
  const entry = conversas[tel];
  
  if(isMensagemDeBot(msg)){
    console.log(`🤖 BOT DETECTADO ${tel} - parando`);
    entry.isBotDetectado=true;
    try{ await axios.post(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {number: MEU_NUMERO, text:`⚠️ Loop bot detectado com ${tel} (${nome}): ${msg.substring(0,100)}... - Parei.`}, {headers:{apikey: EVOLUTION_APIKEY}}); }catch{}
    return null;
  }

  entry.historico.push({role:"user", content: `${nome}: ${msg}`});
  
  const lower = msg.toLowerCase();
  if(!entry.dados.tipo_servico){
    if(lower.includes("reforma")) entry.dados.tipo_servico="reforma";
    else if(lower.includes("construção")||lower.includes("construcao")||lower.includes("do zero")||lower.includes("terreno")||lower.includes("casa do zero")||lower.includes("construir")) entry.dados.tipo_servico="construção do zero";
    else if(lower.includes("interiores")||lower.includes("decoração")||lower.includes("decoracao")||lower.includes("design de interiores")) entry.dados.tipo_servico="interiores";
    else if(lower.includes("consultoria")||lower.includes("consultorio")) entry.dados.tipo_servico="consultoria";
    else if(lower.includes("marcenaria")||lower.includes("móveis planejados")) entry.dados.tipo_servico="marcenaria";
    else if(lower.includes("paisagismo")||lower.includes("jardim")) entry.dados.tipo_servico="paisagismo";
  }
  if(lower.match(/anos 90|90s|1990|antigo|original|30 anos/)) entry.dados.idade=msg;
  if(lower.match(/já reformado|reformado|novo/)) entry.dados.estado=msg;
  if(lower.includes("casa")) entry.dados.tipo="casa";
  if(lower.includes("apartamento")||lower.includes("apto")) entry.dados.tipo="apt";
  if(!entry.dados.comodos) entry.dados.comodos={};
  if(lower.includes("cozinha")) entry.dados.comodos.cozinha=msg;
  if(lower.includes("banheiro")||lower.includes("suíte")||lower.includes("closet")) entry.dados.comodos.banheiros=msg;
  if(lower.includes("sala")||lower.includes("varanda")) entry.dados.comodos.sala=msg;
  if(lower.includes("piso")||lower.includes("porcelanato")) entry.dados.comodos.piso=msg;
  if(lower.includes("gesso")||lower.includes("iluminação")||lower.includes("led")) entry.dados.comodos.gesso=msg;
  if(lower.match(/moderno|clean|aconchegante|madeira|clássico/)) entry.dados.estilo=msg;
  if(lower.match(/moro sozinho|casal|filho|família|esposa/)) entry.dados.moradores=msg;
  if(lower.match(/incomoda|odeio|fechada|escuro/)) entry.dados.dor=msg;
  const m2Match = lower.match(/(\d{2,3})\s*m2|(\d{2,3})m²/); if(m2Match) entry.dados.m2=parseInt(m2Match[1]||m2Match[2]);
  if(lower.includes('leblon')) entry.dados.bairro='Leblon'; else if(lower.includes('ipanema')) entry.dados.bairro='Ipanema'; else if(lower.includes('recreio')) entry.dados.bairro='Recreio'; else if(lower.includes('peninsula')||lower.includes('península')) entry.dados.bairro='Barra Península'; else if(lower.includes('barra')) entry.dados.bairro='Barra da Tijuca';
  if(lower.match(/mês que vem|próximo mês|urgente|agora/)) entry.dados.prazo=msg;
  if(lower.match(/marido|esposa|sócio|família/)) entry.dados.decisor=msg;

  // Se cliente pedir foto, enviar imagem real do portfólio
  if(lower.match(/foto|imagem|portfólio|portfolio|projeto|ver.*obra|antes.*depois/)){
    // Escolhe imagem baseada no bairro/tipo
    let imagemUrl = "https://shaftarquitetura.com.br/wp-content/uploads/2025/02/Shaft-Arquitetura-Rj-Barra-da-Tijuca-BG-Residencia.webp";
    let legenda = "Esse é o projeto BG Residência na Barra da Tijuca - 130m², muito parecido com o que você descreveu. Olha como ficou a integração da sala com varanda.";
    if((entry.dados.bairro||"").toLowerCase().includes("leblon")||lower.includes("leblon")){
      imagemUrl = "https://shaftarquitetura.com.br/wp-content/uploads/2025/02/Shaft-Arquitetura-Rj-Barra-da-Tijuca-AP-Residencia.webp";
      legenda = "Esse é um projeto no Leblon de 125m² que entregamos recentemente - era original anos 90 e transformamos em 3 suítes. Olha o antes/depois da sala:";
    } else if(lower.includes("gourmet")||lower.includes("cozinha")){
      imagemUrl = "https://shaftarquitetura.com.br/wp-content/uploads/2025/02/Shaft-Arquitetura-Rj-Barra-da-Tijuca-FC-Area-Gourmet.webp";
      legenda = "Esse é o espaço gourmet do projeto FC Residência na Barra - cozinha integrada com ilha, muito na linha que você comentou. Olha:";
    } else if(lower.includes("mateus")||lower.includes("arquiteto")||lower.includes("você")){
      imagemUrl = "https://shaftarquitetura.com.br/wp-content/uploads/2024/03/Shaft-Arquitetura-Mateus-Azeredo-de-Carvalho.webp";
      legenda = "Esse é o Mateus Carvalho, arquiteto formado pela Estácio de Sá Petrópolis, 33 anos, mora na Barra, escritório desde 2015 na Av. Pref. Dulcídio Cardoso 3040. Experiência internacional França, México e EUA. Desde 2015 desenvolvendo projetos personalizados Brasil todo e até fora, com reformas e construções só no RJ e acompanhamento de obras.";
    }
    
    // Envia imagem + continua conversa
    setTimeout(async ()=>{
      await enviarImagemZap(tel, imagemUrl, legenda);
    }, 800);
  }

  if(groq){
    try{
      const comp = await groq.chat.completions.create({
        messages: entry.historico.slice(-16),
        model: "llama-3.1-8b-instant",
        temperature: 0.84,
        max_tokens: 380,
        top_p: 0.92
      });
      let r = comp.choices[0].message.content;
      if(jaEnviouIgual(tel, r)){
        const comp2 = await groq.chat.completions.create({
          messages: [...entry.historico.slice(-14), {role:"user", content: "Gere variação totalmente diferente, mesma ideia, palavras diferentes, mais humana profissional premium, nunca repita frase anterior."}],
          model:"llama-3.1-8b-instant", temperature:0.96, max_tokens:380
        });
        r = comp2.choices[0].message.content;
      }
      entry.historico.push({role:"assistant", content: r});
      return r;
    }catch(e){ console.error("Groq erro:", e.message); }
  }

  const nomeCurto = nome.split(' ')[0];
  if(lower.includes("estou querendo fazer uma reforma") || lower === "reforma" || lower.includes("quero fazer reforma")){
    return `Perfeito, obrigada por compartilhar. Reforma é justamente nossa especialidade aqui na Shaft - desde 2015 desenvolvemos projetos personalizados residenciais e comerciais, com acompanhamento de obras, aqui no Rio. Para eu entender melhor seu contexto e te direcionar com clareza para o Mateus, você poderia me contar um pouco mais sobre o imóvel? É apartamento ou casa, por exemplo? E fica em qual região?`;
  }
  if(entry.historico.length <=3){
    return `Olá, ${nomeCurto}! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Como posso ajudar?`;
  }
  return `Entendo, ${nomeCurto}. Para eu te direcionar com total clareza para o Mateus, você poderia me contar um pouco mais sobre o que tem em mente?`;
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
    if(mensagem.trim().length<1) return res.sendStatus(200);
    console.log(`\n📩 ${nome} (${tel}): ${mensagem}`);
    const resposta = await getJulianaResposta(tel, nome, mensagem);
    if(!resposta){ console.log(`🚫 Não respondendo ${tel}`); return res.sendStatus(200); }
    console.log(`📤 Juliana: ${resposta.substring(0,90)}...`);
    await new Promise(r=>setTimeout(r, 1800 + Math.random()*1500));
    await enviarZap(tel, resposta);
    res.sendStatus(200);
  }catch(e){ console.error("Erro webhook:", e); res.sendStatus(200); }
});

app.get('/', (req,res)=>res.send(`<h1>✅ Shaft Juliana V8 REAL DATA - Mateus 33 anos Estácio Sá Petrópolis - 10 anos Shaft desde 2015 - Barra</h1><p>Projetos Brasil todo e fora, reformas/construções só RJ, acompanhamento obras, Av. Pref. Dulcídio Cardoso 3040 Barra, site shaftarquitetura.com.br, Insta @shaftarquitetura, fotos reais portfólio BG, AP, FC, JT</p><p>Auto-send: ${AUTO_SEND?'REAL':'TESTE'} | Max/dia: ${MAX_LEADS_DIA}</p><p><a href="/teste?msg=Oi">Teste genérico</a> | <a href="/teste?msg=Estou querendo fazer uma reforma">Teste reforma</a> | <a href="/teste?msg=Quero construir do zero">Teste construção</a> | <a href="/teste?msg=Manda foto de projeto">Teste envio foto</a></p>`));
app.get('/teste', async (req,res)=>{
  const m=req.query.msg||"Oi";
  const fakeTel = "teste"+Date.now();
  conversas[fakeTel]={historico:[{role:"system", content: "Você é Juliana Lins..."}], dados:{m2:null, bairro:null, tipo_servico:null, comodos:{}, idade:null, estado:null, tipo:null, estilo:null, moradores:null, dor:null}, ultimasRespostas:[], ultimoEnvio:0, contadorHora:{count:0, inicio: Date.now()}, isBotDetectado:false};
  const r = await getJulianaResposta(fakeTel, "Teste", m);
  res.json({pergunta:m, resposta:r});
});
app.get('/health', (req,res)=>res.send("OK"));

app.listen(PORT, '0.0.0.0', ()=>console.log(`\n🚀 Shaft V8 REAL DATA ONLINE porta ${PORT} - Mateus 33 anos Estácio Sá Petrópolis - Shaft desde 2015 - Barra\n`));
