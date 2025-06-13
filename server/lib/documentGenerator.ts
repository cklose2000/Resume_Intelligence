import * as fs from 'fs/promises';
import * as path from 'path';

export interface DocumentTemplate {
  name: string;
  description: string;
}

export const templates: DocumentTemplate[] = [
  { name: "Modern Professional", description: "Clean, ATS-friendly layout" },
  { name: "Executive", description: "Sophisticated design for senior roles" },
  { name: "Creative", description: "Stylish layout for creative industries" },
  { name: "Technical", description: "Optimized for technical positions" }
];

export async function generateDocument(
  content: string,
  templateName: string,
  format: string,
  fileName: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'generated-docs');
  
  // Ensure output directory exists
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const outputFileName = `${timestamp}-${fileName}.${format}`;
  const outputPath = path.join(outputDir, outputFileName);
  
  switch (format) {
    case 'txt':
      await generateTxtDocument(content, outputPath);
      break;
    case 'pdf':
      await generatePdfDocument(content, templateName, outputPath);
      break;
    case 'docx':
      await generateDocxDocument(content, templateName, outputPath);
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
  
  return outputPath;
}

async function generateTxtDocument(content: string, outputPath: string): Promise<void> {
  await fs.writeFile(outputPath, content, 'utf-8');
}

async function generatePdfDocument(content: string, templateName: string, outputPath: string): Promise<void> {
  // For now, create a simple text file - in a real implementation, you'd use puppeteer or similar
  // const puppeteer = require('puppeteer');
  // Generate HTML with the template, then convert to PDF
  
  const htmlContent = generateHtmlTemplate(content, templateName);
  await fs.writeFile(outputPath.replace('.pdf', '.html'), htmlContent, 'utf-8');
  
  // Placeholder for PDF generation
  throw new Error("PDF generation not yet implemented. Use TXT format instead.");
}

async function generateDocxDocument(content: string, templateName: string, outputPath: string): Promise<void> {
  // For now, create a simple text file - in a real implementation, you'd use the docx library
  // const docx = require('docx');
  // Generate document with proper formatting based on template
  
  await fs.writeFile(outputPath.replace('.docx', '.txt'), content, 'utf-8');
  
  // Placeholder for DOCX generation
  throw new Error("DOCX generation not yet implemented. Use TXT format instead.");
}

function generateHtmlTemplate(content: string, templateName: string): string {
  const styles = getTemplateStyles(templateName);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resume</title>
    <style>
        ${styles}
    </style>
</head>
<body>
    <div class="resume">
        ${content.split('\n').map(line => `<p>${line}</p>`).join('')}
    </div>
</body>
</html>`;
}

function getTemplateStyles(templateName: string): string {
  const baseStyles = `
    body { 
      font-family: 'Times New Roman', serif; 
      line-height: 1.6; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .resume { background: white; }
    p { margin: 8px 0; }
  `;
  
  switch (templateName) {
    case "Modern Professional":
      return baseStyles + `
        body { font-family: 'Arial', sans-serif; }
        h1, h2, h3 { color: #2563eb; }
      `;
    case "Executive":
      return baseStyles + `
        body { font-family: 'Georgia', serif; }
        h1, h2, h3 { color: #1f2937; border-bottom: 2px solid #e5e7eb; }
      `;
    case "Creative":
      return baseStyles + `
        body { font-family: 'Helvetica', sans-serif; }
        h1, h2, h3 { color: #7c3aed; }
      `;
    case "Technical":
      return baseStyles + `
        body { font-family: 'Courier New', monospace; }
        h1, h2, h3 { color: #059669; }
      `;
    default:
      return baseStyles;
  }
}
