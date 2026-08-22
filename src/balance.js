// Fórmulas de equilíbrio compartilhadas por todas as fases.
// Regra do jogo: ao vencer o boss de uma fase, o protagonista sobe de nível.
// Os inimigos da fase seguinte são balanceados para aquele mesmo nível,
// então cada fase nova só precisa declarar o nível esperado do jogador
// (normalmente = número da fase) e os valores base dos inimigos.

export const BASE_PLAYER_HP = 100;
export const HP_PER_LEVEL = 25;
export const BASE_ATTACK = 14;
export const ATTACK_PER_LEVEL = 4;

export function playerMaxHpForLevel(level) {
  return BASE_PLAYER_HP + (level - 1) * HP_PER_LEVEL;
}

export function playerAttackForLevel(level) {
  return BASE_ATTACK + (level - 1) * ATTACK_PER_LEVEL;
}

export function enemyHpForLevel(baseHp, level) {
  return Math.round(baseHp * (1 + (level - 1) * 0.35));
}

export function enemyAttackForLevel(baseAttack, level) {
  return Math.round(baseAttack * (1 + (level - 1) * 0.25));
}
