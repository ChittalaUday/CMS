import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type EditorPrefsStore = {
  aiEnabled: boolean;
  toggleAI: () => void;
  setAIEnabled: (enabled: boolean) => void;
};

export const useEditorPrefsStore = create<EditorPrefsStore>()(
  persist(
    (set) => ({
      aiEnabled: true,
      toggleAI: () => set((s) => ({ aiEnabled: !s.aiEnabled })),
      setAIEnabled: (enabled) => set({ aiEnabled: enabled }),
    }),
    { name: 'editor-prefs' }
  )
);
