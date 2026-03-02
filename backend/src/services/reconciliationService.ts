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
        const hash = createHash('sha256')
            .update(`${t.date}|${t.description.toLowerCase().trim()}|${t.debit ?? 0}|${t.credit ?? 0}|${t.balance ?? 0}`)
            .digest('hex');

        if (seen.has(hash)) {
            duplicateCount++;
        } else {
            seen.set(hash, true);
            uniqueTransactions.push(t);
        }
    }

    return { uniqueTransactions, duplicateCount };
};

export const reconcileTransactions = (transactions: Transaction[]) => {
    let reconciliationErrorsCount = 0;
    const processed: Transaction[] = [];

    for (let i = 0; i < transactions.length; i++) {
        const current = { ...transactions[i] };
        const previous = i > 0 ? processed[i - 1] : null;

        if (previous && previous.balance !== null && current.balance !== null) {
            const debit = current.debit ?? 0;
            const credit = current.credit ?? 0;
            const expectedBalance = Number((previous.balance + credit - debit).toFixed(2));

            if (expectedBalance !== current.balance) {
                // Try swap
                const swappedExpectedBalance = Number((previous.balance + debit - credit).toFixed(2));
                if (swappedExpectedBalance === current.balance) {
                    current.debit = credit;
                    current.credit = debit;
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
    let score = 100;

    for (const t of transactions) {
        if (!t.date) score -= 3;
        if (t.balance === null) score -= 5;
        if (t.reconciliation_status === 'mismatch') score -= 7;
        if (isNaN(Number(t.debit)) || isNaN(Number(t.credit))) score -= 5;
        if (!t.description) score -= 2;
    }

    const dupRate = transactions.length > 0 ? duplicateCount / transactions.length : 0;
    if (dupRate > 0.05) score -= 5;

    const errorRate = transactions.length > 0 ? reconciliationErrorsCount / transactions.length : 0;
    if (errorRate > 0.1) score -= 10;

    score = Math.max(0, score);
    return { score, low_confidence: score < 80 };
};
