const WORD_SELECTOR = '[data-word-card]';
const TAP_MOVE_TOLERANCE = 12;

interface ActiveWordTouch {
  element: HTMLElement;
  identifier: number;
  startX: number;
  startY: number;
}

let activeWordTouch: ActiveWordTouch | null = null;

const closestWordElement = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>(WORD_SELECTOR);
};

const findTrackedTouch = (touches: TouchList, identifier: number): Touch | null => {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index);
    if (touch?.identifier === identifier) return touch;
  }
  return null;
};

const movedTooFar = (touch: Touch, active: ActiveWordTouch) => {
  return Math.hypot(touch.clientX - active.startX, touch.clientY - active.startY) > TAP_MOVE_TOLERANCE;
};

const installRegisteredWordTouchFix = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!('ontouchstart' in window) && navigator.maxTouchPoints <= 0) return;

  document.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) {
      activeWordTouch = null;
      return;
    }

    const element = closestWordElement(event.target);
    const touch = event.touches.item(0);
    if (!element || !touch) {
      activeWordTouch = null;
      return;
    }

    activeWordTouch = {
      element,
      identifier: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
    };
  }, { capture: true, passive: true });

  document.addEventListener('touchmove', (event) => {
    if (!activeWordTouch) return;
    const touch = findTrackedTouch(event.touches, activeWordTouch.identifier);
    if (!touch || movedTooFar(touch, activeWordTouch)) activeWordTouch = null;
  }, { capture: true, passive: true });

  document.addEventListener('touchcancel', () => {
    activeWordTouch = null;
  }, { capture: true, passive: true });

  document.addEventListener('touchend', (event) => {
    const active = activeWordTouch;
    activeWordTouch = null;
    if (!active) return;

    const touch = findTrackedTouch(event.changedTouches, active.identifier);
    const endTarget = closestWordElement(event.target);
    if (!touch || endTarget !== active.element || movedTooFar(touch, active)) return;

    if (event.cancelable) event.preventDefault();
    window.getSelection()?.removeAllRanges();

    requestAnimationFrame(() => {
      if (active.element.isConnected) active.element.click();
    });
  }, { capture: true, passive: false });
};

installRegisteredWordTouchFix();
