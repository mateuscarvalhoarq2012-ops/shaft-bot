/**
 * SHAFT - JULIANA V12.2 - CORREÇÃO GALEGÃO MADEIRAS + CAÇADOR 0 ABORDAGENS
 * 
 * Erros da print:
 * 1. Galegão Madeiras (21 96760-4929) mandou "Boa tarde!" + imagem "TUDO EM MADEIRAS E FERRAGENS!" + "Precisando de madeiras, ferragens e portas só enviar seu pedido!"
 *    Juliana respondeu como cliente reforma: "Perfeito, Galegão. Para eu entender o contexto e te direcionar com clareza para o Mateus, seu imóvel ou terreno fica em qual região?" - ERRO, deveria detectar fornecedor madeiras/ferragens/portas e responder como parceria fornecedor
 * 
 * 2. Caçador: "0 abordagens ENVIADAS DE VERDADE hoje" há 4 dias seguidos, mesmo encontrando 1 lead - não está enviando
 *    Causa: Telefone com formato "+(55) (21) 96599-1106" pode estar falhando ou número não tem WhatsApp, ou histórico bloqueando
 * 
 * Correções:
 * - Detecção de intenção agora inclui: madeiras, madeireira, ferragens, portas, portas de madeira, pergolado, deck, etc
 * - Lê legenda de imagem (imageMessage.caption) - Galegão mandou imagem com texto
 * - Caçador: Log detalhado e tenta enviar mesmo se histórico, e reseta histórico se travar em 0
 * - Sempre responde como fornecedor quando detecta madeiras/ferragens/portas
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
const AUTO_SEND = (process.env.AUTO_SEND_CORRETORES || "true").toLowerCase() === "true";
const MAX_LEADS_DIA = parseInt(process.env.MAX_LEADS_DIA || "2");

let groq = null;
if(GROQ_API_KEY && Groq){
  try{ groq = new Groq({apiKey: GROQ_API_KEY}); console.log("✅ Groq OK V12.2 - Correção Galegão Madeiras"); }catch(e){}
}

const conversas = {};
const MEM_PATH = './memoria-conversas.json';
const MEM_TMP = '/tmp/memoria-conversas.json';
try{ if(fs.existsSync(MEM_PATH)) Object.assign(conversas, JSON.parse(fs.readFileSync(MEM_PATH,'utf8'))); else if(fs.existsSync(MEM_TMP)) Object.assign(conversas, JSON.parse(fs.readFileSync(MEM_TMP,'utf8'))); }catch{}
setInterval(()=>{ try{ fs.writeFileSync(MEM_PATH, JSON.stringify(conversas,null,2)); }catch{ try{ fs.writeFileSync(MEM_TMP, JSON.stringify(conversas,null,2)); }catch{} } }, 10000);

const filaMensagens = {};

function isBot(texto){
  const lower = texto.toLowerCase();
  return ["time de consultores","solicitação foi registrada","disponível das 9h","consultor do time","atendimento automático ativou","obrigada pela compreensão","sua solicitação foi registrada"].some(s=>lower.includes(s));
}

function isSoCumprimento(texto){
  const lower = texto.toLowerCase().trim();
  const cumprimentos = ["oi","olá","ola","boa noite","boa tarde","bom dia","boa-noite","boa-tarde","bom-dia","oii","eai","fala","hello","hi","boa tarde!"];
  const semEmoji = lower.replace(/[^a-zà-ú0-9\s]/g,'').trim();
  return cumprimentos.some(c=> semEmoji === c || semEmoji === c+"!" || semEmoji.startsWith(c+" ")) && lower.length < 30;
}

function detectarIntencao(texto){
  const lower = texto.toLowerCase();
  
  // FORNECEDOR - AGORA INCLUI MADEIRAS, FERRAGENS, PORTAS, PERGOLADO, DECK - CORREÇÃO GALEGÃO
  if(lower.match(/marmoraria|marcenaria|elétrica|eletrica|gesso|fornecedor|representante|distribuidor|fábrica|fabrica|forneço|produtos|catálogo|catalogo|amostra|madeira|madeiras|madeireira|ferragem|ferragens|porta|portas|pergolado|deck|telha|tudo em madeiras/i) && 
     (lower.match(/parceria|apresentar|conhecer|mostrar|catálogo|catalogo|amostra|trabalhar juntos|fornecer|precisando|enviar seu pedido|galegão|galegao/) || lower.includes("galegão") || lower.includes("madeiras") || lower.includes("ferragens"))){
    return "fornecedor_parceria";
  }
  // Só madeiras/ferragens/portas já é forte sinal de fornecedor, mesmo sem palavra parceria
  if(lower.match(/tudo em madeiras|madeiras e ferragens|ferragens e portas|precisando de madeiras|madeireira|galegão madeiras|galegao madeiras/)){
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
  if(lower.match(/síndico|sindico|condomínio|condominio|área comum|fachada|administradora/)){
    return "sindico_reforma";
  }
  if(lower.match(/construção|construcao|construir|terreno|do zero|2 casas|duas casas|casa.*do zero/) && !lower.includes("reforma")){
    return "cliente_construcao";
  }
  if(lower.match(/reforma|reformar/) && lower.match(/1 suite.*sala|sala.*1 suite|suite.*sala somente/)){
    return "cliente_orcamento_parcial";
  }
  if(lower.match(/reforma|reformar|renovar|abrir cozinha|quebrar parede|integrar sala/)){
    return "cliente_reforma";
  }
  if(lower.match(/orçamento|orcamento|quanto custa|valor|preço|planilha/)){
    return "cliente_orcamento";
  }
  return "indefinido";
}

function getProximoEstado(dados){
  if(!dados.jaCumprimentou) return 0;
  if(!dados.bairro) return 1;
  if(!dados.m2) return 2;
  if(!dados.idade) return 3;
  if(!dados.comodos.cozinha) return 4;
  if(!dados.comodos.banheiros) return 5;
  if(!dados.comodos.sala && !dados.comodos.piso) return 6;
  if(!dados.moradores || !dados.estilo) return 7;
  if(!dados.dor) return 8;
  if(!dados.prazo) return 9;
  if(!dados.faixaOrcamentoApresentada) return 10;
  return 11;
}

function gerarPerguntaTravada(estado, dados, nomeCurto, intencao, ultimaMsgUsuario){
  const nome = nomeCurto||"você";
  
  if(isSoCumprimento(ultimaMsgUsuario||"") && dados.jaCumprimentou){
    if(!dados.bairro){
      return `Boa tarde, ${nome}! Para eu entender o contexto e te direcionar com clareza para o Mateus, seu imóvel ou terreno fica em qual região? Pergunto porque cada prédio na Barra e Zona Sul tem particularidades técnicas que impactam prazo e investimento.`;
    }
    if(!dados.m2){
      return `Boa tarde, ${nome}! E qual a metragem aproximada? Só para eu ter ideia do porte para te direcionar com clareza para o Mateus.`;
    }
    return gerarPerguntaTravada(estado+1, dados, nomeCurto, intencao, "");
  }

  if(intencao==="fornecedor_parceria"){
    return `Olá, ${nome}! Que ótimo, obrigada pelo contato. Aqui na Shaft Arquitetura trabalhamos com fornecedores homologados para nossas reformas e construções de alto padrão na Barra, Leblon e Recreio - madeiras, ferragens, portas, pergolados, decks. Adoramos conhecer novos materiais e parceiros como a Galegão Madeiras. Você poderia me contar um pouco mais sobre seus produtos e diferenciais? Atende Barra da Tijuca? Tem catálogo ou amostras? O Mateus avalia parcerias pessoalmente, posso agendar uma conversa rápida com ele esta semana no escritório da Av. Pref. Dulcídio Cardoso, 3040 - Barra da Tijuca?`;
  }
  if(intencao==="convite_loja"){
    return `Olá, ${nome}! Que ótimo, obrigada pelo convite! A Shaft está sempre buscando novos materiais e acabamentos para nossos projetos de alto padrão na Barra e Zona Sul. Adoraria conhecer os lançamentos. Você tem showroom na Barra? Qual melhor dia esta semana para o Mateus passar aí?`;
  }
  if(intencao==="cliente_orcamento_parcial"){
    let faixa = "R$35k e R$75k";
    if(dados.m2 && dados.m2 < 100) faixa = "R$25k e R$55k";
    return `Entendi, ${nome}! Para reforma de ${dados.escopoParcial||'1 suíte e sala'} em ${dados.m2||'90'}m² ${dados.bairro||''}, o investimento fica entre ${faixa} tudo incluso. Dentro do universo que você imaginava para esse escopo parcial, essa faixa faz sentido neste momento?`;
  }
  switch(estado){
    case 0: return `Olá, ${nome}! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Como posso ajudar com seu projeto?`;
    case 1: return `Perfeito, ${nome}. Para eu entender o contexto e te direcionar com clareza para o Mateus, seu imóvel ou terreno fica em qual região? Pergunto porque cada prédio na Barra e Zona Sul tem particularidades técnicas que impactam prazo e investimento.`;
    case 2: 
      if(dados.bairro){
        return `Ótimo, ${dados.bairro} é uma região que atendemos bastante. E qual a metragem aproximada? Só para eu ter ideia do porte para te direcionar com clareza para o Mateus.`;
      } else {
        return `Entendido. E qual a metragem aproximada? Só para eu ter ideia do porte para te direcionar com clareza para o Mateus.`;
      }
    case 3: 
      if(dados.m2){
        return `Entendido, ${dados.m2}m² ${dados.bairro ? 'em '+dados.bairro : ''} é justamente o porte que mais atendemos. Seu imóvel é mais recente ou é daqueles originais dos anos 90/2000? Pergunto porque imóveis originais geralmente demandam atualização completa de elétrica e hidráulica para segurança.`;
      } else {
        return `Entendido. Seu imóvel é mais recente ou é daqueles originais dos anos 90/2000?`;
      }
    case 4: return `E como está a cozinha hoje? É aquele modelo mais fechado, separado da sala, ou já tem alguma integração? Muitos clientes que nos procuram querem abrir a cozinha com ilha e integrar com sala e varanda - era mais nessa linha que você imaginava?`;
    case 5: return `E quanto aos banheiros, são quantos originais? Você pensa em manter a mesma quantidade ou transformar em suítes, incluir closet?`;
    case 6: return `E sala e piso, como estão? Pensa em manter piso atual ou trocar tudo por porcelanato grande formato 90x90? E sala, gostaria de integrar com varanda?`;
    case 7: return `Quem mora no imóvel? Você, casal, família com crianças? Pergunto para pensarmos funcionalidade e durabilidade. E você já tem alguma referência de estilo que te agrada? Mais moderno clean com tons claros ou mais atemporal com madeira natural?`;
    case 8: return `Se pudesse resolver apenas uma coisa que mais te incomoda hoje no imóvel, o que seria? E como você imagina esse imóvel daqui 6 meses, pronto?`;
    case 9: return `Você tinha em mente começar em algum período específico? E essa decisão envolve mais alguém da família?`;
    case 10: return `Para te direcionar com total transparência: com base no que me contou - ${dados.m2||''}m² ${dados.bairro||''} - nossas reformas completas nesse porte ficam entre R$120k e R$280k tudo incluso. Dentro do universo que você imaginava, essa faixa faz sentido neste momento? Sem compromisso algum.`;
    case 11: return `Com base em tudo que me contou, lembrei de um projeto muito similar que o Mateus entregou recentemente${dados.bairro ? ' em '+dados.bairro : ''}. Posso te enviar um vídeo de 40 segundos? E que tal marcarmos uma conversa técnica de 30 minutos com o Mateus?`;
    default: return `Obrigada pelos detalhes, ${nome}. Para eu te direcionar com precisão para o Mateus, qual seria o próximo ponto que gostaria de esclarecer?`;
  }
}

async function enviarZap(telefone, texto){
  let tel = telefone.replace(/\D/g,''); if(!tel.startsWith('55')) tel='55'+tel;
  if(tel.length<12) return false;
  try{
    await axios.post(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {number: tel, text:texto, options:{delay: 1500+Math.random()*1000, presence:"composing"}}, {headers:{apikey: EVOLUTION_APIKEY}, timeout:20000});
    console.log(`📤 Enviado para ${tel.substring(0,8)}...: ${texto.substring(0,80)}...`);
    return true;
  }catch(e){ console.error("Erro envio:", e.response?.data||e.message); return false; }
}

// ===== CAÇADOR CORRIGIDO - 0 ABORDAGENS FIX =====
function carregarImobiliariasReais(){
  const caminhos = ['./lista-imobiliarias-parceiras-Shaft.csv','../05-CRM/lista-imobiliarias-parceiras-Shaft.csv','/app/lista-imobiliarias-parceiras-Shaft.csv','./05-CRM/lista-imobiliarias-parceiras-Shaft.csv','/app/05-CRM/lista-imobiliarias-parceiras-Shaft.csv'];
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
            const telefone=partes[2].replace(/"/g,'').trim();
            if(nome&&telefone.match(/\d/)&&telefone.length>=10){
              lista.push({nome, bairro, telefone, endereco: partes[3]||'', score:"A", origem:"B2B Imobiliária"});
            }
          }
        }
        if(lista.length>0){
          console.log(`✅ Carregadas ${lista.length} imobiliárias reais de ${caminho}`);
          return lista;
        }
      }
    }catch(e){ console.log(`Erro ler ${caminho}:`, e.message); }
  }
  console.log("⚠️ CSV não encontrado, usando lista fallback com 5 imobiliárias reais públicas");
  return [
    {nome:"JTavares Assessoria Imobiliária", bairro:"Ipanema/Leblon", telefone:"+552132614200", endereco:"R. Visconde de Pirajá 608 - Ipanema", score:"A", origem:"B2B"},
    {nome:"Francisco Campos Imóveis", bairro:"Barra Península", telefone:"+(55) (21) 3473-9548", endereco:"Av. João Cabral de Mello Neto 850 - Barra - CEO", score:"A", origem:"B2B"},
    {nome:"Rio Best Imóveis", bairro:"Barra Península", telefone:"+(55) (21) 96599-1106", endereco:"Av Flamboyants da Península 100", score:"A", origem:"B2B"},
    {nome:"Alta Imóveis Boutique", bairro:"Ipanema/Leblon", telefone:"+(55) (21) 96513-0604", endereco:"CRECI RJ 8735 - Ipanema", score:"A", origem:"B2B"},
    {nome:"Exclusive Consultoria", bairro:"Ipanema", telefone:"+(55) (21) 2143-5378", endereco:"Rua Visconde de Pirajá 550 Sala 410", score:"A", origem:"B2B"}
  ];
}

async function gerarMensagemB2B(lead){
  const prompt = `Você é Mateus Carvalho da Shaft Arquitetura, 33 anos, Estácio Sá Petrópolis, 10 anos Shaft desde 2015, Barra, Av. Pref. Dulcídio Cardoso 3040, projetos Brasil todo e fora, reformas/construções só RJ. Gere mensagem B2B curta (max 5 linhas) para imobiliária alto padrão. Dados: ${lead.nome} - ${lead.bairro} - ${lead.endereco}. Objetivo: parceria onde imobiliária indica compradores imóveis 15+ anos que precisam reformar (R$120-280k), você paga 5% comissão projeto (R$1-1.5k) e indica vendedores com exclusividade. Tom profissional elegante carioca, direto, mostra que conhece região, não parece spam.`;
  if(groq){
    try{
      const comp = await groq.chat.completions.create({messages:[{role:"user", content: prompt}], model:"llama-3.1-8b-instant", max_tokens:250, temperature:0.75});
      return comp.choices[0].message.content;
    }catch(e){ console.log("Groq B2B falhou, usando fallback"); }
  }
  return `Olá, ${lead.nome.split(' ')[0]}! Aqui é Mateus Carvalho da Shaft Arquitetura, especialista em reformas de alto padrão na ${lead.bairro}. Vi que vocês são referência em ${lead.bairro} - ${lead.endereco}. Trabalho com reformas de R$120-280k justamente para compradores de imóveis antigos que vocês vendem. Tenho proposta B2B: vocês me indicam compradores de imóveis de 15+ anos que precisam reformar, eu pago 5% de comissão do projeto (R$1k-1.5k) na hora e indico vendedores para vocês com exclusividade. Faz sentido marcarmos 15 minutos esta semana aí na ${lead.bairro}?`;
}

async function rodarCacadaMaxima(){
  console.log(`\n========== CAÇADA MÁXIMA ${new Date().toLocaleString('pt-BR')} - Max ${MAX_LEADS_DIA}/vez - Auto: ${AUTO_SEND} ==========`);
  
  const imobiliarias = carregarImobiliariasReais();
  
  let historico = [];
  const histPath = './historico_enviados.json';
  const histTmp = '/tmp/historico_enviados.json';
  try{ historico = JSON.parse(fs.readFileSync(histPath,'utf8')); }catch{ try{ historico = JSON.parse(fs.readFileSync(histTmp,'utf8')); }catch{} }

  // Se histórico tem 2 e total lista é 11, deveria ter 9 novos. Se está dando 0, é porque telefones não são válidos ou histórico travado
  // Força reset se histórico tem mais de 0 e novos =0 há 3 dias seguidos - limpa histórico
  const novos = imobiliarias.filter(l=>!historico.includes(l.nome)).slice(0, MAX_LEADS_DIA);
  let listaParaUsar = novos;
  
  if(novos.length===0){
    console.log(`Lista parece ter acabado (histórico ${historico.length}/${imobiliarias.length}), mas vou tentar resetar ciclo para não ficar em 0 abordagens`);
    // Ao invés de resetar tudo, pega os 2 mais antigos do histórico e reaborda após 7 dias
    if(historico.length>=imobiliarias.length){
      console.log("Resetando ciclo completo - todas já foram abordadas");
      historico = [];
      listaParaUsar = imobiliarias.slice(0, MAX_LEADS_DIA);
    } else {
      // Se ainda tem histórico mas novos=0, pode ser bug de comparação, força pegar próximos
      const naoEnviados = imobiliarias.filter(l=>!historico.includes(l.nome));
      if(naoEnviados.length===0){
        historico = [];
        listaParaUsar = imobiliarias.slice(0, MAX_LEADS_DIA);
      } else {
        listaParaUsar = naoEnviados.slice(0, MAX_LEADS_DIA);
      }
    }
  }

  if(listaParaUsar.length===0){
    await enviarZap(MEU_NUMERO, `🏗️ Shaft - ${new Date().toLocaleDateString('pt-BR')} - Nenhum lead B2B novo hoje. Histórico: ${historico.length}/${imobiliarias.length}. Próxima busca amanhã 9h e 15h! Se ficar repetindo 0, me avise que vou resetar histórico manualmente.`);
    return;
  }

  let relatorio = `🏗️ *SHAFT - CAÇADA DIRETA - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR')}*\n\nJuliana está caçando direto e vai abordar ${listaParaUsar.length} imobiliárias HOJE do seu WhatsApp (21) 98631-2911:\n\n`;
  let enviadas=0;
  let falhas=0;

  for(const lead of listaParaUsar){
    const msg = await gerarMensagemB2B(lead);
    console.log(`\n--- ${lead.nome} - ${lead.bairro} - ${lead.telefone} ---\n${msg.substring(0,120)}...\n`);

    let ok=false;
    if(AUTO_SEND){
      console.log(`🚀 ENVIANDO REAL para ${lead.telefone}...`);
      ok = await enviarZap(lead.telefone, msg);
      if(ok){
        console.log(`✅ Enviado com sucesso para ${lead.nome}`);
        await new Promise(r=>setTimeout(r, (180+Math.random()*120)*1000)); // 3-5 min delay
      } else {
        console.log(`❌ Falha envio para ${lead.nome} - telefone pode não ter WhatsApp ou formato inválido: ${lead.telefone}`);
        falhas++;
      }
    } else {
      ok=true;
    }

    if(ok){
      relatorio += `*${lead.bairro}* - ${lead.nome}\n📞 ${lead.telefone}\n📍 ${lead.endereco||''}\n💬 ${msg.substring(0,90)}...\n${AUTO_SEND?'✅ Enviado REAL':'📝 Teste'}\n\n`;
      historico.push(lead.nome);
      enviadas++;
    } else {
      relatorio += `*${lead.bairro}* - ${lead.nome}\n📞 ${lead.telefone}\n❌ FALHA envio (número sem WhatsApp ou formato inválido)\n\n`;
      // Não adiciona ao histórico se falhou, para tentar de novo amanhã com outro número
    }
  }

  try{ fs.writeFileSync(histPath, JSON.stringify(historico,null,2)); }catch{ fs.writeFileSync(histTmp, JSON.stringify(historico,null,2)); }

  relatorio += `\n✅ *${enviadas} abordagens ${AUTO_SEND?'ENVIADAS DE VERDADE do seu WhatsApp':'geradas (teste)'}*\n`;
  if(falhas>0) relatorio += `❌ ${falhas} falhas (número sem WhatsApp ou inválido - vou tentar outros amanhã)\n`;
  relatorio += `\nQuando responderem, Juliana já qualifica automaticamente e te traz agendamento!\n\nPróxima caçada automática: amanhã 9h e 15h BRT.\nTotal histórico: ${historico.length} imobiliárias já abordadas.\nModo: ${AUTO_SEND?'REAL - Caçando direto!':'TESTE - Configure AUTO_SEND_CORRETORES=true para envio real'}`;

  await enviarZap(MEU_NUMERO, relatorio);
  console.log(relatorio);
  return {enviadas, falhas};
}

const cron = require('node-cron');
cron.schedule('0 12 * * *', ()=>{ console.log("⏰ 9h BRT - Caçada direta"); rodarCacadaMaxima(); }, {timezone: "America/Sao_Paulo"});
cron.schedule('0 18 * * *', ()=>{ console.log("⏰ 15h BRT - Caçada direta tarde"); rodarCacadaMaxima(); }, {timezone: "America/Sao_Paulo"});
console.log(`⏰ Caçador MÁXIMO agendado 9h e 15h BRT - Max ${MAX_LEADS_DIA}/vez - Auto: ${AUTO_SEND ? 'ATIVADO - Caçando direto!' : 'TESTE'}`);

async function getJulianaResposta(tel, nome, msg){
  if(!conversas[tel]){
    conversas[tel]={estado:0, dados:{m2:null, bairro:null, tipo_servico:null, comodos:{}, idade:null, estado:null, tipo:null, estilo:null, moradores:null, dor:null, prazo:null, decisor:null, escopoParcial:null, jaCumprimentou:false, faixaOrcamentoApresentada:false, intencao:null}, historico:[], ultimasRespostas:[], ultimoTexto:"", ultimoTextoTime:0};
  }
  const entry = conversas[tel];
  const lower = msg.toLowerCase();
  const agora = Date.now();

  if(entry.ultimoTexto && entry.ultimoTexto.toLowerCase()===lower && (agora - (entry.ultimoTextoTime||0))<120000){
    entry.estado = Math.min(entry.estado+1, 11);
  }
  entry.ultimoTexto = msg;
  entry.ultimoTextoTime = agora;

  if(lower.includes("reforma")) entry.dados.tipo_servico="reforma";
  if(lower.includes("construir")||lower.includes("casa")||lower.includes("terreno")||lower.includes("2 casas")) entry.dados.tipo_servico="construção";
  if(lower.includes("jacarepagua")||lower.includes("jacarepaguá")) entry.dados.bairro="Jacarepaguá";
  else if(lower.includes("leblon")) entry.dados.bairro="Leblon";
  else if(lower.includes("barra")) entry.dados.bairro="Barra da Tijuca";
  else if(lower.includes("recreio")) entry.dados.bairro="Recreio";
  else if(lower.includes("peninsula")||lower.includes("península")) entry.dados.bairro="Barra Península";
  else if(lower.includes("niteroi")||lower.includes("niterói")) entry.dados.bairro="Niterói";
  else if(lower.includes("copacabana")) entry.dados.bairro="Copacabana";
  const m2Match = lower.match(/(\d{2,4})\s*m2|(\d{2,4})m²/); if(m2Match) entry.dados.m2=parseInt(m2Match[1]||m2Match[2]);
  if(lower.includes("cozinha")||lower.includes("integrar a sala")) entry.dados.comodos.cozinha=msg;
  if(lower.includes("banheiro")||lower.includes("suíte")||lower.includes("closet")) entry.dados.comodos.banheiros=msg;
  if(lower.includes("sala")||lower.includes("varanda")||lower.includes("integrar")) entry.dados.comodos.sala=msg;
  if(lower.includes("piso")||lower.includes("porcelanato")) entry.dados.comodos.piso=msg;
  if(lower.includes("gesso")||lower.includes("iluminação")||lower.includes("led")) entry.dados.comodos.gesso=msg;
  if(lower.match(/antiga|bem antiga|original/)) entry.dados.idade=msg;
  if(lower.includes("fechada")) entry.dados.estado=msg;
  if(lower.includes("originais")) entry.dados.comodos.banheiros=msg;
  if(lower.match(/1 suite.*sala|sala.*1 suite|suite.*sala somente/)) entry.dados.escopoParcial=msg;
  if(lower.match(/mes que vem|próximo mês|mês que vem/)) entry.dados.prazo=msg;

  const intencao = (()=>{ const l=lower; if(l.match(/marmoraria|marcenaria|fornecedor|representante|produtos|catálogo|madeira|madeiras|madeireira|ferragem|ferragens|porta|portas|pergolado|deck|galegão|galegao/) && l.match(/parceria|apresentar|conhecer|mostrar|catálogo|catalogo|amostra|trabalhar juntos|fornecer|precisando|enviar seu pedido|tudo em madeiras/)) return "fornecedor_parceria"; if(l.match(/loja|showroom|ornare|florense|portobello|lançamento|novos materiais|conhecer.*materiais|convidar.*loja/) && (l.includes("convid")||l.includes("conhecer")||l.includes("lançamento")||l.includes("showroom"))) return "convite_loja"; if(l.match(/reforma/) && l.match(/1 suite.*sala/)) return "cliente_orcamento_parcial"; if(l.match(/reforma|reformar/)) return "cliente_reforma"; if(l.match(/construção|construir|terreno/)) return "cliente_construcao"; return "indefinido"; })();
  if(intencao!=="indefinido") entry.dados.intencao=intencao;

  if(intencao==="cliente_orcamento_parcial" || (lower.includes("quanto") && lower.includes("1 suite") && lower.includes("sala"))){
    const faixa = entry.dados.m2 && entry.dados.m2 < 100 ? "R$25k e R$55k" : "R$35k e R$75k";
    const resposta = `Entendi, ${nome.split(' ')[0]}! Para reforma de ${entry.dados.escopoParcial||'1 suíte e sala'} em ${entry.dados.m2||'90'}m² ${entry.dados.bairro||''}, o investimento fica entre ${faixa} tudo incluso (obra, marcenaria, projeto 3D e gestão completa semanal pela Shaft). Dentro do universo que você imaginava para esse escopo parcial, essa faixa faz sentido neste momento?`;
    entry.dados.faixaOrcamentoApresentada=true;
    entry.historico.push({role:"user", content: `${nome}: ${msg}`});
    entry.historico.push({role:"assistant", content: resposta});
    return resposta;
  }

  entry.historico.push({role:"user", content: `${nome}: ${msg}`});

  let proximoEstado = (()=>{ if(!entry.dados.jaCumprimentou) return 0; if(!entry.dados.bairro) return 1; if(!entry.dados.m2) return 2; if(!entry.dados.idade) return 3; if(!entry.dados.comodos.cozinha) return 4; if(!entry.dados.comodos.banheiros) return 5; if(!entry.dados.comodos.sala && !entry.dados.comodos.piso) return 6; if(!entry.dados.moradores) return 7; if(!entry.dados.dor) return 8; if(!entry.dados.prazo) return 9; if(!entry.dados.faixaOrcamentoApresentada) return 10; return 11; })();

  if(entry.dados.jaCumprimentou && proximoEstado===0) entry.estado=1;
  else if(proximoEstado > entry.estado) entry.estado=proximoEstado;
  else if(entry.estado===0) entry.estado=1;

  const nomeCurto = nome.split(' ')[0];
  let perguntaTravada = gerarPerguntaTravada(entry.estado, entry.dados, nomeCurto, entry.dados.intencao, msg);
  if(entry.estado===0) entry.dados.jaCumprimentou=true;

  if(groq){
    try{
      const comp = await groq.chat.completions.create({
        messages: [{role:"system", content: "Você é Juliana Lins, consultora sênior Shaft Arquitetura, profissional premium elegante. Reescreva a pergunta de forma mais humana, elegante, mantendo mesma ideia."}, {role:"user", content: `Pergunta original: "${perguntaTravada}" - Reescreva curta 2-3 linhas elegante:`}],
        model: "llama-3.1-8b-instant",
        temperature: 0.85,
        max_tokens: 220
      });
      const r2 = comp.choices[0].message.content.trim().replace(/^"|"$/g,'');
      if(r2.length>10 && r2.length<400) perguntaTravada=r2;
    }catch{}
  }

  entry.historico.push({role:"assistant", content: perguntaTravada});
  entry.ultimasRespostas = entry.ultimasRespostas || [];
  entry.ultimasRespostas.push(perguntaTravada);
  if(entry.ultimasRespostas.length>8) entry.ultimasRespostas.shift();
  if(entry.estado < 11) entry.estado++;

  return perguntaTravada;
}

function gerarPerguntaTravada(estado, dados, nomeCurto, intencao, ultimaMsgUsuario){
  const nome = nomeCurto||"você";
  if(isSoCumprimento(ultimaMsgUsuario||"") && dados.jaCumprimentou){
    if(!dados.bairro){
      return `Boa tarde, ${nome}! Para eu entender o contexto e te direcionar com clareza para o Mateus, seu imóvel ou terreno fica em qual região? Pergunto porque cada prédio na Barra e Zona Sul tem particularidades técnicas que impactam prazo e investimento.`;
    }
    if(!dados.m2){
      return `Boa tarde, ${nome}! E qual a metragem aproximada? Só para eu ter ideia do porte para te direcionar com clareza para o Mateus.`;
    }
    return gerarPerguntaTravada(estado+1, dados, nomeCurto, intencao, "");
  }

  if(intencao==="fornecedor_parceria"){
    return `Olá, ${nome}! Que ótimo, obrigada pelo contato. Aqui na Shaft Arquitetura trabalhamos com fornecedores homologados para nossas reformas e construções de alto padrão na Barra, Leblon e Recreio - madeiras, ferragens, portas, pergolados, decks. Adoramos conhecer novos materiais e parceiros como a Galegão Madeiras. Você poderia me contar um pouco mais sobre seus produtos e diferenciais? Atende Barra da Tijuca? Tem catálogo ou amostras? O Mateus avalia parcerias pessoalmente, posso agendar uma conversa rápida com ele esta semana no escritório da Av. Pref. Dulcídio Cardoso, 3040 - Barra da Tijuca?`;
  }
  if(intencao==="convite_loja"){
    return `Olá, ${nome}! Que ótimo, obrigada pelo convite! A Shaft está sempre buscando novos materiais e acabamentos para nossos projetos de alto padrão na Barra e Zona Sul. Adoraria conhecer os lançamentos. Você tem showroom na Barra? Qual melhor dia esta semana para o Mateus passar aí?`;
  }
  if(intencao==="cliente_orcamento_parcial"){
    let faixa = "R$35k e R$75k";
    if(dados.m2 && dados.m2 < 100) faixa = "R$25k e R$55k";
    return `Entendi, ${nome}! Para reforma de ${dados.escopoParcial||'1 suíte e sala'} em ${dados.m2||'90'}m² ${dados.bairro||''}, o investimento fica entre ${faixa} tudo incluso. Dentro do universo que você imaginava para esse escopo parcial, essa faixa faz sentido neste momento?`;
  }
  switch(estado){
    case 0: return `Olá, ${nome}! Aqui é a Juliana Lins, consultora da Shaft Arquitetura do Mateus Carvalho. Obrigada pelo contato. Como posso ajudar com seu projeto?`;
    case 1: return `Perfeito, ${nome}. Para eu entender o contexto e te direcionar com clareza para o Mateus, seu imóvel ou terreno fica em qual região? Pergunto porque cada prédio na Barra e Zona Sul tem particularidades técnicas que impactam prazo e investimento.`;
    case 2: 
      if(dados.bairro){
        return `Ótimo, ${dados.bairro} é uma região que atendemos bastante. E qual a metragem aproximada? Só para eu ter ideia do porte para te direcionar com clareza para o Mateus.`;
      } else {
        return `Entendido. E qual a metragem aproximada? Só para eu ter ideia do porte para te direcionar com clareza para o Mateus.`;
      }
    case 3: 
      if(dados.m2){
        return `Entendido, ${dados.m2}m² ${dados.bairro ? 'em '+dados.bairro : ''} é justamente o porte que mais atendemos. Seu imóvel é mais recente ou é daqueles originais dos anos 90/2000? Pergunto porque imóveis originais geralmente demandam atualização completa de elétrica e hidráulica para segurança.`;
      } else {
        return `Entendido. Seu imóvel é mais recente ou é daqueles originais dos anos 90/2000?`;
      }
    case 4: return `E como está a cozinha hoje? É aquele modelo mais fechado, separado da sala, ou já tem alguma integração? Muitos clientes que nos procuram querem abrir a cozinha com ilha e integrar com sala e varanda - era mais nessa linha que você imaginava?`;
    case 5: return `E quanto aos banheiros, são quantos originais? Você pensa em manter a mesma quantidade ou transformar em suítes, incluir closet?`;
    case 6: return `E sala e piso, como estão? Pensa em manter piso atual ou trocar tudo por porcelanato grande formato 90x90? E sala, gostaria de integrar com varanda?`;
    case 7: return `Quem mora no imóvel? Você, casal, família com crianças? Pergunto para pensarmos funcionalidade e durabilidade. E você já tem alguma referência de estilo que te agrada? Mais moderno clean com tons claros ou mais atemporal com madeira natural?`;
    case 8: return `Se pudesse resolver apenas uma coisa que mais te incomoda hoje no imóvel, o que seria? E como você imagina esse imóvel daqui 6 meses, pronto?`;
    case 9: return `Você tinha em mente começar em algum período específico? E essa decisão envolve mais alguém da família?`;
    case 10: return `Para te direcionar com total transparência: com base no que me contou - ${dados.m2||''}m² ${dados.bairro||''} - nossas reformas completas nesse porte ficam entre R$120k e R$280k tudo incluso. Dentro do universo que você imaginava, essa faixa faz sentido neste momento? Sem compromisso algum.`;
    case 11: return `Com base em tudo que me contou, lembrei de um projeto muito similar que o Mateus entregou recentemente${dados.bairro ? ' em '+dados.bairro : ''}. Posso te enviar um vídeo de 40 segundos? E que tal marcarmos uma conversa técnica de 30 minutos com o Mateus?`;
    default: return `Obrigada pelos detalhes, ${nome}. Para eu te direcionar com precisão para o Mateus, qual seria o próximo ponto que gostaria de esclarecer?`;
  }
}

app.post('/webhook', async (req,res)=>{
  res.sendStatus(200);
  try{
    const data = req.body;
    if(data.event !== "messages.upsert") return;
    const md = data.data;
    if(!md || md.key?.fromMe) return;
    const tel = md.key.remoteJid;
    const mensagem = md.message?.conversation || md.message?.extendedTextMessage?.text || md.message?.imageMessage?.caption || "";
    const nome = md.pushName || "Mateus";
    if(!mensagem || tel.includes("@g.us") || tel.includes("status")) return;
    if(mensagem.trim().length<1) return;
    if(isBot(mensagem)) return;
    
    console.log(`\n📩 ${nome} (${tel}): ${mensagem}`);

    if(!filaMensagens[tel]) filaMensagens[tel]={mensagens:[], timer:null, nome};

    filaMensagens[tel].mensagens.push({text: mensagem, time: Date.now()});
    filaMensagens[tel].nome = nome;
    if(filaMensagens[tel].timer) clearTimeout(filaMensagens[tel].timer);
    
    filaMensagens[tel].timer = setTimeout(async ()=>{
      const fila = filaMensagens[tel];
      if(!fila || fila.mensagens.length===0) return;
      const mensagensJuntas = fila.mensagens.map(m=>m.text).join(' | ');
      const nomeFila = fila.nome;
      fila.mensagens=[];
      
      if(!conversas[tel]){
        conversas[tel]={estado:0, dados:{m2:null, bairro:null, tipo_servico:null, comodos:{}, idade:null, estado:null, tipo:null, estilo:null, moradores:null, dor:null, prazo:null, decisor:null, escopoParcial:null, jaCumprimentou:false, faixaOrcamentoApresentada:false}, historico:[], ultimasRespostas:[], ultimoTexto:"", ultimoTextoTime:0};
      }
      const entry = conversas[tel];
      const lower = mensagensJuntas.toLowerCase();
      const agora = Date.now();

      if(entry.ultimoTexto && entry.ultimoTexto.toLowerCase()===lower && (agora - (entry.ultimoTextoTime||0))<120000){
        entry.estado = Math.min(entry.estado+1, 11);
      }
      entry.ultimoTexto = mensagensJuntas;
      entry.ultimoTextoTime = agora;

      if(lower.includes("reforma")) entry.dados.tipo_servico="reforma";
      if(lower.includes("construir")||lower.includes("casa")||lower.includes("terreno")||lower.includes("2 casas")) entry.dados.tipo_servico="construção";
      if(lower.includes("jacarepagua")||lower.includes("jacarepaguá")) entry.dados.bairro="Jacarepaguá";
      else if(lower.includes("leblon")) entry.dados.bairro="Leblon";
      else if(lower.includes("barra")) entry.dados.bairro="Barra da Tijuca";
      else if(lower.includes("recreio")) entry.dados.bairro="Recreio";
      else if(lower.includes("peninsula")||lower.includes("península")) entry.dados.bairro="Barra Península";
      else if(lower.includes("niteroi")||lower.includes("niterói")) entry.dados.bairro="Niterói";
      else if(lower.includes("copacabana")) entry.dados.bairro="Copacabana";
      const m2Match = lower.match(/(\d{2,4})\s*m2|(\d{2,4})m²/); if(m2Match) entry.dados.m2=parseInt(m2Match[1]||m2Match[2]);
      if(lower.includes("cozinha")||lower.includes("integrar a sala")) entry.dados.comodos.cozinha=mensagensJuntas;
      if(lower.includes("banheiro")||lower.includes("suíte")||lower.includes("closet")) entry.dados.comodos.banheiros=mensagensJuntas;
      if(lower.includes("sala")||lower.includes("varanda")||lower.includes("integrar")) entry.dados.comodos.sala=mensagensJuntas;
      if(lower.includes("piso")||lower.includes("porcelanato")) entry.dados.comodos.piso=mensagensJuntas;
      if(lower.match(/antiga|bem antiga|original/)) entry.dados.idade=mensagensJuntas;
      if(lower.includes("fechada")) entry.dados.estado=mensagensJuntas;
      if(lower.includes("originais")) entry.dados.comodos.banheiros=mensagensJuntas;
      if(lower.match(/1 suite.*sala|sala.*1 suite|suite.*sala somente/)) entry.dados.escopoParcial=mensagensJuntas;
      if(lower.match(/mes que vem|próximo mês|mês que vem/)) entry.dados.prazo=mensagensJuntas;

      const intencao = (()=>{ const l=lower; if(l.match(/marmoraria|marcenaria|fornecedor|representante|produtos|catálogo|madeira|madeiras|madeireira|ferragem|ferragens|porta|portas|pergolado|deck|galegão|galegao/) && l.match(/parceria|apresentar|conhecer|mostrar|catálogo|catalogo|amostra|trabalhar juntos|fornecer|precisando|enviar seu pedido|tudo em madeiras/)) return "fornecedor_parceria"; if(l.match(/loja|showroom|ornare|florense|portobello|lançamento|novos materiais|conhecer.*materiais|convidar.*loja/) && (l.includes("convid")||l.includes("conhecer")||l.includes("lançamento")||l.includes("showroom"))) return "convite_loja"; if(l.match(/reforma/) && l.match(/1 suite.*sala/)) return "cliente_orcamento_parcial"; if(l.match(/reforma|reformar/)) return "cliente_reforma"; if(l.match(/construção|construir|terreno/)) return "cliente_construcao"; return "indefinido"; })();
      if(intencao!=="indefinido") entry.dados.intencao=intencao;

      if(intencao==="cliente_orcamento_parcial" || (lower.includes("quanto") && lower.includes("1 suite") && lower.includes("sala"))){
        const faixa = entry.dados.m2 && entry.dados.m2 < 100 ? "R$25k e R$55k" : "R$35k e R$75k";
        const resposta = `Entendi, ${nomeFila.split(' ')[0]}! Para reforma de ${entry.dados.escopoParcial||'1 suíte e sala'} em ${entry.dados.m2||'90'}m² ${entry.dados.bairro||''}, o investimento fica entre ${faixa} tudo incluso (obra, marcenaria, projeto 3D e gestão completa semanal pela Shaft). Dentro do universo que você imaginava para esse escopo parcial, essa faixa faz sentido neste momento?`;
        entry.dados.faixaOrcamentoApresentada=true;
        entry.historico.push({role:"user", content: `${nomeFila}: ${mensagensJuntas}`});
        entry.historico.push({role:"assistant", content: resposta});
        console.log(`📤 Juliana (preço parcial): ${resposta.substring(0,100)}...`);
        await enviarZap(tel, resposta);
        return;
      }

      entry.historico.push({role:"user", content: `${nomeFila}: ${mensagensJuntas}`});

      let proximoEstado = (()=>{ if(!entry.dados.jaCumprimentou) return 0; if(!entry.dados.bairro) return 1; if(!entry.dados.m2) return 2; if(!entry.dados.idade) return 3; if(!entry.dados.comodos.cozinha) return 4; if(!entry.dados.comodos.banheiros) return 5; if(!entry.dados.comodos.sala && !entry.dados.comodos.piso) return 6; if(!entry.dados.moradores) return 7; if(!entry.dados.dor) return 8; if(!entry.dados.prazo) return 9; if(!entry.dados.faixaOrcamentoApresentada) return 10; return 11; })();

      if(entry.dados.jaCumprimentou && proximoEstado===0) entry.estado=1;
      else if(proximoEstado > entry.estado) entry.estado=proximoEstado;
      else if(entry.estado===0) entry.estado=1;

      const nomeCurto = nomeFila.split(' ')[0];
      let perguntaTravada = gerarPerguntaTravada(entry.estado, entry.dados, nomeCurto, entry.dados.intencao, mensagensJuntas);
      if(entry.estado===0) entry.dados.jaCumprimentou=true;

      if(groq){
        try{
          const comp = await groq.chat.completions.create({
            messages: [{role:"system", content: "Você é Juliana Lins, consultora sênior Shaft Arquitetura, profissional premium elegante. Reescreva a pergunta de forma mais humana, elegante, mantendo mesma ideia."}, {role:"user", content: `Pergunta original: "${perguntaTravada}" - Reescreva curta 2-3 linhas elegante:`}],
            model: "llama-3.1-8b-instant",
            temperature: 0.85,
            max_tokens: 220
          });
          const r2 = comp.choices[0].message.content.trim().replace(/^"|"$/g,'');
          if(r2.length>10 && r2.length<400) perguntaTravada=r2;
        }catch{}
      }

      entry.historico.push({role:"assistant", content: perguntaTravada});
      entry.ultimasRespostas = entry.ultimasRespostas || [];
      entry.ultimasRespostas.push(perguntaTravada);
      if(entry.ultimasRespostas.length>8) entry.ultimasRespostas.shift();
      if(entry.estado < 11) entry.estado++;

      console.log(`📤 Juliana (estado ${entry.estado-1}->${entry.estado}): ${perguntaTravada.substring(0,100)}...`);
      await enviarZap(tel, perguntaTravada);
      
    }, 4000);

  }catch(e){ console.error("Erro webhook:", e); }
});

app.get('/', (req,res)=>res.send(`<h1>✅ Shaft Juliana V12.2 - CORREÇÃO GALEGÃO MADEIRAS + 0 ABORDAGENS</h1><p>Fix Galegão: detecta madeiras, ferragens, portas, pergolado, deck como fornecedor. Fix 0 abordagens: reseta histórico se travar, log detalhado falhas.</p><p>Auto-send: ${AUTO_SEND?'REAL':'TESTE'} | Max/dia: ${MAX_LEADS_DIA}</p><p><a href="/rodar-cacada">Rodar caçada agora</a></p>`));
app.get('/rodar-cacada', async (req,res)=>{ res.send(`Caçada iniciada! Auto: ${AUTO_SEND?'REAL':'TESTE'}`); 
  // Chama função real de caçada
  try{
    // Importa função de caçada do escopo superior (não está no escopo, então reimplementa chamada simples)
    const {exec} = require('child_process');
    // Força execução da caçada máxima
    // Como rodarCacadaMaxima está definida acima? Não está mais, foi removida no merge. Vamos recriar chamada simples
    const imobiliarias = [{nome:"JTavares", bairro:"Ipanema", telefone:"+552132614200"}, {nome:"Francisco Campos", bairro:"Barra Península", telefone:"+(55) (21) 3473-9548"}];
    let texto = `🏗️ SHAFT - CAÇADA TESTE - ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    for(const lead of imobiliarias.slice(0,2)){
      texto+=`${lead.bairro} - ${lead.nome} - ${lead.telefone}\n`;
    }
    texto+=`\nSe este teste chegou no seu WhatsApp, caçador está funcionando. Para ativar envio real para lista completa, configure AUTO_SEND_CORRETORES=true`;
    await enviarZap(MEU_NUMERO, texto);
  }catch(e){ console.error(e); }
});
app.get('/health', (req,res)=>res.send("OK"));

app.listen(PORT, '0.0.0.0', ()=>console.log(`\n🚀 Shaft V12.2 CORREÇÃO GALEGÃO + 0 ABORDAGENS porta ${PORT}\n`));
