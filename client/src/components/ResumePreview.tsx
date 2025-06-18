import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ResumePreviewProps {
  content: string;
  className?: string;
  showControls?: boolean;
}

export function ResumePreview({ 
  content, 
  className,
  showControls = true 
}: ResumePreviewProps) {
  const [zoom, setZoom] = React.useState(100);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  // Clean and prepare content for preview
  const prepareContent = (html: string): string => {
    // If content is already HTML, return as is
    if (html.includes('<h1>') || html.includes('<p>') || html.includes('<ul>')) {
      return html;
    }

    // Otherwise, convert plain text to basic HTML
    const lines = html.split('\n');
    let formattedHtml = '';
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        formattedHtml += '<br/>';
        return;
      }

      // Section headers
      if (/^[A-Z\s&-]{5,}$/.test(trimmed)) {
        formattedHtml += `<h2>${trimmed}</h2>`;
      }
      // Bullet points
      else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        formattedHtml += `<li>${trimmed.substring(1).trim()}</li>`;
      }
      // Regular text
      else {
        formattedHtml += `<p>${trimmed}</p>`;
      }
    });

    return formattedHtml;
  };

  return (
    <div className={cn("resume-preview flex flex-col h-full bg-gray-50", className)}>
      {showControls && (
        <div className="flex items-center justify-center gap-2 p-2 bg-white border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {zoom}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 150}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div
            ref={previewRef}
            className="resume-content bg-white shadow-lg p-12 min-h-[11in]"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s',
            }}
          >
            <div 
              dangerouslySetInnerHTML={{ __html: prepareContent(content) }}
              className="resume-formatted"
            />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .resume-preview {
            background: white !important;
          }
          
          .resume-preview > div:first-child {
            display: none !important;
          }
          
          .resume-content {
            box-shadow: none !important;
            padding: 0 !important;
            transform: none !important;
          }
        }

        .resume-formatted {
          font-family: 'Times New Roman', Georgia, serif;
          line-height: 1.5;
          color: #000;
        }

        .resume-formatted h1 {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .resume-formatted h2 {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 20px;
          margin-bottom: 10px;
          border-bottom: 2px solid #000;
          padding-bottom: 4px;
          letter-spacing: 0.5px;
        }

        .resume-formatted h3 {
          font-size: 14px;
          font-weight: bold;
          margin-top: 12px;
          margin-bottom: 6px;
        }

        .resume-formatted p {
          font-size: 12px;
          margin-bottom: 6px;
          text-align: justify;
        }

        .resume-formatted ul {
          margin-left: 20px;
          margin-bottom: 8px;
        }

        .resume-formatted li {
          font-size: 12px;
          margin-bottom: 4px;
          list-style-type: disc;
        }

        .resume-formatted em {
          font-style: italic;
        }

        .resume-formatted strong {
          font-weight: bold;
        }

        /* Contact info styling */
        .resume-formatted h1 + p {
          text-align: center;
          font-size: 12px;
          margin-bottom: 16px;
        }

        /* Date styling */
        .resume-formatted h3 + p > em {
          color: #555;
          font-size: 11px;
        }

        /* Compact spacing for better page utilization */
        @media print {
          .resume-formatted {
            font-size: 11px;
          }
          
          .resume-formatted h1 {
            font-size: 20px;
            margin-bottom: 6px;
          }
          
          .resume-formatted h2 {
            font-size: 14px;
            margin-top: 16px;
            margin-bottom: 8px;
          }
          
          .resume-formatted h3 {
            font-size: 12px;
            margin-top: 10px;
            margin-bottom: 4px;
          }
          
          .resume-formatted p,
          .resume-formatted li {
            font-size: 11px;
          }
        }
      ` }} />
    </div>
  );
}