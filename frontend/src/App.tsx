import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import FileUploader from './components/FileUploader';
import RecentJobs from './components/RecentJobs';
import { Layout, FileText, BarChart3, Receipt, History } from 'lucide-react';

function App() {
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            {/* Header */}
            <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-[1440px]">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 border border-primary/20 rounded">
                            <Receipt className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">BankExtract AI</h1>
                    </div>
                    <nav className="flex items-center gap-8">
                        <button className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors">Documentation</button>
                        <button className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors">Support</button>
                    </nav>
                </div>
            </header>

            <main className="container mx-auto px-6 py-10 max-w-[1440px]">
                <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                    {/* Left Column: Upload & History */}
                    <div className="space-y-6">
                        <div className="bg-card border border-border/40 rounded-md p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText className="w-4 h-4 text-primary" />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Upload Statements</h2>
                            </div>
                            <FileUploader onUploadSuccess={(jobIds) => setActiveJobId(jobIds[0])} />
                        </div>

                        <div className="bg-card border border-border/40 rounded-md p-5 overflow-hidden flex flex-col max-h-[500px]">
                            <div className="flex items-center gap-2 mb-4 shrink-0">
                                <History className="w-4 h-4 text-primary" />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Recent Extractions</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <RecentJobs onSelectJob={setActiveJobId} selectedJobId={activeJobId} />
                            </div>
                        </div>

                        <div className="bg-card border border-border/40 rounded-md p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-4 h-4 text-primary" />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">System Status</h2>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Redis Worker</span>
                                    <span className="text-green-500 font-bold">Active</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Document AI</span>
                                    <span className="text-green-500 font-bold">Connected</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Gemini 2.0 Flash</span>
                                    <span className="text-green-500 font-bold">Ready</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Dashboard */}
                    <div className="min-h-[600px] min-w-0">
                        <Dashboard onSelectJob={setActiveJobId} selectedJobId={activeJobId} />
                    </div>
                </div>
            </main>

            <footer className="border-t border-border/40 py-8 mt-12">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-xs text-muted-foreground font-medium tracking-tight">
                        &copy; 2026 BankExtract AI. Production-grade statement processing.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;
