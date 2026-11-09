# beDoctor

Jogo de cirurgia para navegador, em 2D cartoon visto de cima: o paciente na
mesa, coberto pelo campo verde, com uma janela de pele para operar. Você troca
de instrumento, corta na linha, segura o sangramento, vigia os sinais vitais e
fecha com sutura. No fim sai uma nota de 0 a 100, com estrelas.

Sem login, sem backend: build estático. Melhor nota e melhor tempo de cada
cirurgia ficam no `localStorage` do navegador.

> Estado atual: motor do jogo pronto, com uma cirurgia **Teste** (cortar a pele,
> estancar, dar 3 pontos) e uma interface provisória em texto. As cirurgias de
> verdade (tutorial de sutura e apendicectomia) e os menus definitivos vêm a
> seguir.

## Como jogar

- Escolha a cirurgia no menu e siga a instrução de cada etapa.
- **Bisturi**: arraste em cima da linha tracejada. Cada passada inteira abre uma
  camada (pele, gordura, músculo). Sair da linha é erro e sangra.
- **Afastador**: pegue a borda do corte e arraste para fora para abrir;
  arraste de volta para fechar. Solto, ele mantém a abertura.
- **Pinça**: segura e puxa órgãos (com a cavidade aberta) ou a borda do corte.
- **Tesoura**: clique em cima de uma estrutura (vaso, ligamento) ou passe por
  cima dela arrastando para cortar. Vaso cortado sem ligar sangra forte.
- **Gaze**: esfregue para absorver o sangue; apertada em cima de um
  sangramento pequeno, estanca em pouco mais de 1 s.
- **Aspirador**: segure o botão em cima da poça para puxar o sangue.
- **Porta-agulha**: clique numa marca de sutura e depois na marca do outro lado
  para dar o ponto. Feche o afastador antes. Clicado numa estrutura inteira,
  amarra (liga) ela.
- **Cautério**: clique no sangramento para estancar. Com poça grande em cima,
  aspire antes. Em tecido sadio queima (erro leve).

Sinais vitais: sangramento aberto faz perder sangue; com a perda a pressão cai e
a frequência sobe. Passou de 1500 ml, parada cardíaca: derrota.

Nota: precisão (desvio médio da linha e erros de instrumento) vale 50%, tempo
(contra o tempo de referência da cirurgia) 25%, sangue perdido 25%.
85+ = 3 estrelas, 60+ = 2, abaixo = 1.

## Controles

| Tecla / mouse | Ação |
| --- | --- |
| Botão esquerdo | Usar o instrumento (clicar ou arrastar) |
| 1–8 | Bisturi, Afastador, Pinça, Tesoura, Gaze, Aspirador, Porta-agulha, Cautério |
| Esc ou P | Pausar / retomar |
| M | Liga / desliga o som |

Só mouse e teclado; celular não é suportado.

## Como rodar

Requer Node 22.

```sh
npm --prefix game ci
npm --prefix game run dev      # servidor de desenvolvimento (Vite)
npm --prefix game test         # testes (Vitest, em Node)
npm --prefix game run build    # build estático em game/dist
```

## Deploy

Planejado (ainda não existe nesta versão): `./deploy.sh` na raiz sobe o build
estático num nginx, stack `bedoctor`, porta 8099 (9099 na homologação), em
https://bedoctor.michel-dev.com.
