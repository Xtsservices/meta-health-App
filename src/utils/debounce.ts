
export const DEBOUNCE_DELAY = 800;

type AnyFn = (...args: any[]) => any;

export type Debounced<T extends AnyFn> = ((...args: Parameters<T>) => void) & {
  cancel: () => void;
  flush: () => void;
};

export function debounce<T extends AnyFn>(
  fn: T,
  delay = DEBOUNCE_DELAY,
  opts: { leading?: boolean; trailing?: boolean } = { leading: false, trailing: true }
): Debounced<T> {
  let timer: any = null;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;
  let invoked = false;

  const leading = !!opts.leading;
  const trailing = opts.trailing !== false;

  const invoke = () => {
    if (!lastArgs) return;
    fn.apply(lastThis, lastArgs);
    lastArgs = lastThis = null;
    invoked = true;
  };

  const debounced = function (this: any, ...args: any[]) {
    lastArgs = args;
    lastThis = this;

    if (timer) clearTimeout(timer);

    if (leading && !invoked && !timer) {
      invoke();
    }

    timer = setTimeout(() => {
      timer = null;
      if (trailing && (!leading || invoked)) {
        invoke();
      }
      invoked = false;
    }, delay);
  } as Debounced<T>;

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = lastThis = null;
    invoked = false;
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) invoke();
      invoked = false;
    }
  };

  return debounced;
}
