import { Router } from 'express';
import { extractBankStatements, getJobStatus } from '../controllers/extraction.controller';
import { upload } from '../config/multer';

const router = Router();

router.post('/extract-bank-statements', upload.array('files'), extractBankStatements);
router.get('/extract/:job_id', getJobStatus);

export default router;
