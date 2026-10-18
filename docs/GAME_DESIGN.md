# Documento de Design do Jogo (GDD) — Último Dia: Sobrevivência

## 1. Conceito Central
**Último Dia — Sobrevivência** é um jogo de sobrevivência pós-apocalíptica focado em decisões narrativas sob pressão, gerenciamento de escassez e morte permanente (*permadeath*). O jogador comanda um abrigo com sobreviventes únicos e precisa equilibrar o consumo diário de comida com os riscos das expedições externas.

---

## 2. Ciclo Diário (5 Etapas)
1. **Manhã (`manha`)**:
   - Consome `1 Comida` por sobrevivente vivo.
   - Se a comida for insuficiente, os sobreviventes não alimentados sofrem dano de inanição (`-18 PV`, ou `-12 PV` se `Resistência >= 4`) e ficam `Feridos`.
   - Sobreviventes com `Ferimento Grave` sem tratamento perdem `8 PV` adicionais ao amanhecer.
   - Proteção idempotente (`morningProcessedForDay`) garante que recarregar a página nunca consuma comida duas vezes no mesmo dia.
2. **Preparação (`preparacao`)**:
   - Escolha entre 4 locais de expedição, seleção de 1 a 3 sobreviventes vivos e seleção de equipamentos táticos.
3. **Expedição (`expedicao`)**:
   - Cada local gera um baralho sem repetição de `4 cartas` de evento.
   - Cada opção de carta informa o atributo testado, o nível de risco (`Baixo`, `Moderado`, `Alto`, `Crítico`) e eventuais requisitos de recursos.
4. **Retorno (`retorno`)**:
   - Os itens coletados na mochila (respeitando o limite de peso) são transferidos uma única vez (`rewardsClaimed = true`) para o inventário do abrigo.
5. **Novo Dia (`novo_dia`)**:
   - Permite construir melhorias no abrigo e avançar para a noite.
   - Durante a noite, se as **Barricadas Reforçadas** não estiverem construídas, há eventos de incursão em noites ímpares que causam perda de materiais ou ferimentos na guarda.

---

## 3. Sobreviventes e Atributos (1 a 5)
- **Helena Vargas** (*Ex-Bombeira Militar*): Combate 4 · Percepção 3 · Técnica 2 · Resistência 4
- **Marcos "Ferreiro" Silva** (*Mecânico e Serralheiro*): Combate 2 · Percepção 3 · Técnica 5 · Resistência 3
- **Dr. Caio Mendes** (*Socorrista de Emergência*): Combate 2 · Percepção 5 · Técnica 3 · Resistência 2

### Resolução de Testes de Atributo
- **Pontuação da Equipe**: Maior atributo entre os membros vivos da expedição + `+1` de assistência (se outro membro tiver `>= 3` no mesmo atributo) + bônus de Equipamento + bônus passivo do abrigo (`+1 Técnica` com a Oficina) - penalidade de ferimento do líder (`-1` se Ferido, `-2` se Ferimento Grave).
- **Morte Permanente**: Quando `health <= 0`, o estado muda permanentemente para `morto` (`available = false`). Personagens mortos não podem ser curados nem selecionados para expedições. Se todos morrerem, a campanha entra em estado de `derrota`.

---

## 4. Recursos e Mochila
| Recurso | Peso Unitário na Mochila | Estoque Máximo no Abrigo | Uso Principal |
| :--- | :---: | :---: | :--- |
| **Comida** | 1 | 50 | Alimentação matinal obrigatória (1 por sobrevivente vivo) |
| **Medicamentos** | 1 | 30 | Cura (+30 PV, ou +50 PV com Enfermaria) e eventos |
| **Materiais** | 2 | 60 | Construção das melhorias do abrigo e reparos noturnos |
| **Ferramentas** | 2 | 25 | Construção de melhorias, Pé de Cabra e eventos técnicos |
| **Munição** | 1 | 40 | Uso da Pistola 9mm e resolução segura de combates |

- **Capacidade da Mochila**: `8 (base) + Soma(Resistência dos membros da equipe * 2) + 6 (se Oficina construída)`.

---

## 5. Melhorias do Abrigo
1. **Barricadas Reforçadas** (*Custo: 5 Materiais, 2 Ferramentas*): Impede perdas de recursos e danos aos sobreviventes durante incursões noturnas.
2. **Enfermaria Improvisada** (*Custo: 4 Materiais, 2 Medicamentos, 1 Ferramenta*): Aumenta a cura de Medicamentos de `+30 PV` para `+50 PV` e cura `Ferimento Grave` diretamente para `Saudável`.
3. **Oficina de Manutenção** (*Custo: 5 Materiais, 3 Ferramentas*): Aumenta a capacidade da mochila em `+6 espaços` e concede `+1` passivo em testes de `Técnica`.
