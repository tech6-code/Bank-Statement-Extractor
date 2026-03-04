import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const uploadFiles = async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append('files', file);
    });
    const { data } = await api.post('/extract-bank-statements', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return data;
};

export const getJobStatus = async (jobId: string) => {
    const { data } = await api.get(`/extract/${jobId}`);
    return data;
};

export const getJobs = async () => {
    const { data } = await api.get('/jobs');
    return (data?.jobs || []) as Job[];
};

export const deleteJob = async (jobId: string) => {
    const { data } = await api.delete(`/extract/${jobId}`);
    return data;
};

export interface Job {
    id: string;
    file_name: string;
    total_pages: number;
    processed_pages: number;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    transaction_count: number;
    duplicate_count: number;
    reconciliation_errors_count: number;
    confidence: number;
    low_confidence: boolean;
    created_at: string;
    updated_at: string;
    header_info?: any;
    error_message?: string;
    transactions?: Transaction[];
}

export interface Transaction {
    id: number;
    transaction_date: string;
    description: string;
    debit: number | null;
    credit: number | null;
    balance: number | null;
    reconciliation_status: 'valid' | 'mismatch' | 'corrected';
    validation_error?: string;
}
