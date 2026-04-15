import { create } from 'zustand';

export const useEditorStore = create((set) => ({
    // State
    selectedFile: null,
    preview: null,
    result: null,
    jobId: null,
    isProcessing: false,
    error: '',
    progress: 0,
    model: 'artistic',
    device: 'cpu',
    renderFactor: 35,
    viewMode: 'slider',
    isFullscreen: false,

    // Actions
    setSelectedFile: (file) => set({ selectedFile: file }),
    setPreview: (url) => set({ preview: url }),
    setResult: (url) => set({ result: url }),
    setJobId: (id) => set({ jobId: id }),
    setIsProcessing: (isProcessing) => set({ isProcessing }),
    setError: (error) => set({ error }),
    setProgress: (progress) => set({ progress }),
    setModel: (model) => set({ model }),
    setDevice: (device) => set({ device }),
    setRenderFactor: (factor) => set({ renderFactor: factor }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setIsFullscreen: (isFullscreen) => set({ isFullscreen }),

    // Reset
    resetState: () => set({
        selectedFile: null,
        preview: null,
        result: null,
        jobId: null,
        isProcessing: false,
        error: '',
        progress: 0
    })
}));
