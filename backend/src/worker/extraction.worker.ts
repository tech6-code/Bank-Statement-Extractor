import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import pool from '../config/db';
import { processDocument, extractTextFromDocument } from '../services/docAiService';
import { extractTransactionsFromText, chunkText } from '../services/claudeService';
import {
    detectDuplicates,
    reconcileTransactions,
    calculateConfidence,
} from '../services/reconciliationService';

const worker = new Worker(
    'extraction-queue',
    async (job: Job) => {
        const { jobId, fileName, filePath } = job.data;

        try {
            // 1. Update status to processing
            await pool.execute('UPDATE extraction_jobs SET status = ? WHERE id = ?', ['processing', jobId]);

            // 2. Document AI Processing
            const document = await processDocument(filePath);
            if (!document) {
                throw new Error('Document AI failed to process the document');
            }
            const text = extractTextFromDocument(document);
            const totalPages = document.pages?.length || 0;

            await pool.execute('UPDATE extraction_jobs SET total_pages = ? WHERE id = ?', [
                totalPages,
                jobId,
            ]);

            // 3. Chunk text (simplified for now, Claude 3.5 can handle quite a lot)
            // In a real scenario, we might want more granular chunking based on table rows.
            // For this demo, we'll send the whole text if it's within limits or chunk it.
            const chunks = chunkText(text);
            let allTransactions: any[] = [];

            let processedPages = 0;
            for (const chunk of chunks) {
                const transactions = await extractTransactionsFromText(chunk);
                allTransactions = allTransactions.concat(transactions);

                // Save partial progress
                processedPages += Math.ceil(totalPages / chunks.length);
                await pool.execute('UPDATE extraction_jobs SET processed_pages = ? WHERE id = ?', [
                    Math.min(processedPages, totalPages),
                    jobId,
                ]);

                // Save raw data per chunk/page
                await pool.execute('INSERT INTO raw_extracted_data (job_id, raw_row_data) VALUES (?, ?)', [
                    jobId,
                    JSON.stringify(transactions),
                ]);
            }

            // 4. Duplicate Detection
            const { uniqueTransactions, duplicateCount } = detectDuplicates(allTransactions);

            // 5. Reconciliation Logic (Sequential)
            const { reconciledTransactions, reconciliationErrorsCount } = reconcileTransactions(
                uniqueTransactions
            );

            // 6. Confidence Scoring
            const { score, low_confidence } = calculateConfidence(
                reconciledTransactions,
                duplicateCount,
                reconciliationErrorsCount
            );

            // 7. Save Transactions
            for (const t of reconciledTransactions) {
                await pool.execute(
                    `INSERT INTO transactions 
           (job_id, transaction_date, description, debit, credit, balance, reconciliation_status, validation_error) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        jobId,
                        t.date,
                        t.description,
                        t.debit,
                        t.credit,
                        t.balance,
                        t.reconciliation_status,
                        t.validation_error,
                    ]
                );
            }

            // 8. Final Status Update
            await pool.execute(
                `UPDATE extraction_jobs 
         SET status = ?, transaction_count = ?, duplicate_count = ?, reconciliation_errors_count = ?, confidence = ?, raw_data_saved = TRUE 
         WHERE id = ?`,
                [
                    'completed',
                    reconciledTransactions.length,
                    duplicateCount,
                    reconciliationErrorsCount,
                    score,
                    jobId,
                ]
            );
        } catch (error: any) {
            console.error(`Job ${jobId} failed:`, error);
            await pool.execute('UPDATE extraction_jobs SET status = ?, error_message = ? WHERE id = ?', [
                'failed',
                error.message,
                jobId,
            ]);
            throw error;
        }
    },
    {
        connection: redisConfig,
        concurrency: 2,
    }
);

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} failed with ${err.message}`);
});

export default worker;
