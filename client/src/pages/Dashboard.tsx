import { useState } from 'react';
import { JobAnalysis } from '@/components/JobAnalysis';
import { ResumeUpload } from '@/components/ResumeUpload';
import { ResumeAnalysis } from '@/components/ResumeAnalysis';
import { ContentPreview } from '@/components/ContentPreview';
import { DocumentGeneration } from '@/components/DocumentGeneration';
import { Card, CardContent } from '@/components/ui/card';
import type { JobAnalysisResponse, ResumeAnalysisResponse } from '@/lib/api';

export default function Dashboard() {
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysisResponse | null>(null);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysisResponse | null>(null);
  const [optimizedContent, setOptimizedContent] = useState<string>('');
  const [appliedRecommendations, setAppliedRecommendations] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleJobAnalysisComplete = (analysis: JobAnalysisResponse) => {
    setJobAnalysis(analysis);
  };

  const handleResumeAnalysisComplete = (analysis: ResumeAnalysisResponse) => {
    setResumeAnalysis(analysis);
  };

  const handleOptimizationComplete = (content: string, recommendations: string[]) => {
    setOptimizedContent(content);
    setAppliedRecommendations(recommendations);
    setIsOptimizing(false);
  };

  const handleOptimizationStart = (recommendations: string[]) => {
    setAppliedRecommendations(recommendations);
    setIsOptimizing(true);
  };

  const beforeScore = resumeAnalysis?.scores.overall;
  const afterScore = resumeAnalysis && optimizedContent ? 
    Math.min(100, (resumeAnalysis.scores.overall + 15)) : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-robot text-white text-sm"></i>
              </div>
              <span className="text-xl font-semibold text-gray-900">ResumeAI</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">Dashboard</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">History</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">Templates</a>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium">
                Upgrade Pro
              </button>
            </nav>
            <button className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900">
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Optimize Your Resume with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600"> AI Intelligence</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Upload your resume, paste a job description, and get AI-powered recommendations to boost your application success rate
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <i className="fas fa-check-circle text-emerald-500"></i>
              <span>ATS-Optimized</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-check-circle text-emerald-500"></i>
              <span>Professional Formatting</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-check-circle text-emerald-500"></i>
              <span>Multiple Export Formats</span>
            </div>
          </div>
        </div>

        {/* Optimization Workflow */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Step 1: Job Description Input */}
          <div className="lg:col-span-1">
            <JobAnalysis onAnalysisComplete={handleJobAnalysisComplete} />
          </div>

          {/* Step 2: Resume Upload & Analysis */}
          <div className="lg:col-span-2">
            <ResumeUpload 
              jobAnalysisId={jobAnalysis?.jobAnalysis.id || null}
              onAnalysisComplete={handleResumeAnalysisComplete}
            />
          </div>
        </div>

        {/* Resume Analysis & Content Preview */}
        {resumeAnalysis && (
          <div className="mt-8 grid lg:grid-cols-2 gap-8">
            <div>
              <ResumeAnalysis 
                analysis={resumeAnalysis}
                onOptimizationComplete={handleOptimizationComplete}
                onOptimizationStart={handleOptimizationStart}
              />
            </div>
            <div>
              <ContentPreview
                originalContent={resumeAnalysis.resumeAnalysis.originalContent}
                optimizedContent={optimizedContent}
                appliedRecommendations={appliedRecommendations}
                isOptimizing={isOptimizing}
              />
            </div>
          </div>
        )}

        {/* Document Generation */}
        <div className="mt-8">
          <DocumentGeneration 
            resumeAnalysis={resumeAnalysis}
            beforeScore={beforeScore}
            afterScore={afterScore}
          />
        </div>

        {/* Feature Highlights */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose AI Resume Optimizer?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Our intelligent platform combines cutting-edge AI with proven resume optimization strategies</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-brain text-white text-xl"></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
              <p className="text-sm text-gray-600">Advanced algorithms analyze job requirements and provide targeted optimization suggestions</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-chart-line text-white text-xl"></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Scoring</h3>
              <p className="text-sm text-gray-600">See your resume score improve in real-time as you apply AI recommendations</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-file-download text-white text-xl"></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Professional Output</h3>
              <p className="text-sm text-gray-600">Export ATS-optimized resumes in multiple formats with professional templates</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-robot text-white text-sm"></i>
                </div>
                <span className="text-xl font-semibold text-gray-900">ResumeAI</span>
              </div>
              <p className="text-gray-600 text-sm">Transform your career with AI-powered resume optimization</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Features</a></li>
                <li><a href="#" className="hover:text-gray-900">Templates</a></li>
                <li><a href="#" className="hover:text-gray-900">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Help Center</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact Us</a></li>
                <li><a href="#" className="hover:text-gray-900">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Connect</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-gray-600">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600">
                  <i className="fab fa-linkedin"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600">
                  <i className="fab fa-github"></i>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
            <p>&copy; 2024 ResumeAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
