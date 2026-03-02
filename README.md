# Bank Statement Extraction Platform

A production-grade platform for extracting and reconciling bank statements from large PDFs using Google Document AI and Claude 3.5 Sonnet.

## Features
- **Large PDF Support**: Handles 200–300+ pages using async background processing.
- **Multiple File Upload**: Drag and drop multiple statements at once.
- **Async Processing**: Powered by BullMQ and Redis (WSL compatible).
- **Deterministic Reconciliation**: Balance checking and auto-correction logic.
- **Duplicate Prevention**: Hash-based duplicate detection.
- **Modern UI**: React, TailwindCSS, and shadcn/ui.

## Tech Stack
- **Backend**: Node.js, TypeScript, Express, MySQL, Redis, BullMQ.
- **AI/ML**: Google Document AI, Claude 3.5 Sonnet.
- **Frontend**: React, Vite, TanStack Query, TailwindCSS.

## Setup Instructions

### Prerequisites
1. **MySQL**: Create a database named `bank_statement_extractor`. Run `backend/schema.sql` to initialize tables.
2. **Redis**: Ensure Redis is running on `localhost:6379` (via WSL if on Windows).
3. **Google Cloud**:
   - Enable Document AI API.
   - Create a Processor (Custom Document Extractor or Form Parser).
   - Place your `service_account.json` in the root directory.
4. **Anthropic API**: Get an API key for Claude 3.5 Sonnet.

### Configuration
Update the `.env` file in the root directory with your credentials:
```env
GCP_PROJECT_ID=your-project-id
DOCAI_PROCESSOR_ID=your-processor-id
DOCAI_LOCATION=us
ANTHROPIC_API_KEY=your-api-key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_DATABASE=bank_statement_extractor
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Installation & Running

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.
The backend Swagger docs will be at `http://localhost:5000/docs`.

## System Architecture
1. **Upload**: Files are saved locally and jobs are queued in BullMQ.
2. **OCR**: Google Document AI extracts raw text and layout.
3. **Extraction**: Claude 3.5 Sonnet extracts structured transactions from text chunks.
4. **Logic**: Reconciliation engine validates balances and removes duplicates.
5. **Storage**: Final data is stored in MySQL for the dashboard.
