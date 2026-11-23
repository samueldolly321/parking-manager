/** On-screen messages (bottom-right of the screen), replacing the browser's alert(). */
export type NoticeKind = 'error' | 'success' | 'info';

export interface Notice {
  id: number;
  kind: NoticeKind;
  message: string;
}

type Listener = (notices: Notice[]) => void;

let notices: Notice[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l(notices));

export function dismissNotice(id: number) {
  notices = notices.filter((n) => n.id !== id);
  emit();
}

export function notify(message: string, kind: NoticeKind = 'info') {
  // The same message twice in a row is shown once
  if (notices.some((n) => n.message === message && n.kind === kind)) return;
  const notice = { id: nextId++, kind, message };
  notices = [...notices, notice].slice(-4);
  emit();
  setTimeout(() => dismissNotice(notice.id), kind === 'error' ? 8000 : 4000);
}

/** For buttons whose feature is not built yet: say so honestly instead of pretending it worked. */
export function notifyNotAvailable(feature: string) {
  notify(`${feature} : fonction pas encore disponible.`, 'info');
}

export function subscribeNotices(listener: Listener): () => void {
  listeners.add(listener);
  listener(notices);
  return () => listeners.delete(listener);
}
