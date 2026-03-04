import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFiles } from '../services/api';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FileUploaderProps {
    onUploadSuccess?: (jobIds: string[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess }) => {
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const uploadMutation = useMutation({
        mutationFn: uploadFiles,
        onSuccess: (data) => {
            setFiles([]);
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            if (onUploadSuccess && data.files) {
                onUploadSuccess(data.files.map((f: any) => f.job_id));
            }
        },
    });

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
            // Reset the input value so the same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            // Reset mutation state when new files are added
            if (uploadMutation.isSuccess || uploadMutation.isError) {
                uploadMutation.reset();
            }
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = () => {
        if (files.length > 0) {
            uploadMutation.mutate(files);
        }
    };

    return (
        <div className="space-y-4">
            <div
                className={cn(
                    "border border-border/40 rounded-md p-6 bg-muted/10 transition-colors text-center cursor-pointer hover:bg-muted/20 hover:border-border/60",
                    files.length > 0 && "bg-primary/5 border-primary/30"
                )}
                onClick={() => {
                    if (uploadMutation.isSuccess || uploadMutation.isError) {
                        uploadMutation.reset();
                    }
                    fileInputRef.current?.click();
                }}
            >
                <input
                    id="file-upload"
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".pdf"
                    className="hidden"
                    onChange={onFileChange}
                />
                <Upload className="w-8 h-8 text-primary/60 mx-auto mb-3" />
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Click to upload or drag</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-tight">PDF bank statements only</p>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/10 border border-border/40 rounded-md">
                            <div className="flex items-center gap-3">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-medium truncate max-w-[180px]">{file.name}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                className="p-1 hover:bg-muted/30 rounded transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={handleUpload}
                        disabled={uploadMutation.isPending}
                        className="w-full mt-2 bg-primary text-primary-foreground py-2 rounded-md text-xs font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {uploadMutation.isPending ? (
                            <>
                                <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Start Extraction'
                        )}
                    </button>
                </div>
            )}

            {uploadMutation.isSuccess && (
                <div className="flex items-center gap-2 text-green-500 text-sm mt-2 px-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Upload successful! Processing started.</span>
                </div>
            )}

            {uploadMutation.isError && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2 px-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Upload failed. Please try again.</span>
                </div>
            )}
        </div>
    );
};

export default FileUploader;
