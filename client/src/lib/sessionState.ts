// In-memory session state management for client-side resume optimization

import { JobAnalysisResponse, ResumeAnalysisResponse } from './api';

interface SessionData {
  jobAnalyses: Map<string, JobAnalysisResponse>;
  resumeAnalyses: Map<string, ResumeAnalysisResponse>;
}

class SessionState {
  private data: SessionData = {
    jobAnalyses: new Map(),
    resumeAnalyses: new Map(),
  };

  // Job Analysis methods
  storeJobAnalysis(jobAnalysis: JobAnalysisResponse): void {
    this.data.jobAnalyses.set(jobAnalysis.jobAnalysis.id, jobAnalysis);
  }

  getJobAnalysis(id: string): JobAnalysisResponse | undefined {
    return this.data.jobAnalyses.get(id);
  }

  // Resume Analysis methods
  storeResumeAnalysis(resumeAnalysis: ResumeAnalysisResponse): void {
    this.data.resumeAnalyses.set(resumeAnalysis.resumeAnalysis.id, resumeAnalysis);
  }

  getResumeAnalysis(id: string): ResumeAnalysisResponse | undefined {
    return this.data.resumeAnalyses.get(id);
  }

  updateResumeAnalysis(id: string, updates: Partial<ResumeAnalysisResponse['resumeAnalysis']>): ResumeAnalysisResponse | undefined {
    const existing = this.data.resumeAnalyses.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      resumeAnalysis: {
        ...existing.resumeAnalysis,
        ...updates
      }
    };

    this.data.resumeAnalyses.set(id, updated);
    return updated;
  }

  // Clear all session data
  clear(): void {
    this.data.jobAnalyses.clear();
    this.data.resumeAnalyses.clear();
  }

  // Get all analyses for debugging/display
  getAllJobAnalyses(): JobAnalysisResponse[] {
    return Array.from(this.data.jobAnalyses.values());
  }

  getAllResumeAnalyses(): ResumeAnalysisResponse[] {
    return Array.from(this.data.resumeAnalyses.values());
  }
}

// Export singleton instance
export const sessionState = new SessionState();