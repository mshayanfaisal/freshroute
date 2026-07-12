import { create } from 'zustand';

export interface Notice {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'warn' | 'error';
}

interface NoticeState {
  notices: Notice[];
  push: (text: string, tone?: Notice['tone']) => void;
  dismiss: (id: number) => void;
}

let seq = 1;

/** Transient toast notifications, fed by both HTTP results and WebSocket events. */
export const useNotifications = create<NoticeState>((set) => ({
  notices: [],
  push: (text, tone = 'info') => {
    const id = seq++;
    set((s) => ({ notices: [...s.notices, { id, text, tone }] }));
    setTimeout(() => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })), 6000);
  },
  dismiss: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
}));
