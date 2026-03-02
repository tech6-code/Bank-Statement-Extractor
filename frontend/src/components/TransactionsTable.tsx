import React from 'react';
import { Transaction } from '../services/api';
import { AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TransactionsTableProps {
    transactions: Transaction[];
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead>
                    <tr className="bg-muted/50 border-b border-border/50">
                        <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Date</th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Description</th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] text-right">Debit</th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] text-right">Credit</th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] text-right">Balance</th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                    {transactions.map((t) => (
                        <tr
                            key={t.id}
                            className={cn(
                                "hover:bg-muted/10 transition-colors",
                                t.reconciliation_status === 'mismatch' && "bg-destructive/5 text-destructive-foreground",
                                t.reconciliation_status === 'corrected' && "bg-yellow-500/5"
                            )}
                        >
                            <td className="px-4 py-3 whitespace-nowrap font-mono">{t.transaction_date}</td>
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
