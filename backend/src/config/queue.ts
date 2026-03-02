import { Queue } from 'bullmq';
import { redisConfig } from './redis';

export const extractionQueue = new Queue('extraction-queue', {
    connection: redisConfig,
});
