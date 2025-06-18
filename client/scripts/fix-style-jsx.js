#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  '../src/components/ChangeTracker.tsx',
  '../src/components/AISuggestions.tsx', 
  '../src/components/ResumePreview.tsx',
  '../src/components/ResumeWorkspace.tsx',
  '../src/components/ResumeEditor.tsx',
  '../src/components/InteractiveResumeEditor.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace style jsx global with dangerouslySetInnerHTML
  content = content.replace(
    /<style jsx global>\{`([\s\S]*?)`\}<\/style>/g,
    '<style dangerouslySetInnerHTML={{ __html: `$1` }} />'
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${file}`);
});