type Listener = (count: number) => void;

let count = 0;
const listeners = new Set<Listener>();

export function increment() {
  count += 1;
  listeners.forEach((l) => l(count));
}

export function decrement() {
  count = Math.max(0, count - 1);
  listeners.forEach((l) => l(count));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCount(): number {
  return count;
}
