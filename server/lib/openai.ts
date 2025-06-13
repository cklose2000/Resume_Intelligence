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
          
          CRITICAL FORMATTING RULES:
          - Return ONLY plain text content - NO markdown formatting
          - NO pipe characters (|), hyphens for tables, or markdown syntax
          - Use natural line breaks and spacing for readability
          - Structure content with clear section headers in ALL CAPS
          - Use bullet points with • symbol only where appropriate
          - Preserve professional resume formatting without markdown artifacts
          
          Content Rules:
          - Preserve the overall format and structure
          - Make specific improvements based on the recommendations
          - Ensure the content remains truthful and professional
          - Improve keyword density and ATS compatibility
          - Maintain the candidate's authentic experience and achievements
          - Format as a clean, readable resume suitable for ATS systems`
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
      .replace(/\|/g, ' ')                    // Remove pipe characters
      .replace(/-{2,}/g, ' ')                 // Remove multiple hyphens
      .replace(/\*\*(.*?)\*\*/g, '$1')        // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1')            // Remove italic markdown
      .replace(/#{1,6}\s*/g, '')              // Remove header markdown
      .replace(/```[\s\S]*?```/g, '')         // Remove code blocks
      .replace(/`([^`]+)`/g, '$1')            // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/^\s*[-*+]\s+/gm, '• ')        // Normalize bullet points
      .replace(/\s+/g, ' ')                   // Normalize spaces
      .replace(/\n\s*\n\s*\n/g, '\n\n')       // Normalize line breaks
      .trim();

    return optimizedContent;
  } catch (error) {
    console.error("Error generating optimized content:", error);
    throw new Error("Failed to generate optimized content");
  }
}
