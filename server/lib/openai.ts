import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
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

export async function analyzeJobDescription(jobTitle: string, jobDescription: string): Promise<JobRequirements> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert job requirements analyzer. Extract key requirements from job descriptions and return them in JSON format.
          
          Return a JSON object with these fields:
          - skills: Array of technical and soft skills mentioned
          - experience: Array of experience requirements (years, specific roles, etc.)
          - qualifications: Array of educational or certification requirements
          - keywords: Array of important keywords that should appear in a resume
          - responsibilities: Array of key job responsibilities mentioned
          
          Focus on actionable, specific requirements that can be matched against a resume.`
        },
        {
          role: "user",
          content: `Job Title: ${jobTitle}\n\nJob Description: ${jobDescription}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      skills: result.skills || [],
      experience: result.experience || [],
      qualifications: result.qualifications || [],
      keywords: result.keywords || [],
      responsibilities: result.responsibilities || []
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
      model: "gpt-4o",
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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume writer. Apply the specified recommendations to improve the resume content while maintaining its original structure and voice.
          
          Rules:
          - Preserve the overall format and structure
          - Make specific improvements based on the recommendations
          - Ensure the content remains truthful and professional
          - Improve keyword density and ATS compatibility
          - Maintain the candidate's authentic experience and achievements`
        },
        {
          role: "user",
          content: `Original Resume:\n${originalContent}\n\nApply these recommendations:\n${JSON.stringify(applicableRecommendations, null, 2)}`
        }
      ],
    });

    return response.choices[0].message.content || originalContent;
  } catch (error) {
    console.error("Error generating optimized content:", error);
    throw new Error("Failed to generate optimized content");
  }
}
