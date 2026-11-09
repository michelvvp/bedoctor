# beDoctor

Jogo de cirurgia para navegador, em 2D cartoon visto de cima: o paciente na
mesa, coberto pelo campo verde, com uma janela de pele para operar. Você troca
de instrumento, corta na linha, segura o sangramento, vigia os sinais vitais e
fecha com sutura. No fim sai uma nota de 0 a 100, com estrelas.

Sem login, sem backend: build estático. Melhor nota e melhor tempo de cada
cirurgia ficam no `localStorage` do navegador.

> Estado atual: motor do jogo, menus/HUD em Liquid Glass e as duas cirurgias
> da 1ª versão (tutorial de sutura e apendicectomia) prontos.

## Cirurgias disponíveis

1. **Sutura de corte** (tutorial) — um corte já aberto no antebraço, sangrando
   devagar. Ensina os instrumentos, uma etapa por vez:
   1. limpar o sangue da pele com a **gaze**;
   2. aspirar o que sobrou dentro do corte com o **aspirador**;
   3. estancar os 2 pontos que sangram com o **cautério**;
   4. segurar a borda do corte com a **pinça**;
   5. dar 5 pontos com o **porta-agulha**, nas marcas;
   6. cortar a sobra do fio com a **tesoura**;
   7. fim: resultado e nota.

   É tolerante: vitais estáveis e sangramento lento (parado, perde menos de
   100 ml em 2 minutos). Estancar um ponto com a gaze apertada também vale.
   Bisturi e afastador ficam para a apendicectomia.

2. **Apendicectomia** — tirar o apêndice inflamado por um corte oblíquo no
   lado direito da barriga, abaixo do umbigo (na tela, à esquerda: o paciente
   está de barriga para cima). Usa os 8 instrumentos:
   1. cortar a pele seguindo a linha tracejada com o **bisturi**;
   2. passar o **bisturi** na linha mais duas vezes: gordura e fáscia, até a
      cavidade;
   3. abrir com o **afastador**: puxar uma borda para fora e depois a outra;
   4. estancar o que sangra (os cortes e 2 vasos da parede): **aspirador** na
      poça e **cautério** no ponto;
   5. afastar com a **pinça** as alças do intestino (rosadas) até o apêndice
      (vermelho, inflamado) aparecer;
   6. ligar a base do apêndice com o **porta-agulha**, clicando na marca roxa;
   7. cortar a base com a **tesoura** entre o nó e o apêndice e arrastar o
      apêndice com a **pinça** até a cuba, à direita do campo;
   8. conferir que nada sangra e retirar o **afastador** (arrastar a borda de
      volta);
   9. dar 5 pontos na pele com o **porta-agulha** e cortar a sobra do fio com a
      **tesoura**;
   10. fim: resultado e nota (tempo de referência: 5 minutos).

   Sangra de verdade: só os 2 vasos da parede somam 7 ml/s (o tutorial, 0,6),
   e os cortes das camadas somam mais; sem estancar nada, a parada vem em cerca
   de 1 minuto e meio. Tesoura no
   lugar errado é erro grave e sangra forte: na alça do intestino, no ceco, no
   corpo do apêndice, no mesentério que prende as alças, ou na base abaixo do
   nó (ou antes de ligar). Seguindo as instruções e estancando sem demora, dá
   para terminar com folga.

## Como jogar

- Escolha a cirurgia no menu (cada uma mostra seu recorde) e siga a instrução
  da etapa no painel do canto superior esquerdo. A bandeja à esquerda troca o
  instrumento (o sugerido para a etapa tem realce); o monitor no canto superior
  direito mostra FC, pressão, sangue perdido e o ECG, e pisca em vermelho no
  estado crítico. Ao fim, a tela de resultado mostra nota, estrelas e motivos.
- **Bisturi**: arraste em cima da linha tracejada. Cada passada inteira abre uma
  camada (pele, gordura, músculo). Sair da linha é erro e sangra.
- **Afastador**: pegue a borda do corte e arraste para fora para abrir;
  arraste de volta para fechar. Solto, ele mantém a abertura. Cada borda
  puxada para fora ganha uma lâmina; a apendicectomia pede as duas.
- **Pinça**: segura e puxa órgãos (com a cavidade aberta) ou a borda do corte.
  Órgão preso tem folga limitada; solto e arrastado para longe (até a cuba),
  sai do corpo ao soltar.
- **Tesoura**: clique em cima de uma estrutura (vaso, ligamento, sobra de fio) ou passe por
  cima dela arrastando para cortar. Estrutura ligável cortada sem ligar, ou do
  lado errado do nó, sangra forte e é erro. Clique em cima de um órgão
  (intestino, apêndice) fere o órgão: erro grave e sangramento.
- **Gaze**: esfregue para absorver o sangue; apertada em cima de um
  sangramento pequeno, estanca em pouco mais de 1 s.
- **Aspirador**: segure o botão em cima da poça para puxar o sangue.
- **Porta-agulha**: clique numa marca de sutura e depois na marca do outro lado
  para dar o ponto. Feche o afastador antes. Clicado numa estrutura inteira,
  amarra (liga) ela; se ela tem marca roxa de ligadura, só amarra na marca.
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

`./deploy.sh` na raiz puxa do GitHub (quando há upstream) e recria o stack
`bedoctor`: um serviço `web` (nginx) servindo o build estático de `game/dist`,
porta 8099 (`FRONTEND_PORT`; 9099 na homologação), em
https://bedoctor.michel-dev.com. Sem backend, banco nem `.env` obrigatório.

Arquivos: `Dockerfile` (Node compila, nginx serve), `nginx.conf` (SPA fallback,
cache longo só em `/assets/` com hash), `docker-compose.prod.yml`,
`devflow.conf` (usado pelo `devflow-ops.sh`).
