import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const extractTransactionsFromText = async (text: string) => {
  const prompt = `
    Analyze the following bank statement text.
    1. Extract Statement Header Info (Account Number, IBAN, Currency, Period, Branch, etc.).
    2. Extract ALL Transactions.

    Return a JSON object with the following schema:
    {
      "header_info": {
        "account_number": "string",
        "iban": "string",
        "currency": "string",
        "period": "string",
        "branch": "string",
        "opening_balance": number | null,
        "closing_balance": number | null
      },
      "transactions": [
        {
          "date": "YYYY-MM-DD",
          "description": "string",
          "debit": number | null,
          "credit": number | null,
          "balance": number | null
        }
      ]
    }

    Rules:
    - DATA FIDELITY: Your primary goal is 100% extraction of every money-movement row.
    - SPATIAL AWARENESS: Each line in the input below "### TRANSACTION GRID" is a literal horizontal line from the PDF. Preserve this row-based structure.
    - AMOUNT EXTRACTION: 
      - Debit = Money OUT (Withdrawals/Payments).
      - Credit = Money IN (Deposits/Interest).
      - If a column is ambiguous, use the Running Balance to determine the direction.
    - DATE RECOGNITION: Convert all dates to YYYY-MM-DD. 
      CRITICAL: Use the leftmost date column. NEVER extract dates from the description text.
    - MULTI-LINE NARRATIVES: If a description spans multiple lines but belongs to one transaction (one date/amount), MERGE the description text into a single string.
    - NUMERIC CLEANING: Remove currency symbols and commas. Ensure absolute positive numbers for debit/credit.
    - HEADER INFO: Carefully extract Account Number, IBAN, and Opening/Closing balances from the top metadata.
    
    Input Transaction Grid (Spatial OCR):
    ${text}
  `;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0].replace(/\\(?!"|\\|\/|b|f|n|r|t|u[0-9a-fA-F]{4})/g, ""));
      } catch (e) {
        console.error("Claude JSON parse error:", e);
      }
    }
  }
  return { header_info: {}, transactions: [] };
};

export const chunkText = (text: string, maxRows: number = 500) => {
  // Splits text into chunks of approx 500 lines. 
  // This is optimal for Gemini 2.0 Flash's large context window while maintaining focus.
  const lines = text.split('\n');
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += 500) {
    chunks.push(lines.slice(i, i + 500).join('\n'));
  }
  return chunks;
};
