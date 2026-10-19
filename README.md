# Último Dia — Sobrevivência (Protótipo Top-Down Action Survival)

Jogo mobile de sobrevivência zumbi em tempo real visto de cima (*top-down action survival*) em português brasileiro, construído com **Phaser 3**, **React 19**, **TypeScript (modo estrito)**, **Vite**, **Tailwind CSS** e **Capacitor 8**, com persistência offline e pipeline automatizado para compilação de APK de depuração via **GitHub Actions**.

---

## 1. Visão Geral do Protótipo (`prototype/top-down-action`)

Esta versão reformula o núcleo da jogabilidade para ação e exploração em tempo real na **Vila Esperança**:

- **Exploração Urbana Top-Down**: Câmera acompanhando o sobrevivente por ruas, calçadas, veículos abandonados e três edificações reconhecíveis (**Mercearia & Padaria São Jorge**, **Farmácia Popular 24h** e **Posto Policial & Oficina**), com colisões sólidas em paredes, gôndolas, barricadas e carros.
- **Controles Híbridos (Android Multi-Toque e Desktop)**:
  - **Android / Toque**: Joystick virtual esquerdo para movimentação em 360°/8 direções + Controle direito de mira e disparo simultâneos + botões táticos de **Saquear / Extrair**, **Esquiva / Corrida**, **Recarregar**, **Trocar Arma** e **Curar**.
  - **Computador**: `WASD` / Setas para mover, `Shift` para correr, `Espaço` para esquiva com vigor, `Mouse` para mirar e atirar, `Q` para alternar entre **Pistola 9mm** e **Facão**, `R` para recarregar, `H` para usar Medicamento e `E` para saquear ou extrair.
- **Combate em Tempo Real e 3 Variantes de Zumbis**:
  - **Errante Lento** (`45 PV`): Perseguição constante em grupo.
  - **Corredor Infectado** (`30 PV`): Rápido, aproxima-se flanqueando em zigue-zague com aviso visual antes do bote.
  - **Bruto Blindado** (`120 PV`): Alta resistência a recuo e golpe pesado precedido por círculo de telegrafia visual.
- **Saque, Risco e Extração Persistente**:
  - Caixas e armários espalhados pelo mapa fornecem **Comida**, **Medicamentos**, **Munição** e **Materiais**.
  - Para salvar o saque no estoque permanente do abrigo, o jogador precisa alcançar o **Portão do Abrigo (Zona de Extração)** vivo e acionar a extração (`[E]`). Se morrer antes, perde o saque não extraído daquela incursão.

---

## 2. Estrutura do Projeto

```text
├── .github/workflows/
│   └── android-apk.yml              # Pipeline CI/CD para gerar o APK de depuração na nuvem
├── src/
│   ├── action/                      # Motor de jogo Top-Down em tempo real
│   │   ├── actionTypes.ts           # Contratos TypeScript de entidades, física e saque
│   │   ├── mapData.ts               # Mapa urbano (Vila Esperança), prédios, obstáculos e spawns
│   │   ├── actionRules.ts           # Simulação pura (movimento 8D, colisões, armas, IA e extração)
│   │   └── SurvivalActionScene.ts   # Cena Phaser 3 com câmera, partículas zero-GC e renderização
│   ├── components/
│   │   ├── PhaserArena.tsx          # Integração Phaser + HUD compacto + controles multi-toque
│   │   ├── ResourceBar.tsx          # Componente preservado da camada base
│   │   ├── SurvivorCard.tsx         # Componente preservado da camada base
│   │   └── SvgArt.tsx               # Ícones vetoriais e ilustrações
│   ├── storage/
│   │   ├── actionStorage.ts         # Persistência local do estoque extraído (@capacitor/preferences + localStorage)
│   │   └── campaignStorage.ts       # Adaptador híbrido base preservado
│   └── utils/
│       └── sound.ts                 # Sintetizador Web Audio (tiros, golpes, impactos, saque)
├── tests/
│   ├── action.spec.ts               # Testes Vitest do motor top-down (movimento, colisão, combate, extração)
│   ├── action.test.ts               # Testes Node.js nativos do motor top-down
│   ├── rules.spec.ts                # Testes preservados da camada base
│   └── rules.test.ts                # Testes preservados da camada base
└── capacitor.config.ts              # Configuração do Capacitor 8 para Android
```

---

## 3. Comandos de Verificação e Build

```bash
# Verificar tipos em modo estrito
npm run lint

# Executar suítes de testes automatizados (Vitest e Node runner)
npm test
npm run test:node

# Gerar build de produção web
npm run build
```
