import { describe, it, expect } from 'vitest';

// Extract the parseTransactions function for testing
function parseTransactions(text: string) {
  console.log(text)
  const transactions: Array<{date: string, description: string, amount: string, type: string}> = [];
  
  // Split text into lines and clean them
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Reconstruct fragmented lines by joining related content
  const reconstructedLines: string[] = [];
  let currentLine = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(line);
    
    // Check if this line contains an amount (end of transaction)
    const amountMatch = line.match(/IDR\s*([\d,]+\.?\d*)/i);
    
    if (amountMatch) {
      // This line contains an amount, so it's the end of a transaction
      currentLine += ' ' + line;
      reconstructedLines.push(currentLine.trim());
      currentLine = '';
    } else {
      // This line is part of a transaction, add it to current line
      currentLine += ' ' + line;
    }
  }
  
  // Process each reconstructed transaction line
  for (const line of reconstructedLines) {
    console.log(line);
    const transaction: any = { date: '', description: '', amount: '', type: '' };
    
    // Extract date (look for patterns like "09 Sep 2025" or "Sep 2025")
    const dateMatch = line.match(/(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i);
    if (dateMatch) {
      transaction.date = dateMatch[1];
    }
    
    // Extract amount (IDR with numbers and commas)
    const amountMatch = line.match(/IDR\s*([\d,]+\.?\d*)/i);
    if (amountMatch) {
      transaction.amount = `IDR ${amountMatch[1]}`;
    }
    
    // Extract transaction type
    const typeMatch = line.match(/(TRSF E-BANKING CR|TRANSAKSI DEBIT|TRANSFER|CREDIT|DEBIT)/i);
    if (typeMatch) {
      transaction.type = typeMatch[1];
    }
    
    // The description is the entire line minus the extracted parts
    let description = line;
    
    // Remove date from description
    if (dateMatch) {
      description = description.replace(dateMatch[0], '').trim();
    }
    
    // Remove amount from description
    if (amountMatch) {
      description = description.replace(amountMatch[0], '').trim();
    }
    
    // Remove transaction type from description
    if (typeMatch) {
      description = description.replace(typeMatch[0], '').trim();
    }
    
    // Clean up extra spaces and common OCR artifacts
    description = description
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/[|]/g, '')   // Remove pipe characters
      .replace(/^\d+\s+/, '') // Remove leading numbers
      .trim();
    
    transaction.description = description;
    
    // Only add transaction if we have essential data
    if (transaction.date && transaction.amount) {
      transactions.push(transaction);
    }
  }
  
  return transactions;
}

describe('parseTransactions', () => {
  it('should parse a single transaction with all fields', () => {
    // TODO: Implement test
  });

  it('should parse multiple transactions', () => {
    // TODO: Implement test
  });

  it('should extract dates in DD MMM YYYY format', () => {
    // TODO: Implement test
  });

  it('should extract IDR amounts with commas', () => {
    // TODO: Implement test
  });

  it('should extract IDR amounts with decimals', () => {
    // TODO: Implement test
  });

  it('should extract transaction types (TRSF E-BANKING CR)', () => {
    // TODO: Implement test
  });

  it('should extract transaction types (TRANSAKSI DEBIT)', () => {
    // TODO: Implement test
  });

  it('should extract transaction types (TRANSFER)', () => {
    // TODO: Implement test
  });

  it('should extract transaction types (CREDIT)', () => {
    // TODO: Implement test
  });

  it('should extract transaction types (DEBIT)', () => {
    // TODO: Implement test
  });

  it('should clean up descriptions by removing extracted parts', () => {
    // TODO: Implement test
  });

  it('should handle fragmented lines by reconstructing them', () => {
    // TODO: Implement test
  });

  it('should remove OCR artifacts from descriptions', () => {
    // TODO: Implement test
  });

  it('should remove pipe characters from descriptions', () => {
    // TODO: Implement test
  });

  it('should remove leading numbers from descriptions', () => {
    // TODO: Implement test
  });

  it('should normalize multiple spaces to single space', () => {
    // TODO: Implement test
  });

  it('should filter out transactions without date', () => {
    // TODO: Implement test
  });

  it('should filter out transactions without amount', () => {
    // TODO: Implement test
  });

  it('should handle empty text input', () => {
    // TODO: Implement test
  });

  it('should handle text with no valid transactions', () => {
    // TODO: Implement test
  });

  it('should handle case insensitive matching', () => {
    // TODO: Implement test
  });

  it('should handle amounts with different IDR formats', () => {
    // TODO: Implement test
  });

  it('should handle complex multi-line transactions', () => {
    // TODO: Implement test
  });

  it('should preserve transaction order', () => {
    // TODO: Implement test
  });
});

