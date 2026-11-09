// Todas as constantes de tuning do jogo. Unidade de espaço: milímetro (mm) no
// plano da mesa, x para a direita e y para baixo (como o canvas), com a origem
// no centro da janela de pele. Tempo em segundos, sangue em mililitros (ml).

/** Passo fixo da simulação (60 Hz). */
export const FIXED_DT = 1 / 60;

// --- Campo operatório ---------------------------------------------------------

/** Meia-largura da janela de pele exposta pelo campo cirúrgico. */
export const SKIN_HALF_WIDTH = 180;
/** Meia-altura da janela de pele exposta pelo campo cirúrgico. */
export const SKIN_HALF_HEIGHT = 110;

// --- Camadas e incisão --------------------------------------------------------

/** Camadas, de fora para dentro. Profundidade N = as N primeiras já abertas. */
export const LAYER_SKIN = 0;
export const LAYER_FAT = 1;
export const LAYER_MUSCLE = 2;
/** Profundidade em que a cavidade (órgãos) fica exposta. */
export const CAVITY_DEPTH = 3;

/** Trechos em que a linha-guia é dividida para medir quanto já foi cortado. */
export const INCISION_BINS = 24;
/** Fração dos trechos cortados para a camada atual se abrir. */
export const LAYER_OPEN_COVERAGE = 0.85;
/** Distância máxima da guia (mm) para o bisturi contar como corte na linha. */
export const ON_GUIDE_MAX = 10;
/** Distância mínima da guia (mm) para o bisturi contar como corte errado. */
export const OFF_GUIDE_MIN = 14;
/** Desvio médio (mm) em que a parte de desvio da precisão chega a zero. */
export const DEVIATION_ZERO_SCORE = 12;
/** Espaçamento das amostras ao longo do movimento do bisturi (mm). */
export const CUT_SAMPLE_STEP = 2;
/** Fenda (meia-largura, mm) de uma incisão aberta sem afastador. */
export const INCISION_SLIT = 1.5;
/** Abertura máxima (meia-largura, mm) que o afastador consegue. */
export const RETRACTOR_MAX_OPEN = 45;
/** Folga (mm) além da borda para o afastador pegar a incisão. */
export const RETRACTOR_GRAB_MARGIN = 14;
/** Abertura máxima (meia-largura, mm) que a pinça segura na borda. */
export const FORCEPS_MAX_OPEN = 12;
/** Abertura mínima (meia-largura, mm) para alcançar os órgãos com a pinça. */
export const ORGAN_ACCESS_MIN_OPEN = 15;

/** Chance de um trecho recém-cortado sangrar, por camada (pele, gordura, músculo). */
export const CUT_BLEED_CHANCE = [0.12, 0.18, 0.25] as const;
/** Vazão (ml/s) mínima e máxima de um sangramento de corte na linha. */
export const CUT_BLEED_MIN_RATE = 0.8;
export const CUT_BLEED_MAX_RATE = 2.5;
/** Vazão (ml/s) de um sangramento de corte fora da linha. */
export const OFF_GUIDE_BLEED_RATE = 3;
/** A cada quantos mm de corte fora da linha surge um sangramento novo. */
export const OFF_GUIDE_BLEED_SPACING = 20;
/** A cada quantos mm de corte o sim emite o evento de som de corte. */
export const CUT_SOUND_SPACING = 12;

// --- Sangue no campo ----------------------------------------------------------

/** Sangue (ml) que uma poça junta antes de escorrer para fora do campo. */
export const POOL_MAX_ML = 80;
/** Raio da poça: base + fator * raiz(ml). */
export const POOL_RADIUS_BASE = 3;
export const POOL_RADIUS_PER_SQRT_ML = 2.2;

/** Raio de ação da gaze (mm). */
export const GAUZE_RADIUS = 16;
/** Sangue (ml/s) que a gaze absorve esfregando. */
export const GAUZE_ABSORB_RATE = 14;
/** Fração da absorção quando a gaze está parada (só apertando). */
export const GAUZE_STILL_FACTOR = 0.4;
/** Movimento mínimo (mm por passo) para contar como esfregar. */
export const GAUZE_RUB_MIN_MOVE = 0.4;
/** Fração da vazão que continua saindo com a gaze apertada em cima. */
export const GAUZE_PRESSURE_FACTOR = 0.3;
/** Vazão (ml/s) máxima que a pressão da gaze consegue estancar sozinha. */
export const GAUZE_STOP_MAX_RATE = 2;
/** Tempo (s) de pressão da gaze para estancar um sangramento pequeno. */
export const GAUZE_STOP_TIME = 1.5;

/** Raio de ação do aspirador (mm). */
export const SUCTION_RADIUS = 14;
/** Sangue (ml/s) que o aspirador puxa das poças. */
export const SUCTION_RATE = 35;

/** Distância (mm) do clique do cautério ao sangramento para estancar. */
export const CAUTERY_RADIUS = 9;
/** Poça (ml) acima da qual o cautério não enxerga o vaso (aspire antes). */
export const CAUTERY_MAX_POOL = 25;

// --- Sutura e ligadura ----------------------------------------------------------

/** Distância (mm) de cada marca de sutura até a linha da incisão. */
export const SUTURE_OFFSET = 9;
/** Distância (mm) do clique do porta-agulha à marca para acertar. */
export const STITCH_RADIUS = 7;
/** Abertura (meia-largura, mm) máxima da incisão para conseguir suturar. */
export const STITCH_MAX_OPEN = 2;
/** Distância (mm) do clique do porta-agulha a uma estrutura para ligar. */
export const LIGATE_RADIUS = 7;

// --- Órgãos e estruturas --------------------------------------------------------

/** Folga (mm) além do contorno do órgão para a pinça pegar. */
export const FORCEPS_GRAB_MARGIN = 4;
/** Distância (mm) do clique da tesoura a uma estrutura para cortar. */
export const SCISSORS_RADIUS = 6;
/** Órgão solto puxado além disso (mm) da posição original sai do corpo ao soltar. */
export const ORGAN_REMOVE_DISTANCE = 90;
/** Órgão puxado além disso (mm) da posição original é desenhado fora da cavidade. */
export const ORGAN_LIFT_DISTANCE = 20;

// --- Sinais vitais --------------------------------------------------------------

/** Perda (ml) que causa parada cardíaca. */
export const ARREST_BLOOD_LOSS = 1500;
/** Fração de ARREST_BLOOD_LOSS a partir da qual os vitais ficam em alerta / críticos. */
export const WARNING_LOSS_FRACTION = 0.33;
export const CRITICAL_LOSS_FRACTION = 0.66;
/** Frequência cardíaca (bpm) em repouso e quanto sobe até a perda de parada. */
export const HR_BASE = 76;
export const HR_RISE_AT_ARREST = 74;
/** Quanto a frequência sobe (bpm) por ml/s de sangramento ativo, até o teto. */
export const HR_PER_BLEED_RATE = 1.5;
export const HR_BLEED_RISE_MAX = 25;
/** Pressão (mmHg) sistólica/diastólica em repouso e queda até a perda de parada. */
export const SYSTOLIC_BASE = 120;
export const SYSTOLIC_DROP_AT_ARREST = 65;
export const DIASTOLIC_BASE = 80;
export const DIASTOLIC_DROP_AT_ARREST = 42;
/** Sistólica (mmHg) abaixo da qual os vitais contam como críticos. */
export const SYSTOLIC_CRITICAL = 80;
/** Constante de tempo (s) com que os vitais seguem o alvo. */
export const VITALS_TAU = 2.5;
/** Constante de tempo (s) com que os vitais caem a zero na parada. */
export const ARREST_TAU = 0.4;
/** Amostras guardadas do traçado de ECG (uma por passo: 4 s). */
export const ECG_SAMPLES = 240;

// --- Pontuação ------------------------------------------------------------------

/** Pesos da nota (somam 1). */
export const SCORE_WEIGHT_PRECISION = 0.5;
export const SCORE_WEIGHT_TIME = 0.25;
export const SCORE_WEIGHT_BLOOD = 0.25;
/** Tempo acima do de referência em que a parte de tempo chega a zero (múltiplo do de referência). */
export const TIME_ZERO_FACTOR = 3;
/** Perda (ml) até a qual a parte de sangue vale inteira. */
export const BLOOD_FREE_LOSS = 100;
/** Desconto na precisão por erro de instrumento. */
export const ERROR_PENALTY = {
  offGuide: 0.08,
  burn: 0.04,
  stitchMiss: 0.04,
  protectedCut: 0.25,
} as const;
/** Nota mínima para 3 e 2 estrelas. */
export const STARS_3_MIN = 85;
export const STARS_2_MIN = 60;
