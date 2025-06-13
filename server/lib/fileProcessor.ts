import * as fs from 'fs/promises';
import * as path from 'path';
import mammoth from 'mammoth';

export interface ProcessedFile {
  content: string;
  fileName: string;
  fileType: string;
}

export async function processFile(filePath: string, originalName: string): Promise<ProcessedFile> {
  const fileExtension = path.extname(originalName).toLowerCase();
  
  try {
    switch (fileExtension) {
      case '.txt':
        return await processTxtFile(filePath, originalName);
      case '.pdf':
        return await processPdfFile(filePath, originalName);
      case '.docx':
        return await processDocxFile(filePath, originalName);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error(`Error processing file ${originalName}:`, error);
    throw new Error(`Failed to process file: ${originalName}`);
  }
}

async function processTxtFile(filePath: string, originalName: string): Promise<ProcessedFile> {
  const content = await fs.readFile(filePath, 'utf-8');
  return {
    content: content.trim(),
    fileName: originalName,
    fileType: 'txt'
  };
}

async function processPdfFile(filePath: string, originalName: string): Promise<ProcessedFile> {
  // For now, return a placeholder - in a real implementation, you'd use pdf-parse
  // const pdfParse = require('pdf-parse');
  // const dataBuffer = await fs.readFile(filePath);
  // const data = await pdfParse(dataBuffer);
  // return { content: data.text, fileName: originalName, fileType: 'pdf' };
  
  throw new Error("PDF processing not yet implemented. Please use .txt or .docx files.");
}

async function processDocxFile(filePath: string, originalName: string): Promise<ProcessedFile> {
  try {
    // Use convertToHtml to preserve document structure, then extract text with line breaks
    const result = await mammoth.convertToHtml({ path: filePath });
    
    // Convert HTML to plain text while preserving paragraph structure
    let content = result.value
      .replace(/<p[^>]*>/g, '') // Remove opening paragraph tags
      .replace(/<\/p>/g, '\n\n') // Replace closing paragraph tags with double line breaks
      .replace(/<br[^>]*>/g, '\n') // Replace line breaks
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .replace(/\n\n\n+/g, '\n\n') // Normalize multiple line breaks
      .trim();
    
    if (!content) {
      throw new Error('No text content found in DOCX file');
    }
    
    return {
      content,
      fileName: originalName,
      fileType: 'docx'
    };
  } catch (error) {
    throw new Error(`Failed to process DOCX file: ${error.message}`);
  }
}

export async function saveUploadedFile(fileBuffer: Buffer, originalName: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  
  // Ensure upload directory exists
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  
  const fileName = `${Date.now()}-${originalName}`;
  const filePath = path.join(uploadDir, fileName);
  
  await fs.writeFile(filePath, fileBuffer);
  return filePath;
}

export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to cleanup file ${filePath}:`, error);
  }
}
