import type { Vector2Like } from '../../types/game';

export class VirtualJoystick {
  private direction: Vector2Like = { x: 0, y: 0 };
  private pointerId: number | null = null;
  private readonly maxDistance = 42;

  public constructor(private readonly root: HTMLElement, private readonly ring: HTMLElement, private readonly knob: HTMLElement) {
    root.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
    window.addEventListener('pointermove', this.handlePointerMove, { passive: false });
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    window.addEventListener('blur', this.reset);
  }

  public getDirection(): Vector2Like { return { ...this.direction }; }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.pointerId !== null) return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    const zoneRect = this.root.getBoundingClientRect();
    const x = Math.max(48, Math.min(zoneRect.width - 48, event.clientX - zoneRect.left));
    const y = Math.max(48, Math.min(zoneRect.height - 48, event.clientY - zoneRect.top));
    this.ring.style.left = `${x}px`; this.ring.style.top = `${y}px`; this.ring.classList.add('is-active');
    this.root.setPointerCapture?.(event.pointerId);
    this.updateFromEvent(event);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault();
    this.updateFromEvent(event);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.direction = { x: 0, y: 0 };
    this.knob.style.transform = 'translate3d(0, 0, 0)';
    this.ring.classList.remove('is-active');
  };

  private updateFromEvent(event: PointerEvent): void {
    const rect = this.ring.getBoundingClientRect();
    const offset = { x: event.clientX - (rect.left + rect.width / 2), y: event.clientY - (rect.top + rect.height / 2) };
    const length = Math.hypot(offset.x, offset.y);
    const scale = length > this.maxDistance ? this.maxDistance / length : 1;
    const x = offset.x * scale; const y = offset.y * scale;
    this.direction = length < 6 ? { x: 0, y: 0 } : { x: x / this.maxDistance, y: y / this.maxDistance };
    this.knob.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  private readonly reset = (): void => {
    this.pointerId = null; this.direction = { x: 0, y: 0 };
    this.knob.style.transform = 'translate3d(0, 0, 0)'; this.ring.classList.remove('is-active');
  };

  public destroy(): void {
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    window.removeEventListener('blur', this.reset);
  }
}
