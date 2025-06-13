import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const jobAnalyses = pgTable("job_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  jobTitle: text("job_title").notNull(),
  jobDescription: text("job_description").notNull(),
  extractedRequirements: jsonb("extracted_requirements").$type<string[]>().notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const resumeAnalyses = pgTable("resume_analyses", {
  id: serial("id").primaryKey(),
  jobAnalysisId: integer("job_analysis_id").references(() => jobAnalyses.id).notNull(),
  originalContent: text("original_content").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  overallScore: integer("overall_score").notNull(),
  keywordScore: integer("keyword_score").notNull(),
  atsScore: integer("ats_score").notNull(),
  recommendations: jsonb("recommendations").$type<Array<{
    id: string;
    title: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low';
    category: string;
    applied: boolean;
  }>>().notNull(),
  optimizedContent: text("optimized_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  resumeAnalysisId: integer("resume_analysis_id").references(() => resumeAnalyses.id).notNull(),
  templateName: text("template_name").notNull(),
  format: text("format").notNull(),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobAnalysisSchema = createInsertSchema(jobAnalyses).omit({
  id: true,
  createdAt: true,
});

export const insertResumeAnalysisSchema = createInsertSchema(resumeAnalyses).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export type InsertJobAnalysis = z.infer<typeof insertJobAnalysisSchema>;
export type InsertResumeAnalysis = z.infer<typeof insertResumeAnalysisSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type JobAnalysis = typeof jobAnalyses.$inferSelect;
export type ResumeAnalysis = typeof resumeAnalyses.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
