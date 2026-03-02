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

// Extract content page-by-page using a Spatial Grid (Bucketized Columns)
export const extractPagesContent = (document: any) => {
    const pages: string[] = [];
    if (!document.pages) return [document.text || ''];

    for (const page of document.pages) {
        let pageContent = `--- PAGE ${page.pageNumber || ''} ---\n`;

        // Use a Spatial Grid approach instead of unreliable Table detection
        const grid = extractGridFromPage(page, document.text);
        if (grid) {
            pageContent += "### TRANSACTION GRID (SPATIAL OCR DATA):\n";
            pageContent += grid + "\n";
        } else {
            // Fallback to raw text if no layout available
            const textSegments = page.layout?.textAnchor?.textSegments || [];
            for (const segment of textSegments) {
                const start = segment.startIndex || 0;
                const end = segment.endIndex || 0;
                pageContent += document.text.substring(start, end);
            }
        }

        pages.push(pageContent);
    }
    return pages;
};

// Groups lines based on their Y-coordinates and clusters X into 10 virtual columns
function extractGridFromPage(page: any, fullText: string): string {
    const lines = (page.lines || []).map((line: any) => {
        const vertices = line.layout.boundingPoly.vertices;
        const yTop = Math.min(...vertices.map((v: any) => v.y || 0));
        const yBottom = Math.max(...vertices.map((v: any) => v.y || 0));
        const xLeft = Math.min(...vertices.map((v: any) => v.x || 0));
        const xRight = Math.max(...vertices.map((v: any) => v.x || 0));
        const textAnchor = line.layout.textAnchor;

        let content = "";
        if (textAnchor && textAnchor.textSegments) {
            for (const segment of textAnchor.textSegments) {
                const start = segment.startIndex || 0;
                const end = segment.endIndex || 0;
                content += fullText.substring(start, end);
            }
        }
        content = content.trim();

        return {
            content,
            yCenter: (yTop + yBottom) / 2,
            xLeft,
            xRight,
            height: yBottom - yTop || 10
        };
    }).filter((l: any) => l.content.length > 0);

    if (lines.length === 0) return '';

    // 1. Group into rows by Y-coordinate
    lines.sort((a: any, b: any) => a.yCenter - b.yCenter);
    const rows: any[][] = [];
    if (lines.length > 0) {
        let currentRow: any[] = [lines[0]];
        for (let i = 1; i < lines.length; i++) {
            const last = currentRow[currentRow.length - 1];
            const curr = lines[i];
            // Threshold for grouping: if the center of the next line is 
            // within 60% of the previous line's height, group them.
            if (Math.abs(curr.yCenter - last.yCenter) < last.height * 0.6) {
                currentRow.push(curr);
            } else {
                rows.push(currentRow);
                currentRow = [curr];
            }
        }
        rows.push(currentRow);
    }

    // 2. Cluster X-coordinates into 10 virtual "buckets" (columns)
    // Find the max boundary to normalize buckets
    const maxX = Math.max(...lines.map((l: any) => l.xRight)) || 1000;
    const bucketCount = 10;
    const bucketSize = maxX / bucketCount;

    const formattedRows = rows.map(row => {
        const buckets = Array(bucketCount).fill("");
        row.forEach(line => {
            const bucketIndex = Math.min(Math.floor(line.xLeft / bucketSize), bucketCount - 1);
            buckets[bucketIndex] = buckets[bucketIndex] ? buckets[bucketIndex] + " " + line.content : line.content;
        });
        return `| ${buckets.join(' | ')} |`;
    });

    return formattedRows.join('\n');
}

// For backward compatibility
export const extractTablesFromDocument = (document: any) => {
    const results: string[] = [];
    if (document.pages) {
        for (const page of document.pages) {
            const grid = extractGridFromPage(page, document.text);
            if (grid) results.push(grid);
        }
    }
    return results;
};
