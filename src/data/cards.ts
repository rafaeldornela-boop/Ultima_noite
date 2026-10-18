import type { EventCard, LocationId } from '../game/types.ts';

export const EVENT_CARDS: EventCard[] = [
  {
    id: 'card_corredor_ruido',
    title: 'Ruído Metálico no Corredor Escuro',
    context: 'Passagem estreita entre prateleiras reviradas',
    description:
      'Latas rolam pelo piso frio logo à frente. Entre as sombras, ao menos dois infectados arrastam os pés bloqueando o acesso às caixas de mantimentos intactas.',
    dangerTag: 'Presença Zumbi',
    locations: ['supermercado', 'farmacia', 'casas_abandonadas'],
    options: [
      {
        id: 'opt_corredor_disparo',
        label: 'Neutralizar à Distância (Gasta 1 Munição)',
        description: 'Disparar com precisão antes que se aproximem e recolher os mantimentos rapidamente.',
        risk: 'Baixo',
        testedAttribute: 'combate',
        difficulty: 3,
        requirements: {
          resource: 'municao',
          amount: 1,
          consumeResource: true,
        },
        successOutcome: {
          narrative: 'Os disparos certeiros derrubam as ameaças. A equipe recolhe as caixas antes que o eco atraia mais errantes.',
          loot: { comida: 4, materiais: 2 },
        },
        failureOutcome: {
          narrative: 'Um dos tiros falha na penumbra e um infectado avança antes de cair, ferindo a vanguarda da equipe.',
          loot: { comida: 2 },
          damageLeader: 20,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_corredor_distrair',
        label: 'Criar Distração Sonora e Contornar',
        description: 'Arremessar sucata para o corredor oposto e esgueirar-se pelas sombras.',
        risk: 'Moderado',
        testedAttribute: 'percepcao',
        difficulty: 4,
        successOutcome: {
          narrative: 'Os infectados seguem o barulho da sucata. Vocês esvaziam as prateleiras em silêncio absoluto.',
          loot: { comida: 3, materiais: 1 },
        },
        failureOutcome: {
          narrative: 'Um estilhaço de vidro sob a bota denuncia a posição do grupo. Na correria, alguém sofre escoriações.',
          loot: { comida: 1 },
          damageLeader: 25,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_corredor_combate_corpo',
        label: 'Avançar no Corpo a Corpo',
        description: 'Enfrentar os infectados com armas brancas para economizar munição.',
        risk: 'Alto',
        testedAttribute: 'combate',
        difficulty: 5,
        successOutcome: {
          narrative: 'Com golpes firmes e coordenados, a equipe limpa o corredor sem disparar um único tiro.',
          loot: { comida: 3, ferramentas: 1 },
        },
        failureOutcome: {
          narrative: 'O espaço apertado dificulta a defesa. Vocês abatem os errantes, mas saem mordidos e exaustos.',
          loot: { comida: 2 },
          damageLeader: 35,
          inflictInjury: true,
        },
      },
    ],
  },
  {
    id: 'card_porta_bloqueada',
    title: 'Porta Corta-Fogo Bloqueada',
    context: 'Acesso ao depósito de reserva trancado por dentro',
    description:
      'Uma porta metálica pesada separa o grupo do estoque principal. A fechadura está emperrada mas intacta; forçá-la exigirá perícia técnica ou força bruta barulhenta.',
    dangerTag: 'Obstáculo Físico',
    locations: ['supermercado', 'farmacia', 'delegacia'],
    options: [
      {
        id: 'opt_porta_tecnica',
        label: 'Destravar o Mecanismo Silenciosamente',
        description: 'Desmontar o cilindro da trava com cuidado para não alertar o prédio.',
        risk: 'Baixo',
        testedAttribute: 'tecnica',
        difficulty: 4,
        successOutcome: {
          narrative: 'O pino cede com um clique suave. O depósito está intocado desde o primeiro dia do surto.',
          loot: { comida: 3, materiais: 3, ferramentas: 1 },
        },
        failureOutcome: {
          narrative: 'A chave improvisada entorta dentro da fechadura. Vocês conseguem apenas puxar alguns itens pela fresta.',
          loot: { materiais: 1 },
          damageLeader: 10,
        },
      },
      {
        id: 'opt_porta_arrombar',
        label: 'Arrombar no Ombro e Pé de Cabra',
        description: 'Aplicar força máxima para rebentar a trava antes que os errantes cheguem.',
        risk: 'Alto',
        testedAttribute: 'resistencia',
        difficulty: 5,
        successOutcome: {
          narrative: 'A trava estoura no terceiro impacto. Vocês enchem as mochilas e saem segundos antes da horda surgir.',
          loot: { comida: 4, materiais: 2 },
        },
        failureOutcome: {
          narrative: 'O estrondo ecoa pelo quarteirão inteiro. Infectados surgem pelas costas enquanto a porta mal se abre.',
          loot: { comida: 1 },
          damageAll: 20,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_porta_desistir',
        label: 'Ignorar a Porta e Vasculhar o Saguão',
        description: 'Não arriscar tempo nem barulho; recolher apenas o que restou ao redor.',
        risk: 'Baixo',
        successOutcome: {
          narrative: 'Decisão prudente. Vocês recolhem sobras úteis nas prateleiras externas sem chamar atenção.',
          loot: { materiais: 2 },
        },
      },
    ],
  },
  {
    id: 'card_suprimentos_perigosos',
    title: 'Suprimentos Sob Teto Instável',
    context: 'Estrutura parcialmente desabada com cheiro de gás',
    description:
      'Uma pilha de caixas médicas e enlatados repousa sob vigas retorcidas que rangem a cada segundo. No canto escuro, um infectado preso sob os escombros tenta se soltar.',
    dangerTag: 'Risco de Desabamento',
    locations: ['supermercado', 'farmacia', 'casas_abandonadas'],
    options: [
      {
        id: 'opt_teto_escorar',
        label: 'Escorar a Viga (Gasta 1 Ferramenta)',
        description: 'Travar a estrutura metálica antes de retirar todas as caixas com segurança.',
        risk: 'Baixo',
        testedAttribute: 'tecnica',
        difficulty: 3,
        requirements: {
          resource: 'ferramentas',
          amount: 1,
          consumeResource: true,
        },
        successOutcome: {
          narrative: 'A escora improvisada segura o peso do teto. Vocês resgatam todo o lote médico e alimentar sem incidentes.',
          loot: { comida: 3, medicamentos: 3, materiais: 2 },
        },
        failureOutcome: {
          narrative: 'A ferramenta quebra sob a pressão da viga, mas garante tempo suficiente para puxar metade das caixas.',
          loot: { comida: 2, medicamentos: 1 },
          damageLeader: 15,
        },
      },
      {
        id: 'opt_teto_corrida',
        label: 'Avanço Rápido de Resistência',
        description: 'Entrar correndo, agarrar as caixas mais próximas e saltar antes que o forro ceda.',
        risk: 'Alto',
        testedAttribute: 'resistencia',
        difficulty: 5,
        successOutcome: {
          narrative: 'Com fôlego e força bruta, vocês arrancam os fardos segundos antes do gesso desabar sobre o infectado.',
          loot: { comida: 3, medicamentos: 2 },
        },
        failureOutcome: {
          narrative: 'Parte do reboco e uma viga caem sobre a equipe durante a retirada, causando contusões sérias.',
          loot: { comida: 1 },
          damageLeader: 35,
          inflictInjury: true,
        },
      },
    ],
  },
  {
    id: 'card_sobrevivente_desconhecido',
    title: 'Sobrevivente Encurralado no Mezanino',
    context: 'Um estranho ferido pede ajuda sussurrando do alto de uma escada',
    description:
      'Um homem com mochila carregada está cercado por três errantes na base da escada metálica. Ele promete dividir o que coletou se vocês abrirem caminho.',
    dangerTag: 'Encontro Humano',
    locations: ['supermercado', 'delegacia', 'casas_abandonadas'],
    options: [
      {
        id: 'opt_estranho_salvar',
        label: 'Intervir e Abater os Infectados',
        description: 'Engajar os três errantes para salvar o desconhecido.',
        risk: 'Moderado',
        testedAttribute: 'combate',
        difficulty: 4,
        successOutcome: {
          narrative: 'Vocês eliminam a ameaça rapidamente. Grato, o sobrevivente entrega parte de sua carga antes de fugir.',
          loot: { comida: 2, medicamentos: 2, municao: 2 },
        },
        failureOutcome: {
          narrative: 'O combate é mais duro que o esperado. O estranho consegue escapar e deixa cair uma sacola, mas a equipe sai ferida.',
          loot: { comida: 2 },
          damageLeader: 30,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_estranho_curativo',
        label: 'Dar Cobertura e Ceder 1 Medicamento',
        description: 'Atrair os errantes para longe e tratar o ferimento do estranho em troca de ferramentas.',
        risk: 'Baixo',
        requirements: {
          resource: 'medicamentos',
          amount: 1,
          consumeResource: true,
        },
        successOutcome: {
          narrative: 'Após receber os primeiros socorros, ele revela um esconderijo trancado com ferramentas e munições.',
          loot: { ferramentas: 2, municao: 2, materiais: 2 },
        },
      },
      {
        id: 'opt_estranho_aproveitar',
        label: 'Aproveitar a Distração e Saquear o Fundo',
        description: 'Enquanto os infectados focam no mezanino, vasculhar as caixas próximas sem intervir.',
        risk: 'Baixo',
        testedAttribute: 'percepcao',
        difficulty: 3,
        successOutcome: {
          narrative: 'Com frieza, a equipe coleta os suprimentos do térreo e sai antes que o cerco no mezanino termine.',
          loot: { comida: 3, materiais: 2 },
        },
        failureOutcome: {
          narrative: 'O barulho da escada cedendo atrai mais infectados da rua diretamente para a sua posição.',
          loot: { comida: 1 },
          damageLeader: 20,
        },
      },
    ],
  },
  {
    id: 'card_sinais_horda',
    title: 'Sinais de Horda Recente',
    context: 'Rastros de sangue fresco e dezenas de errantes no estacionamento',
    description:
      'Pelas frestas da janela, vocês avistam um grupo denso de infectados atravessando o pátio. No centro do pátio há uma caminhonete abandonada com caixas de suprimentos na caçamba.',
    dangerTag: 'Ameaça Crítica',
    locations: ['supermercado', 'farmacia', 'delegacia', 'casas_abandonadas'],
    options: [
      {
        id: 'opt_horda_furtivo',
        label: 'Infiltração Furtiva até a Caminhonete',
        description: 'Estudar o padrão da horda e avançar agachado entre os carros.',
        risk: 'Alto',
        testedAttribute: 'percepcao',
        difficulty: 5,
        successOutcome: {
          narrative: 'Com nervos de aço, vocês alcançam a caçamba, recolhem os estojos e recuam sem que nenhum errante perceba.',
          loot: { comida: 3, municao: 3, ferramentas: 1 },
        },
        failureOutcome: {
          narrative: 'Um alarme automotivo dispara com o toque. A equipe precisa correr sob ataque feroz até o prédio.',
          loot: { municao: 1 },
          damageAll: 25,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_horda_observar',
        label: 'Aguardar Escondido e Coletar Sobras Internas',
        description: 'Manter posição segura no interior até a horda passar.',
        risk: 'Baixo',
        testedAttribute: 'resistencia',
        difficulty: 3,
        successOutcome: {
          narrative: 'A espera tensa compensa. Quando o pátio esvazia, vocês recolhem materiais úteis perto da saída.',
          loot: { materiais: 3, comida: 1 },
        },
        failureOutcome: {
          narrative: 'A tensão e o ar abafado desgastam o grupo, mas vocês evitam o confronto direto.',
          loot: { materiais: 1 },
          damageLeader: 10,
        },
      },
    ],
  },
  {
    id: 'card_rota_comprometida',
    title: 'Rota de Fuga Comprometida',
    context: 'A saída principal foi tomada por errantes atraídos pelo cheiro',
    description:
      'Ao preparar o avanço para o próximo setor, vocês percebem que o corredor de retorno está tomado. É preciso abrir uma passagem alternativa agora ou forçar a saída.',
    dangerTag: 'Cerco Iminente',
    locations: ['supermercado', 'farmacia', 'delegacia', 'casas_abandonadas'],
    options: [
      {
        id: 'opt_rota_grade',
        label: 'Serrar Grade de Ventilação Lateral',
        description: 'Usar conhecimento técnico para abrir o duto lateral que dá para o beco seguro.',
        risk: 'Moderado',
        testedAttribute: 'tecnica',
        difficulty: 4,
        successOutcome: {
          narrative: 'A grade cede a tempo! Além de garantir a rota limpa, vocês encontram ferramentas deixadas por antigos zeladores.',
          loot: { ferramentas: 2, materiais: 2 },
        },
        failureOutcome: {
          narrative: 'Os parafusos oxidados demoram a soltar e os primeiros infectados alcançam a retaguarda da equipe.',
          loot: { materiais: 1 },
          damageLeader: 25,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_rota_fogo',
        label: 'Abrir Caminho a Tiros (Gasta 2 Munições)',
        description: 'Concentrar fogo para derrubar os infectados da frente e romper o bloqueio.',
        risk: 'Baixo',
        testedAttribute: 'combate',
        difficulty: 3,
        requirements: {
          resource: 'municao',
          amount: 2,
          consumeResource: true,
        },
        successOutcome: {
          narrative: 'A rajada coordenada abre uma brecha limpa. Vocês ainda recuperam suprimentos nos corpos caídos.',
          loot: { comida: 2, medicamentos: 1 },
        },
        failureOutcome: {
          narrative: 'Vocês rompem o bloqueio, mas o recuo apressado cobra seu preço em escoriações.',
          damageLeader: 15,
        },
      },
      {
        id: 'opt_rota_recuar',
        label: 'Evacuar Imediatamente pelo Telhado (Encerrar Missão)',
        description: 'Abandonar o restante da exploração para salvar a equipe e o que já está na mochila.',
        risk: 'Baixo',
        isRetreatOption: true,
        successOutcome: {
          narrative: 'A equipe sobe pela escada de incêndio e retorna ao abrigo antes que o cerco se feche por completo.',
          triggerRetreat: true,
        },
      },
    ],
  },
  {
    id: 'card_camara_frigorifica',
    title: 'Câmara Frigorífica Trancada',
    context: 'Setor de perecíveis do Supermercado',
    description:
      'A porta térmica do açougue continua vedada. Há caixas de ração industrial e conservas lá dentro, mas o vidro embaçado mostra sombras imóveis no interior.',
    dangerTag: 'Emboscada Gelada',
    locations: ['supermercado'],
    options: [
      {
        id: 'opt_frigorifico_espiar',
        label: 'Inspecionar e Limpar com Cautela',
        description: 'Identificar quais corpos no chão ainda estão ativos antes de entrar.',
        risk: 'Moderado',
        testedAttribute: 'percepcao',
        difficulty: 4,
        successOutcome: {
          narrative: 'Vocês neutralizam o único infectado adormecido pelo frio antes que ele levante e limpam o estoque.',
          loot: { comida: 5, materiais: 1 },
        },
        failureOutcome: {
          narrative: 'Dois errantes enrijecidos atacam de trás das carcaças penduradas, ferindo o líder.',
          loot: { comida: 3 },
          damageLeader: 25,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_frigorifico_rapido',
        label: 'Puxar Apenas os Fardos da Entrada',
        description: 'Não entrar na câmara; alcançar somente as caixas próximas à porta.',
        risk: 'Baixo',
        successOutcome: {
          narrative: 'Sem correr riscos desnecessários, vocês garantem comida suficiente e trancam a porta novamente.',
          loot: { comida: 2 },
        },
      },
    ],
  },
  {
    id: 'card_cofre_farmacia',
    title: 'Armário de Controlados Blindado',
    context: 'Sala restrita nos fundos da Farmácia',
    description:
      'Os antibióticos mais potentes estão trancados em um gabinete de aço cirúrgico. O alarme magnético da loja ainda tem bateria residual.',
    dangerTag: 'Alarme Residual',
    locations: ['farmacia'],
    options: [
      {
        id: 'opt_farmacia_desarmar',
        label: 'Cortar Fiação do Alarme e Destrancar',
        description: 'Desativar o circuito de bateria antes de forçar a fechadura do gabinete.',
        risk: 'Moderado',
        testedAttribute: 'tecnica',
        difficulty: 4,
        successOutcome: {
          narrative: 'O led vermelho apaga. Vocês abrem o gabinete sem ruído e recolhem um lote valioso de medicamentos.',
          loot: { medicamentos: 4, comida: 1 },
        },
        failureOutcome: {
          narrative: 'A sirene dispara por alguns segundos antes de ser quebrada, atraindo errantes da rua.',
          loot: { medicamentos: 2 },
          damageLeader: 25,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_farmacia_quebrar',
        label: 'Estourar a Trava e Correr',
        description: 'Quebrar a porta do gabinete na força bruta e sair imediatamente.',
        risk: 'Alto',
        testedAttribute: 'combate',
        difficulty: 5,
        successOutcome: {
          narrative: 'Vocês arrancam a porta metálica, pegam os frascos e abatem o infectado que entrou pela vitrine.',
          loot: { medicamentos: 3 },
        },
        failureOutcome: {
          narrative: 'Estilhaços e infectados cercam o balcão. A equipe escapa com poucos frascos e ferimentos.',
          loot: { medicamentos: 1 },
          damageAll: 20,
          inflictInjury: true,
        },
      },
    ],
  },
  {
    id: 'card_paiol_delegacia',
    title: 'Paiol de Armas Semi-Inundado',
    context: 'Subsolo do 4º Distrito Policial',
    description:
      'Caixas de munição e ferramentas táticas estão sobre bancadas no subsolo escuro. Policiais infectados com coletes balísticos vagam pela água turva.',
    dangerTag: 'Infectados Blindados',
    locations: ['delegacia'],
    options: [
      {
        id: 'opt_delegacia_precisao',
        label: 'Golpes Precisos nas Articulações',
        description: 'Exigir o máximo de Combate da equipe para contornar os coletes balísticos.',
        risk: 'Alto',
        testedAttribute: 'combate',
        difficulty: 5,
        successOutcome: {
          narrative: 'Com disciplina tática exemplar, a equipe neutraliza os blindados e resgata os cunhetes de munição.',
          loot: { municao: 5, ferramentas: 2 },
        },
        failureOutcome: {
          narrative: 'Os coletes absorvem os primeiros golpes e o contra-ataque no escuro fere gravemente o grupo.',
          loot: { municao: 2 },
          damageLeader: 40,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_delegacia_eletricidade',
        label: 'Religar Quadro de Luz para Cegar os Errantes',
        description: 'Usar Técnica para acionar os refletores de emergência e passar pela lateral.',
        risk: 'Moderado',
        testedAttribute: 'tecnica',
        difficulty: 4,
        successOutcome: {
          narrative: 'O clarão súbito desorienta os infectados no subsolo. Vocês coletam munição e ferramentas em segurança.',
          loot: { municao: 4, ferramentas: 1, materiais: 2 },
        },
        failureOutcome: {
          narrative: 'Um curto-circuito solta faíscas na água e alerta os infectados próximos.',
          loot: { municao: 2 },
          damageLeader: 20,
        },
      },
    ],
  },
  {
    id: 'card_oficina_garagem',
    title: 'Garagem Residencial Fortificada',
    context: 'Sobrado com bancada de serralheria nos fundos',
    description:
      'O antigo morador transformou a garagem em uma pequena oficina cheia de ferramentas e chapas de aço, mas deixou uma armadilha de fio esticado na entrada.',
    dangerTag: 'Armadilha Caseira',
    locations: ['casas_abandonadas'],
    options: [
      {
        id: 'opt_garagem_desarmar',
        label: 'Localizar e Desarmar o Fio deGatilho',
        description: 'Usar Percepção ou Técnica para desmontar o gatilho e aproveitar os componentes.',
        risk: 'Moderado',
        testedAttribute: 'percepcao',
        difficulty: 4,
        successOutcome: {
          narrative: 'Vocês desativam a armadilha com precisão e ainda aproveitam a munição acoplada ao mecanismo!',
          loot: { ferramentas: 2, materiais: 4, municao: 1 },
        },
        failureOutcome: {
          narrative: 'O fio escapa da mão e aciona estilhaços de pregos antes que vocês limpem a bancada.',
          loot: { materiais: 2 },
          damageLeader: 25,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_garagem_janela',
        label: 'Entrar pela Janela Basculante Alta',
        description: 'Evitar a porta principal exigindo esforço físico para escalar e carregar o peso.',
        risk: 'Baixo',
        testedAttribute: 'resistencia',
        difficulty: 4,
        successOutcome: {
          narrative: 'A subida exige força, mas vocês passam por cima do fio e retiram as caixas pela janela.',
          loot: { materiais: 3, ferramentas: 2, comida: 1 },
        },
        failureOutcome: {
          narrative: 'Na descida com as caixas pesadas, um integrante torce o ombro contra o muro.',
          loot: { materiais: 2, ferramentas: 1 },
          damageLeader: 15,
        },
      },
    ],
  },
  {
    id: 'card_ambulancia_capotada',
    title: 'Ambulância Capotada no Cruzamento',
    context: 'Veículo de resgate bloqueando a via de acesso',
    description:
      'Uma ambulância do SAMU está tombada de lado. As portas traseiras estão amassadas pelo impacto, mas é possível ver maletas vermelhas e caixas de soro lá dentro.',
    dangerTag: 'Sucata Médica',
    locations: ['farmacia', 'delegacia', 'casas_abandonadas'],
    options: [
      {
        id: 'opt_ambulancia_alavanca',
        label: 'Desentortar a Porta Traseira',
        description: 'Usar técnica e alavanca para abrir o compartimento sem quebrar os frascos.',
        risk: 'Moderado',
        testedAttribute: 'tecnica',
        difficulty: 4,
        successOutcome: {
          narrative: 'As dobradiças cedem e vocês recuperam maletas médicas intactas e peças mecânicas.',
          loot: { medicamentos: 3, materiais: 2, ferramentas: 1 },
        },
        failureOutcome: {
          narrative: 'O metal rasga a luva de um sobrevivente e o paramédico infectado preso no banco dá o bote.',
          loot: { medicamentos: 1 },
          damageLeader: 25,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_ambulancia_cabine',
        label: 'Vasculhar Apenas a Cabine do Motorista',
        description: 'Coleta rápida e segura de rações de emergência e lanternas.',
        risk: 'Baixo',
        successOutcome: {
          narrative: 'Vocês recolhem rações e kits básicos no painel antes de seguir caminho.',
          loot: { comida: 2, medicamentos: 1 },
        },
      },
    ],
  },
  {
    id: 'card_despensa_subterranea',
    title: 'Porão Úmido com Estoque Caseiro',
    context: 'Alçapão escondido sob um tapete mofado',
    description:
      'Um alçapão de madeira leva a uma despensa escura. O ar é pesado e há barulho de passos arrastados na água acumulada no fundo.',
    dangerTag: 'Visibilidade Zero',
    locations: ['casas_abandonadas', 'supermercado'],
    options: [
      {
        id: 'opt_porao_vasculhar',
        label: 'Descer com Cautela eMapear o Escuro',
        description: 'Confiar na Percepção para identificar o perigo antes de tocar nas prateleiras.',
        risk: 'Moderado',
        testedAttribute: 'percepcao',
        difficulty: 4,
        successOutcome: {
          narrative: 'Vocês avistam o infectado preso atrás da estante, evitam seu alcance e esvaziam a despensa.',
          loot: { comida: 4, materiais: 2 },
        },
        failureOutcome: {
          narrative: 'O degrau podre quebra no escuro e o errante ataca antes de ser contido.',
          loot: { comida: 2 },
          damageLeader: 25,
          inflictInjury: true,
        },
      },
      {
        id: 'opt_porao_puxar',
        label: 'Usar Ganchos a Partir da Escada',
        description: 'Improvisar hastes para puxar o que está perto do alçapão sem descer.',
        risk: 'Baixo',
        testedAttribute: 'tecnica',
        difficulty: 3,
        successOutcome: {
          narrative: 'Com paciência, vocês içam dois engradados de conserva e ferramentas sem pisar no porão.',
          loot: { comida: 2, ferramentas: 1 },
        },
        failureOutcome: {
          narrative: 'Uma das caixas se rompe na subida, mas vocês salvam parte dos enlatados.',
          loot: { comida: 1 },
        },
      },
    ],
  },
];

export const EVENT_CARDS_BY_ID: Record<string, EventCard> = Object.fromEntries(
  EVENT_CARDS.map((card) => [card.id, card])
);

export function getCardsForLocation(locationId: LocationId): EventCard[] {
  return EVENT_CARDS.filter((card) => card.locations.includes(locationId));
}
