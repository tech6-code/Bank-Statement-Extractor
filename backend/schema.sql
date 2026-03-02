CREATE DATABASE IF NOT EXISTS bank_statement_extractor;
USE bank_statement_extractor;

CREATE TABLE IF NOT EXISTS extraction_jobs (
    id VARCHAR(255) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    total_pages INT DEFAULT 0,
    processed_pages INT DEFAULT 0,
    status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
    transaction_count INT DEFAULT 0,
    duplicate_count INT DEFAULT 0,
    reconciliation_errors_count INT DEFAULT 0,
    confidence DECIMAL(5, 2) DEFAULT 0.00,
    raw_data_saved BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(255),
    transaction_date DATE,
    description TEXT,
    debit DECIMAL(15, 2),
    credit DECIMAL(15, 2),
    balance DECIMAL(15, 2),
    currency VARCHAR(10),
    reconciliation_status ENUM('valid', 'mismatch', 'corrected') DEFAULT 'valid',
    validation_error TEXT,
    FOREIGN KEY (job_id) REFERENCES extraction_jobs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_transaction (job_id, transaction_date, description(255), debit, credit, balance)
);

CREATE TABLE IF NOT EXISTS raw_extracted_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(255),
    page_number INT,
    raw_row_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES extraction_jobs(id) ON DELETE CASCADE
);
