import { useCallback, useEffect, useRef } from 'react';
import { API_URL, useAuth } from '../context/AuthContext';
import axios from '../lib/axios';
import { useEditorStore } from '../store/editorStore';
import { wsManager } from '../lib/websocket';

function buildResultUrl(outputPath) {
    return `${API_URL}/${outputPath.replace(/\\/g, '/')}`;
}

function startBlobDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

export function useJobProcessing({ jobType, getParams, downloadName, onLimitExceeded }) {
    const { refreshUser } = useAuth();
    const {
        selectedFile,
        setResult,
        jobId,
        setJobId,
        setIsProcessing,
        setError,
        setProgress,
    } = useEditorStore();

    const cleanupRef = useRef(() => {});

    const cleanupWatchers = useCallback(() => {
        cleanupRef.current();
        cleanupRef.current = () => {};
    }, []);

    useEffect(() => cleanupWatchers, [cleanupWatchers]);

    const finishJob = useCallback((job) => {
        cleanupWatchers();
        if (job.output_path) {
            setResult(buildResultUrl(job.output_path));
        }
        setJobId(job.id);
        setProgress(100);
        setIsProcessing(false);
        refreshUser();
    }, [cleanupWatchers, refreshUser, setIsProcessing, setJobId, setProgress, setResult]);

    const failJob = useCallback((message) => {
        cleanupWatchers();
        setError(message || 'Islem basarisiz');
        setIsProcessing(false);
    }, [cleanupWatchers, setError, setIsProcessing]);

    const watchJob = useCallback((id) => {
        cleanupWatchers();

        const intervalId = window.setInterval(async () => {
            try {
                const response = await axios.get(`/jobs/${id}`);
                const job = response.data;
                if (job.progress !== undefined && job.progress !== null) {
                    setProgress(job.progress);
                }
                if (job.status === 'COMPLETED') {
                    finishJob(job);
                } else if (job.status === 'FAILED') {
                    failJob(job.error_message || 'Islem basarisiz');
                }
            } catch {
                failJob('Durum kontrolu basarisiz');
            }
        }, 2000);

        let unsubscribe = () => {};
        if (wsManager.isConnected()) {
            unsubscribe = wsManager.watchJob(
                id,
                (progress) => setProgress(progress),
                (outputPath, processingTime) => finishJob({ id, output_path: outputPath, processing_time: processingTime }),
                (error) => failJob(error || 'Islem basarisiz'),
            );
        }

        cleanupRef.current = () => {
            window.clearInterval(intervalId);
            unsubscribe();
        };
    }, [cleanupWatchers, failJob, finishJob, setProgress]);

    const processJob = useCallback(async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setError('');
        setProgress(0);
        cleanupWatchers();

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const params = new URLSearchParams({ type: jobType, ...(getParams?.() || {}) });
            const response = await axios.post(`/jobs/process?${params.toString()}`, formData);
            const job = response.data;

            if (job.status === 'COMPLETED') {
                finishJob(job);
            } else if (job.status === 'FAILED') {
                failJob(job.error_message || 'Islem basarisiz');
            } else {
                setJobId(job.id);
                watchJob(job.id);
            }
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (onLimitExceeded?.(detail)) {
                setIsProcessing(false);
                return;
            }
            setError(typeof detail === 'string' ? detail : 'Islem basarisiz');
            setIsProcessing(false);
        }
    }, [
        cleanupWatchers,
        failJob,
        finishJob,
        getParams,
        jobType,
        onLimitExceeded,
        selectedFile,
        setError,
        setIsProcessing,
        setJobId,
        setProgress,
        watchJob,
    ]);

    const downloadJob = useCallback(async () => {
        if (!jobId) return;
        const response = await axios.get(`/jobs/${jobId}/download`, { responseType: 'blob' });
        startBlobDownload(new Blob([response.data]), downloadName?.(jobId) || `processed_${jobId}`);
    }, [downloadName, jobId]);

    return { processJob, downloadJob };
}
