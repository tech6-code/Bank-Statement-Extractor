import { Router } from 'express';
import { extractBankStatements, getJobStatus, listJobs, deleteJob } from '../controllers/extraction.controller';
import { upload } from '../config/multer';

const router = Router();

router.post('/extract-bank-statements', upload.array('files'), extractBankStatements);
router.get('/extract/:job_id', getJobStatus);
router.get('/jobs', listJobs);
router.delete('/extract/:job_id', deleteJob);

export default router;
