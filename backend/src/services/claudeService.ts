import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export const extractTransactionsFromText = async (text: string) => {
    const prompt = `
    Extract bank transactions from the following text. 
    Return a JSON array of objects with the following schema:
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "debit": number | null,
      "credit": number | null,
      "balance": number | null
    }

    The text may contain multiple pages and tables. 
    If a value is missing, use null.
    Ensure numeric values are parsed correctly.

    Text:
    ${text}
  `;

    const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [
            {
                role: 'user',
                content: prompt,
            },
        ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
        const jsonStr = content.text.match(/\[[\s\S]*\]/)?.[0];
        if (jsonStr) {
            return JSON.parse(jsonStr);
        }
    }
    return [];
};

export const chunkText = (text: string, maxRows: number = 80) => {
    // This is a simplified chunking logic. 
    // In a real scenario, we might want to split by lines or tokens.
    const lines = text.split('\n');
    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += 200) { // Approx 200 lines per chunk
        chunks.push(lines.slice(i, i + 200).join('\n'));
    }
    return chunks;
};
