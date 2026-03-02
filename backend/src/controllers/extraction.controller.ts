import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db';
import { extractionQueue } from '../config/queue';

export const extractBankStatements = async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const jobs = [];
    for (const file of files) {
        const jobId = uuidv4();
        const fileName = file.originalname;
        const filePath = file.path;

        // Insert job into DB
        await pool.execute(
            'INSERT INTO extraction_jobs (id, file_name, status) VALUES (?, ?, ?)',
            [jobId, fileName, 'queued']
        );

        // Push to Queue
        await extractionQueue.add('extract-job', {
            jobId,
            fileName,
            filePath,
        });

        jobs.push({
            job_id: jobId,
            file_name: fileName,
            status: 'queued',
        });
    }

    res.json({ success: true, files: jobs });
};

export const getJobStatus = async (req: Request, res: Response) => {
    const { job_id } = req.params;

    const [rows]: any = await pool.execute('SELECT * FROM extraction_jobs WHERE id = ?', [job_id]);
    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = rows[0];

    const [transactions]: any = await pool.execute(
        'SELECT * FROM transactions WHERE job_id = ? ORDER BY transaction_date ASC',
        [job_id]
    );

    res.json({
        ...job,
        low_confidence: job.confidence < 80,
        transactions,
    });
};
