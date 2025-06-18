import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentStructureParser, ResumeStructure, EditOperation } from '../documentStructure';

describe('DocumentStructureParser', () => {
  let parser: DocumentStructureParser;

  describe('with plain text content', () => {
    const sampleResume = `JOHN DOE
123 Main St, San Francisco, CA 94122
(415) 555-0123 • john.doe@email.com • linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years developing scalable web applications.

PROFESSIONAL EXPERIENCE

Senior Software Engineer - TechCorp Inc.
2021 - Present

• Led development of microservices architecture serving 1M+ users
• Improved application performance by 40% through optimization

Software Engineer - StartupXYZ
2019 - 2021

• Built RESTful APIs and responsive front-end applications
• Implemented CI/CD pipelines reducing deployment time by 60%

EDUCATION

Bachelor of Science in Computer Science
University of California, Berkeley - 2019

SKILLS
Programming: JavaScript, TypeScript, Python, Java
Frameworks: React, Node.js, Express, Django`;

    beforeEach(() => {
      parser = new DocumentStructureParser(sampleResume);
    });

    describe('parse()', () => {
      it('should parse contact information correctly', () => {
        const result = parser.parse();
        expect(result.contact).toEqual({
          name: 'JOHN DOE',
          email: 'john.doe@email.com',
          phone: '(415) 555-0123',
          location: '123 Main St, San Francisco, CA 94122',
          linkedin: 'linkedin.com/in/johndoe'
        });
      });

      it('should parse summary section', () => {
        const result = parser.parse();
        expect(result.summary).toBe('Experienced software engineer with 5+ years developing scalable web applications.');
      });

      it('should parse experience entries', () => {
        const result = parser.parse();
        expect(result.experience).toHaveLength(2);
        
        expect(result.experience[0]).toEqual({
          position: 'Senior Software Engineer',
          company: 'TechCorp Inc.',
          duration: '2021 - Present',
          description: [
            '• Led development of microservices architecture serving 1M+ users',
            '• Improved application performance by 40% through optimization'
          ].join('\n')
        });

        expect(result.experience[1]).toEqual({
          position: 'Software Engineer',
          company: 'StartupXYZ',
          duration: '2019 - 2021',
          description: [
            '• Built RESTful APIs and responsive front-end applications',
            '• Implemented CI/CD pipelines reducing deployment time by 60%'
          ].join('\n')
        });
      });

      it('should parse education entries', () => {
        const result = parser.parse();
        expect(result.education).toHaveLength(1);
        expect(result.education[0]).toEqual({
          degree: 'Bachelor of Science in Computer Science',
          school: 'University of California, Berkeley',
          year: '2019'
        });
      });

      it('should parse skills', () => {
        const result = parser.parse();
        expect(result.skills).toHaveLength(2);
        expect(result.skills[0]).toEqual({
          category: 'Programming',
          items: ['JavaScript', 'TypeScript', 'Python', 'Java']
        });
        expect(result.skills[1]).toEqual({
          category: 'Frameworks',
          items: ['React', 'Node.js', 'Express', 'Django']
        });
      });
    });

    describe('toHTML()', () => {
      it('should convert structure back to formatted HTML', () => {
        const structure = parser.parse();
        const html = parser.toHTML(structure);
        
        expect(html).toContain('<h1>JOHN DOE</h1>');
        expect(html).toContain('<h2>PROFESSIONAL SUMMARY</h2>');
        expect(html).toContain('<h3>Senior Software Engineer - TechCorp Inc.</h3>');
        expect(html).toContain('<p>2021 - Present</p>');
        expect(html).toContain('Led development of microservices architecture');
      });

      it('should handle missing sections gracefully', () => {
        const partialStructure: ResumeStructure = {
          contact: {
            name: 'Test User',
            email: 'test@example.com'
          },
          summary: '',
          experience: [],
          education: [],
          skills: [],
          additionalSections: []
        };
        
        const html = parser.toHTML(partialStructure);
        expect(html).toContain('<h1>Test User</h1>');
        expect(html).not.toContain('PROFESSIONAL SUMMARY');
        expect(html).not.toContain('EXPERIENCE');
      });
    });

    describe('applyStructuredEdits()', () => {
      it('should apply edit operations to experience section', () => {
        const structure = parser.parse();
        const operation: EditOperation = {
          edits: [{
            section: 'experience',
            index: 0,
            field: 'description',
            original: '• Led development of microservices architecture serving 1M+ users',
            suggested: '• Led development of cloud-native microservices architecture serving 2M+ users',
            reason: 'Updated metrics and added cloud-native keyword'
          }],
          additions: [],
          removals: []
        };

        const result = parser.applyStructuredEdits(structure, operation);
        expect(result.experience[0].description).toContain('cloud-native microservices architecture serving 2M+ users');
      });

      it('should apply additions to skills section', () => {
        const structure = parser.parse();
        const operation: EditOperation = {
          edits: [],
          additions: [{
            section: 'skills',
            content: 'Cloud: AWS, Azure, GCP',
            reason: 'Add cloud platforms'
          }],
          removals: []
        };

        const result = parser.applyStructuredEdits(structure, operation);
        expect(result.skills).toHaveLength(3);
        expect(result.skills[2]).toEqual({
          category: 'Cloud',
          items: ['AWS', 'Azure', 'GCP']
        });
      });

      it('should apply removal operations', () => {
        const structure = parser.parse();
        const operation: EditOperation = {
          edits: [],
          additions: [],
          removals: [{
            section: 'experience',
            index: 1,
            reason: 'Remove older, less relevant experience'
          }]
        };

        const result = parser.applyStructuredEdits(structure, operation);
        expect(result.experience).toHaveLength(1);
        expect(result.experience[0].company).toBe('TechCorp Inc.');
      });
    });
  });

  describe('with HTML content', () => {
    const htmlResume = `
      <h1>JANE SMITH</h1>
      <p>jane.smith@email.com • (555) 123-4567</p>
      
      <h2>PROFESSIONAL SUMMARY</h2>
      <p>Product manager with expertise in agile methodologies.</p>
      
      <h2>EXPERIENCE</h2>
      <h3>Senior Product Manager - BigTech Co</h3>
      <p>2020 - Present</p>
      <ul>
        <li>Launched 3 major features increasing user engagement by 25%</li>
        <li>Managed cross-functional team of 12 engineers and designers</li>
      </ul>
    `;

    beforeEach(() => {
      parser = new DocumentStructureParser(htmlResume);
    });

    it('should parse HTML formatted resume', () => {
      const result = parser.parse();
      
      expect(result.contact.name).toBe('JANE SMITH');
      expect(result.contact.email).toBe('jane.smith@email.com');
      expect(result.summary).toBe('Product manager with expertise in agile methodologies.');
      expect(result.experience).toHaveLength(1);
      expect(result.experience[0].position).toBe('Senior Product Manager');
      expect(result.experience[0].company).toBe('BigTech Co');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      parser = new DocumentStructureParser('');
      const result = parser.parse();
      
      expect(result.contact.name).toBe('');
      expect(result.experience).toHaveLength(0);
      expect(result.education).toHaveLength(0);
      expect(result.skills).toHaveLength(0);
    });

    it('should handle malformed content gracefully', () => {
      const malformed = `Random text without structure
Some more text
Maybe an email: test@example.com`;
      
      parser = new DocumentStructureParser(malformed);
      const result = parser.parse();
      
      expect(result.contact.email).toBe('test@example.com');
      expect(result.additionalSections).toHaveLength(1);
    });

    it('should handle special characters in content', () => {
      const specialChars = `JOSÉ O'CONNOR
Software Engineer @ Tech & Co.
Experience with C++ & C#`;
      
      parser = new DocumentStructureParser(specialChars);
      const result = parser.parse();
      
      expect(result.contact.name).toBe("JOSÉ O'CONNOR");
      expect(result.additionalSections[0].content).toContain('C++ & C#');
    });
  });

  describe('performance', () => {
    it('should parse large documents efficiently', () => {
      // Create a large resume with many entries
      const largeResume = `JOHN DOE
john.doe@email.com

EXPERIENCE
` + Array(50).fill(null).map((_, i) => `
Engineer ${i} - Company ${i}
2020 - 2021
• Did something important
• Achieved great results
`).join('\n');

      const startTime = performance.now();
      parser = new DocumentStructureParser(largeResume);
      const result = parser.parse();
      const endTime = performance.now();

      expect(result.experience).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(100); // Should parse in less than 100ms
    });
  });
});