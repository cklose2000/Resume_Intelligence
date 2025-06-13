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
  const [jobDescription, setJobDescription] = useState('');
  const [extractedRequirements, setExtractedRequirements] = useState<string[]>([]);
  const [extractedJobInfo, setExtractedJobInfo] = useState<{title: string, company: string} | null>(null);
  const { toast } = useToast();

  const analyzeJobMutation = useMutation({
    mutationFn: (description: string) => {
      return analyzeJob(description);
    },
    onSuccess: (data) => {
      setExtractedRequirements(data.requirements.skills.concat(
        data.requirements.experience,
        data.requirements.qualifications,
        data.requirements.responsibilities
      ));
      setExtractedJobInfo({ title: data.jobTitle, company: data.company });
      onAnalysisComplete(data);
      toast({
        title: "Job Analysis Complete",
        description: `Extracted ${data.jobTitle} at ${data.company}`,
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
    if (!jobDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please paste the job description.",
        variant: "destructive",
      });
      return;
    }
    analyzeJobMutation.mutate(jobDescription);
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
            <Label htmlFor="jobDescription">
              Job Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the complete job description from LinkedIn, Indeed, or any job board..."
              rows={10}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              <i className="fas fa-magic text-blue-500"></i>
              {' '}AI will automatically extract job title, company, requirements, and keywords
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
                <i className="fas fa-magic mr-2"></i>
                Analyze with AI
              </>
            )}
          </Button>
        </form>

        {extractedJobInfo && (
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h3 className="font-medium text-emerald-900 mb-3">Job Information Extracted:</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <i className="fas fa-briefcase text-emerald-600"></i>
                <span className="font-medium text-emerald-800">Position:</span>
                <span className="text-emerald-700">{extractedJobInfo.title}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <i className="fas fa-building text-emerald-600"></i>
                <span className="font-medium text-emerald-800">Company:</span>
                <span className="text-emerald-700">{extractedJobInfo.company}</span>
              </div>
            </div>
          </div>
        )}

        {extractedRequirements.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
