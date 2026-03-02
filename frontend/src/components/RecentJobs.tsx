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
        <div className="space-y-3 pr-1">
            {jobs.map((job) => (
                <div key={job.id} className="group relative">
                    <button
                        onClick={() => onSelectJob(job.id)}
                        className={cn(
                            "w-full flex flex-col gap-2 p-4 rounded-xl border transition-all text-left",
                            selectedJobId === job.id
                                ? "bg-primary/10 border-primary shadow-md ring-1 ring-primary/20"
                                : "bg-card/50 border-border/40 hover:bg-muted/50 hover:border-border"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={cn(
                                    "p-1.5 rounded-lg shrink-0",
                                    job.status === 'completed' && "bg-green-500/10 text-green-500",
                                    job.status === 'processing' && "bg-blue-500/10 text-blue-500",
                                    job.status === 'queued' && "bg-yellow-500/10 text-yellow-500",
                                    job.status === 'failed' && "bg-destructive/10 text-destructive",
                                )}>
                                    <FileText className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold truncate leading-none">
                                    {job.file_name}
                                </span>
                            </div>
                            <ChevronRight className={cn(
                                "w-4 h-4 text-muted-foreground/50 transition-transform shrink-0",
                                selectedJobId === job.id ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                            )} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    job.status === 'completed' && "bg-green-500/20 text-green-400",
                                    job.status === 'processing' && "bg-blue-500/20 text-blue-400 animate-pulse",
                                    job.status === 'queued' && "bg-yellow-500/20 text-yellow-400",
                                    job.status === 'failed' && "bg-destructive/20 text-destructive",
                                )}>
                                    {job.status}
                                </span>
                                {job.status === 'completed' && (
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                        {job.transaction_count} items
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={(e) => handleDelete(e, job.id)}
                        disabled={deleteMutation.isPending}
                        className="absolute -right-2 -top-2 p-1.5 bg-background border border-border/50 rounded-full text-muted-foreground hover:text-destructive hover:border-destructive/50 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10 scale-90 hover:scale-100"
                        title="Delete record"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default RecentJobs;
