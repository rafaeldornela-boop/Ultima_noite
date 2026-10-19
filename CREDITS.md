# Créditos e Licenças Visuais — Último Dia: Sobrevivência

Este documento registra a pesquisa, avaliação de estilo e licenciamento dos recursos visuais avaliados e integrados ao projeto **Último Dia — Sobrevivência**, garantindo funcionamento **100% offline** em dispositivos Android (via Capacitor 8) e conformidade com os termos de uso.

---

## 1. Pacotes Avaliados na Direção de Arte

1. **Free Zombie Apocalypse Top-Down Pixel Art Kit**
   - **Autor / Fonte**: Free Game Assets (CraftPix.net) — `https://free-game-assets.itch.io/free-zombie-apocalypse-top-down-pixel-art-kit`
   - **Licença**: Free Starter Kit License (uso gratuito em projetos pessoais e comerciais; vedada a revenda isolada dos arquivos de arte brutos).
   - **Avaliação**: Referência principal de proporção anatômica *top-down* em pixel art (cabeça, ombros, mochila tática, passos visíveis sob o tronco e postura distinta entre sobrevivente e variantes de infectados, incluindo quadros de caminhada, ataque, dano e cadáver no solo).

2. **Kenney — Roguelike Modern City**
   - **Autor / Fonte**: Kenney Vleugels (`https://kenney.nl/assets/roguelike-modern-city`)
   - **Licença**: **CC0 1.0 Universal (Domínio Público)** — livre para uso comercial e modificações sem exigência de atribuição obrigatória, mantido o crédito voluntário a Kenney.nl.
   - **Avaliação**: Referência estrutural de ladrilhos urbanos modulares (asfalto rachado, calçadas de concreto, faixas viárias desgastadas, paredes de alvenaria e pisos internos), adaptada para a paleta sombria e dessaturada inspirada em *Project Zomboid* e *Darkwood*.

3. **Kenney — Top-Down Shooter**
   - **Autor / Fonte**: Kenney Vleugels (`https://kenney.nl/assets/top-down-shooter`)
   - **Licença**: **CC0 1.0 Universal (Domínio Público)**.
   - **Avaliação**: Analisado quanto à leitura clara de silhueta e orientação de armas *top-down*; as versões vetoriais coloridas originais foram descartadas como base direta de personagens por apresentarem saturação excessiva, priorizando-se o conjunto em pixel art sombria e uniforme.

---

## 2. Assets Locais Integrados no Repositório (`public/assets/pixel/`)

Para garantir que nenhuma imagem dependa de links remotos durante a partida e manter **100% de consistência de escala, resolução e paleta pós-apocalíptica**, os spritesheets e tilesets estão empacotados localmente em `public/assets/pixel/` (e podem ser recompilados de forma determinística via `node scripts/build-pixel-assets.mjs`):

- `public/assets/pixel/survivor_sheet.png` — Spritesheet em pixel art (`768×48 px`, 16 quadros de `48×48 px`) contendo animações de repouso, caminhada/corrida de 4 passos, disparo com recuo e clarão, recarga de pistola e ataque em dois tempos com facão tático.
- `public/assets/pixel/zombies_sheet.png` — Spritesheet em pixel art (`384×144 px`, 24 quadros de `48×48 px`) contendo 3 arquétipos distintos (**Errante Lento**, **Corredor Infectado** e **Bruto Blindado**), cada um com ciclo de locomoção de 4 quadros, ataque de 2 quadros, reação de dano e sprite permanente de cadáver abatido no solo.
- `public/assets/pixel/urban_tileset.png` — Atlas de ladrilhos urbanos em pixel art (`256×64 px`, blocos de `32×32 px`) com variações de asfalto deteriorado, calçada, piso de mercearia, piso de farmácia, concreto de oficina policial, vegetação invasiva, manchas de sangue, vidros estilhaçados, caixas de suprimento e alvenaria.
- `public/assets/pixel/vehicles_sheet.png` — Spritesheet de veículos abandonados em pixel art (`512×64 px`, 4 quadros de `128×64 px`) contendo sedãs civis enferrujados, ambulância avariada e viatura policial bloqueando cruzamentos.

---

## 3. Áudio e Tipografia

- **Efeitos Sonoros**: Sintetizador Web Audio API procedural local (`src/utils/sound.ts`), sem dependência de arquivos externos de áudio licenciados, gerando estampido de disparo 9mm, clique metálico de arma sem munição, corte de facão, impacto em tecido/armadura e alerta de ferimento.
- **Tipografia**: *Oswald*, *Plus Jakarta Sans* e *JetBrains Mono* (SIL Open Font License 1.1), com *fallbacks* nativos do sistema para operação integralmente offline no Android.
