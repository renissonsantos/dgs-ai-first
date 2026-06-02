---
name: "escrever-adr"
description: "Escrever, revisar e refinar Architecture Decision Records (ADRs) com qualidade. Use sempre que o usuário pedir para criar, documentar, revisar ou melhorar uma decisão arquitetural / ADR, ou registrar uma escolha técnica e seus trade-offs. Inclui o processo de devil's advocate."
argument-hint: "Descreva a decisão arquitetural a registrar como ADR"
compatibility: "Projeto com diretório docs/adr/ (template em docs/adr/ADR-template.md)"
metadata:
  author: "dgs-ai-first"
user-invocable: true
disable-model-invocation: false
---

## Entrada do usuário

```text
$ARGUMENTS
```

Considere a entrada acima antes de prosseguir (se não estiver vazia).

## Objetivo

Produzir um ADR (Architecture Decision Record) que registre **uma** decisão arquitetural, o
contexto que a forçou e suas consequências. Um ADR não é relatório nem tutorial: é um registro
enxuto e durável que alguém entrando no projeto em 6 meses lê isolado e entende *por que*
decidimos assim.

## Antes de escrever

1. Leia o contexto do cenário/projeto atual (arquivos em `context/`, a spec relevante em `specs/`, ou o contexto que o usuário forneceu). **A especificidade vem do cenário — não invente dados.** Se faltar um dado necessário, marque `[NECESSITA ESCLARECIMENTO]` em vez de chutar.
2. Leia os princípios do projeto em `.specify/memory/constitution.md`.
3. Confira os ADRs já existentes em `docs/adr/` para numeração e para não duplicar/conflitar decisões.

## Formato obrigatório

Copie `docs/adr/ADR-template.md` para `docs/adr/ADR-NNNN-titulo-em-kebab-case.md`. Estrutura mínima:

```
# ADR-NNNN: [Título em forma de decisão tomada]
## Status: Proposto | Aceito | Depreciado | Substituído por ADR-XXXX
## Contexto
## Decisão
## Consequências   (positivas E negativas + mitigações)
## Alternativas consideradas   (e por que descartadas)
## Devil's advocate
```

Regras de numeração e ciclo de vida:

- Numeração sequencial de quatro dígitos (`ADR-0001`); arquivo em kebab-case.
- ADR é **imutável depois de "Aceito"**. Para mudar uma decisão, crie um novo ADR e marque o antigo como "Substituído por ADR-XXXX".
- Uma decisão por ADR. Se a entrada contém duas decisões, proponha dividir em dois ADRs.

## Critérios de qualidade (régua de aprovação)

Antes de finalizar, verifique cada item:

- **Autossuficiente** — lê-se isolado; não exige outro documento para ser entendido.
- **Fundamentado em trade-offs explícitos, não em preferência de tecnologia.** "Escolhemos X porque é melhor" reprova. "Escolhemos X porque, dado o volume N e a restrição Y, o custo Z compensa a perda de W" aprova.
- **Ancorado em números reais** do contexto do cenário. Decisão sem número é palpite.
- **Consequências honestas** — toda decisão tem custo; liste o que piora, não só o que melhora. ADR só com vantagens é suspeito.
- **Alternativas reais** — pelo menos duas, cada uma com o motivo específico do descarte. Nada de espantalhos.
- **Mitigações acionáveis** — mecanismos concretos (ex.: "filtro que rejeita resposta sem citação", "versionamento com data de vigência no pipeline"), nunca "monitorar" ou "ficar atento".

## Processo: devil's advocate (obrigatório)

Depois do rascunho de cada ADR:

1. Argumente explicitamente **contra** a decisão: aponte onde ela falha, premissas frágeis e cenários em que se prova errada.
2. Liste os contra-argumentos mais fortes.
3. **Revise a decisão ou reforce-a respondendo a cada contra-argumento** dentro do ADR (em Consequências ou Alternativas). A versão final deve ser visivelmente mais robusta que o rascunho.
4. Quando o usuário pedir histórico do debate, registre-o em `docs/adr/devils-advocate/ADR-NNNN-debate.md`.

## Anti-padrões a evitar

- ADR genérico que serviria a qualquer projeto (sem os números do cenário atual).
- Decisão sem alternativa descartada, ou com alternativas-espantalho.
- Consequências só positivas.
- "Vamos monitorar" como mitigação.
- Duas decisões no mesmo ADR.

## Saída

- Crie/edite o arquivo do ADR em `docs/adr/`.
- Atualize a tabela/índice em `docs/adr/README.md` se existir.
- Reporte ao usuário um resumo da decisão e os principais contra-argumentos tratados.
