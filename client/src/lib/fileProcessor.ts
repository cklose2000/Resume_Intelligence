import mammoth from 'mammoth';

export interface ProcessedFile {
  content: string;
  fileName: string;
  fileType: string;
}

export async function processFile(file: File): Promise<ProcessedFile> {
  const fileName = file.name;
  const fileType = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    let content: string;

    switch (fileType) {
      case 'txt':
        content = await processTextFile(file);
        break;
      case 'docx':
        content = await processDocxFile(file);
        break;
      case 'pdf':
        content = await processPdfFile(file);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Clean and normalize the content
    content = cleanTextContent(content);

    return {
      content,
      fileName,
      fileType
    };
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(`Failed to process ${fileType.toUpperCase()} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };
    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
}

async function processDocxFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (error) {
        reject(new Error('Failed to extract text from DOCX file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read DOCX file'));
    reader.readAsArrayBuffer(file);
  });
}

async function processPdfFile(file: File): Promise<string> {
  // For now, we'll provide a basic PDF text extraction
  // In a production environment, you might want to use a more robust library
  // like PDF.js or pdf-parse, but these can be complex to set up in browser
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Basic PDF text extraction - this is very limited
        // For better PDF processing, consider using PDF.js or asking users to convert to DOCX/TXT
        let text = '';
        for (let i = 0; i < uint8Array.length; i++) {
          const char = String.fromCharCode(uint8Array[i]);
          if (char.match(/[a-zA-Z0-9\s.,!?;:()@\-]/)) {
            text += char;
          }
        }
        
        // Clean up the extracted text
        text = text
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s.,!?;:()@\-]/g, '')
          .trim();

        if (!text || text.length < 50) {
          reject(new Error('PDF text extraction failed. Please convert your PDF to DOCX or TXT format for better results.'));
          return;
        }

        resolve(text);
      } catch (error) {
        reject(new Error('Failed to extract text from PDF file. Please try converting to DOCX or TXT format.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read PDF file'));
    reader.readAsArrayBuffer(file);
  });
}

function cleanTextContent(content: string): string {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid content provided for cleaning');
  }

  return content
    // Remove non-printable characters except standard whitespace
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // Normalize line breaks consistently
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    
    // Clean up spacing while preserving intentional structure
    .replace(/[ \t]+/g, ' ')                    // Multiple spaces/tabs to single space
    .replace(/\n[ \t]+/g, '\n')                 // Remove indentation at line starts
    .replace(/[ \t]+\n/g, '\n')                 // Remove trailing whitespace
    
    // Preserve paragraph breaks but remove excessive empty lines
    .replace(/\n\s*\n\s*\n+/g, '\n\n')          // Multiple empty lines to double newline
    .replace(/^\s+|\s+$/g, '')                  // Trim start and end
    
    // Ensure content meets minimum quality standards
    .split('\n')
    .filter(line => line.trim().length > 0)     // Remove completely empty lines
    .join('\n');
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!file.name) {
    return { valid: false, error: 'File must have a name' };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  const minSize = 100; // 100 bytes minimum
  const allowedTypes = ['txt', 'pdf', 'docx'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  if (file.size < minSize) {
    return { valid: false, error: 'File appears to be too small or empty' };
  }

  const fileType = file.name.split('.').pop()?.toLowerCase();
  if (!fileType || !allowedTypes.includes(fileType)) {
    return { valid: false, error: 'Only .txt, .pdf, and .docx files are supported' };
  }

  // Additional MIME type validation for security
  const expectedMimeTypes = {
    'txt': ['text/plain'],
    'pdf': ['application/pdf'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  const expectedMimes = expectedMimeTypes[fileType as keyof typeof expectedMimeTypes];
  if (expectedMimes && !expectedMimes.includes(file.type) && file.type !== '') {
    return { valid: false, error: `File type mismatch. Expected ${fileType.toUpperCase()} file.` };
  }

  return { valid: true };
}