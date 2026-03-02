import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import FileUploader from './components/FileUploader';
import { Layout, FileText, BarChart3, Receipt } from 'lucide-react';

function App() {
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            {/* Header */}
            <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary rounded-lg">
                            <Receipt className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">BankExtract AI</h1>
                    </div>
                    <nav className="flex items-center gap-6">
                        <button className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Documentation</button>
                        <button className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Support</button>
                    </nav>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
                    {/* Left Column: Upload */}
                    <div className="space-y-6">
                        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">Multiple File Upload</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                Upload your bank statement PDFs (up to 300 pages). We'll handle the extraction and reconciliation.
                            </p>
                            <FileUploader onUploadSuccess={(jobIds: string[]) => console.log('Jobs created:', jobIds)} />
                        </div>

                        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">System Status</h2>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Redis Worker</span>
                                    <span className="text-green-500 font-medium">Active</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Document AI</span>
                                    <span className="text-green-500 font-medium">Connected</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Claude 3.5 Sonnet</span>
                                    <span className="text-green-500 font-medium">Available</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Dashboard */}
                    <div className="min-h-[600px]">
                        <Dashboard onSelectJob={setActiveJobId} selectedJobId={activeJobId} />
                    </div>
                </div>
            </main>

            <footer className="border-t border-border/40 py-6 mt-12 bg-card/30">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        &copy; 2026 BankExtract AI. Production-grade statement processing.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;
