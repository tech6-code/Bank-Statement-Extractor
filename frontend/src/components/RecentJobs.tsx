import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobs, deleteJob, Job } from '../services/api';
import { History, FileText, CheckCircle2, Clock, AlertCircle, ChevronRight, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface RecentJobsProps {
    onSelectJob: (id: string | null) => void;
    selectedJobId: string | null;
}

const RecentJobs: React.FC<RecentJobsProps> = ({ onSelectJob, selectedJobId }) => {
    const queryClient = useQueryClient();
    const { data: jobs, isLoading } = useQuery({
        queryKey: ['jobs'],
        queryFn: getJobs,
        refetchInterval: 5000,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            if (selectedJobId) {
                // If the currently selected job was deleted, clear selection
                onSelectJob(null);
            }
        },
    });

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this extraction record?')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading && !jobs) {
        return <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-lg" />)}
        </div>;
    }

    if (!jobs || jobs.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                <p className="text-xs">No recent extraction jobs</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 pr-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {jobs.map((job) => (
                <div key={job.id} className="group relative">
                    <button
                        onClick={() => onSelectJob(job.id)}
                        className={cn(
                            "w-full flex flex-col gap-2 p-4 rounded-md border transition-all text-left",
                            selectedJobId === job.id
                                ? "bg-primary/[0.05] border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.05)]"
                                : "bg-transparent border-border/40 hover:bg-muted/10 hover:border-border/60"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className={cn(
                                    "w-4 h-4 shrink-0",
                                    job.status === 'completed' && "text-green-500",
                                    job.status === 'processing' && "text-blue-500",
                                    job.status === 'queued' && "text-yellow-500",
                                    job.status === 'failed' && "text-destructive",
                                )} />
                                <span className="text-[14px] font-bold truncate leading-snug text-foreground/90">
                                    {job.file_name}
                                </span>
                            </div>
                            <ChevronRight className={cn(
                                "w-3.5 h-3.5 text-muted-foreground/50 transition-transform shrink-0",
                                selectedJobId === job.id ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                            )} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest",
                                    job.status === 'completed' && "text-green-500",
                                    job.status === 'processing' && "text-blue-500",
                                    job.status === 'queued' && "text-yellow-500",
                                    job.status === 'failed' && "text-destructive",
                                )}>
                                    {job.status}
                                </span>
                                {job.status === 'completed' && (
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                        • {job.transaction_count} items
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase">
                                {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={(e) => handleDelete(e, job.id)}
                        disabled={deleteMutation.isPending}
                        className="absolute -right-1.5 -top-1.5 p-1 bg-background border border-border/40 rounded text-muted-foreground hover:text-destructive hover:border-destructive/40 opacity-0 group-hover:opacity-100 transition-all z-10 scale-90 hover:scale-100"
                        title="Delete record"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default RecentJobs;
