import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0,
    maxOutputTokens: 8192,
  }
});

export const extractTransactionsWithGemini = async (text: string) => {
  const prompt = `
    Analyze the following bank statement text. It includes both "RAW PAGE TEXT" for context and a "TRANSACTION GRID" which is a spatial reconstruction of the page layout.

    1. Extract Statement Header Info (Account Number, IBAN, Currency, Period, Branch, etc.) from the top of the page.
    2. Extract ALL Transactions from the grid.

    JSON Schema:
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
    - DATA FIDELITY: Your primary goal is 100% extraction of every money-movement row. Absolute accuracy is required.
    - SPATIAL AWARENESS: Use the "TRANSACTION GRID" to understand columns. Each line is a literal horizontal row from the PDF.
    - EMPTY PAGES: If a page contains NO transactions (e.g., only headers or summary), return an empty "transactions" array []. This is NOT an error.
    - AMOUNT EXTRACTION: 
      - Debit = Money OUT (Withdrawals/Payments).
      - Credit = Money IN (Deposits/Interest).
      - If columns are ambiguous (e.g., one "Amount" column), use the Running Balance to determine direction.
    - DATE RECOGNITION: Convert all dates to YYYY-MM-DD. Use the leftmost date column.
    - MULTI-LINE NARRATIVES: Merge multi-line descriptions into a single string.
    - NUMERIC CLEANING: Remove currency symbols and commas. Ensure absolute positive numbers for debit/credit.
    
    Input:
    ${text}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const outText = response.text();

    try {
      return JSON.parse(outText);
    } catch (parseError) {
      // Fallback: Try to find a JSON object block {...} if parsing the full text fails
      const jsonMatch = outText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0].replace(/\\(?!"|\\|\/|b|f|n|r|t|u[0-9a-fA-F]{4})/g, ""));
        } catch (innerError) {
          throw parseError;
        }
      }
      throw parseError;
    }
  } catch (error) {
    console.error('Gemini extraction error:', error);
    throw error;
  }
};
