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
  const rawContent = await fs.readFile(filePath, 'utf-8');
  
  // Clean up and restructure content for better readability
  const content = rawContent
    .replace(/\r\n/g, '\n')                    // Normalize line endings
    .replace(/\r/g, '\n')                      // Convert remaining carriage returns
    .replace(/[ \t]+/g, ' ')                   // Normalize spaces and tabs
    .replace(/^\s+|\s+$/gm, '')                // Trim each line
    
    // Add proper spacing around resume sections
    .replace(/(PROFESSIONAL EXPERIENCE|EDUCATION|SKILLS|CORE COMPETENCIES|TECHNICAL SKILLS|CERTIFICATIONS|PROJECTS|ACHIEVEMENTS|SUMMARY|OBJECTIVE|CONTACT)/gi, '\n\n$1\n\n')
    .replace(/(\d{4}\s*[-–—]\s*\d{4}|\d{4}\s*[-–—]\s*Present)/gi, '\n\n$1\n')  // Date ranges
    
    // Clean up excessive line breaks and rebuild structure
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')                // Normalize excessive line breaks
    .trim();
  
  return {
    content,
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
    // Use convertToHtml to preserve document structure
    const result = await mammoth.convertToHtml({ path: filePath });
    
    // Convert HTML to clean plain text with proper formatting
    let content = result.value
      .replace(/<p[^>]*>/g, '') // Remove opening paragraph tags
      .replace(/<\/p>/g, '\n\n') // Replace closing paragraph tags with double line breaks
      .replace(/<br[^>]*>/g, '\n') // Replace line breaks
      .replace(/<strong[^>]*>(.*?)<\/strong>/g, '$1') // Remove bold tags but keep content
      .replace(/<b[^>]*>(.*?)<\/b>/g, '$1') // Remove bold tags
      .replace(/<em[^>]*>(.*?)<\/em>/g, '$1') // Remove italic tags
      .replace(/<i[^>]*>(.*?)<\/i>/g, '$1') // Remove italic tags
      .replace(/<u[^>]*>(.*?)<\/u>/g, '$1') // Remove underline tags
      .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<') // Replace HTML entities
      .replace(/&gt;/g, '>') // Replace HTML entities
      .replace(/&quot;/g, '"') // Replace HTML entities
      .replace(/&#39;/g, "'") // Replace HTML entities
      .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs
      .replace(/^\s+|\s+$/gm, '') // Trim each line
      
      // Add proper spacing around resume sections
      .replace(/(PROFESSIONAL EXPERIENCE|EDUCATION|SKILLS|CORE COMPETENCIES|TECHNICAL SKILLS|CERTIFICATIONS|PROJECTS|ACHIEVEMENTS|SUMMARY|OBJECTIVE|CONTACT)/gi, '\n\n$1\n\n')
      .replace(/(\d{4}\s*[-–—]\s*\d{4}|\d{4}\s*[-–—]\s*Present)/gi, '\n\n$1\n')  // Date ranges
      
      // Clean up excessive line breaks and rebuild structure
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Normalize excessive line breaks
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
    throw new Error(`Failed to process DOCX file: ${(error as Error).message}`);
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
