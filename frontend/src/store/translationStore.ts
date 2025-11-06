import { create } from 'zustand';
import type { Translation, PDFMetadata, TextBlock } from '../types';

interface TranslationStore {
  pdfFile: File | null;
  pdfMetadata: PDFMetadata | null;
  translations: Map<string, Translation>;
  textBlocks: Map<number, TextBlock[]>; // pageNum -> blocks
  isTranslating: boolean;
  currentPage: number;
  showTranslations: boolean;
  
  setPdfFile: (file: File | null) => void;
  setPdfMetadata: (metadata: PDFMetadata | null) => void;
  addTranslation: (key: string, translation: Translation) => void;
  getTranslation: (key: string) => Translation | undefined;
  setTextBlocks: (pageNum: number, blocks: TextBlock[]) => void;
  getTextBlocks: (pageNum: number) => TextBlock[];
  setIsTranslating: (isTranslating: boolean) => void;
  setCurrentPage: (page: number) => void;
  setShowTranslations: (show: boolean) => void;
  reset: () => void;
}

export const useTranslationStore = create<TranslationStore>((set, get) => ({
  pdfFile: null,
  pdfMetadata: null,
  translations: new Map(),
  textBlocks: new Map(),
  isTranslating: false,
  currentPage: 1,
  showTranslations: true,
  
  setPdfFile: (file) => set({ pdfFile: file }),
  
  setPdfMetadata: (metadata) => set({ pdfMetadata: metadata }),
  
  addTranslation: (key, translation) => {
    const translations = new Map(get().translations);
    translations.set(key, translation);
    set({ translations });
  },
  
  getTranslation: (key) => {
    return get().translations.get(key);
  },
  
  setTextBlocks: (pageNum, blocks) => {
    const textBlocks = new Map(get().textBlocks);
    textBlocks.set(pageNum, blocks);
    set({ textBlocks });
  },
  
  getTextBlocks: (pageNum) => {
    return get().textBlocks.get(pageNum) || [];
  },
  
  setIsTranslating: (isTranslating) => set({ isTranslating }),
  
  setCurrentPage: (page) => set({ currentPage: page }),
  
  setShowTranslations: (show) => set({ showTranslations: show }),
  
  reset: () => set({
    pdfFile: null,
    pdfMetadata: null,
    translations: new Map(),
    textBlocks: new Map(),
    isTranslating: false,
    currentPage: 1,
    showTranslations: true,
  }),
}));

