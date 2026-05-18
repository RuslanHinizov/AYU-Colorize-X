import { useEditorStore } from '../../store/editorStore'

// Reset the store to a known state before every test
const INITIAL_STATE = {
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
}

beforeEach(() => {
    useEditorStore.setState(INITIAL_STATE)
})

// ─────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────

describe('initial state', () => {
    it('selectedFile is null', () => {
        expect(useEditorStore.getState().selectedFile).toBeNull()
    })

    it('isProcessing is false', () => {
        expect(useEditorStore.getState().isProcessing).toBe(false)
    })

    it('progress is 0', () => {
        expect(useEditorStore.getState().progress).toBe(0)
    })

    it('model defaults to artistic', () => {
        expect(useEditorStore.getState().model).toBe('artistic')
    })

    it('device defaults to cpu', () => {
        expect(useEditorStore.getState().device).toBe('cpu')
    })

    it('renderFactor defaults to 35', () => {
        expect(useEditorStore.getState().renderFactor).toBe(35)
    })

    it('viewMode defaults to slider', () => {
        expect(useEditorStore.getState().viewMode).toBe('slider')
    })

    it('isFullscreen is false', () => {
        expect(useEditorStore.getState().isFullscreen).toBe(false)
    })
})

// ─────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────

describe('actions', () => {
    it('setSelectedFile updates selectedFile', () => {
        const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' })
        useEditorStore.getState().setSelectedFile(file)
        expect(useEditorStore.getState().selectedFile).toBe(file)
    })

    it('setPreview updates preview URL', () => {
        useEditorStore.getState().setPreview('blob:http://localhost/123')
        expect(useEditorStore.getState().preview).toBe('blob:http://localhost/123')
    })

    it('setResult updates result URL', () => {
        useEditorStore.getState().setResult('/media/output.jpg')
        expect(useEditorStore.getState().result).toBe('/media/output.jpg')
    })

    it('setJobId updates jobId', () => {
        useEditorStore.getState().setJobId('abc-123')
        expect(useEditorStore.getState().jobId).toBe('abc-123')
    })

    it('setIsProcessing toggles processing flag', () => {
        useEditorStore.getState().setIsProcessing(true)
        expect(useEditorStore.getState().isProcessing).toBe(true)
        useEditorStore.getState().setIsProcessing(false)
        expect(useEditorStore.getState().isProcessing).toBe(false)
    })

    it('setError updates error message', () => {
        useEditorStore.getState().setError('Something went wrong')
        expect(useEditorStore.getState().error).toBe('Something went wrong')
    })

    it('setProgress updates progress value', () => {
        useEditorStore.getState().setProgress(72)
        expect(useEditorStore.getState().progress).toBe(72)
    })

    it('setModel updates model', () => {
        useEditorStore.getState().setModel('stable')
        expect(useEditorStore.getState().model).toBe('stable')
    })

    it('setDevice updates device', () => {
        useEditorStore.getState().setDevice('cuda')
        expect(useEditorStore.getState().device).toBe('cuda')
    })

    it('setRenderFactor updates renderFactor', () => {
        useEditorStore.getState().setRenderFactor(20)
        expect(useEditorStore.getState().renderFactor).toBe(20)
    })

    it('setViewMode updates viewMode', () => {
        useEditorStore.getState().setViewMode('side-by-side')
        expect(useEditorStore.getState().viewMode).toBe('side-by-side')
    })

    it('setIsFullscreen toggles fullscreen', () => {
        useEditorStore.getState().setIsFullscreen(true)
        expect(useEditorStore.getState().isFullscreen).toBe(true)
    })
})

// ─────────────────────────────────────────────────────────────
// resetState
// ─────────────────────────────────────────────────────────────

describe('resetState', () => {
    it('clears selectedFile, preview, result, jobId', () => {
        useEditorStore.setState({
            selectedFile: new File([''], 'x.jpg'),
            preview: 'blob:http://localhost/abc',
            result: '/output.jpg',
            jobId: 'xyz',
        })
        useEditorStore.getState().resetState()
        const s = useEditorStore.getState()
        expect(s.selectedFile).toBeNull()
        expect(s.preview).toBeNull()
        expect(s.result).toBeNull()
        expect(s.jobId).toBeNull()
    })

    it('resets isProcessing, error, progress', () => {
        useEditorStore.setState({ isProcessing: true, error: 'oops', progress: 88 })
        useEditorStore.getState().resetState()
        const s = useEditorStore.getState()
        expect(s.isProcessing).toBe(false)
        expect(s.error).toBe('')
        expect(s.progress).toBe(0)
    })

    it('preserves model, device, renderFactor, viewMode, isFullscreen', () => {
        useEditorStore.setState({ model: 'stable', device: 'cuda', renderFactor: 20, viewMode: 'side-by-side', isFullscreen: true })
        useEditorStore.getState().resetState()
        const s = useEditorStore.getState()
        expect(s.model).toBe('stable')
        expect(s.device).toBe('cuda')
        expect(s.renderFactor).toBe(20)
        expect(s.viewMode).toBe('side-by-side')
        expect(s.isFullscreen).toBe(true)
    })
})
