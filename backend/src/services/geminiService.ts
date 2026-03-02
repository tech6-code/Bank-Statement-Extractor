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
    Analyze the following bank statement text (which may be a markdown table or raw OCR).
    1. Extract Statement Header Info (Account Number, IBAN, Currency, Period, Branch, etc.).
    2. Extract ALL Transactions.

    Accuracy is critical (100% capture). 
    
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
    - DATA FIDELITY: Every single row in the "TRANSACTION GRID" that represents a money movement MUST be extracted. 
    - GRID FORMAT: Each line below the "### TRANSACTION GRID" header represents a horizontal line in the original PDF.
    - DATE RECOGNITION: Convert all dates to YYYY-MM-DD. 
      CRITICAL: Identify the specific grid column for "Transaction Date" (e.g., Column 1). 
      STRICT FORBIDDEN: NEVER use dates found in the Narrative/Description. 
      Example: If a cell in the Narrative column says "SETT 310825", IGNORE IT. Use the date from the Date column.
      STRICT FORBIDDEN: DO NOT guess months. NEVER default to the 1st.
    - COLUMN MAPPING:
      - Date: Use the identified Date column from the grid.
      - Description: Use the Narrative/Description column.
      - Debit/Credit: Use the respective amount columns.
      - Balance: Use the Running Balance column.
    - NUMERIC VALUES: Return absolute positive numbers.
    - MULTI-LINE NARRATIVES: If a transaction description spans multiple grid rows but has only one date/amount pair, merge them.
    - HEADER INFO: Extract metadata from the start of the text into header_info.

    Input Transaction Grid (Spatial OCR):
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
