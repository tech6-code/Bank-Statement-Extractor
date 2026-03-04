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
        <div className="space-y-6 w-full min-w-0 overflow-hidden text-foreground">
            {/* Job Header Info */}
            <div className="bg-card border border-border/40 rounded-md p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">{job.file_name}</h2>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                                job.status === 'completed' ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                                    job.status === 'processing' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                                        job.status === 'queued' ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                                            "bg-destructive/10 text-destructive border border-destructive/20"
                            )}>
                                {job.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={<FileDigit className="w-3.5 h-3.5" />}
                        label="Transactions"
                        value={job?.transaction_count || 0}
                    />
                    <StatCard
                        icon={<Hash className="w-3.5 h-3.5" />}
                        label="Duplicates"
                        value={job?.duplicate_count || 0}
                        isWarning={job?.duplicate_count > 0}
                    />
                    <StatCard
                        icon={<AlertCircle className="w-3.5 h-3.5" />}
                        label="Errors"
                        value={job?.reconciliation_errors_count || 0}
                        isDestructive={job?.reconciliation_errors_count > 0}
                    />
                    <StatCard
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        label="Confidence"
                        value={`${job?.confidence || 0}%`}
                        isLowConfidence={job?.low_confidence}
                    />
                </div>

                {/* Status-specific messaging/progress */}
                {job?.status === 'queued' && (
                    <div className="mt-6 p-4 bg-muted/10 border border-border/40 rounded-md flex items-center gap-4">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold uppercase tracking-wide">Waiting in queue</p>
                            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-tight">Processing will start shortly</p>
                        </div>
                    </div>
                )}

                {/* Progress Bar (Visible during processing) */}
                {job?.status === 'processing' && (
                    <div className="mt-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Processing with Gemini AI</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                <span>Progress</span>
                                <span>{job.total_pages > 0 ? Math.round((job.processed_pages / job.total_pages) * 100) : 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-1000"
                                    style={{ width: `${job.total_pages > 0 ? Math.round((job.processed_pages / job.total_pages) * 100) : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Statement Metadata */}
            {job?.status === 'completed' && job.header_info && Object.keys(job.header_info).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatementInfoCard headerInfo={job.header_info} />
                </div>
            )}

            {/* Transactions Table */}
            {job?.status === 'completed' && job.transactions && (
                <div className="bg-card border border-border/40 rounded-md p-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80 mb-4 px-2">Transactions</h3>
                    <TransactionsTable
                        transactions={job.transactions}
                        fileName={job.file_name}
                    />
                </div>
            )}

            {job?.status === 'failed' && (
                <div className="bg-destructive/5 border border-destructive/30 rounded-md p-8 text-center">
                    <AlertCircle className="w-10 h-10 text-destructive/60 mx-auto mb-4" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-destructive/80 mb-2">Extraction Failed</h3>
                    <p className="text-xs text-muted-foreground/60 font-medium">
                        {job.error_message || 'An unexpected error occurred while processing.'}
                    </p>
                </div>
            )}
        </div>
    );
};

const StatementInfoCard = ({ headerInfo }: { headerInfo: any }) => {
    if (!headerInfo) return null;

    const items = [
        { label: 'Account', value: headerInfo.account_number },
        { label: 'IBAN', value: headerInfo.iban },
        { label: 'Currency', value: headerInfo.currency || 'AED' },
        { label: 'Period', value: headerInfo.period },
        { label: 'Branch', value: headerInfo.branch },
        { label: 'Opening Balance', value: headerInfo.opening_balance ? `${headerInfo.currency || 'AED'} ${headerInfo.opening_balance.toLocaleString()}` : null },
        { label: 'Closing Balance', value: headerInfo.closing_balance ? `${headerInfo.currency || 'AED'} ${headerInfo.closing_balance.toLocaleString()}` : null },
    ].filter(i => i.value);

    if (items.length === 0) return null;

    return (
        <div className="col-span-full md:col-span-2 lg:col-span-3 bg-card border border-border/40 rounded-md p-6">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Statement Details</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {items.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{item.label}</p>
                        <p className="text-[14px] font-bold truncate leading-none tracking-tight text-foreground/90" title={item.value as string}>{item.value}</p>
                    </div>
                ))}
            </div>
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
    <div className="p-5 bg-muted/5 border border-border/40 rounded-md space-y-4">
        <div className="flex items-center gap-2.5 text-muted-foreground/80">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-widest truncate">{label}</span>
        </div>
        <div className={cn(
            "text-2xl font-bold tracking-tighter",
            isWarning && "text-yellow-500",
            isDestructive && "text-destructive",
            isLowConfidence && "text-orange-500",
            !isWarning && !isDestructive && !isLowConfidence && "text-foreground"
        )}>
            {value}
        </div>
    </div>
);

export default Dashboard;
