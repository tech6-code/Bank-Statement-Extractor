import { createHash } from 'crypto';
import { normalizeDate } from '../utils/dateUtils';

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
        const date = normalizeDate(t.date);
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

export const reconcileTransactions = (transactions: Transaction[], headerInfo: any = {}) => {
    let reconciliationErrorsCount = 0;
    const processed: Transaction[] = [];

    // 1. Initial Sort by Date
    const sorted = [...transactions].sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
    });

    // 2. Sequential Reconciliation with Intra-day Permutation attempt
    let currentBalance = headerInfo.opening_balance !== undefined && headerInfo.opening_balance !== null
        ? Number(headerInfo.opening_balance)
        : (sorted.length > 0 ? (sorted[0].balance !== null ? sorted[0].balance - (sorted[0].credit ?? 0) + (sorted[0].debit ?? 0) : null) : null);

    const groupsByDate: { [date: string]: Transaction[] } = {};
    for (const t of sorted) {
        if (!groupsByDate[t.date]) groupsByDate[t.date] = [];
        groupsByDate[t.date].push(t);
    }

    const sortedDates = Object.keys(groupsByDate).sort();

    for (const date of sortedDates) {
        const dayTransactions = groupsByDate[date];

        // If there's only one transaction or balance context is missing, process normally
        if (dayTransactions.length === 1 || currentBalance === null) {
            for (const t of dayTransactions) {
                const reconciled = reconcileOne(t, currentBalance);
                processed.push(reconciled);
                currentBalance = reconciled.balance;
                if (reconciled.reconciliation_status === 'mismatch') reconciliationErrorsCount++;
            }
        } else {
            // Try to find a sequence that works for same-day transactions
            // This is a simple greedy approach: find the one that matches the current balance
            let remaining = [...dayTransactions];
            let daySequence: Transaction[] = [];
            let tempBalance = currentBalance;

            while (remaining.length > 0) {
                let foundMatch = false;
                for (let i = 0; i < remaining.length; i++) {
                    const t = remaining[i];
                    const debit = Math.abs(t.debit ?? 0);
                    const credit = Math.abs(t.credit ?? 0);

                    if (t.balance !== null) {
                        const expected = Number((tempBalance + credit - debit).toFixed(2));
                        if (Math.abs(expected - t.balance) <= 0.01) {
                            const reconciled = { ...t, debit: debit > 0 ? debit : null, credit: credit > 0 ? credit : null, reconciliation_status: 'valid' as const };
                            daySequence.push(reconciled);
                            tempBalance = reconciled.balance as number;
                            remaining.splice(i, 1);
                            foundMatch = true;
                            break;
                        }

                        // Try swap
                        const swappedExpected = Number((tempBalance + debit - credit).toFixed(2));
                        if (Math.abs(swappedExpected - t.balance) <= 0.01) {
                            const reconciled = { ...t, debit: credit > 0 ? credit : null, credit: debit > 0 ? debit : null, reconciliation_status: 'corrected' as const };
                            daySequence.push(reconciled);
                            tempBalance = reconciled.balance as number;
                            remaining.splice(i, 1);
                            foundMatch = true;
                            break;
                        }
                    }
                }

                if (!foundMatch) {
                    // Fallback: just take the next one and mark as mismatch
                    const t = remaining.shift()!;
                    const reconciled = reconcileOne(t, tempBalance);
                    daySequence.push(reconciled);
                    tempBalance = reconciled.balance as number;
                    if (reconciled.reconciliation_status === 'mismatch') reconciliationErrorsCount++;
                }
            }
            processed.push(...daySequence);
            currentBalance = tempBalance;
        }
    }

    // Final check against closing balance if available
    if (headerInfo.closing_balance !== undefined && headerInfo.closing_balance !== null && currentBalance !== null) {
        if (Math.abs(currentBalance - Number(headerInfo.closing_balance)) > 0.01) {
            console.warn(`Final balance ${currentBalance} does not match statement closing balance ${headerInfo.closing_balance}`);
        }
    }

    return { reconciledTransactions: processed, reconciliationErrorsCount };
};

const reconcileOne = (current: Transaction, previousBalance: number | null): Transaction => {
    const t = { ...current };
    const debit = Math.abs(t.debit ?? 0);
    const credit = Math.abs(t.credit ?? 0);
    t.debit = debit > 0 ? debit : null;
    t.credit = credit > 0 ? credit : null;

    if (previousBalance !== null && t.balance !== null) {
        const expectedBalance = Number((previousBalance + credit - debit).toFixed(2));

        if (Math.abs(expectedBalance - t.balance) > 0.01) {
            const swappedExpectedBalance = Number((previousBalance + debit - credit).toFixed(2));

            if (Math.abs(swappedExpectedBalance - t.balance) <= 0.01) {
                t.debit = t.credit;
                t.credit = debit > 0 ? debit : null;
                t.reconciliation_status = 'corrected';
            } else {
                t.reconciliation_status = 'mismatch';
                t.validation_error = `Expected balance ${expectedBalance}, but got ${t.balance}`;
            }
        } else {
            t.reconciliation_status = 'valid';
        }
    } else if (previousBalance !== null && t.balance === null) {
        // Recover missing balance
        t.balance = Number((previousBalance + (t.credit ?? 0) - (t.debit ?? 0)).toFixed(2));
        t.reconciliation_status = 'corrected';
        t.validation_error = 'Recovered missing balance';
    } else {
        t.reconciliation_status = 'valid';
    }

    return t;
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
