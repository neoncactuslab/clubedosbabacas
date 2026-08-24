// Ordem das fases do jogo. Pra adicionar uma fase nova: criar o arquivo em
// src/levels/, importar aqui e colocar na posição certa da lista.
import * as vilaRosa from './vilaRosa.js';
import * as rechan from './rechan.js';
import * as agropecuaria from './agropecuaria.js';
import * as peruibe from './peruibe.js';

export var LEVELS = [vilaRosa, rechan, agropecuaria, peruibe];
