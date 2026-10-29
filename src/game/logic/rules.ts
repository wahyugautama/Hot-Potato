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

/**
 * Physics solvers separate two circular bodies to their exact combined radius.
 * A small contact tolerance makes that resting contact count without allowing a
 * visibly separated pass.
 */
export const areCirclesTouching = (
  ax: number, ay: number, bx: number, by: number, combinedRadius: number, tolerance = 4,
): boolean => Math.hypot(ax - bx, ay - by) <= combinedRadius + tolerance;
