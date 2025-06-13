import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { analyzeJob, type JobAnalysisResponse, type JobRequirements } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface JobAnalysisProps {
  onAnalysisComplete: (analysis: JobAnalysisResponse) => void;
}

export function JobAnalysis({ onAnalysisComplete }: JobAnalysisProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [extractedRequirements, setExtractedRequirements] = useState<string[]>([]);
  const { toast } = useToast();

  const analyzeJobMutation = useMutation({
    mutationFn: ({ title, description }: { title: string; description: string }) =>
      analyzeJob(title, description),
    onSuccess: (data) => {
      setExtractedRequirements(data.requirements.skills.concat(
        data.requirements.experience,
        data.requirements.qualifications,
        data.requirements.responsibilities
      ));
      onAnalysisComplete(data);
      toast({
        title: "Job Analysis Complete",
        description: "Successfully extracted key requirements from the job description.",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze job description",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !jobDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both job title and description.",
        variant: "destructive",
      });
      return;
    }
    analyzeJobMutation.mutate({ title: jobTitle, description: jobDescription });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">1</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Job Requirements</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="jobTitle">
              Job Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="jobTitle"
              type="text"
              placeholder="e.g., Senior Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="jobDescription">
              Job Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the complete job description here..."
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              <i className="fas fa-lightbulb text-amber-500"></i>
              {' '}Include requirements, responsibilities, and qualifications
            </p>
          </div>

          <Button 
            type="submit"
            className="w-full"
            disabled={analyzeJobMutation.isPending}
          >
            {analyzeJobMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Analyzing...
              </>
            ) : (
              <>
                <i className="fas fa-search mr-2"></i>
                Analyze Job Requirements
              </>
            )}
          </Button>
        </form>

        {extractedRequirements.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Key Requirements Detected:</h3>
            <div className="space-y-2">
              {extractedRequirements.slice(0, 5).map((requirement, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <i className="fas fa-dot-circle text-blue-500 text-xs"></i>
                  <span className="text-blue-800">{requirement}</span>
                </div>
              ))}
              {extractedRequirements.length > 5 && (
                <p className="text-xs text-blue-600 mt-2">
                  And {extractedRequirements.length - 5} more requirements...
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
