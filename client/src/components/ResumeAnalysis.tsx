import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { optimizeResume, type ResumeAnalysisResponse, type OptimizationRecommendation } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ResumeAnalysisProps {
  analysis: ResumeAnalysisResponse | null;
  onOptimizationComplete: (optimizedContent: string, recommendations: string[]) => void;
  onOptimizationStart?: (recommendations: string[]) => void;
}

export function ResumeAnalysis({ analysis, onOptimizationComplete, onOptimizationStart }: ResumeAnalysisProps) {
  const [appliedRecommendations, setAppliedRecommendations] = useState<string[]>([]);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const { toast } = useToast();

  const optimizeResumeMutation = useMutation({
    mutationFn: (recommendations: string[]) => {
      if (!analysis) throw new Error('No analysis available');
      return optimizeResume(analysis.resumeAnalysis.id, recommendations);
    },
    onSuccess: (data) => {
      onOptimizationComplete(data.optimizedContent, appliedRecommendations);
      toast({
        title: "Resume Optimized",
        description: `Applied ${appliedRecommendations.length} recommendations successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Failed to optimize resume",
        variant: "destructive",
      });
    },
  });

  const handleApplyRecommendation = (recommendationId: string) => {
    const newApplied = [...appliedRecommendations, recommendationId];
    setAppliedRecommendations(newApplied);
    onOptimizationStart?.(newApplied);
    optimizeResumeMutation.mutate(newApplied);
  };

  const handleRemoveRecommendation = (recommendationId: string) => {
    const newApplied = appliedRecommendations.filter(id => id !== recommendationId);
    setAppliedRecommendations(newApplied);
    if (newApplied.length > 0) {
      optimizeResumeMutation.mutate(newApplied);
    }
  };

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-400 font-semibold text-sm">2</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-400">Resume Analysis & Optimization</h2>
          </div>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-chart-line text-gray-400 text-xl"></i>
            </div>
            <p className="text-gray-500">Upload your resume to see analysis results</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { scores, recommendations } = analysis;
  const displayedRecommendations = showAllRecommendations ? recommendations : recommendations.slice(0, 2);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'bg-amber-100 text-amber-700';
      case 'Medium': return 'bg-blue-100 text-blue-700';
      case 'Low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-semibold text-sm">2</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Resume Analysis & Optimization</h2>
        </div>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Analysis Progress</span>
              <span className="text-sm text-gray-600">Complete</span>
            </div>
            <Progress value={100} className="mb-1" />
            <p className="text-xs text-gray-500">Analysis completed successfully</p>
          </div>

          {/* Alignment Scores */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${getScoreColor(scores.overall)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Overall Match</p>
                  <p className="text-2xl font-bold">{scores.overall}%</p>
                </div>
                <i className="fas fa-chart-line text-xl"></i>
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${getScoreColor(scores.keywords)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Keywords</p>
                  <p className="text-2xl font-bold">{scores.keywords}%</p>
                </div>
                <i className="fas fa-key text-xl"></i>
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${getScoreColor(scores.ats)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">ATS Score</p>
                  <p className="text-2xl font-bold">{scores.ats}%</p>
                </div>
                <i className="fas fa-robot text-xl"></i>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-violet-50 rounded-lg p-6 border border-violet-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center">
                <i className="fas fa-magic text-white text-sm"></i>
              </div>
              <h3 className="text-lg font-semibold text-violet-900">AI Optimization Recommendations</h3>
            </div>
            
            <div className="space-y-4">
              {displayedRecommendations.map((recommendation) => (
                <div key={recommendation.id} className="bg-white p-4 rounded-lg border border-violet-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-exclamation text-amber-600 text-xs"></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {recommendation.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        {recommendation.description}
                      </p>
                      <div className="flex items-center space-x-3">
                        {appliedRecommendations.includes(recommendation.id) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveRecommendation(recommendation.id)}
                            disabled={optimizeResumeMutation.isPending}
                          >
                            <i className="fas fa-check mr-1"></i>
                            Applied
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleApplyRecommendation(recommendation.id)}
                            disabled={optimizeResumeMutation.isPending}
                          >
                            {optimizeResumeMutation.isPending ? (
                              <i className="fas fa-spinner fa-spin mr-1"></i>
                            ) : null}
                            Apply Suggestion
                          </Button>
                        )}
                      </div>
                    </div>
                    <Badge className={getImpactColor(recommendation.impact)}>
                      {recommendation.impact} Impact
                    </Badge>
                  </div>
                </div>
              ))}

              {recommendations.length > 2 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAllRecommendations(!showAllRecommendations)}
                >
                  {showAllRecommendations 
                    ? 'Show Less Recommendations' 
                    : `View All Recommendations (${recommendations.length - 2} more)`
                  }
                </Button>
              )}
            </div>
          </div>

          {/* Interactive Editor Preview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Content Preview</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {appliedRecommendations.length} optimizations applied
                </Badge>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 min-h-[200px]">
              <div className="space-y-3 text-sm">
                <div className="font-medium text-gray-900">RESUME CONTENT</div>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {analysis.resumeAnalysis.optimizedContent || 
                   analysis.resumeAnalysis.originalContent.substring(0, 500)}
                  {analysis.resumeAnalysis.originalContent.length > 500 && '...'}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <i className="fas fa-lightbulb text-amber-500"></i>
              {' '}Apply recommendations above to see optimized content
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
