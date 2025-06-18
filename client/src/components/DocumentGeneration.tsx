import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { getTemplates, generateDocument, type DocumentTemplate, type ResumeAnalysisResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DocumentGenerationProps {
  resumeAnalysis: ResumeAnalysisResponse | null;
  beforeScore?: number;
  afterScore?: number;
}

export function DocumentGeneration({ resumeAnalysis, beforeScore, afterScore }: DocumentGenerationProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('Professional');
  const [selectedFormat, setSelectedFormat] = useState('docx');
  const { toast } = useToast();

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
    enabled: !!resumeAnalysis,
  });

  const generateDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!resumeAnalysis) throw new Error('No resume analysis available');
      
      // Use optimized content if available, otherwise use original content
      const content = resumeAnalysis.resumeAnalysis.optimizedContent || resumeAnalysis.resumeAnalysis.originalContent;
      
      const result = await generateDocument(content, selectedTemplate, selectedFormat);
      
      // Import the download function and trigger download
      const { downloadDocument } = await import('@/lib/documentGenerator');
      downloadDocument(result.content, result.filename, result.format);
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Document Generated",
        description: "Your optimized resume has been generated and downloaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate document",
        variant: "destructive",
      });
    },
  });

  const templates = templatesData?.templates || [];
  const appliedRecommendations = resumeAnalysis?.resumeAnalysis.recommendations.filter(rec => rec.applied).length || 0;
  const totalRecommendations = resumeAnalysis?.resumeAnalysis.recommendations.length || 0;
  const improvement = afterScore && beforeScore ? afterScore - beforeScore : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-emerald-600 font-semibold text-sm">3</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Generate Professional Documents</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Template Options */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Choose Template</h3>
            <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
              {templates.map((template) => (
                <div key={template.name} className="flex items-center space-x-2">
                  <RadioGroupItem value={template.name} id={template.name} />
                  <Label htmlFor={template.name} className="flex-1 cursor-pointer">
                    <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 transition-colors">
                      <div className="aspect-[3/4] bg-gray-100 rounded mb-2 flex items-center justify-center">
                        {/* Template preview */}
                        <div className="text-xs text-gray-500 text-center">
                          <div className="w-16 h-2 bg-gray-300 rounded mb-1 mx-auto"></div>
                          <div className="w-12 h-1 bg-gray-300 rounded mb-2 mx-auto"></div>
                          <div className="w-14 h-1 bg-gray-300 rounded mb-1 mx-auto"></div>
                          <div className="w-10 h-1 bg-gray-300 rounded mx-auto"></div>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{template.name}</p>
                      <p className="text-xs text-gray-500">{template.description}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Export Format</h3>
            <RadioGroup value={selectedFormat} onValueChange={setSelectedFormat}>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="txt" id="txt" />
                  <Label htmlFor="txt" className="flex items-center space-x-2 cursor-pointer">
                    <i className="fas fa-file-alt text-gray-500"></i>
                    <span className="text-sm font-medium">Plain Text</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 opacity-50">
                  <RadioGroupItem value="pdf" id="pdf" disabled />
                  <Label htmlFor="pdf" className="flex items-center space-x-2 cursor-not-allowed">
                    <i className="fas fa-file-pdf text-red-500"></i>
                    <span className="text-sm font-medium">PDF Document (Coming Soon)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 opacity-50">
                  <RadioGroupItem value="docx" id="docx" disabled />
                  <Label htmlFor="docx" className="flex items-center space-x-2 cursor-not-allowed">
                    <i className="fas fa-file-word text-blue-500"></i>
                    <span className="text-sm font-medium">Word Document (Coming Soon)</span>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Progress Tracking */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Optimization Progress</h3>
            <div className="space-y-3">
              {beforeScore && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Before Optimization</span>
                  <Badge variant="destructive">{beforeScore}%</Badge>
                </div>
              )}
              {afterScore && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">After Optimization</span>
                  <Badge className="bg-emerald-100 text-emerald-700">{afterScore}%</Badge>
                </div>
              )}
              {improvement > 0 && (
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-gray-900">Improvement</span>
                  <Badge className="bg-emerald-100 text-emerald-700">+{improvement}%</Badge>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Recommendations Applied</div>
                <div className="text-sm font-medium">
                  {appliedRecommendations} of {totalRecommendations} suggestions
                </div>
              </div>
            </div>
          </div>

          {/* Generation Actions */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Generate & Download</h3>
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => generateDocumentMutation.mutate()}
                disabled={!resumeAnalysis || generateDocumentMutation.isPending}
              >
                {generateDocumentMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-download mr-2"></i>
                    Generate Resume
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                disabled={!resumeAnalysis}
              >
                <i className="fas fa-eye mr-2"></i>
                Preview
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                disabled={!resumeAnalysis}
              >
                <i className="fas fa-save mr-2"></i>
                Save to History
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center space-x-1">
                <i className="fas fa-shield-alt text-emerald-500"></i>
                <span>Your documents are private</span>
              </div>
              <div className="flex items-center space-x-1">
                <i className="fas fa-clock text-blue-500"></i>
                <span>Saved for 30 days</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
