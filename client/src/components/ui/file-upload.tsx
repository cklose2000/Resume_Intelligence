import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from './button';
import { Card } from './card';
import { Progress } from './progress';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes: string[];
  maxSize: number;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function FileUpload({ 
  onFileSelect, 
  acceptedFileTypes, 
  maxSize, 
  isUploading = false,
  uploadProgress = 0 
}: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize,
    multiple: false
  });

  if (isUploading) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <i className="fas fa-spinner fa-spin text-2xl text-blue-500"></i>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Resume</h3>
            <p className="text-gray-600 mb-4">Analyzing your resume content...</p>
            <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            <p className="text-xs text-gray-500 mt-2">{uploadProgress}% complete</p>
          </div>
        </div>
      </Card>
    );
  }

  if (uploadedFile) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <i className="fas fa-file-alt text-green-600"></i>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{uploadedFile.name}</h3>
            <p className="text-sm text-gray-500">
              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUploadedFile(null);
            }}
          >
            <i className="fas fa-times mr-2"></i>
            Remove
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      {...getRootProps()} 
      className={`p-8 text-center cursor-pointer transition-colors ${
        isDragActive 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-blue-400'
      }`}
    >
      <input {...getInputProps()} />
      <div className="space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors ${
          isDragActive 
            ? 'bg-blue-100' 
            : 'bg-gray-100 group-hover:bg-blue-50'
        }`}>
          <i className={`fas fa-cloud-upload-alt text-2xl transition-colors ${
            isDragActive 
              ? 'text-blue-500' 
              : 'text-gray-400 group-hover:text-blue-500'
          }`}></i>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Your Resume</h3>
          <p className="text-gray-600 mb-4">
            {isDragActive 
              ? 'Drop your resume file here' 
              : 'Drag and drop your resume file or click to browse'}
          </p>
          <Button variant="default" className="mb-2">
            Choose File
          </Button>
          <p className="text-xs text-gray-500">
            Supports {acceptedFileTypes.join(', ')} (Max {Math.round(maxSize / 1024 / 1024)}MB)
          </p>
        </div>
      </div>
    </Card>
  );
}
