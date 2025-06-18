// Client-side OpenAI implementation for privacy-first resume optimization

export interface JobRequirements {
  skills: string[];
  experience: string[];
  qualifications: string[];
  keywords: string[];
  responsibilities: string[];
}

export interface ResumeScores {
  overall: number;
  keywords: number;
  ats: number;
}

export interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  category: string;
  applied: boolean;
}

export interface JobAnalysisResult {
  jobTitle: string;
  company: string;
  requirements: JobRequirements;
}

class OpenAIClient {
  private apiKey: string | null = null;

  setApiKey(apiKey: string) {
    // Store in sessionStorage for security (cleared when browser closes)
    sessionStorage.setItem('openai_api_key', apiKey);
    this.apiKey = apiKey;
  }

  private getApiKey(): string {
    if (this.apiKey) return this.apiKey;
    
    const stored = sessionStorage.getItem('openai_api_key');
    if (!stored) {
      throw new Error('OpenAI API key not set. Please provide your API key.');
    }
    
    this.apiKey = stored;
    return stored;
  }

  clearApiKey() {
    sessionStorage.removeItem('openai_api_key');
    this.apiKey = null;
  }

  hasApiKey(): boolean {
    return !!(this.apiKey || sessionStorage.getItem('openai_api_key'));
  }

  private async makeOpenAIRequest(messages: any[]) {
    const apiKey = this.getApiKey();
    
    const requestBody: any = {
      model: "o3",
      messages,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`OpenAI API Error: ${errorMessage}`);
    }

    return response.json();
  }

  async analyzeJobDescription(jobDescription: string): Promise<JobAnalysisResult> {
    try {
      const response = await this.makeOpenAIRequest([
        {
          role: "system",
          content: `You are an expert job description parser. Your primary task is to accurately extract the job title and company name from job postings, along with requirements.

CRITICAL: Pay close attention to the EXACT job title and company name as they appear in the text.

For job title extraction:
- Look for phrases like "Job Title:", "Position:", "Role:", or titles that appear prominently
- Common patterns: "[Title] at [Company]", "[Company] is hiring [Title]", "We are looking for a [Title]"
- If multiple titles exist, choose the most prominent/specific one
- Never make up or modify the title - use exactly what's written

For company extraction:
- Look for company names in headers, signatures, or "at [Company]" patterns
- Common patterns: "[Title] at [Company]", "[Company] careers", "Join [Company]"
- If no company is explicitly mentioned, use "Company"
- Use the exact company name as written

Return JSON with these exact fields:
- jobTitle: The exact job title found (be very precise)
- company: The exact company name found or "Company" if not found
- skills: Array of technical and soft skills mentioned
- experience: Array of experience requirements
- qualifications: Array of educational requirements
- keywords: Array of important ATS keywords
- responsibilities: Array of key job responsibilities`
        },
        {
          role: "user",
          content: `Parse this job description and extract the exact job title and company name:

${jobDescription}

IMPORTANT: Return ONLY valid JSON, no other text.`
        }
      ]);

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        jobTitle: result.jobTitle || "Job Position",
        company: result.company || "Company",
        requirements: {
          skills: result.skills || [],
          experience: result.experience || [],
          qualifications: result.qualifications || [],
          keywords: result.keywords || [],
          responsibilities: result.responsibilities || []
        }
      };
    } catch (error) {
      console.error("Error analyzing job description:", error);
      throw new Error("Failed to analyze job description");
    }
  }

  async analyzeResumeAlignment(
    resumeContent: string,
    jobRequirements: JobRequirements
  ): Promise<{ scores: ResumeScores; recommendations: OptimizationRecommendation[] }> {
    try {
      const response = await this.makeOpenAIRequest([
        {
          role: "system",
          content: `You are an expert resume optimization analyst. Analyze how well a resume aligns with job requirements and provide specific recommendations.

          Return a JSON object with:
          - scores: Object with overall (0-100), keywords (0-100), and ats (0-100) scores
          - recommendations: Array of recommendation objects with:
            - id: Unique identifier string
            - title: Brief recommendation title
            - description: Detailed explanation of what to improve and why
            - impact: "High", "Medium", or "Low"
            - category: Category like "Keywords", "Experience", "Skills", "Formatting", etc.
            - applied: Always false initially
          
          Provide actionable, specific recommendations that directly address gaps between the resume and job requirements.`
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Requirements:\n${JSON.stringify(jobRequirements, null, 2)}\n\nIMPORTANT: Return ONLY valid JSON, no other text.`
        }
      ]);

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        scores: {
          overall: Math.max(0, Math.min(100, result.scores?.overall || 0)),
          keywords: Math.max(0, Math.min(100, result.scores?.keywords || 0)),
          ats: Math.max(0, Math.min(100, result.scores?.ats || 0))
        },
        recommendations: result.recommendations?.map((rec: any, index: number) => ({
          id: rec.id || `rec-${index}`,
          title: rec.title || "Optimization Recommendation",
          description: rec.description || "No description provided",
          impact: ['High', 'Medium', 'Low'].includes(rec.impact) ? rec.impact : 'Medium',
          category: rec.category || "General",
          applied: false
        })) || []
      };
    } catch (error) {
      console.error("Error analyzing resume alignment:", error);
      throw new Error("Failed to analyze resume alignment");
    }
  }

  async generateOptimizedContent(
    originalContent: string,
    recommendations: OptimizationRecommendation[],
    appliedRecommendations: string[]
  ): Promise<string> {
    try {
      const applicableRecommendations = recommendations.filter(rec => 
        appliedRecommendations.includes(rec.id)
      );

      if (applicableRecommendations.length === 0) {
        return originalContent;
      }

      const response = await this.makeOpenAIRequest([
        {
          role: "system",
          content: `You are an expert resume writer. Apply the specified recommendations to improve the resume content while maintaining its original structure and voice.
          
          CRITICAL FORMATTING REQUIREMENTS - STRICTLY ENFORCE:
          - Output MUST be plain text only - absolutely NO markdown, tables, or special formatting
          - NEVER use pipe characters (|), dashes for tables, asterisks for bold, or any markdown syntax
          - Do NOT create tables, columns, or structured layouts with special characters
          - Use simple paragraph breaks and line spacing for organization
          - Section headers should be in ALL CAPS on their own lines
          - Use simple bullet points (•) sparingly and only for lists
          - NO special characters except periods, commas, and basic punctuation
          
          Content Requirements:
          - Preserve the overall structure and professional tone
          - Apply the specific recommendations provided
          - Ensure all content remains truthful and authentic
          - Enhance keyword density for ATS compatibility
          - Maintain the candidate's genuine experience and achievements
          - Format as clean, readable text suitable for any system
          
          FORMATTING EXAMPLES - FOLLOW EXACTLY:
          
          CHANDLER KLOSE
          Northampton, MA 413-588-2411
          cklose@gmail.com linkedin.com/in/chandler-klose
          
          PROFESSIONAL EXPERIENCE
          
          Staff Data Engineer - AI/ML & Data Foundations
          Fortune 500 Company (2019 - Present)
          
          Led development of cloud-native data platforms that power machine learning products and analytics. Deep expertise in Snowflake on AWS, Python, SQL, and Apache Airflow orchestration with a proven record of converting complex business logic into performant, production-grade data pipelines.
          
          CORE COMPETENCIES
          
          Data Platform Architecture (Snowflake, Redshift, BigQuery, Databricks)
          Scalable ELT/ETL Pipelines (Airflow, dbt, Spark, Kafka)
          ML/AI Systems Design & MLOps (Feature Stores, Vertex AI, SageMaker)
          
          NOTICE: Use proper spacing, complete sentences, and clear paragraph breaks.`
        },
        {
          role: "user",
          content: `Original Resume:\n${originalContent}\n\nApply these recommendations:\n${JSON.stringify(applicableRecommendations, null, 2)}\n\nCRITICAL FORMATTING REQUIREMENTS:
          
1. Write in complete, well-formed sentences with proper spacing
2. Each sentence should flow naturally without awkward line breaks  
3. Use standard paragraph formatting with proper line breaks between sections
4. Do NOT break sentences in the middle of words or phrases
5. Ensure all text reads as professional, coherent prose
6. Use consistent spacing and punctuation throughout
7. Return ONLY clean, readable plain text suitable for professional documents

EXAMPLE SENTENCE STRUCTURE:
"Led development of cloud-native data platforms that power machine learning products and analytics at Fortune 500 scale."

NOT: "Led development of cloud native data platforms that power machine learning products and analytics at Fortune 500 scale."

Return the complete optimized resume with proper formatting now.`
        }
      ]);

      let optimizedContent = response.choices[0].message.content || originalContent;
      
      // Improved text cleaning and restructuring with better sentence preservation
      optimizedContent = this.cleanAndStructureText(optimizedContent);

      return optimizedContent;
    } catch (error) {
      console.error("Error generating optimized content:", error);
      throw new Error("Failed to generate optimized content");
    }
  }

  private cleanAndStructureText(content: string): string {
    // Phase 1: Clean markdown and formatting artifacts while preserving content structure
    let cleaned = content
      // Remove markdown formatting but preserve content
      .replace(/\*\*([^*]+)\*\*/g, '$1')        // Bold markdown
      .replace(/\*([^*]+)\*/g, '$1')            // Italic markdown  
      .replace(/_{2,}([^_]+)_{2,}/g, '$1')      // Underline markdown
      .replace(/#{1,6}\s*([^\n]+)/g, '$1')      // Header markdown (preserve the header text)
      .replace(/```[\s\S]*?```/g, '')           // Code blocks
      .replace(/`([^`]+)`/g, '$1')              // Inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Links (preserve text)
      
      // Clean table artifacts carefully
      .replace(/^\s*\|.*\|\s*$/gm, '')          // Table rows
      .replace(/^\s*[-|:\s]+\s*$/gm, '')        // Table separators
      .replace(/\|/g, ' ')                      // Remaining pipe characters
      
      // Normalize whitespace without breaking sentences
      .replace(/[ \t]+/g, ' ')                  // Multiple spaces/tabs to single space
      .replace(/\r\n/g, '\n')                   // Windows line endings
      .replace(/\r/g, '\n')                     // Mac line endings
      
      // Remove empty lines but preserve intentional paragraph breaks
      .replace(/\n\s*\n\s*\n+/g, '\n\n')        // Multiple empty lines to double newline
      .trim();

    // Phase 2: Improve sentence structure and punctuation
    const sentences = this.splitIntoSentences(cleaned);
    const cleanedSentences = sentences.map(sentence => this.cleanSentence(sentence));
    
    // Phase 3: Restructure into proper resume format
    const structuredContent = this.restructureResumeContent(cleanedSentences.join(' '));
    
    return structuredContent;
  }

  private splitIntoSentences(text: string): string[] {
    // More sophisticated sentence splitting that preserves resume structure
    const lines = text.split('\n');
    const sentences: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Check if this is a section header or date line
      if (this.isHeaderOrDate(trimmed)) {
        sentences.push(trimmed);
        continue;
      }
      
      // Split line into sentences, but be careful with periods in abbreviations
      const lineSentences = trimmed
        .replace(/([.!?])\s+(?=[A-Z])/g, '$1|SENTENCE_BREAK|') // Mark sentence breaks
        .split('|SENTENCE_BREAK|')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      sentences.push(...lineSentences);
    }
    
    return sentences;
  }

  private isHeaderOrDate(text: string): boolean {
    // Check if text is likely a section header or date
    return /^[A-Z][A-Z\s&-]{3,}$/.test(text) || // All caps headers
           /\d{4}[\s-]*\d{4}|\d{4}\s*-\s*Present/i.test(text) || // Date ranges
           /^[A-Z][a-zA-Z\s&-]+ - [A-Za-z\s&,.-]+$/.test(text); // Job titles with companies
  }

  private cleanSentence(sentence: string): string {
    return sentence
      // Fix punctuation spacing
      .replace(/\s*([,.;:!?])/g, '$1')          // Remove space before punctuation
      .replace(/([,.;:!?])(?=[a-zA-Z])/g, '$1 ') // Add space after punctuation if needed
      
      // Fix parentheses spacing
      .replace(/\(\s+/g, '(')                   // Remove space after opening parenthesis
      .replace(/\s+\)/g, ')')                   // Remove space before closing parenthesis
      .replace(/\)(?=[a-zA-Z])/g, ') ')         // Add space after closing parenthesis if needed
      
      // Fix common spacing issues
      .replace(/\s+/g, ' ')                     // Multiple spaces to single space
      .replace(/\s*-\s*/g, ' - ')               // Normalize dash spacing
      .replace(/\s*&\s*/g, ' & ')               // Normalize ampersand spacing
      .replace(/\s*\.\s*$/g, '.')               // Clean sentence ending
      
      .trim();
  }

  private restructureResumeContent(content: string): string {
    // Split content into logical sections and restructure
    let structured = content
      // Identify and format section headers
      .replace(/(PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|EDUCATION|SKILLS|CORE COMPETENCIES|TECHNICAL SKILLS|CERTIFICATIONS|PROJECTS|ACHIEVEMENTS|SUMMARY|OBJECTIVE|QUALIFICATIONS)(\s|\.)/gi, '\n\n$1\n\n')
      
      // Format job titles and company information
      .replace(/([A-Z][a-zA-Z\s&-]+ - [A-Za-z\s&,.-]+)\s*(\d{4}[\s-]*\d{4}|\d{4}\s*-\s*Present)/gi, '\n\n$1\n$2\n\n')
      
      // Format standalone date ranges
      .replace(/(\d{4}[\s-]*\d{4}|\d{4}\s*-\s*Present)(?!\s*\n)/gi, '\n$1\n')
      
      // Clean up excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/gm, '')               // Trim each line
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n')
      .trim();

    return structured;
  }
}

// Export a singleton instance
export const openaiClient = new OpenAIClient();