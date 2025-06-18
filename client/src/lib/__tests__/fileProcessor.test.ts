import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processFile, validateFile, ProcessedFile } from '../fileProcessor';
import mammoth from 'mammoth';

// Mock mammoth library
vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn(),
    extractRawText: vi.fn(),
  },
}));

// Mock DocumentStructureParser
vi.mock('../documentStructure', () => ({
  DocumentStructureParser: vi.fn().mockImplementation((content) => ({
    parse: () => ({
      contact: { name: 'Test User', email: 'test@example.com' },
      summary: 'Test summary',
      experience: [],
      education: [],
      skills: [],
    }),
    toHTML: () => '<h1>Test User</h1><p>test@example.com</p>',
  })),
}));

describe('fileProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processFile', () => {
    describe('Text file processing', () => {
      it('should process valid text file', async () => {
        const textContent = `JOHN DOE
Software Engineer
john.doe@email.com

EXPERIENCE
Senior Developer at Tech Corp`;

        const file = new File([textContent], 'resume.txt', { type: 'text/plain' });
        
        const result = await processFile(file);
        
        expect(result).toMatchObject({
          content: expect.stringContaining('JOHN DOE'),
          fileName: 'resume.txt',
          fileType: 'txt',
          structure: expect.objectContaining({
            contact: expect.objectContaining({
              name: 'Test User',
              email: 'test@example.com',
            }),
          }),
          htmlContent: expect.stringContaining('<h1>Test User</h1>'),
        });
      });

      it('should handle empty text file', async () => {
        const file = new File([''], 'empty.txt', { type: 'text/plain' });
        
        const result = await processFile(file);
        
        expect(result.content).toBe('');
        expect(result.fileType).toBe('txt');
      });

      it('should handle text file with special characters', async () => {
        const specialContent = 'José O\'Connor\nSoftware Engineer @ Tech & Co.\nSkills: C++ & C#';
        const file = new File([specialContent], 'special.txt', { type: 'text/plain' });
        
        const result = await processFile(file);
        
        expect(result.content).toContain('José O\'Connor');
        expect(result.content).toContain('C++ & C#');
      });
    });

    describe('DOCX file processing', () => {
      it('should process valid DOCX file', async () => {
        const mockArrayBuffer = new ArrayBuffer(8);
        const file = new File([mockArrayBuffer], 'resume.docx', { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });

        vi.mocked(mammoth).convertToHtml.mockResolvedValue({
          value: '<h1>JOHN DOE</h1><p>Software Engineer</p>',
          messages: [],
        });

        const result = await processFile(file);
        
        expect(mammoth.convertToHtml).toHaveBeenCalledWith(
          { arrayBuffer: mockArrayBuffer },
          expect.objectContaining({
            styleMap: expect.arrayContaining([
              expect.stringContaining('Heading 1'),
              expect.stringContaining('Heading 2'),
            ]),
          })
        );
        
        expect(result.fileType).toBe('docx');
        expect(result.structure).toBeDefined();
      });

      it('should fall back to raw text extraction on HTML conversion failure', async () => {
        const mockArrayBuffer = new ArrayBuffer(8);
        const file = new File([mockArrayBuffer], 'resume.docx', { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });

        vi.mocked(mammoth).convertToHtml.mockRejectedValue(new Error('Conversion failed'));
        vi.mocked(mammoth).extractRawText.mockResolvedValue({
          value: 'Raw text content',
          messages: [],
        });

        const result = await processFile(file);
        
        expect(mammoth.extractRawText).toHaveBeenCalled();
        expect(result.content).toBe('Raw text content');
      });

      it('should preserve document structure from DOCX', async () => {
        const file = new File([new ArrayBuffer(8)], 'structured.docx', { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });

        vi.mocked(mammoth).convertToHtml.mockResolvedValue({
          value: `
            <h1>JANE SMITH</h1>
            <p>jane@example.com</p>
            <h2>PROFESSIONAL EXPERIENCE</h2>
            <h3>Senior Manager - Big Corp</h3>
            <p>2020 - Present</p>
            <ul>
              <li>Led team of 10</li>
              <li>Increased revenue by 50%</li>
            </ul>
          `,
          messages: [],
        });

        const result = await processFile(file);
        
        expect(result.content).toContain('JANE SMITH');
        expect(result.content).toContain('PROFESSIONAL EXPERIENCE');
        expect(result.content).toContain('• Led team of 10');
      });
    });

    describe('PDF file processing', () => {
      it('should process PDF file with basic text extraction', async () => {
        const pdfContent = new Uint8Array([
          // Simulated PDF content with text
          ...Array.from('John Doe Software Engineer').map(c => c.charCodeAt(0))
        ]);
        
        const file = new File([pdfContent], 'resume.pdf', { type: 'application/pdf' });
        
        const result = await processFile(file);
        
        expect(result.fileType).toBe('pdf');
        expect(result.content).toContain('John Doe Software Engineer');
      });

      it('should show error for PDF with insufficient text', async () => {
        const file = new File([new Uint8Array(10)], 'empty.pdf', { type: 'application/pdf' });
        
        await expect(processFile(file)).rejects.toThrow(/PDF text extraction failed/);
      });

      it('should handle binary PDF data', async () => {
        // Create a buffer with enough valid ASCII characters
        const validChars = 'Lorem ipsum dolor sit amet consectetur adipiscing elit '.repeat(10);
        const pdfContent = new Uint8Array(Array.from(validChars).map(c => c.charCodeAt(0)));
        
        const file = new File([pdfContent], 'binary.pdf', { type: 'application/pdf' });
        
        const result = await processFile(file);
        
        expect(result.content).toContain('Lorem ipsum');
      });
    });

    describe('Unsupported file types', () => {
      it('should reject unsupported file types', async () => {
        const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
        
        await expect(processFile(file)).rejects.toThrow('Unsupported file type: jpg');
      });

      it('should handle files without extension', async () => {
        const file = new File(['content'], 'resume', { type: '' });
        
        await expect(processFile(file)).rejects.toThrow('Unsupported file type');
      });
    });

    describe('Content cleaning', () => {
      it('should clean and normalize text content', async () => {
        const messyContent = `JOHN   DOE\r\n\r\n\r\n
        
        
        Software\tEngineer\t\t
        
        Extra    spaces     everywhere`;
        
        const file = new File([messyContent], 'messy.txt', { type: 'text/plain' });
        
        const result = await processFile(file);
        
        // Should normalize whitespace
        expect(result.content).not.toMatch(/\t/); // No tabs
        expect(result.content).not.toMatch(/\r/); // No carriage returns
        expect(result.content).not.toMatch(/\s{3,}/); // No triple+ spaces
        expect(result.content).not.toMatch(/\n{4,}/); // No quadruple+ newlines
      });

      it('should preserve section headers', async () => {
        const content = `JOHN DOE

PROFESSIONAL EXPERIENCE

Senior Developer
Tech Corp
2020 - Present

EDUCATION

BS Computer Science`;
        
        const file = new File([content], 'headers.txt', { type: 'text/plain' });
        
        const result = await processFile(file);
        
        expect(result.content).toContain('PROFESSIONAL EXPERIENCE');
        expect(result.content).toContain('EDUCATION');
      });

      it('should preserve bullet points', async () => {
        const content = `Experience:
• Led development team
• Improved performance by 50%
- Reduced costs by 30%
* Mentored junior developers`;
        
        const file = new File([content], 'bullets.txt', { type: 'text/plain' });
        
        const result = await processFile(file);
        
        expect(result.content).toContain('• Led development team');
        expect(result.content).toContain('- Reduced costs');
        expect(result.content).toContain('* Mentored');
      });

      it('should remove non-printable characters', async () => {
        const contentWithControlChars = `John Doe\x00\x01\x02Software Engineer\x1F`;
        const file = new File([contentWithControlChars], 'control.txt', { type: 'text/plain' });
        
        const result = await processFile(file);
        
        expect(result.content).not.toMatch(/[\x00-\x1F]/);
        expect(result.content).toContain('John Doe');
        expect(result.content).toContain('Software Engineer');
      });
    });

    describe('Error handling', () => {
      it('should handle file read errors', async () => {
        const file = new File(['content'], 'error.txt', { type: 'text/plain' });
        
        // Mock FileReader to throw error
        const originalFileReader = global.FileReader;
        global.FileReader = vi.fn().mockImplementation(() => ({
          readAsText: function() {
            this.onerror();
          },
          readAsArrayBuffer: function() {
            this.onerror();
          },
        })) as any;
        
        await expect(processFile(file)).rejects.toThrow('Failed to read text file');
        
        global.FileReader = originalFileReader;
      });

      it('should provide specific error messages', async () => {
        const file = new File([''], 'test.xyz', { type: 'application/xyz' });
        
        try {
          await processFile(file);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Failed to process XYZ file');
        }
      });
    });
  });

  describe('validateFile', () => {
    it('should validate valid text file', () => {
      const file = new File(['content'], 'resume.txt', { type: 'text/plain' });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate valid DOCX file', () => {
      const file = new File([new ArrayBuffer(1000)], 'resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
    });

    it('should validate valid PDF file', () => {
      const file = new File([new ArrayBuffer(1000)], 'resume.pdf', { 
        type: 'application/pdf' 
      });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const largeContent = new ArrayBuffer(11 * 1024 * 1024); // 11MB
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('less than 10MB');
    });

    it('should reject files that are too small', () => {
      const file = new File([''], 'empty.txt', { type: 'text/plain' });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too small or empty');
    });

    it('should reject unsupported file types', () => {
      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Only .txt, .pdf, and .docx files are supported');
    });

    it('should handle missing file', () => {
      const result = validateFile(null as any);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('should handle file without name', () => {
      const file = new File(['content'], '', { type: 'text/plain' });
      Object.defineProperty(file, 'name', { value: undefined });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File must have a name');
    });

    it('should validate MIME type for security', () => {
      // File claims to be TXT but has PDF MIME type
      const file = new File(['content'], 'fake.txt', { type: 'application/pdf' });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type mismatch');
    });

    it('should allow files with empty MIME type', () => {
      // Some systems don't set MIME type
      const file = new File(['content'.repeat(20)], 'resume.txt', { type: '' });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should process large files efficiently', async () => {
      const largeContent = 'Lorem ipsum dolor sit amet '.repeat(10000);
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
      
      const startTime = performance.now();
      const result = await processFile(file);
      const processingTime = performance.now() - startTime;
      
      expect(processingTime).toBeLessThan(1000); // Should process in less than 1 second
      expect(result.content).toBeDefined();
    });

    it('should handle complex DOCX structure efficiently', async () => {
      const file = new File([new ArrayBuffer(1000)], 'complex.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      // Mock complex HTML structure
      vi.mocked(mammoth).convertToHtml.mockResolvedValue({
        value: '<div>' + Array(100).fill('<p>Section content</p>').join('') + '</div>',
        messages: [],
      });

      const startTime = performance.now();
      await processFile(file);
      const processingTime = performance.now() - startTime;
      
      expect(processingTime).toBeLessThan(500);
    });
  });
});