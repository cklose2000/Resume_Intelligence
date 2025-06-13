import { apiRequest } from "./queryClient";

export interface JobRequirements {
  skills: string[];
  experience: string[];
  qualifications: string[];
  keywords: string[];
  responsibilities: string[];
}

export interface JobAnalysisResponse {
  jobAnalysis: {
    id: number;
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
    id: number;
    jobAnalysisId: number;
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
  const response = await apiRequest("POST", "/api/analyze-job", {
    jobDescription,
  });
  
  return response.json();
}

export async function analyzeResume(file: File, jobAnalysisId: number): Promise<ResumeAnalysisResponse> {
  const formData = new FormData();
  formData.append('resume', file);
  formData.append('jobAnalysisId', jobAnalysisId.toString());
  
  const response = await fetch("/api/analyze-resume", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  
  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }
  
  return response.json();
}

export async function optimizeResume(resumeAnalysisId: number, appliedRecommendations: string[]) {
  const response = await apiRequest("POST", "/api/optimize-resume", {
    resumeAnalysisId,
    appliedRecommendations,
  });
  
  return response.json();
}

export async function getTemplates(): Promise<{ templates: DocumentTemplate[] }> {
  const response = await apiRequest("GET", "/api/templates");
  return response.json();
}

export async function generateDocument(
  resumeAnalysisId: number, 
  templateName: string, 
  format: string
): Promise<{ document: any; downloadUrl: string }> {
  const response = await apiRequest("POST", "/api/generate-document", {
    resumeAnalysisId,
    templateName,
    format,
  });
  
  return response.json();
}

export async function getResumeAnalysis(id: number) {
  const response = await apiRequest("GET", `/api/resume-analysis/${id}`);
  return response.json();
}
