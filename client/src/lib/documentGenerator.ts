import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface DocumentTemplate {
  name: string;
  description: string;
}

export const templates: DocumentTemplate[] = [
  { name: "Professional", description: "Clean, modern resume template" },
  { name: "Modern", description: "Contemporary design with accent colors" },
  { name: "Classic", description: "Traditional, professional layout" },
  { name: "Minimal", description: "Simple, clean design" }
];

export async function generateClientDocument(
  content: string, 
  templateName: string, 
  format: string
): Promise<{ content: string; filename: string; format: string }> {
  const fileName = `resume_${Date.now()}`;
  
  switch (format.toLowerCase()) {
    case 'docx':
      return generateDocxDocument(content, templateName, fileName);
    case 'txt':
      return generateTextDocument(content, fileName);
    case 'pdf':
      // For PDF, we'll generate HTML and let the user print to PDF
      return generateHtmlDocument(content, templateName, fileName);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

async function generateDocxDocument(content: string, templateName: string, fileName: string) {
  const sections = parseResumeContent(content);
  const doc = createDocxFromSections(sections, templateName);
  
  const blob = await Packer.toBlob(doc);
  const base64 = await blobToBase64(blob);
  
  return {
    content: base64,
    filename: `${fileName}.docx`,
    format: 'docx'
  };
}

function generateTextDocument(content: string, fileName: string) {
  const base64 = btoa(content);
  
  return Promise.resolve({
    content: base64,
    filename: `${fileName}.txt`,
    format: 'txt'
  });
}

function generateHtmlDocument(content: string, templateName: string, fileName: string) {
  const sections = parseResumeContent(content);
  const html = createHtmlFromSections(sections, templateName);
  const base64 = btoa(html);
  
  return Promise.resolve({
    content: base64,
    filename: `${fileName}.html`,
    format: 'html'
  });
}

function parseResumeContent(content: string) {
  const lines = content.split('\n').filter(line => line.trim());
  const sections: { [key: string]: string[] } = {};
  let currentSection = 'HEADER';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this is a section header (all caps, common resume sections)
    if (trimmedLine.match(/^[A-Z\s&-]{3,}$/) && 
        (trimmedLine.includes('EXPERIENCE') || 
         trimmedLine.includes('EDUCATION') || 
         trimmedLine.includes('SKILLS') || 
         trimmedLine.includes('COMPETENCIES') ||
         trimmedLine.includes('SUMMARY') ||
         trimmedLine.includes('OBJECTIVE') ||
         trimmedLine.includes('PROJECTS') ||
         trimmedLine.includes('CERTIFICATIONS'))) {
      currentSection = trimmedLine;
      sections[currentSection] = [];
    } else {
      if (!sections[currentSection]) {
        sections[currentSection] = [];
      }
      sections[currentSection].push(trimmedLine);
    }
  }
  
  return sections;
}

function createDocxFromSections(sections: { [key: string]: string[] }, templateName: string) {
  const children: Paragraph[] = [];
  
  // Add header section (name and contact info)
  if (sections.HEADER) {
    sections.HEADER.forEach((line, index) => {
      children.push(new Paragraph({
        children: [new TextRun({ text: line, bold: index === 0, size: index === 0 ? 32 : 22 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: index === 0 ? 200 : 100 }
      }));
    });
  }
  
  // Add other sections
  Object.entries(sections).forEach(([sectionName, sectionContent]) => {
    if (sectionName === 'HEADER') return;
    
    // Section header
    children.push(new Paragraph({
      children: [new TextRun({ text: sectionName, bold: true, size: 26 })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }));
    
    // Section content
    sectionContent.forEach(line => {
      children.push(new Paragraph({
        children: [new TextRun({ text: line, size: 22 })],
        spacing: { after: 120 }
      }));
    });
  });
  
  return new Document({
    sections: [{
      properties: {},
      children
    }]
  });
}

function createHtmlFromSections(sections: { [key: string]: string[] }, templateName: string): string {
  let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Resume</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 8.5in; 
            margin: 0 auto; 
            padding: 1in; 
            line-height: 1.4;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .contact { font-size: 14px; margin-bottom: 5px; }
        .section { margin-bottom: 25px; }
        .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 10px; 
            border-bottom: 1px solid #ccc; 
            padding-bottom: 3px;
        }
        .section-content { margin-bottom: 8px; }
        @media print {
            body { margin: 0; padding: 0.5in; }
        }
    </style>
</head>
<body>
`;

  // Add header
  if (sections.HEADER) {
    html += '<div class="header">';
    sections.HEADER.forEach((line, index) => {
      const className = index === 0 ? 'name' : 'contact';
      html += `<div class="${className}">${line}</div>`;
    });
    html += '</div>';
  }

  // Add other sections
  Object.entries(sections).forEach(([sectionName, sectionContent]) => {
    if (sectionName === 'HEADER') return;
    
    html += `<div class="section">`;
    html += `<div class="section-title">${sectionName}</div>`;
    sectionContent.forEach(line => {
      html += `<div class="section-content">${line}</div>`;
    });
    html += `</div>`;
  });

  html += `
    <script>
        // Auto-print for PDF generation
        window.onload = function() {
            setTimeout(() => {
                window.print();
            }, 1000);
        };
    </script>
</body>
</html>`;

  return html;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Function to download generated documents
export async function downloadDocument(content: string, filename: string, format: string) {
  const binaryString = atob(content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  let mimeType: string;
  switch (format) {
    case 'docx':
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      break;
    case 'txt':
      mimeType = 'text/plain';
      break;
    case 'html':
      mimeType = 'text/html';
      break;
    default:
      mimeType = 'application/octet-stream';
  }
  
  const blob = new Blob([bytes], { type: mimeType });
  saveAs(blob, filename);
}