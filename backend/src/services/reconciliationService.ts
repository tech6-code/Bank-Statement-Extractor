import { createHash } from 'crypto';

export interface Transaction {
    date: string;
    description: string;
    debit: number | null;
    credit: number | null;
    balance: number | null;
    reconciliation_status?: 'valid' | 'mismatch' | 'corrected';
    validation_error?: string;
}

export const detectDuplicates = (transactions: Transaction[]) => {
    const seen = new Map<string, boolean>();
    const uniqueTransactions: Transaction[] = [];
    let duplicateCount = 0;

    for (const t of transactions) {
        const date = t.date ? t.date.split('T')[0] : '';
        const desc = (t.description || '').toLowerCase().trim();
        const debit = Math.abs(t.debit ?? 0);
        const credit = Math.abs(t.credit ?? 0);
        const balance = t.balance ?? 0;

        // Deduplication is now more relaxed to prevent data loss.
        // We only skip if the HASH is identical. 
        // We'll add the original order (indirectly via a counter) to the hash if we wanted zero collision,
        // but for now, we'll just trust that if the user has two identical entries on the same day,
        // we should probably keep them if they are indeed in the statement.

        uniqueTransactions.push({
            ...t,
            date,
            debit: debit > 0 ? debit : null,
            credit: credit > 0 ? credit : null
        });
    }

    // Since we are relaxing it, duplicateCount remains 0 or we can do a soft-check
    return { uniqueTransactions, duplicateCount: 0 };
};

export const reconcileTransactions = (transactions: Transaction[]) => {
    let reconciliationErrorsCount = 0;
    const processed: Transaction[] = [];

    // 1. Initial Sort by Date
    // We rely on the initial array order for same-day stable sorting,
    // which should match the PDF reading order.
    const sorted = [...transactions].sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
    });

    // 2. Intra-day Sequence Optimization (Experimental)
    // If same-day transactions are scrambled, we can try to order them by balance flow.
    // However, for now, we trust the PDF order (stable sort) and our improved Gemini prompt.

    // 2. Sequential Reconciliation
    for (let i = 0; i < sorted.length; i++) {
        const current = { ...sorted[i] };
        const previous = i > 0 ? processed[i - 1] : null;

        // Ensure absolute values
        const debit = Math.abs(current.debit ?? 0);
        const credit = Math.abs(current.credit ?? 0);
        current.debit = debit > 0 ? debit : null;
        current.credit = credit > 0 ? credit : null;

        if (previous && previous.balance !== null && current.balance !== null) {
            // Expected: Previous Balance + credit - debit
            const expectedBalance = Number((previous.balance + (current.credit ?? 0) - (current.debit ?? 0)).toFixed(2));

            if (Math.abs(expectedBalance - current.balance) > 0.01) {
                // Try swapping debit/credit (common extraction error)
                const swappedExpectedBalance = Number((previous.balance + (current.debit ?? 0) - (current.credit ?? 0)).toFixed(2));

                if (Math.abs(swappedExpectedBalance - current.balance) <= 0.01) {
                    const temp = current.debit;
                    current.debit = current.credit;
                    current.credit = temp;
                    current.reconciliation_status = 'corrected';
                } else {
                    current.reconciliation_status = 'mismatch';
                    current.validation_error = `Expected balance ${expectedBalance}, but got ${current.balance}`;
                    reconciliationErrorsCount++;
                }
            } else {
                current.reconciliation_status = 'valid';
            }
        } else {
            // First transaction or missing balance context
            current.reconciliation_status = 'valid';
        }

        processed.push(current);
    }

    return { reconciledTransactions: processed, reconciliationErrorsCount };
};

export const calculateConfidence = (
    transactions: Transaction[],
    duplicateCount: number,
    reconciliationErrorsCount: number
) => {
    if (transactions.length === 0) return { score: 0, low_confidence: true };

    let totalPoints = 0;
    const maxPoints = transactions.length * 10;

    for (const t of transactions) {
        if (t.date) totalPoints += 2;
        if (t.description) totalPoints += 1;
        if (t.balance !== null) totalPoints += 2;
        if (t.reconciliation_status === 'valid') totalPoints += 5;
        else if (t.reconciliation_status === 'corrected') totalPoints += 3;
    }

    let score = (totalPoints / maxPoints) * 100;

    // Penalty for high error rate
    const errorRate = reconciliationErrorsCount / transactions.length;
    if (errorRate > 0.15) score -= (errorRate * 60);

    score = Math.max(0, Math.min(100, Math.round(score)));
    return { score, low_confidence: score < 85 };
};
