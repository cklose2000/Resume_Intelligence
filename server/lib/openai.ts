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
          
          EXAMPLE OF CORRECT FORMAT:
          CHANDLER KLOSE
          Northampton, MA 413-588-2411
          cklose@gmail.com
          
          PROFESSIONAL EXPERIENCE
          
          Staff Data Engineer at Fortune 500 Company
          Led development of cloud-native data platforms...`
        },
        {
          role: "user",
          content: `Original Resume:\n${originalContent}\n\nApply these recommendations:\n${JSON.stringify(applicableRecommendations, null, 2)}\n\nIMPORTANT: Return the optimized resume as clean plain text with no markdown formatting, tables, or special characters.`
        }
      ],
    });

    let optimizedContent = response.choices[0].message.content || originalContent;
    
    // Post-process to remove any remaining markdown artifacts
    optimizedContent = optimizedContent
      .replace(/\|/g, '')                     // Remove ALL pipe characters
      .replace(/-{2,}/g, '')                  // Remove multiple hyphens/table separators
      .replace(/\*\*(.*?)\*\*/g, '$1')        // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1')            // Remove italic markdown
      .replace(/_{2,}(.*?)_{2,}/g, '$1')      // Remove underline markdown
      .replace(/#{1,6}\s*/g, '')              // Remove header markdown
      .replace(/```[\s\S]*?```/g, '')         // Remove code blocks
      .replace(/`([^`]+)`/g, '$1')            // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/^\s*[-*+]\s+/gm, '• ')        // Normalize bullet points
      .replace(/\s*\|\s*/g, ' ')              // Remove any remaining pipes with spaces
      .replace(/\s*-\s*\|\s*/g, ' ')          // Remove dash-pipe combinations
      .replace(/\s*\|\s*-\s*/g, ' ')          // Remove pipe-dash combinations
      .replace(/(\w)\s*\|\s*(\w)/g, '$1 $2')  // Replace pipes between words with spaces
      .replace(/\s{2,}/g, ' ')                // Normalize multiple spaces to single space
      .replace(/\n\s*\n\s*\n/g, '\n\n')       // Normalize line breaks
      .replace(/^\s+|\s+$/gm, '')             // Trim each line
      .trim();

    return optimizedContent;
  } catch (error) {
    console.error("Error generating optimized content:", error);
    throw new Error("Failed to generate optimized content");
  }
}
