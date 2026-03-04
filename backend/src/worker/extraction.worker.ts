import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import pool from '../config/db';
import { splitPdf } from '../utils/pdfUtils';
import { processDocument, mergeDocuments, extractTextFromDocument, extractPagesContent } from '../services/docAiService';
import { extractTransactionsFromText, chunkText } from '../services/claudeService';
import { extractTransactionsWithGemini } from '../services/geminiService';
import {
    detectDuplicates,
    reconcileTransactions,
    calculateConfidence,
} from '../services/reconciliationService';
import { normalizeDate } from '../utils/dateUtils';

const worker = new Worker(
    'extraction-queue',
    async (job: Job) => {
        const { jobId, fileName, filePath } = job.data;

        try {
            // 1. Update status to processing
            await pool.execute('UPDATE extraction_jobs SET status = ? WHERE id = ?', ['processing', jobId]);

            // 2. Proactive Splitting for Large PDFs (DocAI limit is typically 15-30 pages synchronous)
            console.log(`Analyzing/Splitting PDF: ${fileName}`);
            const pdfChunks = await splitPdf(filePath, 15);
            console.log(`Document split into ${pdfChunks.length} chunks.`);

            // Process PDF chunks in parallel
            const docPromises = pdfChunks.map(chunk => processDocument(chunk));
            const docResults = await Promise.all(docPromises);

            // Merge individual DocAI documents into one master document
            const document = mergeDocuments(docResults);

            if (!document) {
                throw new Error('Document AI failed to process any document chunks');
            }
            const text = extractTextFromDocument(document);
            const totalPages = Math.max(1, document.pages?.length || 1);

            await pool.execute('UPDATE extraction_jobs SET total_pages = ?, processed_pages = 0 WHERE id = ?', [
                totalPages,
                jobId,
            ]);

            // 3. Prepare Chunks (Page-by-page with Tables + Text)
            console.log('Extracting content page-by-page...');
            const chunks = extractPagesContent(document);

            // DEBUG: Save raw DocAI chunks for inspection
            for (let idx = 0; idx < chunks.length; idx++) {
                await pool.execute('INSERT INTO debug_chunks (job_id, page_number, content) VALUES (?, ?, ?)', [
                    jobId, idx + 1, chunks[idx]
                ]);
            }

            let allTransactions: any[] = [];
            let processedPagesCount = 0;
            let combinedHeaderInfo: any = {};

            console.log(`Processing ${chunks.length} chunks in parallel...`);

            // Process chunks in parallel batches
            const batchSize = 5;
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const batchPromises = batch.map(async (chunk, index) => {
                    let result: any;
                    const maxRetries = 3;
                    let attempt = 0;

                    while (attempt < maxRetries) {
                        try {
                            console.log(`[Batch ${Math.floor(i / batchSize) + 1}] Processing chunk ${i + index + 1} (Attempt ${attempt + 1})...`);
                            // Primary: Gemini
                            result = await extractTransactionsWithGemini(chunk);
                            if (result && (result.transactions || result.header_info)) break; // Success (even if transactions is empty)
                            else {
                                console.warn(`Gemini returned invalid results for chunk ${i + index + 1}`);
                                throw new Error('Invalid results from Gemini');
                            }
                        } catch (geminiError: any) {
                            attempt++;
                            console.warn(`Attempt ${attempt} failed for Gemini on chunk ${i + index + 1}: ${geminiError.message}`);
                            if (attempt === maxRetries) {
                                console.error(`Gemini failed after ${maxRetries} attempts, falling back to Claude...`);
                                try {
                                    result = await extractTransactionsFromText(chunk);
                                } catch (claudeError: any) {
                                    console.error(`Claude also failed for chunk ${i + index + 1}:`, claudeError.message);
                                    return null;
                                }
                            }
                            // Small delay before retry
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                    return result;
                });

                const batchResults = await Promise.all(batchPromises);

                for (const result of batchResults) {
                    if (result) {
                        // Handle both older array-style and newer object-style responses
                        const transactions = Array.isArray(result) ? result : (result.transactions || []);
                        const headerInfo = (!Array.isArray(result) && result.header_info) ? result.header_info : {};

                        allTransactions = allTransactions.concat(transactions);
                        combinedHeaderInfo = { ...combinedHeaderInfo, ...headerInfo };

                        // Save raw data per chunk (Check if job still exists to avoid FK error)
                        const [jobExists]: any = await pool.execute('SELECT id FROM extraction_jobs WHERE id = ?', [jobId]);
                        if (jobExists.length > 0) {
                            await pool.execute('INSERT INTO raw_extracted_data (job_id, raw_row_data) VALUES (?, ?)', [
                                jobId,
                                JSON.stringify(result),
                            ]);
                        } else {
                            console.warn(`Job ${jobId} was deleted. Stopping processing for this chunk.`);
                            return null;
                        }
                    }
                }

                // Update progress after each batch
                processedPagesCount += Math.ceil((totalPages / chunks.length) * batch.length);
                await pool.execute('UPDATE extraction_jobs SET processed_pages = ? WHERE id = ?', [
                    Math.min(processedPagesCount, totalPages),
                    jobId,
                ]);
            }

            // 4. Clean out any "header-like" rows from transactions if they were accidentally included
            allTransactions = allTransactions.filter(t => {
                const desc = (t.description || '').toLowerCase().trim();
                const debit = t.debit !== null ? Number(t.debit) : 0;
                const credit = t.credit !== null ? Number(t.credit) : 0;

                const hasAmount = (debit !== 0) || (credit !== 0);

                // If it has no date and no amount, it's definitely not a transaction
                if (!t.date && !hasAmount) return false;

                // CRITICAL: Refined Metadata Filter
                // We only exclude if the description is EXACTLY or heavily matching a metadata header
                // and has NO money movement (debit/credit).
                const exactMetadataHeaders = [
                    'account number', 'iban', 'account type', 'opening balance',
                    'closing balance', 'total debit', 'total credit', 'carried forward',
                    'brought forward', 'statement period', 'currency', 'customer name',
                    'branch name', 'ifsc code', 'swift code'
                ];

                if (!hasAmount && exactMetadataHeaders.some(key => desc === key || desc.startsWith(key + ':'))) {
                    return false;
                }

                // If description is empty and no amounts, skip
                if (!desc && !hasAmount) return false;

                return true;
            });

            // 5. Intelligent Chronological Reordering
            // Most bank statements are either Oldest-to-Newest or Newest-to-Oldest.
            // We need them Oldest-to-Newest for reconciliation.
            if (allTransactions.length > 1) {
                const firstDate = allTransactions[0].date;
                const lastDate = allTransactions[allTransactions.length - 1].date;

                // If first date is later than last date, it's likely a descending statement
                if (firstDate && lastDate && firstDate > lastDate) {
                    console.log('Detected DESCENDING statement order. Reversing for chronological processing.');
                    allTransactions.reverse();
                }
            }

            // 6. Duplicate Detection
            const { uniqueTransactions, duplicateCount } = detectDuplicates(allTransactions);

            // 7. Reconciliation Logic (Sequential)
            const { reconciledTransactions, reconciliationErrorsCount } = reconcileTransactions(
                uniqueTransactions,
                combinedHeaderInfo
            );

            // 7. Confidence Scoring
            const { score, low_confidence } = calculateConfidence(
                reconciledTransactions,
                duplicateCount,
                reconciliationErrorsCount
            );

            // 8. Save Transactions
            for (const t of reconciledTransactions) {
                await pool.execute(
                    `INSERT INTO transactions 
           (job_id, transaction_date, description, debit, credit, balance, reconciliation_status, validation_error) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        jobId,
                        normalizeDate(t.date) || null,
                        t.description || null,
                        t.debit ?? null,
                        t.credit ?? null,
                        t.balance ?? null,
                        t.reconciliation_status || 'valid',
                        t.validation_error || null,
                    ]
                );
            }

            // 9. Final Status Update
            await pool.execute(
                `UPDATE extraction_jobs 
         SET status = ?, transaction_count = ?, duplicate_count = ?, reconciliation_errors_count = ?, confidence = ?, header_info = ?, raw_data_saved = TRUE 
         WHERE id = ?`,
                [
                    'completed',
                    reconciledTransactions.length,
                    duplicateCount,
                    reconciliationErrorsCount,
                    score,
                    JSON.stringify(combinedHeaderInfo),
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

worker.on('completed', (job: Job) => {
    console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
    console.log(`Job ${job?.id} failed with ${err.message}`);
});

export default worker;
