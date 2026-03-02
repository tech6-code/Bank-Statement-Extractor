import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJobStatus, Job } from '../services/api';
import TransactionsTable from './TransactionsTable';
import { RefreshCw, CheckCircle2, Loader2, AlertCircle, FileDigit, Hash, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface DashboardProps {
    onSelectJob: (id: string) => void;
    selectedJobId: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectJob, selectedJobId }) => {
    const [pollInterval, setPollInterval] = useState<number | false>(2000);

    const { data: job, isLoading, error, refetch } = useQuery({
        queryKey: ['job', selectedJobId],
        queryFn: () => getJobStatus(selectedJobId!),
        enabled: !!selectedJobId,
        refetchInterval: pollInterval,
    });

    useEffect(() => {
        if (job?.status === 'completed' || job?.status === 'failed') {
            setPollInterval(false);
        } else if (selectedJobId) {
            setPollInterval(2000);
        }
    }, [job?.status, selectedJobId]);

    if (!selectedJobId) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-dashed border-border/50 rounded-xl bg-card/10">
                <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Job Selected</h3>
                <p className="text-muted-foreground max-w-sm">
                    Select a job from your history or upload new bank statements to start the extraction process.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span>Error loading job status. Please try again.</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Job Header Info */}
            <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">{job?.file_name}</h2>
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                                job?.status === 'completed' && "bg-green-500/10 text-green-500",
                                job?.status === 'processing' && "bg-blue-500/10 text-blue-500",
                                job?.status === 'queued' && "bg-yellow-500/10 text-yellow-500",
                                job?.status === 'failed' && "bg-destructive/10 text-destructive",
                            )}>
                                {job?.status}
                            </span>
                            <span className="text-sm text-muted-foreground italic">
                                ID: {selectedJobId.substring(0, 8)}...
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="p-2 hover:bg-muted rounded-lg transition-all active:scale-95"
                    >
                        <RefreshCw className={cn("w-5 h-5", job?.status === 'processing' && "animate-spin")} />
                    </button>
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={<FileDigit className="w-4 h-4" />}
                        label="Transactions"
                        value={job?.transaction_count || 0}
                    />
                    <StatCard
                        icon={<Hash className="w-4 h-4" />}
                        label="Duplicates"
                        value={job?.duplicate_count || 0}
                        isWarning={job?.duplicate_count > 0}
                    />
                    <StatCard
                        icon={<AlertCircle className="w-4 h-4" />}
                        label="Reconcile Errors"
                        value={job?.reconciliation_errors_count || 0}
                        isDestructive={job?.reconciliation_errors_count > 0}
                    />
                    <StatCard
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        label="Confidence"
                        value={`${job?.confidence || 0}%`}
                        isLowConfidence={job?.low_confidence}
                    />
                </div>

                {/* Progress Bar (Visible during processing) */}
                {job?.status === 'processing' && (
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-xs font-medium uppercase tracking-tight text-muted-foreground">
                            <span>Extracting Pages</span>
                            <span>{Math.round((job.processed_pages / job.total_pages) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-out"
                                style={{ width: `${Math.round((job.processed_pages / job.total_pages) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Transactions Table */}
            {job?.status === 'completed' && job.transactions && (
                <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                    <TransactionsTable transactions={job.transactions} />
                </div>
            )}

            {job?.status === 'failed' && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-destructive mb-2">Extraction Failed</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        {job.error_message || 'An unexpected error occurred while processing the statement.'}
                    </p>
                </div>
            )}
        </div>
    );
};

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    isWarning?: boolean;
    isDestructive?: boolean;
    isLowConfidence?: boolean;
}

const StatCard = ({ icon, label, value, isWarning, isDestructive, isLowConfidence }: StatCardProps) => (
    <div className="p-4 bg-muted/20 border border-border/40 rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-xs font-medium uppercase truncate">{label}</span>
        </div>
        <div className={cn(
            "text-2xl font-bold font-mono tracking-tighter",
            isWarning && "text-yellow-500",
            isDestructive && "text-destructive",
            isLowConfidence && "text-orange-500"
        )}>
            {value}
        </div>
    </div>
);

export default Dashboard;
