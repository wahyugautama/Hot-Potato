export const isDashReady = (now: number, cooldownUntil: number): boolean => now >= cooldownUntil;

export const isTransferEligible = (
  phase: string,
  holderAlive: boolean,
  recipientAlive: boolean,
  recipientProtectedUntil: number,
  now: number,
  contactConsumed: boolean,
): boolean => phase === 'playing' && holderAlive && recipientAlive && now >= recipientProtectedUntil && !contactConsumed;

export const shouldStartNextRound = (phase: string, now: number, transitionAt: number): boolean => phase === 'intermission' && now >= transitionAt;
