import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { 
  insertJobAnalysisSchema,
  insertResumeAnalysisSchema,
  insertDocumentSchema 
} from "@shared/schema";
import { 
  analyzeJobDescription, 
  analyzeResumeAlignment, 
  generateOptimizedContent,
  type JobAnalysisResult 
} from "./lib/openai";
import { 
  processFile, 
  saveUploadedFile, 
  cleanupFile 
} from "./lib/fileProcessor";
import { 
  generateDocument, 
  templates 
} from "./lib/documentGenerator";
import * as path from "path";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt, .pdf, and .docx files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Analyze job description
  app.post("/api/analyze-job", async (req, res) => {
    try {
      const { jobDescription } = req.body;
      
      if (!jobDescription) {
        return res.status(400).json({ message: "Job description is required" });
      }
      
      const analysisResult = await analyzeJobDescription(jobDescription);
      
      const jobAnalysis = await storage.createJobAnalysis({
        userId: null,
        jobTitle: analysisResult.jobTitle,
        jobDescription,
        extractedRequirements: [
          ...analysisResult.requirements.skills,
          ...analysisResult.requirements.experience,
          ...analysisResult.requirements.qualifications,
          ...analysisResult.requirements.responsibilities
        ],
        keywords: analysisResult.requirements.keywords,
      });
      
      res.json({ 
        jobAnalysis,
        requirements: analysisResult.requirements,
        jobTitle: analysisResult.jobTitle,
        company: analysisResult.company
      });
    } catch (error) {
      console.error("Error analyzing job:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to analyze job description" 
      });
    }
  });

  // Upload and analyze resume
  app.post("/api/analyze-resume", upload.single('resume'), async (req, res) => {
    let tempFilePath: string | null = null;
    
    try {
      const { jobAnalysisId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      if (!jobAnalysisId) {
        return res.status(400).json({ message: "Job analysis ID is required" });
      }
      
      const jobAnalysis = await storage.getJobAnalysis(parseInt(jobAnalysisId));
      if (!jobAnalysis) {
        return res.status(404).json({ message: "Job analysis not found" });
      }
      
      // Save uploaded file temporarily
      tempFilePath = await saveUploadedFile(req.file.buffer, req.file.originalname);
      
      // Process the file to extract text content
      const processedFile = await processFile(tempFilePath, req.file.originalname);
      
      // Create job requirements object for analysis
      const jobRequirements = {
        skills: jobAnalysis.extractedRequirements,
        experience: [],
        qualifications: [],
        keywords: jobAnalysis.keywords,
        responsibilities: []
      };
      
      // Analyze resume against job requirements
      const { scores, recommendations } = await analyzeResumeAlignment(
        processedFile.content,
        jobRequirements
      );
      
      // Create resume analysis record
      const resumeAnalysis = await storage.createResumeAnalysis({
        jobAnalysisId: parseInt(jobAnalysisId),
        originalContent: processedFile.content,
        fileName: processedFile.fileName,
        fileType: processedFile.fileType,
        overallScore: scores.overall,
        keywordScore: scores.keywords,
        atsScore: scores.ats,
        recommendations,
        optimizedContent: null,
      });
      
      res.json({ 
        resumeAnalysis,
        scores,
        recommendations 
      });
      
    } catch (error) {
      console.error("Error analyzing resume:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to analyze resume" 
      });
    } finally {
      // Cleanup temporary file
      if (tempFilePath) {
        await cleanupFile(tempFilePath);
      }
    }
  });

  // Apply recommendations to optimize resume
  app.post("/api/optimize-resume", async (req, res) => {
    try {
      const { resumeAnalysisId, appliedRecommendations } = req.body;
      
      if (!resumeAnalysisId || !appliedRecommendations) {
        return res.status(400).json({ message: "Resume analysis ID and applied recommendations are required" });
      }
      
      const resumeAnalysis = await storage.getResumeAnalysis(resumeAnalysisId);
      if (!resumeAnalysis) {
        return res.status(404).json({ message: "Resume analysis not found" });
      }
      
      // Generate optimized content
      const optimizedContent = await generateOptimizedContent(
        resumeAnalysis.originalContent,
        resumeAnalysis.recommendations,
        appliedRecommendations
      );
      
      // Update the resume analysis with optimized content
      const updatedAnalysis = await storage.updateResumeAnalysis(resumeAnalysisId, {
        optimizedContent,
        recommendations: resumeAnalysis.recommendations.map(rec => ({
          ...rec,
          applied: appliedRecommendations.includes(rec.id)
        }))
      });
      
      res.json({ 
        optimizedContent,
        updatedAnalysis 
      });
      
    } catch (error) {
      console.error("Error optimizing resume:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to optimize resume" 
      });
    }
  });

  // Get available templates
  app.get("/api/templates", async (req, res) => {
    res.json({ templates });
  });

  // Generate document
  app.post("/api/generate-document", async (req, res) => {
    try {
      const { resumeAnalysisId, templateName, format } = req.body;
      
      if (!resumeAnalysisId || !templateName || !format) {
        return res.status(400).json({ message: "Resume analysis ID, template name, and format are required" });
      }
      
      const resumeAnalysis = await storage.getResumeAnalysis(resumeAnalysisId);
      if (!resumeAnalysis) {
        return res.status(404).json({ message: "Resume analysis not found" });
      }
      
      const content = resumeAnalysis.optimizedContent || resumeAnalysis.originalContent;
      const fileName = resumeAnalysis.fileName.replace(/\.[^/.]+$/, ""); // Remove extension
      
      // Generate document
      const filePath = await generateDocument(content, templateName, format, fileName);
      
      // Create document record
      const document = await storage.createDocument({
        resumeAnalysisId,
        templateName,
        format,
        filePath,
      });
      
      res.json({ 
        document,
        downloadUrl: `/api/download/${document.id}` 
      });
      
    } catch (error) {
      console.error("Error generating document:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate document" 
      });
    }
  });

  // Download generated document
  app.get("/api/download/:documentId", async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const documents = await storage.getDocumentsByResumeAnalysis(documentId);
      const document = documents.find(doc => doc.id === documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const fileName = path.basename(document.filePath);
      res.download(document.filePath, fileName);
      
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to download document" 
      });
    }
  });

  // Get resume analysis by ID
  app.get("/api/resume-analysis/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const resumeAnalysis = await storage.getResumeAnalysis(id);
      
      if (!resumeAnalysis) {
        return res.status(404).json({ message: "Resume analysis not found" });
      }
      
      res.json({ resumeAnalysis });
    } catch (error) {
      console.error("Error fetching resume analysis:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch resume analysis" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
