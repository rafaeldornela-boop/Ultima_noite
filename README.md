# Último Dia — Sobrevivência

Jogo mobile de sobrevivência zumbi em português brasileiro, construído com **React 19**, **TypeScript (modo estrito)**, **Vite**, **Tailwind CSS** e **Capacitor 8**, com persistência offline e pipeline automatizado para compilação de APK de depuração via **GitHub Actions**.

---

## 1. Visão Geral

Em **Último Dia — Sobrevivência**, você lidera um grupo de sobreviventes em um abrigo urbano improvisado. Cada dia é dividido em cinco etapas claras:

1. **Manhã**: Consumo automático de rações (1 Comida por sobrevivente vivo), avaliação de ferimentos e tratamento médico.
2. **Preparação**: Escolha do local de exploração (`Supermercado Alvorada`, `Casas Abandonadas`, `Farmácia Central 24h`, `4º Distrito Policial`), seleção da equipe (1 a 3 sobreviventes vivos) e equipamentos táticos.
3. **Expedição**: Resolução de cartas de evento narrativas com testes de atributos (`Combate`, `Percepção`, `Técnica`, `Resistência`), consumo de recursos, controle de peso da mochila e opção de retirada tática.
4. **Retorno**: Incorporação única (idempotente) do saque trazido na mochila para o estoque do abrigo.
5. **Novo Dia**: Construção de melhorias permanentes (`Barricadas Reforçadas`, `Enfermaria Improvisada`, `Oficina de Manutenção`) e resolução da vigília noturna.

---

## 2. Estrutura do Projeto

```text
├── .github/workflows/
│   └── android-apk.yml          # Pipeline CI/CD para gerar o APK de depuração na nuvem
├── docs/
│   ├── GAME_DESIGN.md           # Documentação detalhada das mecânicas e fórmulas
│   └── ROADMAP.md               # Próximas etapas planejadas para expansão
├── src/
│   ├── components/
│   │   ├── ResourceBar.tsx      # HUD superior (Dia, Etapa, 5 Recursos, Som e Pausa)
│   │   ├── SurvivorCard.tsx     # Cartão de sobrevivente, atributos, saúde e cura
│   │   └── SvgArt.tsx           # Ilustrações vetoriais autorais dos locais e retratos
│   ├── data/
│   │   ├── cards.ts             # 12 cartas de evento estruturadas com escolhas e riscos
│   │   ├── locations.ts         # 4 destinos de expedição com perfis de risco e saque
│   │   ├── resources.ts         # 5 recursos (Comida, Medicamentos, Materiais, Ferramentas, Munição) e equipamentos
│   │   ├── survivors.ts         # 3 sobreviventes iniciais e metadados de atributos
│   │   └── upgrades.ts          # 3 melhorias do abrigo com custos e efeitos nas regras
│   ├── game/
│   │   ├── rules.ts             # Motor de regras puro, determinístico e testável
│   │   └── types.ts             # Contratos TypeScript e versão de esquema
│   ├── screens/
│   │   ├── TitleScreen.tsx      # Tela inicial com suporte a teclado e ?autostart=1
│   │   ├── ShelterScreen.tsx    # Gestão do ciclo diário, grupo e acontecimentos
│   │   ├── ExpeditionScreen.tsx # Preparação, exploração por cartas e relatório de retorno
│   │   ├── UpgradesScreen.tsx   # Construção das melhorias do abrigo
│   │   └── JournalScreen.tsx    # Estatísticas, guia de regras, histórico e reinício
│   ├── storage/
│   │   └── campaignStorage.ts   # Persistência híbrida (@capacitor/preferences + localStorage)
│   └── utils/
│       └── sound.ts             # Efeitos sonoros procedurais via Web Audio API
├── tests/
│   ├── rules.test.ts            # Suíte de testes automatizados (Vitest)
│   └── rules-node.test.ts       # Suíte de testes nativos do Node 22 (node:test)
└── capacitor.config.ts          # Configuração do Capacitor 8 para Android
```

---

## 3. Comandos de Desenvolvimento e Verificação

### Instalar dependências
```bash
npm install
```

### Executar em modo de desenvolvimento (porta 3000)
```bash
npm run dev
```

### Executar testes automatizados
```bash
# Via Vitest
npm test

# Via executor nativo do Node.js 22
npm run test:node
```

### Verificar tipos (TypeScript estrito) e gerar build web de produção
```bash
npm run lint
npm run build
```

---

## 4. Geração do APK Android (Local e GitHub Actions)

### Na nuvem via GitHub Actions (Recomendado — sem instalar Android Studio)
1. Envie o código para um repositório no GitHub na branch `main` (ou `master`).
2. O workflow `.github/workflows/android-apk.yml` será iniciado automaticamente no `push`, ou pode ser disparado manualmente na aba **Actions -> Build Android Debug APK -> Run workflow**.
3. O pipeline executa Node.js 22 + JDK 21, roda os testes automatizados, compila o projeto web (`vite build`), gera a pasta nativa Android com Capacitor 8 (`npx cap add android` e `npx cap sync android`) e executa `./gradlew assembleDebug`.
4. Ao finalizar, baixe o artefato **`ultimo-dia-debug.apk`** diretamente na página de resumo da execução do workflow no GitHub Actions.

### Localmente (caso possua Android SDK + JDK 21 configurados)
```bash
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
O arquivo gerado estará em `android/app/build/outputs/apk/debug/app-debug.apk`.
