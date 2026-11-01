/**
 * setInterval that respects window visibility.
 * - `hiddenMs` undefined: ticks are skipped while hidden, one tick fires on return.
 * - `hiddenMs` set: keeps running at that slower cadence while hidden.
 */
export function setVisibleInterval(
  fn: () => void | Promise<void>,
  visibleMs: number,
  opts: { hiddenMs?: number; immediate?: boolean } = {},
): () => void {
  let timer: number | undefined;
  let running = false;
  let stopped = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch {
      // callers handle their own errors
    } finally {
      running = false;
    }
  };

  const schedule = () => {
    if (stopped) return;
    const hidden = document.hidden;
    if (hidden && opts.hiddenMs === undefined) return;
    const ms = hidden ? (opts.hiddenMs as number) : visibleMs;
    timer = window.setTimeout(async () => {
      await tick();
      schedule();
    }, ms);
  };

  const onVisibility = () => {
    window.clearTimeout(timer);
    if (!document.hidden) void tick();
    schedule();
  };

  document.addEventListener("visibilitychange", onVisibility);
  if (opts.immediate) void tick();
  schedule();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
