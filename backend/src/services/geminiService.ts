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

    return parseRobustJson(outText);
  } catch (error) {
    console.error('Gemini extraction error:', error);
    throw error;
  }
};

/**
 * Robustly parses JSON from AI output, handling markdown blocks, 
 * trailing commas, and other common syntax issues.
 */
function parseRobustJson(text: string): any {
  // 1. Try direct parse
  try {
    return JSON.parse(text);
  } catch (e) { }

  // 2. Extract JSON block from potential markdown text
  let jsonString = text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonString = jsonMatch[0];
  }

  // 3. Clean common AI artifacts
  // Remove markdown fences
  jsonString = jsonString.replace(/```json\n?|```/g, '');

  // Remove potential single-line comments // ...
  jsonString = jsonString.replace(/\/\/.*/g, '');

  // Convert single-quoted values/keys to double-quoted
  // This is a bit tricky but works for most JSON-like structures
  jsonString = jsonString.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

  // Quote unquoted keys (e.g., { account_number: "..." })
  // Matches a key followed by a colon
  jsonString = jsonString.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');

  // Remove trailing commas before closing braces/brackets
  jsonString = jsonString.replace(/,\s*([\}\]])/g, '$1');

  try {
    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error('Final JSON parse failed:', error.message);
    console.error('Attempted to parse:', jsonString);
    throw new Error(`Failed to parse Gemini response: ${error.message}`);
  }
}
