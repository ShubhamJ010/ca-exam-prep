export type Tier = 'easy' | 'medium' | 'hard';

export interface QuizState {
  tier: Tier;
  nextTier: Tier;
  easyStreak: number;
  hardCharge: number;
  mediumStrikes: number;
  mediumLocked: boolean;
  redemptionStreak: number;
  correct: number;
  answered: number;
}

export const TARGET = {
  easyStreak: 3,
  hardCharge: 2,
  mediumStrikes: 2,
  redemptionStreak: 4,
} as const;

export function createState(): QuizState {
  return {
    tier: 'easy',
    nextTier: 'easy',
    easyStreak: 0,
    hardCharge: 0,
    mediumStrikes: 0,
    mediumLocked: false,
    redemptionStreak: 0,
    correct: 0,
    answered: 0,
  };
}

/**
 * 3E -> 1M -> 2M -> 1H
 * Easy: 3 straight corrects queue one medium. While medium is locked, 4 straight
 * corrects reopen it. A miss resets both counters and serves another easy.
 * Medium: 2 corrects queue one hard, otherwise return to easy. 2 strikes lock
 * medium and return to easy.
 * Hard: single-round sudden death, always back to easy with the charge cleared.
 */
export function applyAnswer(prev: QuizState, correct: boolean): QuizState {
  const s: QuizState = {
    ...prev,
    answered: prev.answered + 1,
    correct: prev.correct + (correct ? 1 : 0),
  };

  if (prev.tier === 'easy') {
    if (correct) {
      if (!s.mediumLocked) {
        s.easyStreak = prev.easyStreak + 1;
        if (s.easyStreak >= TARGET.easyStreak) {
          s.easyStreak = 0;
          s.nextTier = 'medium';
        } else {
          s.nextTier = 'easy';
        }
      } else {
        s.redemptionStreak = prev.redemptionStreak + 1;
        if (s.redemptionStreak >= TARGET.redemptionStreak) {
          s.mediumLocked = false;
          s.mediumStrikes = 0;
          s.redemptionStreak = 0;
        }
        s.nextTier = 'easy';
      }
    } else {
      s.easyStreak = 0;
      s.redemptionStreak = 0;
      s.nextTier = 'easy';
    }
    return s;
  }

  if (prev.tier === 'medium') {
    if (correct) {
      s.hardCharge = prev.hardCharge + 1;
      if (s.hardCharge >= TARGET.hardCharge) {
        s.hardCharge = 0;
        s.nextTier = 'hard';
      } else {
        s.nextTier = 'easy';
      }
    } else {
      s.mediumStrikes = prev.mediumStrikes + 1;
      s.hardCharge = 0;
      if (s.mediumStrikes >= TARGET.mediumStrikes) {
        s.mediumLocked = true;
        s.redemptionStreak = 0;
      }
      s.nextTier = 'easy';
    }
    return s;
  }

  s.hardCharge = 0;
  s.nextTier = 'easy';
  return s;
}
