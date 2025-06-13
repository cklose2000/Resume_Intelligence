import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { analyzeResume, type ResumeAnalysisResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ResumeUploadProps {
  jobAnalysisId: number | null;
  onAnalysisComplete: (analysis: ResumeAnalysisResponse) => void;
}

export function ResumeUpload({ jobAnalysisId, onAnalysisComplete }: ResumeUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const analyzeResumeMutation = useMutation({
    mutationFn: (file: File) => {
      if (!jobAnalysisId) {
        throw new Error('Please analyze job requirements first');
      }
      return analyzeResume(file, jobAnalysisId);
    },
    onSuccess: (data) => {
      onAnalysisComplete(data);
      toast({
        title: "Resume Analysis Complete",
        description: `Overall match score: ${data.scores.overall}%`,
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze resume",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (jobAnalysisId) {
      analyzeResumeMutation.mutate(file);
    } else {
      toast({
        title: "Job Analysis Required",
        description: "Please analyze job requirements first before uploading your resume.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-semibold text-sm">2</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Resume Upload & Analysis</h2>
        </div>

        <div className="mb-8">
          <FileUpload
            onFileSelect={handleFileSelect}
            acceptedFileTypes={['.PDF', '.DOCX', '.TXT']}
            maxSize={10 * 1024 * 1024} // 10MB
            isUploading={analyzeResumeMutation.isPending}
            uploadProgress={analyzeResumeMutation.isPending ? 75 : 0}
          />
        </div>

        {!jobAnalysisId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-exclamation-triangle text-amber-600"></i>
              <p className="text-sm text-amber-800">
                Please complete the job analysis first before uploading your resume.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
