// Enhanced Resume Editor Components
export { ResumeEditor } from '../ResumeEditor';
export { ResumeWorkspace } from '../ResumeWorkspace';
export { ResumePreview } from '../ResumePreview';
export { AISuggestions } from '../AISuggestions';
export { ChangeTracker } from '../ChangeTracker';

// Re-export types
export type { 
  ContactInfo,
  Experience,
  Education,
  Skill,
  ResumeStructure,
  StructuredEdit,
  EditOperation
} from '@/lib/documentStructure';

export type {
  StructuredSuggestion
} from '@/lib/openaiClient';