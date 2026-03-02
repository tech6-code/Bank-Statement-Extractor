import React from 'react';
import { Transaction } from '../services/api';
import { AlertTriangle, CheckCircle2, History, Download, Search, FileText, FileSpreadsheet, Code } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToJSON } from '../utils/exportUtils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TransactionsTableProps {
    transactions: Transaction[];
    fileName: string;
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions, fileName }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [showExport, setShowExport] = React.useState(false);

    const filteredTransactions = transactions.filter(t =>
        (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.transaction_date || '').includes(searchTerm)
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/20 rounded-lg border border-border/40">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="w-full bg-background border border-border/50 rounded-md py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowExport(!showExport)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>

                    {showExport && (
                        <div className="absolute right-0 mt-2 w-48 bg-card border border-border shadow-xl rounded-lg overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                            <button
                                onClick={() => { exportToExcel(transactions, fileName); setShowExport(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-left transition-colors"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-green-500" />
                                <span>Excel (.xlsx)</span>
                            </button>
                            <button
                                onClick={() => { exportToCSV(transactions, fileName); setShowExport(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-left transition-colors"
                            >
                                <FileText className="w-4 h-4 text-blue-500" />
                                <span>CSV (.csv)</span>
                            </button>
                            <button
                                onClick={() => { exportToJSON(transactions, fileName); setShowExport(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-left transition-colors"
                            >
                                <Code className="w-4 h-4 text-orange-500" />
                                <span>JSON (.json)</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full max-h-[75vh] overflow-auto border border-border/50 rounded-lg custom-scrollbar">
                <table className="w-full min-w-[1000px] text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border/50 sticky top-0 z-10 text-center">
                            <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] bg-muted/95 backdrop-blur-sm w-12">#</th>
                            <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] bg-muted/95 backdrop-blur-sm text-left">Date</th>
                            <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] bg-muted/95 backdrop-blur-sm text-left">Description</th>
                            <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] bg-muted/95 backdrop-blur-sm text-right">Debit</th>
                            <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] bg-muted/95 backdrop-blur-sm text-right">Credit</th>
                            <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] bg-muted/95 backdrop-blur-sm text-right">Balance</th>
                            <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] bg-muted/95 backdrop-blur-sm text-left">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {filteredTransactions.map((t, index) => (
                            <tr
                                key={t.id}
                                className={cn(
                                    "hover:bg-muted/10 transition-colors",
                                    t.reconciliation_status === 'mismatch' && "bg-destructive/10",
                                    t.reconciliation_status === 'corrected' && "bg-yellow-500/10"
                                )}
                            >
                                <td className="px-4 py-3 whitespace-nowrap font-mono text-center text-muted-foreground text-[11px] border-r border-border/10">{index + 1}</td>
                                <td className="px-4 py-3 whitespace-nowrap font-mono">{(t.transaction_date || '').split('T')[0]}</td>
                                <td className="px-4 py-3 min-w-[300px]">
                                    <div className="font-medium truncate max-w-[400px]" title={t.description}>
                                        {t.description}
                                    </div>
                                    {t.validation_error && (
                                        <span className="text-[10px] text-destructive leading-tight block mt-1">
                                            {t.validation_error}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-destructive">
                                    {t.debit ? t.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-green-500">
                                    {t.credit ? t.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold">
                                    {t.balance ? t.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={t.reconciliation_status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: Transaction['reconciliation_status'] }) => {
    switch (status) {
        case 'valid':
            return (
                <div className="flex items-center gap-1.5 text-green-500 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Valid</span>
                </div>
            );
        case 'mismatch':
            return (
                <div className="flex items-center gap-1.5 text-destructive font-medium text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Mismatch</span>
                </div>
            );
        case 'corrected':
            return (
                <div className="flex items-center gap-1.5 text-yellow-500 font-medium text-[11px]">
                    <History className="w-3.5 h-3.5" />
                    <span>Corrected</span>
                </div>
            );
        default:
            return null;
    }
};

export default TransactionsTable;
