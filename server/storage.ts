import { 
  users, 
  jobAnalyses, 
  resumeAnalyses, 
  documents,
  type User, 
  type InsertUser,
  type JobAnalysis,
  type InsertJobAnalysis,
  type ResumeAnalysis,
  type InsertResumeAnalysis,
  type Document,
  type InsertDocument
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createJobAnalysis(analysis: InsertJobAnalysis): Promise<JobAnalysis>;
  getJobAnalysis(id: number): Promise<JobAnalysis | undefined>;
  
  createResumeAnalysis(analysis: InsertResumeAnalysis): Promise<ResumeAnalysis>;
  getResumeAnalysis(id: number): Promise<ResumeAnalysis | undefined>;
  updateResumeAnalysis(id: number, analysis: Partial<ResumeAnalysis>): Promise<ResumeAnalysis | undefined>;
  getResumeAnalysesByJobAnalysis(jobAnalysisId: number): Promise<ResumeAnalysis[]>;
  
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByResumeAnalysis(resumeAnalysisId: number): Promise<Document[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private jobAnalyses: Map<number, JobAnalysis>;
  private resumeAnalyses: Map<number, ResumeAnalysis>;
  private documents: Map<number, Document>;
  private currentUserId: number;
  private currentJobAnalysisId: number;
  private currentResumeAnalysisId: number;
  private currentDocumentId: number;

  constructor() {
    this.users = new Map();
    this.jobAnalyses = new Map();
    this.resumeAnalyses = new Map();
    this.documents = new Map();
    this.currentUserId = 1;
    this.currentJobAnalysisId = 1;
    this.currentResumeAnalysisId = 1;
    this.currentDocumentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createJobAnalysis(analysis: InsertJobAnalysis): Promise<JobAnalysis> {
    const id = this.currentJobAnalysisId++;
    const jobAnalysis: JobAnalysis = {
      ...analysis,
      id,
      createdAt: new Date(),
    };
    this.jobAnalyses.set(id, jobAnalysis);
    return jobAnalysis;
  }

  async getJobAnalysis(id: number): Promise<JobAnalysis | undefined> {
    return this.jobAnalyses.get(id);
  }

  async createResumeAnalysis(analysis: InsertResumeAnalysis): Promise<ResumeAnalysis> {
    const id = this.currentResumeAnalysisId++;
    const resumeAnalysis: ResumeAnalysis = {
      ...analysis,
      id,
      createdAt: new Date(),
    };
    this.resumeAnalyses.set(id, resumeAnalysis);
    return resumeAnalysis;
  }

  async getResumeAnalysis(id: number): Promise<ResumeAnalysis | undefined> {
    return this.resumeAnalyses.get(id);
  }

  async updateResumeAnalysis(id: number, analysis: Partial<ResumeAnalysis>): Promise<ResumeAnalysis | undefined> {
    const existing = this.resumeAnalyses.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...analysis };
    this.resumeAnalyses.set(id, updated);
    return updated;
  }

  async getResumeAnalysesByJobAnalysis(jobAnalysisId: number): Promise<ResumeAnalysis[]> {
    return Array.from(this.resumeAnalyses.values()).filter(
      (analysis) => analysis.jobAnalysisId === jobAnalysisId
    );
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const doc: Document = {
      ...document,
      id,
      createdAt: new Date(),
    };
    this.documents.set(id, doc);
    return doc;
  }

  async getDocumentsByResumeAnalysis(resumeAnalysisId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.resumeAnalysisId === resumeAnalysisId
    );
  }
}

export const storage = new MemStorage();
