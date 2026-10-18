# Roadmap de Evolução — Último Dia: Sobrevivência

## Fase 1 — Fatia Vertical Completa (Concluída)
- [x] Arquitetura modular em React + TypeScript estrito + Vite + Capacitor 8.
- [x] Ciclo diário de 5 etapas (`Manhã`, `Preparação`, `Expedição`, `Retorno`, `Novo Dia`).
- [x] 3 sobreviventes iniciais com atributos de 1 a 5 e morte permanente irreversível.
- [x] 5 recursos com validação centralizada e mochila limitada por peso.
- [x] 3 melhorias de abrigo funcionais (`Barricadas`, `Enfermaria Improvisada`, `Oficina`).
- [x] 4 locais de expedição e 12 cartas narrativas de evento sem repetição na mesma missão.
- [x] Camada de persistência híbrida (`@capacitor/preferences` e `localStorage`) com validação de esquema e recuperação contra dados corrompidos.
- [x] Testes unitários automatizados cobrindo regras de negócio e persistência.
- [x] Workflow `.github/workflows/android-apk.yml` configurado para gerar `ultimo-dia-debug.apk`.

---

## Fase 2 — Expansão de Conteúdo e Eventos do Abrigo (Próximas Etapas)
- [ ] **Sistema de Recrutamento de Sobreviventes**: Ativar eventos raros onde estranhos batem à porta do abrigo ou são resgatados em expedições (utilizando `RECRUITABLE_SURVIVORS_POOL`).
- [ ] **Mais Cartas Específicas por Local**: Expandir o baralho de 12 para 30+ cartas, incluindo eventos encadeados de múltiplos dias.
- [ ] **Condições Climáticas**: Chuva ácida, neblina densa e ondas de frio que alteram o consumo de recursos e a percepção nas expedições.

---

## Fase 3 — Profundidade Tática e Metaprogressão
- [ ] **Níveis Adicionais de Melhorias (Nível 2 e 3)**: Horta interna para produção passiva de comida e Bancada de Recarga de Munição.
- [ ] **Traços de Personalidade e Moral**: Efeitos psicológicos após a morte de companheiros do grupo.
- [ ] **Assinatura de Release Android**: Configuração opcional de Keystore via GitHub Secrets para publicação de APK/AAB assinado na Google Play.
