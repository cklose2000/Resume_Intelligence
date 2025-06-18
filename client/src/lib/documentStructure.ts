export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  description: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate: string;
  gpa?: string;
  achievements?: string[];
}

export interface Skill {
  category: string;
  items: string[];
}

export interface ResumeStructure {
  contact: ContactInfo;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  additionalSections?: {
    title: string;
    content: string[];
  }[];
}

export interface StructuredEdit {
  section: keyof ResumeStructure | 'additionalSections';
  index?: number;
  field?: string;
  original: string;
  suggested: string;
  reason: string;
  confidence?: number;
}

export interface EditOperation {
  edits: StructuredEdit[];
  additions: {
    section: keyof ResumeStructure;
    content: any;
    reason: string;
  }[];
  removals: {
    section: keyof ResumeStructure;
    index: number;
    reason: string;
  }[];
}

export class DocumentStructureParser {
  private content: string;
  
  constructor(content: string) {
    this.content = content;
  }

  parse(): ResumeStructure {
    const lines = this.content.split('\n').map(line => line.trim());
    const structure: ResumeStructure = {
      contact: {},
      experience: [],
      education: [],
      skills: []
    };

    let currentSection: string | null = null;
    let currentIndex = 0;

    while (currentIndex < lines.length) {
      const line = lines[currentIndex];
      
      // Skip empty lines
      if (!line) {
        currentIndex++;
        continue;
      }

      // Check if this is a section header
      const sectionHeader = this.identifySection(line);
      if (sectionHeader) {
        currentSection = sectionHeader;
        currentIndex++;
        continue;
      }

      // Parse content based on current section
      if (currentSection) {
        switch (currentSection) {
          case 'contact':
            this.parseContactInfo(lines, currentIndex, structure.contact);
            break;
          case 'summary':
            structure.summary = this.parseSummary(lines, currentIndex);
            break;
          case 'experience':
            const exp = this.parseExperience(lines, currentIndex);
            if (exp) structure.experience.push(exp);
            break;
          case 'education':
            const edu = this.parseEducation(lines, currentIndex);
            if (edu) structure.education.push(edu);
            break;
          case 'skills':
            this.parseSkills(lines, currentIndex, structure.skills);
            break;
          default:
            // Handle additional sections
            this.parseAdditionalSection(lines, currentIndex, currentSection, structure);
        }
      }

      currentIndex++;
    }

    return structure;
  }

  private identifySection(line: string): string | null {
    const upperLine = line.toUpperCase();
    
    const sectionPatterns = {
      'contact': /^(CONTACT|PERSONAL INFO|CONTACT INFO)/,
      'summary': /^(SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE)/,
      'experience': /^(EXPERIENCE|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT)/,
      'education': /^(EDUCATION|ACADEMIC|QUALIFICATIONS)/,
      'skills': /^(SKILLS|TECHNICAL SKILLS|COMPETENCIES|EXPERTISE)/,
    };

    for (const [section, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(upperLine)) {
        return section;
      }
    }

    // Check if it's a custom section header (all caps, short)
    if (/^[A-Z\s&-]{3,30}$/.test(line) && line.length > 3) {
      return line;
    }

    return null;
  }

  private parseContactInfo(lines: string[], startIndex: number, contact: ContactInfo): void {
    // Look for patterns in the next few lines
    for (let i = startIndex; i < Math.min(startIndex + 5, lines.length); i++) {
      const line = lines[i];
      
      // Name is usually the first non-empty line
      if (!contact.name && i === startIndex && line && !this.identifySection(line)) {
        contact.name = line;
        continue;
      }

      // Email pattern
      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch && !contact.email) {
        contact.email = emailMatch[0];
      }

      // Phone pattern
      const phoneMatch = line.match(/[\d\s()+-]+\d{4}/);
      if (phoneMatch && !contact.phone && phoneMatch[0].length >= 10) {
        contact.phone = phoneMatch[0].trim();
      }

      // LinkedIn pattern
      if (line.toLowerCase().includes('linkedin') && !contact.linkedin) {
        contact.linkedin = line;
      }

      // Location (city, state pattern)
      const locationMatch = line.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2}/);
      if (locationMatch && !contact.location) {
        contact.location = locationMatch[0];
      }
    }
  }

  private parseSummary(lines: string[], startIndex: number): string {
    const summaryLines = [];
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // Stop if we hit another section
      if (this.identifySection(line)) {
        break;
      }
      
      if (line) {
        summaryLines.push(line);
      }
    }

    return summaryLines.join(' ');
  }

  private parseExperience(lines: string[], startIndex: number): Experience | null {
    const line = lines[startIndex];
    
    // Look for job title patterns
    const jobPattern = /^([^–—\-|]+?)\s*[–—\-|]\s*(.+?)(?:\s*[–—\-|]\s*(.+))?$/;
    const datePattern = /(\w+\s+\d{4}|\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\d{4}|Present|Current)/i;
    
    const jobMatch = line.match(jobPattern);
    const dateMatch = line.match(datePattern);
    
    if (jobMatch || dateMatch) {
      const experience: Experience = {
        id: `exp-${Date.now()}-${Math.random()}`,
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        description: []
      };

      // Parse job title and company
      if (jobMatch) {
        experience.position = jobMatch[1].trim();
        experience.company = jobMatch[2].trim();
        if (jobMatch[3]) {
          experience.location = jobMatch[3].trim();
        }
      } else {
        experience.position = line.split(/[–—\-|]/)[0].trim();
      }

      // Parse dates
      if (dateMatch) {
        experience.startDate = dateMatch[1];
        experience.endDate = dateMatch[2];
        experience.current = /present|current/i.test(dateMatch[2]);
      }

      // Parse description bullets
      for (let i = startIndex + 1; i < lines.length; i++) {
        const descLine = lines[i];
        
        if (this.identifySection(descLine) || this.isNewExperience(descLine)) {
          break;
        }
        
        if (descLine && (descLine.startsWith('•') || descLine.startsWith('-') || descLine.startsWith('*'))) {
          experience.description.push(descLine.replace(/^[•\-*]\s*/, ''));
        } else if (descLine && experience.description.length === 0) {
          // Sometimes descriptions don't have bullets
          experience.description.push(descLine);
        }
      }

      return experience;
    }

    return null;
  }

  private parseEducation(lines: string[], startIndex: number): Education | null {
    const line = lines[startIndex];
    
    // Common patterns for education entries
    const degreePattern = /(Bachelor|Master|PhD|Ph\.D\.|BS|BA|MS|MA|MBA|Associate)/i;
    const yearPattern = /\b(19|20)\d{2}\b/;
    
    if (degreePattern.test(line) || yearPattern.test(line)) {
      const education: Education = {
        id: `edu-${Date.now()}-${Math.random()}`,
        institution: '',
        degree: '',
        endDate: ''
      };

      // Extract degree
      const degreeMatch = line.match(degreePattern);
      if (degreeMatch) {
        // Find the full degree text
        const degreeStartIndex = line.indexOf(degreeMatch[0]);
        const restOfLine = line.substring(degreeStartIndex);
        const inMatch = restOfLine.match(/^([^,–—\-|]+?)(?:\s+in\s+([^,–—\-|]+))?/);
        
        if (inMatch) {
          education.degree = inMatch[1].trim();
          if (inMatch[2]) {
            education.field = inMatch[2].trim();
          }
        }
      }

      // Extract institution and dates
      const parts = line.split(/[,–—\-|]/);
      for (const part of parts) {
        const trimmed = part.trim();
        
        if (yearPattern.test(trimmed) && !education.endDate) {
          const years = trimmed.match(/\b(19|20)\d{2}\b/g);
          if (years) {
            if (years.length > 1) {
              education.startDate = years[0];
              education.endDate = years[1];
            } else {
              education.endDate = years[0];
            }
          }
        } else if (!degreePattern.test(trimmed) && trimmed.length > 3 && !education.institution) {
          education.institution = trimmed;
        }
      }

      // Look for GPA or achievements in next lines
      for (let i = startIndex + 1; i < Math.min(startIndex + 3, lines.length); i++) {
        const nextLine = lines[i];
        if (!nextLine || this.identifySection(nextLine)) break;
        
        if (nextLine.toLowerCase().includes('gpa')) {
          const gpaMatch = nextLine.match(/\d+\.\d+/);
          if (gpaMatch) {
            education.gpa = gpaMatch[0];
          }
        } else if (nextLine.startsWith('•') || nextLine.startsWith('-')) {
          if (!education.achievements) education.achievements = [];
          education.achievements.push(nextLine.replace(/^[•\-*]\s*/, ''));
        }
      }

      return education;
    }

    return null;
  }

  private parseSkills(lines: string[], startIndex: number, skills: Skill[]): void {
    let currentCategory = 'General';
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (this.identifySection(line)) {
        break;
      }
      
      if (!line) continue;

      // Check if this is a skill category
      if (line.includes(':')) {
        const [category, items] = line.split(':');
        currentCategory = category.trim();
        
        if (items.trim()) {
          skills.push({
            category: currentCategory,
            items: items.split(/[,;]/).map(item => item.trim()).filter(Boolean)
          });
        }
      } else {
        // Add to current category
        const existingCategory = skills.find(s => s.category === currentCategory);
        const items = line.split(/[,;]/).map(item => item.trim()).filter(Boolean);
        
        if (existingCategory) {
          existingCategory.items.push(...items);
        } else {
          skills.push({
            category: currentCategory,
            items
          });
        }
      }
    }
  }

  private parseAdditionalSection(lines: string[], startIndex: number, sectionTitle: string, structure: ResumeStructure): void {
    if (!structure.additionalSections) {
      structure.additionalSections = [];
    }

    const content: string[] = [];
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (this.identifySection(line)) {
        break;
      }
      
      if (line) {
        content.push(line);
      }
    }

    if (content.length > 0) {
      structure.additionalSections.push({
        title: sectionTitle,
        content
      });
    }
  }

  private isNewExperience(line: string): boolean {
    // Check if this line starts a new experience entry
    const jobPattern = /^[A-Z][^–—\-|]*[–—\-|]/;
    const datePattern = /\b(19|20)\d{2}\b/;
    
    return jobPattern.test(line) || (datePattern.test(line) && line.length < 100);
  }

  toHTML(structure: ResumeStructure): string {
    let html = '';

    // Contact section
    if (structure.contact.name) {
      html += `<h1>${structure.contact.name}</h1>\n`;
      const contactDetails = [];
      if (structure.contact.email) contactDetails.push(structure.contact.email);
      if (structure.contact.phone) contactDetails.push(structure.contact.phone);
      if (structure.contact.location) contactDetails.push(structure.contact.location);
      if (contactDetails.length > 0) {
        html += `<p>${contactDetails.join(' • ')}</p>\n`;
      }
    }

    // Summary section
    if (structure.summary) {
      html += `<h2>PROFESSIONAL SUMMARY</h2>\n`;
      html += `<p>${structure.summary}</p>\n`;
    }

    // Experience section
    if (structure.experience.length > 0) {
      html += `<h2>PROFESSIONAL EXPERIENCE</h2>\n`;
      structure.experience.forEach(exp => {
        html += `<h3>${exp.position} – ${exp.company}${exp.location ? ` – ${exp.location}` : ''}</h3>\n`;
        html += `<p><em>${exp.startDate} - ${exp.endDate}</em></p>\n`;
        if (exp.description.length > 0) {
          html += '<ul>\n';
          exp.description.forEach(desc => {
            html += `<li>${desc}</li>\n`;
          });
          html += '</ul>\n';
        }
      });
    }

    // Education section
    if (structure.education.length > 0) {
      html += `<h2>EDUCATION</h2>\n`;
      structure.education.forEach(edu => {
        html += `<h3>${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>\n`;
        html += `<p>${edu.institution}${edu.endDate ? ` – ${edu.endDate}` : ''}</p>\n`;
        if (edu.gpa) {
          html += `<p>GPA: ${edu.gpa}</p>\n`;
        }
        if (edu.achievements && edu.achievements.length > 0) {
          html += '<ul>\n';
          edu.achievements.forEach(achievement => {
            html += `<li>${achievement}</li>\n`;
          });
          html += '</ul>\n';
        }
      });
    }

    // Skills section
    if (structure.skills.length > 0) {
      html += `<h2>SKILLS</h2>\n`;
      structure.skills.forEach(skill => {
        if (skill.category !== 'General') {
          html += `<p><strong>${skill.category}:</strong> ${skill.items.join(', ')}</p>\n`;
        } else {
          html += `<p>${skill.items.join(', ')}</p>\n`;
        }
      });
    }

    // Additional sections
    if (structure.additionalSections) {
      structure.additionalSections.forEach(section => {
        html += `<h2>${section.title.toUpperCase()}</h2>\n`;
        section.content.forEach(line => {
          if (line.startsWith('•') || line.startsWith('-')) {
            html += `<li>${line.replace(/^[•\-*]\s*/, '')}</li>\n`;
          } else {
            html += `<p>${line}</p>\n`;
          }
        });
      });
    }

    return html;
  }

  applyStructuredEdits(structure: ResumeStructure, operation: EditOperation): ResumeStructure {
    const updated = JSON.parse(JSON.stringify(structure)) as ResumeStructure;

    // Apply edits
    operation.edits.forEach(edit => {
      switch (edit.section) {
        case 'contact':
          if (edit.field && edit.field in updated.contact) {
            (updated.contact as any)[edit.field] = edit.suggested;
          }
          break;
        
        case 'summary':
          updated.summary = edit.suggested;
          break;
        
        case 'experience':
          if (edit.index !== undefined && updated.experience[edit.index]) {
            if (edit.field === 'description' && typeof edit.index === 'number') {
              // Handle description array updates
              updated.experience[edit.index].description = edit.suggested.split('\n').filter(Boolean);
            } else if (edit.field && edit.field in updated.experience[edit.index]) {
              (updated.experience[edit.index] as any)[edit.field] = edit.suggested;
            }
          }
          break;
        
        case 'education':
          if (edit.index !== undefined && updated.education[edit.index]) {
            if (edit.field && edit.field in updated.education[edit.index]) {
              (updated.education[edit.index] as any)[edit.field] = edit.suggested;
            }
          }
          break;
        
        case 'skills':
          if (edit.index !== undefined && updated.skills[edit.index]) {
            if (edit.field === 'items') {
              updated.skills[edit.index].items = edit.suggested.split(',').map(item => item.trim());
            } else if (edit.field === 'category') {
              updated.skills[edit.index].category = edit.suggested;
            }
          }
          break;
      }
    });

    // Apply additions
    operation.additions.forEach(addition => {
      switch (addition.section) {
        case 'experience':
          updated.experience.push(addition.content as Experience);
          break;
        case 'education':
          updated.education.push(addition.content as Education);
          break;
        case 'skills':
          updated.skills.push(addition.content as Skill);
          break;
      }
    });

    // Apply removals (in reverse order to maintain indices)
    operation.removals.sort((a, b) => b.index - a.index).forEach(removal => {
      switch (removal.section) {
        case 'experience':
          updated.experience.splice(removal.index, 1);
          break;
        case 'education':
          updated.education.splice(removal.index, 1);
          break;
        case 'skills':
          updated.skills.splice(removal.index, 1);
          break;
      }
    });

    return updated;
  }
}