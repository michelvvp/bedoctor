# beDoctor — regras para agentes

Jogo de cirurgia 2D (canvas) para navegador. Leia também o `README.md`.

## Estrutura

Tudo fica em `game/` (Vite + TypeScript estrito + Vitest, canvas 2D puro, sem
framework de UI e sem Three.js).

| Pasta | O que é | Pode importar |
| --- | --- | --- |
| `game/src/sim/` | Simulação pura: tecido em camadas, incisões, sangramento, órgãos, sinais vitais, etapas, nota | só a própria `sim/` |
| `game/src/surgeries/` | Definição declarativa de cada cirurgia (`ProcedureDef`) | `sim/` |
| `game/src/render/` | Desenho no canvas: mesa, paciente, tecido, sangue, instrumento no cursor | `sim/` (estado, tuning, geometria) |
| `game/src/input/` | Mouse e teclado (`keys.ts` puro, `input.ts` com DOM) | nada do jogo |
| `game/src/audio/` | Sons procedurais (Web Audio) | nada do jogo |
| `game/src/game/` | Liga tudo e implementa a `GameApi` (`api.ts`); recordes (`progress.ts`); textos (`texts.ts`) | tudo acima |
| `game/src/ui/` | Menus e HUD | **só** `game/api.ts` |
| `game/test/` | Testes Vitest (Node, sem navegador) | — |

## Regras

- **`sim/` não importa DOM, canvas nem outras camadas.** O build confere com
  `tsconfig.sim.json` (sem `lib` DOM) e `test/purity.test.ts` barra import de
  fora da `sim/`.
- Simulação em passo fixo de 60 Hz (`FIXED_DT`) com acumulador
  (`game/loop.ts`), separada do `requestAnimationFrame`. A sim é
  determinística: mesma semente e mesmas entradas, mesmo resultado (sorteios
  pelo `Rng` com semente, nunca `Math.random`). O render desenha o último
  passo; o instrumento no cursor usa a posição crua do mouse.
- A entrada chega à sim só como `ToolInput` (`sim/tools.ts`): instrumento,
  posição (mm) e botão. A sim detecta aperto e soltura sozinha; trocar de
  instrumento com o botão apertado espera soltar.
- Toda constante de tuning fica em `game/src/sim/tuning.ts`, comentada.
  Unidade: mm no plano da mesa, x para a direita, y para baixo, origem no
  centro da janela de pele.
- A sim emite eventos (`sim/events.ts`); som e mensagens da tela saem deles na
  camada `game/` (`texts.ts`). A sim não escreve mensagem de tela — exceção:
  os motivos da nota (`sim/score.ts`) e as instruções das etapas.
- Sem alocação por quadro no loop quente: o `ToolInput` e o cursor são
  reaproveitados; a `GameApi` só publica estado novo quando algo visível muda.
- Código e identificadores em inglês; textos da tela e comentários em
  português.

## Cirurgias (`game/src/surgeries/`)

Uma cirurgia é um `ProcedureDef` (`sim/procedure.ts`): `setup` inicial e uma
lista de etapas. Cada etapa tem `instruction` (português), `tool` sugerido,
`setup` opcional aplicado quando ela começa (incisões com linha-guia, marcas de
sutura, órgãos, estruturas, sangramentos) e `done(state)`, a condição de
conclusão — escreva com as consultas de `sim/queries.ts`. Registre a cirurgia
em `surgeries/index.ts`. A **Teste** (`surgeries/test.ts`) existe só para provar
o formato.

## Modelo da simulação

- Incisão: linha-guia + profundidade (0 intacta … 3 cavidade). A guia é
  dividida em `INCISION_BINS` trechos; cortar ≥ `LAYER_OPEN_COVERAGE` deles
  abre a camada atual. Bisturi a mais de `OFF_GUIDE_MIN` mm de qualquer guia,
  na pele, é corte errado (erro + sangramento).
- Abertura: meia-largura em forma de olho (`openingHalfWidth`); afastador
  mantém (`openWidth`), pinça na borda segura enquanto apertada (`heldOpen`).
- Órgãos: cápsulas; alcançáveis com a cavidade aberta o bastante ou depois de
  puxados para fora. Presos por estruturas com `organ`, não passam da folga;
  soltos e puxados longe, saem do corpo ao soltar (se `removable`).
- Sangramento: cada um tem vazão e poça. A perda soma em `vitals.bloodLost`;
  vitais seguem a perda; `ARREST_BLOOD_LOSS` = parada = derrota.
- Nota (`sim/score.ts`): precisão 50% / tempo 25% / sangue 25%; derrota = 0.

## UI (Liquid Glass)

Menus e HUD em `game/src/ui/` usam o design system Liquid Glass.
`game/src/design-system.css` é cópia literal (nunca edite; para atualizar,
copie de novo de `michelvvp/designSystemLiquidGlass`) e
`game/src/DESIGN-SYSTEM.md` é a referência de HTML canônico. O estilo do app
(accent teal, HUD, monitor) fica em `game/src/theme.css`, só com tokens: sem
cor escrita em componente.

- `ui/mount.ts` monta tudo; `menu.ts`, `hud.ts` e `overlays.ts` (pausa e
  resultado) são telas montadas uma vez, atualizadas por `update(state)`.
- A `ui/` fala só pela `GameApi`. O ECG vem de `readEcg`, desenhado a cada
  quadro no canvas do monitor (cores lidas dos tokens do tema).
- `#ui` tem `pointer-events: none`; só painéis (`.card`, modais) recebem
  clique, então botão do HUD não vira ação de instrumento. O HUD fica nas
  bordas: bandeja à esquerda, monitor no canto superior direito.
- Ícones dos instrumentos em `ui/icons.ts` (SVG inline). Recordes e estrelas
  vêm de `SurgeryInfo` (`bestScore`, `bestStars`, `bestTimeSec`).

## Verificação

Não há navegador no container. Prove com:

```sh
npm --prefix game ci && npm --prefix game test && npm --prefix game run build
```

Comportamento da sim se testa simulando N passos com `test/helpers.ts`
(`drag`, `click`, `hold`, `sandbox`) e conferindo o estado.
