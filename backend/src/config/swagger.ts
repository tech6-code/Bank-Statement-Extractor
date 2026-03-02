import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Bank Statement Extractor API',
        version: '1.0.0',
        description: 'API for extracting and reconciling bank statements using AI',
    },
    servers: [
        {
            url: 'http://localhost:5000',
        },
    ],
    paths: {
        '/api/extract-bank-statements': {
            post: {
                summary: 'Upload multiple PDFs for extraction',
                requestBody: {
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                properties: {
                                    files: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                            format: 'binary',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Jobs created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        files: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    job_id: { type: 'string' },
                                                    file_name: { type: 'string' },
                                                    status: { type: 'string' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/extract/{job_id}': {
            get: {
                summary: 'Get status and transactions of a job',
                parameters: [
                    {
                        name: 'job_id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                    },
                ],
                responses: {
                    200: {
                        description: 'Job details',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

const router = Router();
router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
