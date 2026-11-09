# Guia para agentes de IA — aplicando este design system

Este arquivo é a referência canônica para aplicar o design system em outro projeto. O `design-system.css` é a única dependência; o `styleguide.html` é a demonstração visual (não copie os estilos internos dele — são só do guia). Em caso de dúvida entre este arquivo e o styleguide, este arquivo vence.

## Adoção em 3 passos

1. Copie `design-system.css` para `src/` do projeto e importe no entry point: `import './design-system.css'`
2. O tema segue o SO; para controle manual: `document.documentElement.dataset.theme = 'dark' | 'light'` (remover o atributo volta ao automático)
3. Defina a identidade do projeto sobrescrevendo o accent **depois** do import (ver contrato abaixo)

## Contrato de tokens

Um tema é definido por **exatamente 4 variáveis** — nada mais:

```css
:root {
  --accent: #f7931a;                          /* a cor da marca */
  --accent-hover: #ffa53a;                    /* ~15% mais clara */
  --accent-tint: rgba(247, 147, 26, 0.18);    /* a cor com ~18% de opacidade */
  --on-accent: #000000;                       /* preto se a cor for clara, senão branco */
}
```

Tudo o mais deriva sozinho via `color-mix`: focus ring, fundo ambiente (`--bg-ambient`), badges, alertas, spinner, avatar. **Nunca defina cores novas em componentes** — use os tokens (`--accent`, `--success`, `--danger`, `--warning`, materiais e texto).

Uma exceção deliberada: **a paleta de gráficos (`--chart-1`…`--chart-8`) não deriva do accent e não deve ser trocada por projeto.** A ordem dos oito slots é o mecanismo que mantém séries vizinhas distinguíveis para quem tem daltonismo, e foi validada para as duas modalidades; um accent entrando como "série 1" quebra a validação e ainda muda de projeto para projeto. Série única é o único caso em que o accent pinta o dado (não há vizinha para confundir). Ver § Gráficos.

Texto: `--text` (96% de opacidade), `--muted` (55%), `--faint` (32%) — hierarquia por opacidade, nunca por cinzas fixos.

## Regras de decisão

- **Todo componente de superfície é vidro** (`.card`, `.window`, `.modal`, `.menu`, `.navbar`). O vidro exige o fundo ambiente atrás — o `body` já o recebe do CSS; não troque por cor chapada. Wallpaper/imagem própria é permitido (`body { background-image: url(...) }`).
- **Nunca aninhe vidro sobre vidro.** Dentro de um `.card`/`.window`, os controles usam `--glass-fill` (é o que `.input`, `.list-group`, `.segmented` já fazem) — não outro `backdrop-filter`.
- `.card.widget` → número/indicador de dashboard (rótulo em caixa alta + valor grande + badge). `.card` → conteúdo em geral. `.card--solid` → exceção para conteúdo denso que precisa de fundo estável (tabelas longas, editores).
- Tela de configurações/CRUD → `.window` + `.sidebar` + `.window-content` com `.list-group`s. Landing/dashboard → seções soltas com `.card`/`.widget`.
- Feedback: **toast** = confirmação passageira de ação; **alert** = aviso persistente no fluxo da página; **modal** = decisão que bloqueia (confirmar exclusão). Não use modal para o que um toast resolve.
- Seleção: **popup** = valor único em linha de configuração (o padrão preferido); **segmented** = 2–4 opções sempre visíveis; `<select>` nativo só em formulários longos onde o popup não compensa o JS.
- Raios: pílula para botões, `--radius-md` (16px) para inputs/popovers, `--radius-lg` (26px) para cartões. Não invente raios intermediários.
- Espaço: sempre múltiplos de 4 via `--space-*`. Profundidade vem do contraste de material; sombra extra só nos tokens (`--shadow-glass`, `--shadow-float`).
- Layout: tela de configuração/CRUD → `.window`. Conteúdo solto (entrada, escolha de contexto, painel) → `.page` (ou `.page--center` para o que se centraliza na tela) com `.content-header` no topo de cada seção.
- Número virou comprimento? Se é uma proporção (progresso, cota, meta) → `.meter`. Se é uma série ao longo do tempo em espaço apertado → `.sparkline`. Se precisa de eixo, grade e leitura de valores → gráfico de verdade (§ Gráficos). Se é um número e pronto → `.widget`, sem desenho nenhum.
- Escolha entre realce estático e deslizante: `.segmented` puro quando a escolha é rara e discreta; `.segmented--fluid`/`.tabbar--fluid` quando o controle é usado o tempo todo com o dedo — o polegar deslizante mostra a continuidade entre as opções e aceita arrasto.

## Catálogo — HTML canônico

### Botões
```html
<button class="btn" type="button">Publicar</button>
<button class="btn btn--secondary" type="button">Duplicar</button>
<button class="btn btn--ghost" type="button">Cancelar</button>
<button class="btn btn--danger" type="button">Excluir</button>
<button class="btn btn--muted" type="button">Detalhes…</button> <!-- utilitário retangular -->
<!-- tamanhos: btn--sm, btn--lg -->
```

### Cartão e widget
```html
<div class="card">…</div>
<div class="card card--hover">…</div> <!-- levanta no hover -->

<div class="card widget">
  <span class="widget-label">Metas do mês</span>
  <p class="widget-value">18</p>
  <span class="badge badge--success">+2</span>
</div>
```

### Formulário
```html
<div class="field">
  <label class="label" for="x">Nome</label>
  <input class="input" id="x" type="text" placeholder="Ex.: Relatório">
  <span class="field-hint">Texto de apoio.</span>       <!-- ou field-error -->
</div>

<label class="checkbox"><input type="checkbox" checked> Notificações</label>
<label class="radio"><input type="radio" name="g" checked> Mensal</label>

<label class="switch">
  <input type="checkbox" checked aria-label="Ativar">
  <span class="switch-track"></span>                     <!-- obrigatório, irmão do input -->
</label>

<input class="slider" type="range" min="0" max="100" value="50" aria-label="Meta">
```
Contrato JS do slider (WebKit): no evento `input`, `el.style.setProperty('--fill', ((el.value - el.min) / (el.max - el.min) * 100) + '%')` — e uma vez na montagem.

### Segmented
```html
<div class="segmented" role="group" aria-label="Período">
  <button type="button" aria-pressed="true">Semana</button>
  <button type="button" aria-pressed="false">Mês</button>
</div>
<!-- largura total com ativo no accent: class="segmented segmented--full" -->
```
Contrato JS: clique define `aria-pressed="true"` no clicado e `"false"` nos irmãos.

### Popup (seletor) e menu
```html
<div class="popup">
  <button class="popup-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
    <span class="popup-value">Semanal</span>
    <span class="popup-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9.5 12 4.5l5 5M7 14.5l5 5 5-5"/></svg></span>
  </button>
  <div class="menu" role="listbox" hidden>
    <button class="menu-item" type="button" role="option" aria-selected="true"><span class="menu-check">✓</span>Semanal</button>
    <button class="menu-item" type="button" role="option" aria-selected="false"><span class="menu-check">✓</span>Mensal</button>
  </div>
</div>
```
Regras: o `.menu-check` existe em **todos** os itens (fica invisível nos não selecionados — é o que alinha o texto). Menu ancora à direita; use `.menu--left` para ancorar à esquerda. `.menu` também serve de menu de contexto (`.menu-divider` separa grupos).
Contrato JS: clique no trigger alterna `hidden` do menu + classe `is-open` no `.popup` + `aria-expanded`; escolher item move `aria-selected`, atualiza `.popup-value`, fecha e devolve o foco ao trigger; clique fora fecha.
Contrato de teclado (obrigatório): `↓`/`↑` no trigger abrem o menu já focando um item (o selecionado, se houver; `↑` foca o último); dentro do menu, `↓`/`↑` circulam entre os itens, `Home`/`End` saltam para o primeiro/último, `Esc` fecha e devolve o foco ao trigger, `Tab` fecha; `Enter`/`Espaço` ativam o item (nativo de `<button>`). Referência completa no `styleguide.html`.

### Badges
```html
<span class="badge">Rascunho</span>
<span class="badge badge--accent">Novo</span>
<!-- badge--success, badge--warning, badge--danger -->
```

### Tabela
```html
<div class="card" style="padding:0;overflow:hidden">
  <div class="table-wrap">  <!-- obrigatório: rolagem horizontal fica aqui dentro -->
    <table class="table">
      <thead><tr><th>Tarefa</th><th>Status</th></tr></thead>
      <tbody><tr><td>Backup</td><td><span class="badge badge--success">Concluído</span></td></tr></tbody>
    </table>
  </div>
</div>
```
Números em colunas recebem `class="numeric"` (tabular-nums) — e com isso também param de quebrar (uma data virando duas linhas é sempre erro). Texto livre em `<td>` quebra em qualquer ponto para não esticar a tabela; `<th>` quebra só entre palavras.

Variante `.table--fit`: `table-layout: fixed`, colunas dividindo a largura disponível e nenhuma rolagem lateral. Use quando as colunas são poucas e apertar é melhor que rolar (grades de lançamento de valores); a `.table` normal continua sendo o padrão.

### Janela de app (tela de configurações)
```html
<div class="window">
  <aside class="sidebar">
    <input class="input input--sm" type="search" placeholder="Buscar" aria-label="Buscar">
    <div class="identity">
      <span class="avatar">MP</span>
      <span class="identity-name">Michel Pereira<span class="identity-sub">Plano Performance</span></span>
    </div>
    <button class="sidebar-item is-active" type="button">
      <span class="sidebar-icon" style="background:#0a84ff"><svg><!-- glifo branco stroke currentColor --></svg></span>
      Treinos
    </button>
    <div class="sidebar-section"></div>  <!-- espaçador entre grupos -->
  </aside>
  <div class="window-content">…</div>
</div>
```
Tiles de ícone: fundo colorido via `style="background:#…"`, glifo SVG branco (stroke `currentColor`, ~15px). Item ativo = `.is-active` (um por vez).

### Listas agrupadas (miolo de configurações)
```html
<p class="list-header">Aparelhos</p>
<div class="list-group">
  <div class="list-row">
    <span class="list-label">Check-in automático
      <span class="list-sub">Registre a entrada ao chegar.</span>
    </span>
    <label class="switch"><input type="checkbox" checked aria-label="Check-in"><span class="switch-track"></span></label>
  </div>
  <div class="list-row list-row--hover">
    <span class="list-label">Smartwatch</span>
    <span class="list-trailing">
      <button class="icon-btn" type="button" data-tooltip="Opções" aria-label="Opções">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
      </button>
    </span>
  </div>
</div>
```
Controle/valor sempre à direita (`.list-value` para texto, `.list-trailing` para grupos de controles). `list-row--hover` só em linhas clicáveis.

### Modal
```html
<div class="modal-overlay" id="m" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt" tabindex="-1">
    <h3 id="mt">Excluir item?</h3>
    <p class="text-muted">Não dá para desfazer.</p>
    <div class="row" style="justify-content:flex-end">
      <button class="btn btn--ghost" type="button">Cancelar</button>
      <button class="btn btn--danger" type="button">Excluir</button>
    </div>
  </div>
</div>
```
Abrir/fechar = alternar `hidden` (o CSS já trata `.modal-overlay[hidden]`). Clique no overlay fecha; clique dentro do `.modal` não.
Contrato de teclado/foco (obrigatório): o `.modal` leva `tabindex="-1"`; ao abrir, foque o `.modal` (é o que faz `Esc` funcionar); `Esc` fecha; ao fechar, devolva o foco ao elemento que abriu.
Contrato de rolagem (obrigatório): com o modal aberto o fundo fica parado. O CSS já corta o encadeamento (`overscroll-behavior`) e já sabe travar o body — falta o JS: ao abrir, guarde o `scrollY`, ponha `.has-modal` no `<body>` e compense com `top: -<scrollY>px`; ao fechar, tire a classe e devolva o scroll. Sem a compensação a página salta para o topo. Quem rola quando o formulário é mais alto que a tela é o **overlay**, não o modal — já está no CSS, não ponha `overflow` no painel (cortaria os menus abertos lá dentro).

### Feedback
```html
<div class="toast toast--success show" role="status"><span class="toast-dot"></span>Alterações salvas</div>
<!-- variantes: toast--success, toast--danger, toast--warning; exibir = classe .show, ocultar após ~1.8s -->

<div class="alert alert--warning">
  <span class="alert-icon"><svg><!-- ícone stroke currentColor 16px --></svg></span>
  <div><span class="alert-title">Pagamento pendente</span><p>Vence em 3 dias.</p></div>
</div>
<!-- variantes: alert--info, alert--success, alert--warning, alert--danger -->

<span class="spinner" role="status" aria-label="Carregando"></span>  <!-- spinner--lg -->
<span class="skeleton skeleton--text" style="width:60%"></span>
<span class="skeleton skeleton--circle" style="width:40px;height:40px"></span>
```

### Tooltip e avatar
```html
<button class="icon-btn" data-tooltip="Mais opções" aria-label="Mais opções">…</button>
<!-- tooltip por atributo; aparece com atraso de 400ms no hover/foco; sempre pareado com aria-label -->

<span class="avatar">MP</span>  <!-- avatar--sm, avatar--lg; ou <img> dentro -->
```

### Adicionar e excluir
```html
<!-- "+" circular de toolbar -->
<button class="add-btn" type="button" aria-label="Adicionar">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
</button>

<!-- "×" no canto do cartão (modo de edição); o pai deve ser um .card -->
<div class="card widget">
  <button class="delete-btn" type="button" aria-label="Excluir">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </button>
  …
</div>
```
O `.delete-btn` é cinza em repouso e vira `--danger` no hover. Use-o só em modo de edição (renderização condicional), não permanentemente.

### Mini calendário
```html
<div class="mini-cal">
  <div class="mini-cal-header">
    <button class="icon-btn" type="button" aria-label="Mês anterior"><svg><!-- chevron ‹ --></svg></button>
    <span class="mini-cal-title">Julho 2026</span>
    <button class="icon-btn" type="button" aria-label="Próximo mês"><svg><!-- chevron › --></svg></button>
  </div>
  <div class="mini-cal-grid">
    <span class="dow">D</span><!-- … 7 iniciais … -->
    <button class="mini-cal-day is-muted" type="button">28</button>  <!-- dias dos meses vizinhos -->
    <button class="mini-cal-day is-today" type="button" aria-current="date">5</button>
    <button class="mini-cal-day" type="button">6</button>
    <!-- … sempre células completas, 7 por linha … -->
  </div>
</div>
```
Estados: `.is-today` (accent, um por grade), `.is-selected` (cinza, controlado por clique), `.is-muted` (vizinhos). A grade deve sempre ter linhas completas de 7 dias. Contrato JS: clique remove `.is-selected` de todos e aplica no clicado (exceto se for `.is-today`).

### Página e cabeçalho de conteúdo
```html
<div class="page">                     <!-- .page--center centraliza na tela -->
  <div class="content-header">
    <h1>Atletas</h1>
    <div class="row"><button class="btn" type="button">Novo</button></div>
  </div>
  …
</div>
<!-- fora de uma .page: .page-title + .page-sub para título/subtítulo soltos -->
```
A `.page` é o layout do conteúdo que não mora numa `.window`. O `.content-header` quebra em duas linhas quando não couber, e a fileira de ações vai para a direita.

### Campo com botão dentro
```html
<div class="input-group">              <!-- .input-group--leading põe o botão à esquerda -->
  <input class="input" type="password" id="senha">
  <button class="icon-btn" type="button" aria-label="Mostrar senha"><svg>…</svg></button>
</div>
```

### Caixa de texto técnico
```html
<code class="code-box">mcp_9f3c1a77-4b02-4e51-9a6d-0c8b2f7e51dd</code>
```
Para token, chave, id, comando: quebra em qualquer ponto (não tem espaços) e o clique seleciona tudo. Pareie com um botão de copiar; a caixa é o plano B de quando o clipboard falha.

### Arrasto para reordenar
```html
<div class="list-row">
  <span class="list-label">Aquecimento</span>
  <span class="list-trailing">
    <button class="drag-handle" type="button" aria-label="Arraste para reordenar"><svg>…</svg></button>
  </span>
</div>
```
A linha em movimento recebe `.is-lifted` (vidro denso, anel no accent, sombra de flutuação). Contrato JS: pointer events **no pegador**, não na linha inteira — o resto da linha continua clicável; `touch-action: none` já está no CSS. Ofereça também um caminho por teclado (↑/↓ com o pegador focado) ou a ordenação fica inacessível.

### Trilho deslizante (segmented e tab bar)
```html
<div class="segmented segmented--fluid" role="group" aria-label="Período">
  <span class="track-thumb" aria-hidden="true"></span>   <!-- primeiro filho -->
  <button type="button" aria-pressed="true">Semana</button>
  <button type="button" aria-pressed="false">Mês</button>
</div>
```
O realce deixa de ser pintado pelo item e passa a ser o `.track-thumb`, que desliza até ele. `.segmented--full.segmented--fluid` deixa o polegar no accent; `.tabbar--fluid` funciona igual na barra inferior.
Contrato JS: ao trocar a seleção e a cada resize, meça o item ativo e escreva no polegar `--thumb-x`, `--thumb-y`, `width` e `height`. Durante o arrasto ponha `.is-dragging` (o transform deixa de interpolar — atraso aqui se sente como o polegar resistindo ao dedo); quando estiver remedindo em sequência (a barra encolhendo, por exemplo), `.is-syncing`; sem nada selecionado, `.is-hidden`. Implementação de referência no `styleguide.html`.

### Tab bar retrátil e separador
```html
<nav class="tabbar tabbar--mobile is-compact" aria-label="Navegação principal">
  <a class="tabbar-item is-active" href="#"><svg>…</svg>Treinos</a>
  <a class="tabbar-item" href="#"><svg>…</svg>Agenda</a>
  <span class="tabbar-divider" aria-hidden="true"></span>
  <button class="tabbar-item" type="button"><svg>…</svg>Sair</button>
</nav>
```
`.is-compact` esconde os rótulos e deixa só os ícones — alterne conforme a direção do scroll, com uma zona morta de alguns pixels para não piscar. O `.tabbar-divider` marca onde acabam as abas e começam as ações (que não ficam selecionadas).

### Banner de modo
```html
<div class="banner banner--warning" role="status">
  <span class="banner-text">Você está vendo o portal como <strong>Ana Lima</strong></span>
  <button class="btn btn--sm btn--secondary" type="button">Sair</button>
</div>
```
Para um estado que vale em **qualquer** tela e do qual é preciso poder sair: sessão emprestada, modo de teste, rascunho. Diferente do alert (que é do fluxo da página) e do toast (que passa). O layout deve abrir espaço para ele (descontar a altura da margem/altura da janela), não deixá-lo cobrir conteúdo.

### Passo a passo guiado (coach marks)
```html
<div class="spotlight-overlay">
  <div class="spotlight-hole" style="top:120px;left:24px;width:232px;height:44px"></div>
  <div class="card spotlight-card" style="top:180px;left:280px">
    <span class="spotlight-step">Passo 2 de 5</span>
    <h3 class="spotlight-title">Suas fichas</h3>
    <div class="spotlight-text"><p>Aqui ficam os treinos que você prescreveu.</p></div>
    <div class="row" style="justify-content:flex-end">
      <button class="btn btn--ghost" type="button">Pular</button>
      <button class="btn" type="button">Próximo</button>
    </div>
  </div>
</div>
```
O buraco é uma sombra de raio gigante — o brilho real do app continua atravessando dentro do retângulo. Contrato JS: meça o alvo a cada passo e escreva top/left/width/height no `.spotlight-hole`; passo sem alvo usa `.spotlight-card--center` e o overlay escurece sozinho; `Esc` encerra.

### Gráficos
O sistema não traz biblioteca: traz o cenário, a paleta e as peças ao redor. Vale para SVG escrito à mão e para qualquer biblioteca que desenhe SVG.

```html
<div class="card">
  <div class="chart-header">
    <div><h4 class="chart-title">Evolução</h4><p class="chart-sub">Últimos oito meses</p></div>
    <div class="segmented" role="group" aria-label="Período">…</div>
  </div>

  <div class="chart chart--ratio">        <!-- .chart--sm / .chart--lg mudam a altura -->
    <svg viewBox="0 0 640 240" role="img" aria-label="descrição do que o gráfico mostra">
      <g class="chart-grid"><line x1="46" y1="138" x2="624" y2="138"/></g>
      <g class="chart-axis"><line x1="46" y1="198" x2="624" y2="198"/></g>
      <g class="chart-series-1">
        <path class="chart-line" d="M …"/>
        <circle class="chart-dot chart-dot--ringed" cx="624" cy="34" r="4"/>
      </g>
      <g class="chart-series-2"><path class="chart-line" d="M …"/></g>
    </svg>
    <div class="chart-tooltip" style="left:56%;top:18%">
      <span class="chart-tooltip-title">Junho</span>
      <span class="chart-tooltip-row">
        <span class="chart-tooltip-name"><i class="chart-swatch chart-series-1"></i>Peso</span>
        <span class="chart-tooltip-value">68,0 kg</span>
      </span>
    </div>
  </div>

  <div class="chart-legend">
    <span class="chart-legend-item"><i class="chart-swatch chart-series-1"></i>Peso (kg)</span>
    <span class="chart-legend-item"><i class="chart-swatch chart-series-2"></i>Gordura (%)</span>
  </div>
</div>
```

Peças: `.chart` (a caixa; altura por `--chart-h`), `.chart--ratio` (para SVG à mão: a altura sai da proporção do viewBox, sem letterbox), `.chart-header`/`.chart-title`/`.chart-sub`, `.chart-legend`/`.chart-legend-item`/`.chart-swatch`, `.chart-tooltip` (+ `-title`, `-row`, `-name`, `-value`), `.chart-empty`, `.sparkline`, `.meter`.
Cenário: `.chart-grid`, `.chart-axis`, `.chart-band` (faixa/zona), `.chart-rule` (meta/limite), `.chart-crosshair`, `.chart-cursor`.
Marcas: `.chart-line`, `.chart-area`, `.chart-bar`, `.chart-dot` (+ `.chart-dot--ringed` quando cruza outra marca) — todas em `currentColor`, então a cor vem da classe de série no elemento ou num `<g>` em volta.
Séries: `.chart-series-1` … `.chart-series-8` na ordem, `.chart-series-accent` (série única), `.chart-series-muted` (contexto: média, ano anterior, "o resto").

Regras (valem também para gráfico feito com biblioteca):
- o gráfico mora dentro de um `.card` e **nunca é vidro** — vidro sobre vidro some. O `.chart-tooltip` é a exceção porque flutua acima, como o `.menu`;
- **atribua os slots em ordem e nunca os recicle**: série 1 → slot 1, série 2 → slot 2. Não existe nona série — vira "Outros", vira facetas, ou o gráfico está tentando dizer coisa demais;
- **a cor segue a entidade, não a posição**: um filtro que muda quantas séries aparecem não pode repintar as que sobraram;
- **uma série só usa `--accent`** e dispensa legenda: o título já a nomeia;
- **texto nunca veste a cor da série** — rótulo, valor e legenda usam `--text`/`--muted`/`--faint`, e o quadradinho ao lado carrega a identidade;
- duas ou mais séries pedem legenda; até quatro, rotule também o fim da linha — identidade não pode depender só de cor;
- **nunca dois eixos Y no mesmo gráfico.** Duas medidas de escalas diferentes são dois gráficos (ou uma indexada à outra); sobrepostas, a comparação que o leitor faz é a do desenho, que ninguém escolheu;
- eixo Y não precisa começar no zero em série temporal contínua; em barras, precisa — barra é comparação de comprimento;
- todo gráfico tem `role="img"` e um `aria-label` que diz o que ele mostra (não "gráfico de linhas"), e um caminho para os números em texto (a tabela que ele resume, um estado expandido);
- sem dados é `.chart-empty`, que ocupa a mesma caixa — o cartão não pode pular de altura quando os dados chegarem.

Com biblioteca, aponte as props de cor para os tokens em vez de repetir hex nas telas:
```
grade   stroke: var(--chart-grid)    eixo/ticks  stroke: var(--chart-axis)
rótulo  fill:   var(--chart-label)   faixa/zona  fill:   var(--chart-band)
série N var(--chart-N)               série única var(--accent)
tooltip use a classe .chart-tooltip em vez de estilo inline
```

Magnitude contínua (mapa de calor, intensidade) usa a rampa sequencial `--chart-seq-1`…`--chart-seq-5` (um matiz só, do "perto de zero" ao "máximo" — no escuro a âncora inverte). Polaridade (acima/abaixo de uma linha de base) usa `--chart-diverge-1` / `--chart-diverge-2` com `--chart-diverge-mid` no meio. Nunca arco-íris; nunca um matiz no meio do divergente.

### Sparkline e medidor
```html
<!-- série mínima: sem eixo, sem grade, dentro de um .widget ou de uma linha -->
<svg class="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
  <path class="sparkline-fill" d="M … L 100 28 L 0 28 Z"/>
  <path d="M …"/>
</svg>

<!-- proporção: um número que virou comprimento -->
<div class="meter" role="progressbar" aria-valuenow="18" aria-valuemin="0" aria-valuemax="20"
     aria-label="Meta do mês" style="--meter-value:90%">
  <div class="meter-fill"></div>
  <span class="meter-mark"></span>          <!-- opcional: --meter-mark:85% -->
</div>
<!-- .meter--lg, .meter--success / --warning / --danger -->
```
O `preserveAspectRatio="none"` do sparkline é intencional: o traço não estica junto por causa do `vector-effect: non-scaling-stroke`. O medidor sem `role`/`aria-*` não diz nada a um leitor de tela — a barra sozinha é decoração.

### Mobile — swipe para excluir
```html
<div class="swipe-item">
  <div class="swipe-action">
    <button class="swipe-delete" type="button" aria-label="Excluir Brasília">
      <svg><!-- lixeira stroke currentColor --></svg>
    </button>
  </div>
  <div class="swipe-content">
    <!-- o conteúdo da linha (row--between, list-label etc.) -->
  </div>
</div>
```
Estado aberto = classe `.is-open` no `.swipe-item` (conteúdo desliza −72px, botão cresce de scale 0.4 → 1). Contrato JS (pointer events no `.swipe-content`): arrasto horizontal limitado a [−72, 0]; ao soltar, abre se passou da metade; `touch-action: pan-y` já está no CSS para não roubar o scroll vertical. Excluir = remover o item (animar altura) + toast. Em telas com mouse, ofereça também o `.delete-btn`/modo de edição como alternativa descobrível.

### Mobile — tab bar
```html
<nav class="tabbar" aria-label="Navegação principal">
  <button class="tabbar-item is-active" type="button"><svg><!-- ícone --></svg>Treinos</button>
  <button class="tabbar-item" type="button"><svg><!-- ícone --></svg>Agenda</button>
</nav>
```
A `.tabbar` é `position: fixed` no rodapé (com `safe-area-inset-bottom`), pílula de vidro denso, item ativo no accent. Regra responsiva: **em telas ≤ 640px, a `.sidebar` da `.window` some e a `.tabbar` assume** com os mesmos itens principais (3–5 no máximo, ícone + rótulo curto). O CSS já implementa o colapso: a sidebar é ocultada, a `.window` vira tela cheia, e havendo uma `.tabbar` na página o conteúdo ganha `padding-bottom` para a barra não cobrir a última linha. Em apps que têm sidebar no desktop e tabbar no mobile, adicione **`.tabbar--mobile`** à barra — ela fica `display: none` no desktop e aparece sozinha ≤ 640px.

### Mobile — sheet (a forma mobile do modal)
```html
<div class="modal-overlay modal-overlay--sheet" hidden>
  <div class="modal modal--sheet" role="dialog" aria-modal="true" aria-labelledby="t">
    <div class="sheet-grabber"></div>
    <h3 id="t">Novo alarme</h3>
    <!-- conteúdo + ações -->
  </div>
</div>
```
Mesmo contrato de abrir/fechar do modal (alternar `hidden`; clique no overlay fecha). O sheet sobe do rodapé em largura total, com cantos superiores arredondados, animação de entrada e `safe-area-inset-bottom` no padding.

## Adaptações mobile (≤ 640px) — mapa rápido

| Desktop | Mobile |
|---|---|
| `.window` + `.sidebar` | coluna única + `.tabbar` fixa no rodapé (mesmos itens, 3–5) — **automático no CSS**; marque a barra com `.tabbar--mobile` |
| `.delete-btn` (modo de edição) | swipe para excluir (`.swipe-item`) |
| `.table` | `.list-group` — um registro por linha, detalhes em `.list-sub`, badge à direita |
| `.modal` centralizado | `.modal--sheet` (overlay `.modal-overlay--sheet`) subindo do rodapé |

Para a troca tabela ↔ lista (a única que o CSS não faz sozinho), marque as duas versões com **`.only-desktop`** e **`.only-mobile`** — elas nunca devolvem um `display`, então cada elemento mantém o seu (flex, grid, table-row).

Também no mobile, e já no CSS: um `.popup` dentro de um `.field` vira controle de largura cheia (o menu ancorado à direita cresceria para fora da tela), e a `.tabbar` ganha um teto de largura com os itens dividindo o espaço — com cinco ou seis itens ela estourava a tela.

O que **não** muda: cards/widgets (a grade `repeat(auto-fill, minmax(240px, 1fr))` já colapsa sozinha), formulários, popup, mini calendário, toast/alert e os materiais de vidro.

O CSS também cuida do toque: em ponteiros imprecisos (`pointer: coarse`), os controles pequenos (`.icon-btn`, `.delete-btn`, `.add-btn`, checkbox/radio, `.popup-trigger`) ganham área de acerto invisível de 44×44px, os controles de fluxo (`.btn`, `.input`, `.select`, `.list-row`, `.menu-item`) ganham altura mínima de 44px, o pop-up mostra a caixa de vidro em repouso (não há hover no toque) e os dias do mini calendário crescem para 32px. Ao criar um controle custom, mantenha o mínimo de 44×44px de área de toque.

## Em React

Os contratos JS acima viram componentes controlados: `Popup` (estado `open` + `value`), `Modal` (prop `open`), `Toast` (fila com timeout), `Slider` (efeito que sincroniza `--fill`), `Segmented` (valor selecionado). O comportamento de referência completo (fechar ao clicar fora, teclado — `Esc`, setas, `Home`/`End`, devolução de foco —, `aria-*`, reinício de transição do toast) está no `<script>` do `styleguide.html`.

Os componentes com estado medido viram hooks: trava de rolagem do modal (`.has-modal` + compensação do `scrollY`), trilho deslizante (mede o item ativo e escreve `--thumb-*`), tab bar retrátil (`.is-compact` pela direção do scroll), arrasto para reordenar (pointer events no `.drag-handle`, `.is-lifted` na linha) e o passo a passo guiado (mede o alvo e posiciona `.spotlight-hole` + `.spotlight-card`). Um `DatePicker` é a composição `.popup` + `.mini-cal`: o trigger e o contrato de teclado são os do popup, o menu contém o mini calendário em vez de uma lista.

## Nunca faça

- Cor chapada nova em componente — derive de `--accent` ou use as semânticas
- Hex de cor dentro de um gráfico, paleta de séries reordenada ou reciclada, accent como "série 1" de um gráfico com mais de uma série
- Dois eixos Y no mesmo gráfico
- Cor semântica (`--success`/`--danger`/`--warning`) usada como cor de série
- `backdrop-filter` em elemento dentro de outro vidro
- `display` custom em `.modal-overlay`/`.menu` sem tratar `[hidden]`
- Sombra fora dos tokens, raio fora da escala, espaçamento fora da base 4px
- Remover os fallbacks de `prefers-reduced-transparency` / `prefers-reduced-motion`
- Omitir os contratos de teclado (`Esc` fecha modal/menu devolvendo o foco; setas navegam o menu) ou controle interativo com área de toque menor que 44×44px sem a expansão via `::before`
- Mencionar as inspirações do sistema em textos de interface ou documentação
