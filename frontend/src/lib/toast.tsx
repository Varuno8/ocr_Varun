import { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const listeners = new Set<(messages: ToastMessage[]) => void>();
let messages: ToastMessage[] = [];

function notify() {
  for (const listener of listeners) {
    listener([...messages]);
  }
}

function push(type: ToastMessage['type'], message: string) {
  messages = [...messages, { id: Date.now() + Math.random(), type, message }];
  notify();
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
};

export function ToastContainer() {
  const [queue, setQueue] = useState<ToastMessage[]>(messages);

  useEffect(() => {
    const listener = (items: ToastMessage[]) => setQueue(items);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!queue.length) return;
    const timer = setTimeout(() => {
      messages = messages.slice(1);
      notify();
    }, 3000);
    return () => clearTimeout(timer);
  }, [queue]);

  if (!queue.length) return null;

  return (
    <div className="fixed right-4 top-4 z-50 space-y-2">
      {queue.map((item) => (
        <div
          key={item.id}
          className={`rounded border px-4 py-2 shadow ${
            item.type === 'error'
              ? 'border-error text-error bg-white'
              : item.type === 'success'
                ? 'border-success text-success bg-white'
                : 'border-primary text-primary bg-white'
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
