/**
 * Normalizes various date formats into YYYY-MM-DD for MySQL.
 * Supported formats: DD/MM/YYYY, MM/DD/YYYY (fallback), YYYY-MM-DD, DD-MM-YYYY, etc.
 * @param dateStr The raw date string from LLM extraction
 * @returns Normalized date string in YYYY-MM-DD format, or original string if parsing fails
 */
export function normalizeDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    // Remove any leading/trailing whitespace and hidden characters
    let cleanDate = dateStr.trim().replace(/[^\d\/\-\.]/g, '');

    // Already in YYYY-MM-DD?
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        return cleanDate;
    }

    // Common delimiters: / - .
    const parts = cleanDate.split(/[\/\-\.]/);
    if (parts.length !== 3) return cleanDate; // Unrecognized format

    let year = parts[0];
    let month = parts[1];
    let day = parts[2];

    // Case 1: DD/MM/YYYY or MM/DD/YYYY
    if (parts[2].length === 4) {
        year = parts[2];
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);

        // Heuristic for Global Format (DD/MM/YYYY) vs US (MM/DD/YYYY)
        // Most bank statements use DD/MM/YYYY outside the US.
        // If p1 > 12, it must be day.
        if (p1 > 12) {
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
        } else if (p2 > 12) {
            // If p2 > 12, it must be day
            day = parts[1].padStart(2, '0');
            month = parts[0].padStart(2, '0');
        } else {
            // Ambiguous (both <= 12). Default to DD/MM/YYYY
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
        }
    }
    // Case 2: YYYY/MM/DD
    else if (parts[0].length === 4) {
        year = parts[0];
        month = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
    }
    // Case 3: DD/MM/YY (assuming 20xx)
    else if (parts[2].length === 2) {
        year = `20${parts[2]}`;
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
    }

    // Final sanity check
    if (year.length === 4 && month.length === 2 && day.length === 2) {
        return `${year}-${month}-${day}`;
    }

    return cleanDate;
}
