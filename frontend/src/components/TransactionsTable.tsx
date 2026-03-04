import React from 'react';
import { Transaction } from '../services/api';
import { AlertTriangle, CheckCircle2, History, Download, Search, FileText, FileSpreadsheet, Code, Calendar } from 'lucide-react';
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
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [showExport, setShowExport] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = 20;

    const startInputRef = React.useRef<HTMLInputElement>(null);
    const endInputRef = React.useRef<HTMLInputElement>(null);

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate]);

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.transaction_date || '').includes(searchTerm);

        let matchesDate = true;
        if (t.transaction_date) {
            const txDate = t.transaction_date.split('T')[0];
            if (startDate && txDate < startDate) matchesDate = false;
            if (endDate && txDate > endDate) matchesDate = false;
        } else if (startDate || endDate) {
            matchesDate = false; // If there's a filter but no date on transaction
        }

        return matchesSearch && matchesDate;
    });

    const totalPages = Math.ceil(filteredTransactions.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 py-2">
                <div className="flex flex-wrap items-end gap-4 flex-1">
                    {/* Search Input */}
                    <div className="flex flex-col gap-1.5 min-w-[300px] flex-1 lg:flex-none">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest px-1">Search</span>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                            <input
                                type="text"
                                placeholder="DESCRIPTION OR DATE..."
                                className="w-full bg-muted/5 border border-border/40 rounded-md py-2.5 pl-10 pr-4 text-[12px] font-bold uppercase tracking-widest focus:outline-none focus:border-primary/50 focus:bg-muted/10 transition-all placeholder:text-muted-foreground/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Date Filters */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest px-1">From</span>
                            <div
                                className="flex items-center gap-3 bg-muted/5 border border-border/40 rounded-md px-4 py-2.5 hover:border-border/60 transition-colors cursor-pointer"
                                onClick={() => startInputRef.current?.showPicker()}
                            >
                                <Calendar className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                                <input
                                    ref={startInputRef}
                                    type="date"
                                    className="bg-transparent text-[13px] font-bold focus:outline-none w-[110px] cursor-pointer tracking-tight text-foreground/90 uppercase"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest px-1">To</span>
                            <div
                                className="flex items-center gap-3 bg-muted/5 border border-border/40 rounded-md px-4 py-2.5 hover:border-border/60 transition-colors cursor-pointer"
                                onClick={() => endInputRef.current?.showPicker()}
                            >
                                <Calendar className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                                <input
                                    ref={endInputRef}
                                    type="date"
                                    className="bg-transparent text-[13px] font-bold focus:outline-none w-[110px] cursor-pointer tracking-tight text-foreground/90 uppercase"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="h-[46px] mt-auto px-4 text-[11px] text-destructive/60 hover:text-destructive font-bold uppercase tracking-widest transition-colors border border-destructive/20 rounded-md hover:bg-destructive/5"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative shrink-0 pt-5">
                    <button
                        onClick={() => setShowExport(!showExport)}
                        className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-[11px] font-bold uppercase tracking-[0.2em] transition-colors shadow-lg active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>

                    {showExport && (
                        <div className="absolute right-0 mt-3 w-72 bg-card border border-border shadow-2xl rounded-md overflow-hidden z-50">
                            <div className="p-3 bg-muted/20 border-b border-border/40">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 tracking-widest">Filtered ({filteredTransactions.length})</span>
                            </div>
                            <div className="p-1.5">
                                <button
                                    onClick={() => { exportToExcel(filteredTransactions, `${fileName}_filtered`); setShowExport(false); }}
                                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 rounded text-[13px] font-bold uppercase tracking-tight transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-green-500" />
                                    <span>Excel</span>
                                </button>
                                <button
                                    onClick={() => { exportToCSV(filteredTransactions, `${fileName}_filtered`); setShowExport(false); }}
                                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 rounded text-[13px] font-bold uppercase tracking-tight transition-colors"
                                >
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    <span>CSV</span>
                                </button>
                                <button
                                    onClick={() => { exportToJSON(filteredTransactions, `${fileName}_filtered`); setShowExport(false); }}
                                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 rounded text-[13px] font-bold uppercase tracking-tight transition-colors"
                                >
                                    <Code className="w-4 h-4 text-orange-500" />
                                    <span>JSON</span>
                                </button>
                            </div>

                            <div className="p-3 bg-muted/20 border-y border-border/40">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 tracking-widest">All Records ({transactions.length})</span>
                            </div>
                            <div className="p-1.5">
                                <button
                                    onClick={() => { exportToExcel(transactions, fileName); setShowExport(false); }}
                                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 rounded text-[13px] font-bold uppercase tracking-tight transition-colors opacity-70"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-green-500/60" />
                                    <span>Excel Full</span>
                                </button>
                                <button
                                    onClick={() => { exportToCSV(transactions, fileName); setShowExport(false); }}
                                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 rounded text-[13px] font-bold uppercase tracking-tight transition-colors opacity-70"
                                >
                                    <FileText className="w-4 h-4 text-blue-500/60" />
                                    <span>CSV Full</span>
                                </button>
                                <button
                                    onClick={() => { exportToJSON(transactions, fileName); setShowExport(false); }}
                                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 rounded text-[13px] font-bold uppercase tracking-tight transition-colors opacity-70"
                                >
                                    <Code className="w-4 h-4 text-orange-500/60" />
                                    <span>JSON Full</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full max-h-[75vh] overflow-auto border border-border/40 rounded-md custom-scrollbar bg-card">
                <table className="w-full min-w-[1000px] text-left border-collapse">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-card border-b border-border/50">
                            <th className="px-5 py-5 font-bold text-muted-foreground/80 uppercase tracking-widest text-[11px] w-14 text-center">#</th>
                            <th className="px-5 py-5 font-bold text-muted-foreground/80 uppercase tracking-widest text-[11px]">Date</th>
                            <th className="px-5 py-5 font-bold text-muted-foreground/80 uppercase tracking-widest text-[11px]">Description</th>
                            <th className="px-5 py-5 font-bold text-muted-foreground/80 uppercase tracking-widest text-[11px] text-right">Debit</th>
                            <th className="px-5 py-5 font-bold text-muted-foreground/80 uppercase tracking-widest text-[11px] text-right">Credit</th>
                            <th className="px-5 py-5 font-bold text-muted-foreground/80 uppercase tracking-widest text-[11px] text-right">Balance</th>
                            <th className="px-5 py-5 font-bold text-muted-foreground/80 uppercase tracking-widest text-[11px]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                        {paginatedTransactions.map((t, index) => {
                            const actualIndex = startIndex + index + 1;
                            return (
                                <tr
                                    key={t.id}
                                    className={cn(
                                        "transition-colors",
                                        t.reconciliation_status === 'mismatch' ? "bg-destructive/[0.05] hover:bg-destructive/[0.08]" : "hover:bg-muted/[0.05]",
                                        t.reconciliation_status === 'corrected' && "bg-yellow-500/[0.05] hover:bg-yellow-500/[0.08]"
                                    )}
                                >
                                    <td className="px-5 py-4 whitespace-nowrap font-mono text-center text-muted-foreground/60 text-[12px] font-bold">{actualIndex}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-[14px] font-bold tracking-tight text-foreground/80">{(t.transaction_date || '').split('T')[0]}</td>
                                    <td className="px-5 py-4 min-w-[350px]">
                                        <div className="text-[14px] font-bold truncate max-w-[500px] tracking-tight text-foreground/90 leading-relaxed uppercase" title={t.description}>
                                            {t.description}
                                        </div>
                                        {t.validation_error && (
                                            <span className="text-[11px] font-bold text-destructive/90 uppercase tracking-tight block mt-1">
                                                {t.validation_error}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right text-[14px] font-bold font-mono text-destructive tracking-tighter">
                                        {t.debit ? t.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="px-5 py-4 text-right text-[14px] font-bold font-mono text-green-500 tracking-tighter">
                                        {t.credit ? t.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="px-5 py-4 text-right text-[14px] font-bold font-mono tracking-tighter text-foreground">
                                        {t.balance ? t.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="px-5 py-4">
                                        <StatusBadge status={t.reconciliation_status} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination UI */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between py-4 px-2 border-t border-border/30">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        SHOWING PAGE <span className="text-foreground">{currentPage}</span> OF <span className="text-foreground">{totalPages}</span> ({filteredTransactions.length} items)
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-border/40 rounded-md hover:bg-muted/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            PREV
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-border/40 rounded-md hover:bg-muted/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            NEXT
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }: { status: Transaction['reconciliation_status'] }) => {
    switch (status) {
        case 'valid':
            return <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">VALID</span>;
        case 'mismatch':
            return <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">MISMATCH</span>;
        case 'corrected':
            return <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">CORRECTED</span>;
        default:
            return null;
    }
};

export default TransactionsTable;
