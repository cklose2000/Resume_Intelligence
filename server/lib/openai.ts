import OpenAI from "openai";

// Using o3 model as requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

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

export async function analyzeJobDescription(jobDescription: string): Promise<JobAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "o3",
      messages: [
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

${jobDescription}`
        }
      ],
      response_format: { type: "json_object" },
    });

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

export async function analyzeResumeAlignment(
  resumeContent: string,
  jobRequirements: JobRequirements
): Promise<{ scores: ResumeScores; recommendations: OptimizationRecommendation[] }> {
  try {
    const response = await openai.chat.completions.create({
      model: "o3",
      messages: [
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
          content: `Resume Content:\n${resumeContent}\n\nJob Requirements:\n${JSON.stringify(jobRequirements, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

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

export async function generateOptimizedContent(
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

    const response = await openai.chat.completions.create({
      model: "o3",
      messages: [
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
      ],
    });

    let optimizedContent = response.choices[0].message.content || originalContent;
    
    // Comprehensive text cleaning and restructuring
    optimizedContent = optimizedContent
      // Remove all markdown and formatting artifacts
      .replace(/\|/g, '')                     // Remove ALL pipe characters
      .replace(/-{2,}/g, '')                  // Remove table separators
      .replace(/\*\*(.*?)\*\*/g, '$1')        // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1')            // Remove italic markdown
      .replace(/_{2,}(.*?)_{2,}/g, '$1')      // Remove underline markdown
      .replace(/#{1,6}\s*/g, '')              // Remove header markdown
      .replace(/```[\s\S]*?```/g, '')         // Remove code blocks
      .replace(/`([^`]+)`/g, '$1')            // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/^\s*[-*+]\s+/gm, '• ')        // Normalize bullet points
      
      // Split into sentences and rebuild with proper structure
      .split(/(?<=[.!?])\s+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0)
      .map(sentence => {
        // Clean each sentence individually
        return sentence
          .replace(/\s+/g, ' ')              // Normalize all spacing
          .replace(/\s*([,.;:!?])/g, '$1')   // Fix punctuation spacing
          .replace(/([,.;:!?])\s*/g, '$1 ')  // Add space after punctuation
          .replace(/\(\s+/g, '(')            // Fix opening parentheses
          .replace(/\s+\)/g, ')')            // Fix closing parentheses
          .trim();
      })
      .join(' ')
      
      // Now restructure into proper paragraphs
      .replace(/([A-Z][A-Z\s&-]{4,})/g, '\n\n$1\n\n')  // Section headers
      .replace(/(\d{4}[\s-]*\d{4}|\d{4}\s*-\s*Present)/g, '\n\n$1\n')  // Date ranges
      .replace(/(PROFESSIONAL EXPERIENCE|EDUCATION|SKILLS|CORE COMPETENCIES|TECHNICAL SKILLS|CERTIFICATIONS|PROJECTS|ACHIEVEMENTS|SUMMARY|OBJECTIVE)/gi, '\n\n$1\n\n')
      
      // Final cleanup
      .replace(/\n{3,}/g, '\n\n')            // Normalize line breaks
      .replace(/^\s+|\s+$/gm, '')            // Trim lines
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n')
      .trim();

    return optimizedContent;
  } catch (error) {
    console.error("Error generating optimized content:", error);
    throw new Error("Failed to generate optimized content");
  }
}
