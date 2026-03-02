import { v1 } from '@google-cloud/documentai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const client = new v1.DocumentProcessorServiceClient();

export const processDocument = async (filePath: string) => {
    const projectId = process.env.GCP_PROJECT_ID;
    const location = process.env.DOCAI_LOCATION || 'us';
    const processorId = process.env.DOCAI_PROCESSOR_ID;

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const fs = require('fs');
    const imageContext = fs.readFileSync(filePath);
    const encodedImage = Buffer.from(imageContext).toString('base64');

    const request = {
        name,
        rawDocument: {
            content: encodedImage,
            mimeType: 'application/pdf',
        },
    };

    const [result] = await client.processDocument(request);
    const { document } = result;

    return document;
};

export const extractTextFromDocument = (document: any) => {
    const { text } = document;
    return text;
};

// Simplified table extraction from Document AI
export const extractTablesFromDocument = (document: any) => {
    const tables: any[] = [];
    if (document.pages) {
        for (const page of document.pages) {
            if (page.tables) {
                for (const table of page.tables) {
                    const rows: any[] = [];
                    for (const row of table.headerRows) {
                        rows.push(extractRowData(row, document.text));
                    }
                    for (const row of table.bodyRows) {
                        rows.push(extractRowData(row, document.text));
                    }
                    tables.push(rows);
                }
            }
        }
    }
    return tables;
};

const extractRowData = (row: any, text: string) => {
    return row.cells.map((cell: any) => {
        const start = cell.layout.textAnchor.textSegments[0].startIndex || 0;
        const end = cell.layout.textAnchor.textSegments[0].endIndex || 0;
        return text.substring(start, end).trim();
    });
};
