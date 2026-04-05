import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: [],
  
  setThreads: (threads) => set({ threads }),
  
  addThread: (thread) => set((state) => ({ 
    threads: [thread, ...state.threads] 
  })),
  
  setActiveThreadId: (id) => set({ activeThreadId: id }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  
  updateLastMessage: (delta) => set((state) => {
    const newMessages = [...state.messages];
    if (newMessages.length > 0) {
      newMessages[newMessages.length - 1].content += delta;
    }
    return { messages: newMessages };
  }),
  
  clearStore: () => set({ threads: [], activeThreadId: null, messages: [] })
}));

export default useChatStore;
