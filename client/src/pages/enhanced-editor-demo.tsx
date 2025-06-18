import React, { useState } from 'react';
import { ResumeWorkspace } from '@/components/enhanced-editor';
import { openaiClient } from '@/lib/openaiClient';
import { DocumentStructureParser } from '@/lib/documentStructure';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUp, Sparkles } from 'lucide-react';

// Sample resume content for demonstration
const SAMPLE_RESUME = `JOHN DOE
San Francisco, CA • (415) 555-0123 • john.doe@email.com • linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years developing scalable web applications. Expertise in React, Node.js, and cloud technologies.

PROFESSIONAL EXPERIENCE

Senior Software Engineer - TechCorp Inc.
2021 - Present

• Led development of microservices architecture serving 1M+ users
• Improved application performance by 40% through optimization
• Mentored junior developers and conducted code reviews

Software Engineer - StartupXYZ
2019 - 2021

• Built RESTful APIs and responsive front-end applications
• Implemented CI/CD pipelines reducing deployment time by 60%
• Collaborated with product team to deliver features on schedule

EDUCATION

Bachelor of Science in Computer Science
University of California, Berkeley - 2019

SKILLS
Programming: JavaScript, TypeScript, Python, Java
Frameworks: React, Node.js, Express, Django
Tools: Git, Docker, Kubernetes, AWS, Jenkins`;

export default function EnhancedEditorDemo() {
  const [content, setContent] = useState(SAMPLE_RESUME);
  const [optimizedContent, setOptimizedContent] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = async () => {
    if (!openaiClient.hasApiKey()) {
      alert('Please set your OpenAI API key first');
      return;
    }

    setIsOptimizing(true);
    try {
      // Parse the resume structure
      const parser = new DocumentStructureParser(content);
      const structure = parser.parse();

      // Generate structured suggestions
      const jobRequirements = {
        skills: ['React', 'TypeScript', 'AWS', 'Docker'],
        experience: ['5+ years', 'team leadership', 'microservices'],
        qualifications: ['Computer Science degree'],
        keywords: ['scalable', 'cloud', 'agile', 'DevOps'],
        responsibilities: ['architecture design', 'mentoring', 'code reviews']
      };

      const aiSuggestions = await openaiClient.generateStructuredSuggestions(
        structure,
        jobRequirements
      );

      setSuggestions(aiSuggestions);
      
      // Apply high-impact suggestions automatically
      const highImpactSuggestions = aiSuggestions.filter(s => s.impact === 'high');
      if (highImpactSuggestions.length > 0) {
        const operation = {
          edits: highImpactSuggestions.filter(s => s.type === 'edit').map(s => ({
            section: s.section,
            index: s.index,
            field: s.field,
            original: s.original || '',
            suggested: s.suggested,
            reason: s.reason
          })),
          additions: highImpactSuggestions.filter(s => s.type === 'addition').map(s => ({
            section: s.section,
            content: s.suggested,
            reason: s.reason
          })),
          removals: highImpactSuggestions.filter(s => s.type === 'removal').map(s => ({
            section: s.section,
            index: s.index || 0,
            reason: s.reason
          }))
        };

        const optimized = parser.applyStructuredEdits(structure, operation);
        setOptimizedContent(parser.toHTML(optimized));
      }
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Failed to optimize resume. Please check your API key and try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleExport = (format: 'docx' | 'pdf' | 'txt') => {
    // Export logic would go here
    console.log(`Exporting as ${format}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <Card className="mb-6 p-6">
          <h1 className="text-2xl font-bold mb-4">Enhanced Resume Editor Demo</h1>
          <p className="text-gray-600 mb-4">
            This demo showcases the new Artifacts-like editor with rich text editing,
            format preservation, and AI-powered suggestions.
          </p>
          
          <div className="flex gap-4">
            <Button variant="outline" className="gap-2">
              <FileUp className="h-4 w-4" />
              Upload Resume
            </Button>
            
            <Button 
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isOptimizing ? 'Optimizing...' : 'Optimize with AI'}
            </Button>
          </div>
        </Card>

        <ResumeWorkspace
          initialContent={content}
          optimizedContent={optimizedContent ?? undefined}
          aiSuggestions={suggestions}
          onContentChange={setContent}
          onExport={handleExport}
        />
      </div>
    </div>
  );
}