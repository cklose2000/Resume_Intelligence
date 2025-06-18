import { openaiClient } from "./openaiClient";

export interface JobRequirements {
  skills: string[];
  experience: string[];
  qualifications: string[];
  keywords: string[];
  responsibilities: string[];
}

export interface JobAnalysisResponse {
  jobAnalysis: {
    id: string;
    jobTitle: string;
    jobDescription: string;
    extractedRequirements: string[];
    keywords: string[];
  };
  requirements: JobRequirements;
  jobTitle: string;
  company: string;
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

export interface ResumeAnalysisResponse {
  resumeAnalysis: {
    id: string;
    jobAnalysisId: string;
    originalContent: string;
    fileName: string;
    fileType: string;
    overallScore: number;
    keywordScore: number;
    atsScore: number;
    recommendations: OptimizationRecommendation[];
    optimizedContent: string | null;
  };
  scores: ResumeScores;
  recommendations: OptimizationRecommendation[];
}

export interface DocumentTemplate {
  name: string;
  description: string;
}

export async function analyzeJob(jobDescription: string): Promise<JobAnalysisResponse> {
  const { sessionState } = await import('./sessionState');
  
  const analysisResult = await openaiClient.analyzeJobDescription(jobDescription);
  
  // Create a unique ID for the job analysis (since we're not using a database)
  const jobAnalysisId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const jobAnalysisResponse = {
    jobAnalysis: {
      id: jobAnalysisId,
      jobTitle: analysisResult.jobTitle,
      jobDescription,
      extractedRequirements: [
        ...analysisResult.requirements.skills,
        ...analysisResult.requirements.experience,
        ...analysisResult.requirements.qualifications,
        ...analysisResult.requirements.responsibilities
      ],
      keywords: analysisResult.requirements.keywords,
    },
    requirements: analysisResult.requirements,
    jobTitle: analysisResult.jobTitle,
    company: analysisResult.company
  };
  
  // Store in session state
  sessionState.storeJobAnalysis(jobAnalysisResponse);
  
  return jobAnalysisResponse;
}

export async function analyzeResume(file: File, jobAnalysisId: string, jobRequirements: JobRequirements): Promise<ResumeAnalysisResponse> {
  const { sessionState } = await import('./sessionState');
  
  // Process file client-side
  const { processFile } = await import('./fileProcessor');
  const processedFile = await processFile(file);
  
  // Analyze resume against job requirements using OpenAI
  const { scores, recommendations } = await openaiClient.analyzeResumeAlignment(
    processedFile.content,
    jobRequirements
  );
  
  // Create a unique ID for the resume analysis
  const resumeAnalysisId = `resume-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const resumeAnalysisResponse = {
    resumeAnalysis: {
      id: resumeAnalysisId,
      jobAnalysisId,
      originalContent: processedFile.content,
      fileName: processedFile.fileName,
      fileType: processedFile.fileType,
      overallScore: scores.overall,
      keywordScore: scores.keywords,
      atsScore: scores.ats,
      recommendations,
      optimizedContent: null,
    },
    scores,
    recommendations 
  };
  
  // Store in session state
  sessionState.storeResumeAnalysis(resumeAnalysisResponse);
  
  return resumeAnalysisResponse;
}

export async function optimizeResume(resumeAnalysisId: string, appliedRecommendations: string[]) {
  const { sessionState } = await import('./sessionState');
  
  const resumeAnalysis = sessionState.getResumeAnalysis(resumeAnalysisId);
  if (!resumeAnalysis) {
    throw new Error("Resume analysis not found");
  }

  // Generate optimized content using OpenAI
  const optimizedContent = await openaiClient.generateOptimizedContent(
    resumeAnalysis.resumeAnalysis.originalContent,
    resumeAnalysis.recommendations,
    appliedRecommendations
  );

  // Update the resume analysis with optimized content and applied recommendations
  const updatedAnalysis = sessionState.updateResumeAnalysis(resumeAnalysisId, {
    optimizedContent,
    recommendations: resumeAnalysis.recommendations.map(rec => ({
      ...rec,
      applied: appliedRecommendations.includes(rec.id)
    }))
  });

  return { 
    optimizedContent,
    updatedAnalysis 
  };
}

export async function getTemplates(): Promise<{ templates: DocumentTemplate[] }> {
  // Client-side templates - no server required
  const templates = [
    { name: "Professional", description: "Clean, modern resume template" },
    { name: "Modern", description: "Contemporary design with accent colors" },
    { name: "Classic", description: "Traditional, professional layout" },
    { name: "Minimal", description: "Simple, clean design" }
  ];
  
  return { templates };
}

export async function generateDocument(
  content: string, 
  templateName: string, 
  format: string
): Promise<{ content: string; filename: string; format: string }> {
  const { generateClientDocument } = await import('./documentGenerator');
  return generateClientDocument(content, templateName, format);
}

export async function getResumeAnalysis(id: string) {
  const { sessionState } = await import('./sessionState');
  const resumeAnalysis = sessionState.getResumeAnalysis(id);
  
  if (!resumeAnalysis) {
    throw new Error("Resume analysis not found");
  }
  
  return { resumeAnalysis };
}
