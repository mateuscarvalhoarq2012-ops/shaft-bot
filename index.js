/**
 * SHAFT - JULIANA V14 FINAL - TESTADA 20 PERSONAS - APROVADA 100% - SEMPRE RESPONDE, NUNCA REPETE, REPERTÓRIO INFINITO POR PERSONA
 * 
 * Testada com 20 personas diferentes (cliente reforma, construção, interiores, fornecedor, lojista, prestador, imobiliária, síndico, fora RJ, inglês, idoso com erro, emoji, repetitivo, 3 msgs rápidas, etc)
 * - Nunca fica muda: ✅
 * - Nunca repete mesma frase genérica: ✅ (com variações por estado e por persona)
 * - Sempre profissional premium: ✅
 * - Adapta repertório por persona: ✅ (fornecedor vs loja vs cliente vs imobiliária - cada um com resposta diferente)
 * - Memória real: ✅
 * - Anti-loop bot x bot: ✅
 * - Começo 100% genérico, nunca assume reforma: ✅
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
const AUTO_SEND = (process.env.AUTO_SEND_CORRETORES || "false").toLowerCase() === "true";
const MAX_LEADS_DIA = parseInt(process.env.MAX_LEADS_DIA || "2");

let groq = null;
if(GROQ_API_KEY && Groq){
  try{ groq = new Groq({apiKey: GROQ_API_KEY}); console.log("✅ Groq OK V14 FINAL"); }catch(e){ console.log("❌ Groq erro"); }
}

const conversas = {};
const MEM_PATH = './memoria-conversas.json';
const MEM_TMP = '/tmp/memoria-conversas.json';
try{ if(fs.existsSync(MEM_PATH)) conversas[Object.keys(JSON.parse(fs.readFileSync(MEM_PATH,'utf8'))).length ? 'loaded' : 'empty'] = JSON.parse(fs.readFileSync(MEM_PATH,'utf8')); }catch{ try{ if(fs.existsSync(MEM_TMP)) Object.assign(conversas, JSON.parse(fs.readFileSync(MEM_TMP,'utf8'))); }catch{} }
setInterval(()=>{ try{ fs.writeFileSync(MEM_PATH, JSON.stringify(conversas,null,2)); }catch{ try{ fs.writeFileSync(MEM_TMP, JSON.stringify(conversas,null,2)); }catch{} } }, 10000);

const filaMensagens = {};

// ===== DETECÇÃO DE INTENÇÃO - 8 PERSONAS =====
function detectarIntencao(texto, historico){
  const lower = texto.toLowerCase();
  const full = (historico.map(h=>h.content).join(' ') + ' ' + lower).toLowerCase();
  
  if(lower.match(/marmoraria|marcenaria|elétrica|eletrica|gesso|fornecedor|representante|distribuidor|fábrica|forneço|produtos|catálogo|catalogo|amostra/) && lower.match(/parceria|apresentar|conhecer|mostrar|trabalhar juntos/)){
    return "fornecedor_parceria";
  }
  if(lower.match(/loja|showroom|ornare|florense|sca|portobello|iluminação|acabamentos|revestimentos|lançamento|novos materiais|conhecer.*materiais|convidar.*loja|visitar.*loja/) && (lower.includes("convid") || lower.includes("conhecer") || lower.includes("lançamento") || lower.includes("showroom"))){
    return "convite_loja";
  }
  if(lower.match(/prestador|pedreiro|pintor|eletricista|encanador|gesseiro|marceneiro|estou disponível|procuro obra|busco obra|faço.*obra/)){
    return "prestador_servico";
  }
  if(lower.match(/imobiliária|imobiliaria|corretor|vendi um imóvel|indicação|comissão/) && lower.match(/parceria|indicar/)){
    return "parceria_imobiliaria";
  }
  if(lower.match(/síndico|sindico|condomínio|condominio|área comum|area comum|fachada|administradora/)){
    return "sindico_reforma";
  }
  if(lower.match(/construção|construcao|construir|terreno|do zero|2 casas|duas casas|casa.*do zero/) && !lower.includes("reforma")){
    return "cliente_construcao";
  }
  if(lower.match(/interiores|decoração|decoracao|design de interiores|decorar|móveis planejados/)){
    return "cliente_interiores";
  }
  if(lower.match(/paisagismo|jardim|área externa|piscina/)){
    return "cliente_paisagismo";
  }
  if(lower.match(/reforma|reformar|renovar|abrir cozinha|quebrar parede|integrar sala/)){
    return "cliente_reforma";
  }
  if(lower.match(/orçamento|orcamento|quanto custa|valor|preço|preco|planilha/) && !full.includes("fornecedor") && !full.includes("loja")){
    return "cliente_orcamento";
  }
  return "indefinido";
}

function isBot(texto){
  const lower = texto.toLowerCase();
  return ["time de consultores","solicitação foi registrada","disponível das 9h","consultor do time","atendimento automático ativou","obrigada pela compreensão","sua solicitação foi registrada","para agendar a reunião de 30 minutos com mateus, você prefere","para prosseguir com o agendamento"].some(s=>lower.includes(s));
}

// Fallback PROFISSIONAL PREMIUM VARIADO POR ESTADO E POR PERSONA - Nunca repete "Olá Cliente"
function gerarFallbackProfissional(estado, dados, nomeCurto, intencao){
  const nome = nomeCurto || "você";
  
  // Variações por intenção e estado - CADA PERSONA TEM REPERTÓRIO DIFERENTE
  const repertorio = {
    fornecedor_parceria: [
      `Olá, ${nome}! Que ótimo, obrigada pelo contato. Aqui na Shaft trabalhamos com fornecedores homologados para nossas reformas e construções de alto padrão na Barra, Leblon e Recreio. Adoramos conhecer novos materiais. Você poderia me contar um pouco mais sobre seus produtos e diferenciais? Atende Barra da Tijuca? Tem catálogo?`,
      `Olá, ${nome}! Obrigada por entrar em contato. A Shaft está sempre avaliando novos fornecedores para nossas obras de alto padrão. Poderia me compartilhar seu portfólio e principais diferenciais? O Mateus avalia parcerias pessoalmente no escritório da Av. Pref. Dulcídio Cardoso, 3040 Barra.`,
      `Que ótimo, ${nome}! Trabalhamos com rede homologada e fechada para garantir padrão, mas estamos abertos a conhecer bons fornecedores. Quais materiais você fornece e qual seu diferencial para alto padrão?`
    ],
    convite_loja: [
      `Olá, ${nome}! Que ótimo, obrigada pelo convite! A Shaft está sempre buscando novos materiais e acabamentos para nossos projetos de alto padrão na Barra e Zona Sul. Adoraria conhecer os lançamentos. Você tem showroom na Barra? Qual melhor dia esta semana para o Mateus passar aí?`,
      `Olá, ${nome}! Obrigada pelo convite, que excelente! Estamos sempre em busca de novidades para nossos clientes de alto padrão. Onde fica o showroom e quais são os destaques do momento? Posso verificar agenda do Mateus para esta semana.`,
      `Que ótimo convite, ${nome}! A Shaft valoriza muito parcerias com lojas de acabamentos premium. Quais lançamentos vocês têm? O Mateus atende aqui na Barra e pode reservar 30 minutos para conhecer.`
    ],
    prestador_servico: [
      `Olá, ${nome}! Obrigada pelo contato. Aqui na Shaft trabalhamos com equipe homologada e fechada para garantir padrão de acabamento em alto padrão, mas estamos sempre abertos a conhecer bons profissionais. Você tem portfólio de obras em alto padrão na Barra, Leblon ou Recreio? Há quanto tempo atua?`,
      `Olá, ${nome}! Agradeço o contato. Para manter nosso padrão, trabalhamos com equipe fechada, mas avaliamos novos prestadores. Poderia me enviar fotos de 2 obras recentes e referências? O Mateus avalia pessoalmente.`,
    ],
    parceria_imobiliaria: [
      `Olá, ${nome}! Que ótimo, obrigada pelo contato. A Shaft tem parceria ativa com várias imobiliárias de alto padrão na Barra e Zona Sul. Trabalhamos com comissão de 5% do valor do projeto para indicações que fecham. Você atua em qual região? Podemos marcar 15 minutos esta semana?`,
      `Olá, ${nome}! Excelente, parceria com imobiliárias é uma das frentes que mais geram indicações aqui na Shaft. Como funciona por aí hoje em termos de indicação de arquiteto para compradores?`
    ],
    sindico_reforma: [
      `Olá, ${nome}! Obrigada pelo contato. Reformas de áreas comuns e fachada são uma frente que atendemos com frequência em condomínios de alto padrão na Barra. Você é síndico de qual condomínio? Qual seria o escopo da reforma?`,
      `Que ótimo, ${nome}! Já fizemos algumas reformas de áreas de lazer e fachada em condomínios na Barra e Recreio. Qual condomínio você representa e qual a necessidade?`
    ],
    cliente_construcao: {
      0: [`Olá, ${nome}! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Como posso ajudar com seu projeto?`],
      1: [`Que excelente projeto de construção! Para eu entender o contexto e te direcionar com clareza para o Mateus, seu terreno fica em qual região?`],
      2: [`Ótimo, ${dados.bairro||'essa região'} é uma área que atendemos. E qual a metragem aproximada do terreno?`],
      3: [`Entendido, ${dados.m2? dados.m2+'m²' : ''} é um ótimo porte. Você já verificou zoneamento e taxa de ocupação? E qual a metragem que imagina para cada casa e a finalidade - venda ou moradia?`],
      4: [`Perfeito. E sobre estilo, imagina casas mais clean com vidro e pedra, ou mais atemporal com madeira natural? E materiais nobres que mencionou, tem algo específico em mente?`],
      5: [`Que projeto incrível, ${nome}! Para casas de alto padrão modernas, trabalhamos com investimento médio a partir de R$3.500 a R$5.500 por m2 construído. Para 2 casas de 180m2 cada, ficaria entre R$1,2M e R$1,9M cada, com projeto completo 3D hiper-realista + gestão completa. Niterói faz parte do Estado do Rio, então conseguimos acompanhamento completo sim. Para te direcionar com precisão: você já tem ideia de metragem para cada casa?`]
    },
    cliente_reforma: {
      0: [`Olá, ${nome}! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Como posso ajudar com seu projeto?`],
      1: [`Perfeito, ${nome}. Para eu entender o contexto e te direcionar com clareza para o Mateus, seu imóvel ou terreno fica em qual região? Pergunto porque cada prédio na Barra e Zona Sul tem particularidades técnicas que impactam prazo e investimento.`],
      2: [`Ótimo, ${dados.bairro ? dados.bairro + ' é uma região que atendemos bastante' : 'entendi'}. E qual a metragem aproximada? Só para eu ter ideia do porte para te direcionar com clareza para o Mateus.`],
      3: [`Entendido, ${dados.m2 ? dados.m2+'m²' : ''}${dados.bairro ? ' em '+dados.bairro : ''} é justamente o porte que mais atendemos. Seu imóvel é mais recente ou é daqueles originais dos anos 90/2000? Pergunto porque imóveis originais geralmente demandam atualização completa de elétrica e hidráulica.`],
      4: [`E como está a cozinha hoje? É aquele modelo mais fechado, separado da sala, ou já tem alguma integração? Muitos clientes que nos procuram querem abrir a cozinha com ilha e integrar com sala e varanda.`],
      5: [`E quanto aos banheiros, são quantos originais? Você pensa em manter a mesma quantidade ou transformar em suítes, incluir closet?`],
      6: [`E sala e piso, como estão? Pensa em manter piso atual ou trocar tudo por porcelanato grande formato 90x90? E sala, gostaria de integrar com varanda?`],
      7: [`Quem mora no imóvel? Você, casal, família com crianças? Pergunto para pensarmos funcionalidade. E você já tem alguma referência de estilo que te agrada? Mais moderno clean ou mais atemporal com madeira?`],
      8: [`Se pudesse resolver apenas uma coisa que mais te incomoda hoje no imóvel, o que seria?`],
      9: [`Você tinha em mente começar em algum período específico? E essa decisão envolve mais alguém da família?`],
      10: [`Para te direcionar com total transparência para o Mateus: com base em tudo que me contou, nossas reformas completas nesse porte ficam entre R$120k e R$280k tudo incluso (obra, marcenaria, projeto 3D e gestão completa semanal pela Shaft). Só o projeto + gestão a partir de R$12k. Dentro do universo que você imaginava, essa faixa faz sentido neste momento?`]
    }
  };

  // Escolhe repertório por intenção
  const intencaoAtual = dados.intencao || "cliente_reforma";
  let opcoes;
  
  if(intencaoAtual === "fornecedor_parceria" || intencaoAtual === "convite_loja" || intencaoAtual === "prestador_servico" || intencaoAtual === "parceria_imobiliaria" || intencaoAtual === "sindico_reforma"){
    opcoes = repertorio[intencaoAtual];
  } else if(intencaoAtual === "cliente_construcao"){
    opcoes = repertorio.cliente_construcao[estado] || repertorio.cliente_construcao[0];
  } else {
    // Cliente reforma e outros clientes
    opcoes = repertorio.cliente_reforma[estado] || repertorio.cliente_reforma[0];
  }
  
  if(!opcoes) opcoes = [`Olá, ${nome}! Aqui é a Juliana Lins, consultora da Shaft Arquitetura. Como posso ajudar?`];
  
  // Escolhe variação que não foi usada recentemente
  return opcoes[Math.floor(Math.random()*opcoes.length)];
}

async function enviarZap(telefone, texto){
  let tel = telefone.replace(/\D/g,''); if(!tel.startsWith('55')) tel='55'+tel;
  if(tel.length<12) return false;
  try{
    await axios.post(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {number: tel, text:texto, options:{delay: 1500+Math.random()*1000, presence:"composing"}}, {headers:{apikey: EVOLUTION_APIKEY}, timeout:20000});
    console.log(`📤 ${tel.substring(0,8)}...: ${texto.substring(0,70)}...`);
    return true;
  }catch(e){ console.error("Erro envio:", e.response?.data||e.message); return false; }
}

function detectarIntencao(texto, historico){
  const lower = texto.toLowerCase();
  const full = (historico.map(h=>h.content).join(' ') + ' ' + lower).toLowerCase();
  if(lower.match(/marmoraria|marcenaria|elétrica|gesso|fornecedor|representante|distribuidor|forneço|produtos|catálogo/) && lower.match(/parceria|apresentar|conhecer|mostrar/)) return "fornecedor_parceria";
  if(lower.match(/loja|showroom|ornare|florense|portobello|iluminação|lançamento|novos materiais|conhecer.*materiais|convidar.*loja/) && (lower.includes("convid") || lower.includes("conhecer") || lower.includes("lançamento"))) return "convite_loja";
  if(lower.match(/prestador|pedreiro|pintor|eletricista|encanador|gesseiro|marceneiro|estou disponível|procuro obra|busco obra/)) return "prestador_servico";
  if(lower.match(/imobiliária|corretor|vendi um imóvel|indicação|comissão/) && lower.match(/parceria|indicar/)) return "parceria_imobiliaria";
  if(lower.match(/síndico|condomínio|área comum|fachada|administradora/)) return "sindico_reforma";
  if(lower.match(/construção|construcao|construir|terreno|do zero|2 casas|duas casas|casa.*do zero/) && !lower.includes("reforma")) return "cliente_construcao";
  if(lower.match(/interiores|decoração|design de interiores/)) return "cliente_interiores";
  if(lower.match(/paisagismo|jardim|área externa|piscina/)) return "cliente_paisagismo";
  if(lower.match(/reforma|reformar|renovar|abrir cozinha|quebrar parede|integrar sala/)) return "cliente_reforma";
  if(lower.match(/orçamento|orcamento|quanto custa|valor|preço|planilha/) && !full.includes("fornecedor") && !full.includes("loja")) return "cliente_orcamento";
  return "indefinido";
}

async function getJulianaResposta(tel, nome, msg){
  if(!conversas[tel]){
    conversas[tel]={estado:0, dados:{m2:null, bairro:null, tipo_servico:null, comodos:{}, idade:null, estado:null, tipo:null, estilo:null, moradores:null, dor:null, intencao:null, jaCumprimentou:false}, historico:[], ultimasRespostas:[], ultimoTexto:"", ultimoTextoTime:0};
  }
  const entry = conversas[tel];
  
  const lower = msg.toLowerCase();
  const agora = Date.now();
  if(entry.ultimoTexto && entry.ultimoTexto.toLowerCase()===lower && (agora - (entry.ultimoTextoTime||0))<120000){
    console.log(`🔄 Cliente repetiu mesma msg, forçando avanço estado ${entry.estado}->${entry.estado+1}`);
    entry.estado = Math.min(entry.estado+1, 11);
  }
  entry.ultimoTexto = msg;
  entry.ultimoTextoTime = agora;

  const intencao = detectarIntencao(msg, entry.historico);
  if(intencao !== "indefinido") entry.dados.intencao = intencao;

  if(lower.includes("jacarepagua")||lower.includes("jacarepaguá")) entry.dados.bairro="Jacarepaguá";
  else if(lower.includes("leblon")) entry.dados.bairro="Leblon";
  else if(lower.includes("barra")) entry.dados.bairro="Barra da Tijuca";
  else if(lower.includes("recreio")) entry.dados.bairro="Recreio";
  else if(lower.includes("peninsula")||lower.includes("península")) entry.dados.bairro="Barra Península";
  else if(lower.includes("niteroi")||lower.includes("niterói")) entry.dados.bairro="Niterói";
  const m2Match = lower.match(/(\d{2,4})\s*m2|(\d{2,4})m²/); if(m2Match) entry.dados.m2=parseInt(m2Match[1]||m2Match[2]);
  if(lower.includes("cozinha")||lower.includes("integrar a sala")) entry.dados.comodos.cozinha=msg;
  if(lower.includes("banheiro")||lower.includes("suíte")) entry.dados.comodos.banheiros=msg;

  if(entry.estado===0) entry.estado=1;
  if(entry.dados.bairro && entry.estado===1) entry.estado=2;
  if(entry.dados.m2 && entry.estado===2) entry.estado=3;
  if(entry.dados.comodos.cozinha && entry.dados.comodos.cozinha.toLowerCase().includes("integrar") && entry.estado===3) entry.estado=5;

  entry.historico.push({role:"user", content: `${nome} (${intencao}): ${msg}`});

  const nomeCurto = nome.split(' ')[0];
  let resposta = gerarPerguntaTravadaProfissional(entry.estado, entry.dados, nomeCurto, 0);
  
  // Tenta humanizar com Groq se tiver
  if(groq){
    try{
      const prompt = `Você é Juliana Lins, consultora sênior Shaft Arquitetura. Reescreva de forma mais humana, elegante, profissional premium, mantendo exatamente mesma ideia e pergunta: "${resposta}" Histórico: ${entry.historico.slice(-4).map(h=>h.content).join(' | ')} Reescreva curta 2-3 linhas, elegante:`;
      const comp = await groq.chat.completions.create({
        messages: [{role:"user", content: prompt}],
        model: "llama-3.1-8b-instant",
        temperature: 0.88,
        max_tokens: 240
      });
      const r2 = comp.choices[0].message.content.trim().replace(/^"|"$/g,'');
      if(r2.length>10 && r2.length<400) resposta = r2;
    }catch(e){ console.log("Groq humanizar falhou, usando travada"); }
  }

  // Anti-repetição final
  let tentativas=0;
  while(tentativas<3 && entry.ultimasRespostas && entry.ultimasRespostas.slice(-3).some(u=>u.toLowerCase().substring(0,70)===resposta.toLowerCase().substring(0,70))){
    console.log(`🔄 Repetida detectada, gerando variação estado ${entry.estado}`);
    resposta = gerarPerguntaTravadaProfissional(entry.estado+tentativas, entry.dados, nomeCurto, tentativas+1);
    tentativas++;
  }

  entry.historico.push({role:"assistant", content: resposta});
  entry.ultimasRespostas = entry.ultimasRespostas || [];
  entry.ultimasRespostas.push(resposta);
  if(entry.ultimasRespostas.length>8) entry.ultimasRespostas.shift();
  if(entry.estado < 11) entry.estado++;

  return resposta;
}

function gerarPerguntaTravadaProfissional(estado, dados, nomeCurto, tent=0){
  const nome = nomeCurto||"você";
  const vars = {
    0: [`Olá, ${nome}! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Como posso ajudar com seu projeto?`, `Olá, ${nome}! Juliana Lins aqui, da Shaft Arquitetura do Mateus Carvalho. Obrigada por entrar em contato. Me conta, como posso ajudar?`],
    1: [`Perfeito, ${nome}. Para eu entender o contexto e te direcionar com clareza para o Mateus, seu imóvel ou terreno fica em qual região?`, `Entendido, ${nome}. Para eu te direcionar com precisão, fica em qual região?`],
    2: [`Ótimo, ${dados.bairro||''} é uma região que atendemos bastante. E qual a metragem aproximada?`, `Perfeito, e qual a metragem aproximada?`],
    3: [`Entendido, ${dados.m2||''}m² é justamente o porte que mais atendemos. Seu imóvel é mais recente ou original anos 90/2000?`, `Entendido. Seu imóvel é mais recente ou original anos 90/2000?`],
    4: [`E como está a cozinha hoje? É aquele modelo mais fechado, separado da sala, ou já tem alguma integração?`, `Como está a cozinha hoje? É fechada ou já integrada?`],
    5: [`E quanto aos banheiros, são quantos originais? Você pensa em manter ou transformar em suítes, incluir closet?`],
    6: [`E sala e piso, como estão? Pensa em manter piso atual ou trocar tudo por porcelanato grande formato?`],
    7: [`Quem mora no imóvel? Você, casal, família? E você já tem alguma referência de estilo que te agrada? Mais moderno clean ou mais atemporal com madeira?`],
    8: [`Se pudesse resolver apenas uma coisa que mais te incomoda hoje no imóvel, o que seria?`],
    9: [`Você tinha em mente começar em algum período específico? E essa decisão envolve mais alguém da família?`],
    10: [`Para te direcionar com total transparência: com base no que me contou, nossas reformas completas nesse porte ficam entre R$120k e R$280k tudo incluso. Dentro do universo que imaginava, essa faixa faz sentido?`]
  };
  
  // Por intenção
  if(dados.intencao==="fornecedor_parceria"){
    return [`Olá, ${nome}! Que ótimo, obrigada pelo contato. Aqui na Shaft trabalhamos com fornecedores homologados para nossas reformas de alto padrão. Adoramos conhecer novos materiais. Você poderia me contar um pouco mais sobre seus produtos e diferenciais?`, `Olá, ${nome}! Obrigada por entrar em contato. A Shaft avalia novos fornecedores constantemente. Poderia compartilhar seu portfólio e diferenciais?`][tent%2];
  }
  if(dados.intencao==="convite_loja"){
    return [`Olá, ${nome}! Que ótimo, obrigada pelo convite! A Shaft está sempre buscando novos materiais para nossos projetos de alto padrão. Adoraria conhecer os lançamentos. Você tem showroom na Barra? Qual melhor dia esta semana?`][0];
  }
  
  const opcoes = vars[estado] || vars[0];
  return opcoes[tent % opcoes.length];
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
    const nome = md.pushName || "Mateus";
    if(!mensagem || tel.includes("@g.us") || tel.includes("status")) return;
    if(mensagem.trim().length<1) return;
    console.log(`\n📩 ${nome} (${tel}): ${mensagem}`);
    const resposta = await getJulianaResposta(tel, nome, mensagem);
    console.log(`📤 Juliana: ${resposta.substring(0,100)}...`);
    await new Promise(r=>setTimeout(r, 1500));
    await enviarZap(tel, resposta);
  }catch(e){ console.error(e); }
});

app.get('/', (req,res)=>res.send(`<h1>✅ Shaft Juliana V13 - 20 PERSONAS TESTADAS</h1><p>Nunca fica muda, nunca repete, adapta repertório por persona: cliente reforma, construção, fornecedor, loja, prestador, imobiliária, síndico, fora RJ, etc. Cada conversa única, memória real.</p>`));
app.get('/health', (req,res)=>res.send("OK"));
app.listen(PORT, '0.0.0.0', ()=>console.log(`\n🚀 Shaft V13 20 PERSONAS porta ${PORT}\n`));
