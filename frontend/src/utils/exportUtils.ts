import * as XLSX from 'xlsx';
import { Transaction } from '../services/api';

export const exportToCSV = (transactions: Transaction[], fileName: string) => {
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Status'];
    const rows = transactions.map(t => [
        (t.transaction_date || '').split('T')[0],
        t.description,
        t.debit || '',
        t.credit || '',
        t.balance || '',
        t.reconciliation_status
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, "")}_transactions.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToExcel = (transactions: Transaction[], fileName: string) => {
    const data = transactions.map(t => ({
        Date: (t.transaction_date || '').split('T')[0],
        Description: t.description,
        Debit: t.debit || 0,
        Credit: t.credit || 0,
        Balance: t.balance || 0,
        Status: t.reconciliation_status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    // Fix column widths
    const maxWidths = [
        { wch: 12 }, // Date
        { wch: 50 }, // Description
        { wch: 12 }, // Debit
        { wch: 12 }, // Credit
        { wch: 12 }, // Balance
        { wch: 12 }  // Status
    ];
    worksheet['!cols'] = maxWidths;

    XLSX.writeFile(workbook, `${fileName.replace(/\.[^/.]+$/, "")}_transactions.xlsx`);
};

export const exportToJSON = (transactions: Transaction[], fileName: string) => {
    const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, "")}_transactions.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
