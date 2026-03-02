import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';

/**
 * Splits a PDF into multiple chunks of a specified size.
 * @param filePath Path to the original PDF
 * @param chunkSize Number of pages per chunk (default 15 for DocAI safety)
 * @returns Array of Buffers, each representing a PDF chunk
 */
export async function splitPdf(filePath: string, chunkSize: number = 15): Promise<Buffer[]> {
    const pdfBytes = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    const chunks: Buffer[] = [];

    for (let i = 0; i < totalPages; i += chunkSize) {
        const newDoc = await PDFDocument.create();
        const endPage = Math.min(i + chunkSize, totalPages);

        // Copy pages
        const copiedPages = await newDoc.copyPages(pdfDoc, Array.from({ length: endPage - i }, (_, k) => i + k));
        copiedPages.forEach(page => newDoc.addPage(page));

        const chunkBytes = await newDoc.save();
        chunks.push(Buffer.from(chunkBytes));
    }

    return chunks;
}
