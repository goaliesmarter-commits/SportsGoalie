'use client';

import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { firebaseStorageService, UploadProgress } from '@/lib/firebase/storage';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  file: File;
  url?: string;
  type: 'image' | 'video' | 'document';
  uploading: boolean;
  progress: number;
  error?: string;
  preview?: string;
}

interface MultiFileUploadProps {
  maxFiles?: number;
  userId: string;
  onFilesChange: (files: UploadedFile[]) => void;
  className?: string;
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  maxFiles = 3,
  userId,
  onFilesChange,
  className
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update parent when files change
  const updateFiles = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    onFilesChange(newFiles);
  }, [onFilesChange]);

  // Generate preview for image files
  const generatePreview = (file: File, type: string): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (type === 'image') {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  // Handle file upload
  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      // Upload to Firebase Storage
      const result = await firebaseStorageService.uploadMessageAttachment(
        uploadedFile.file,
        userId,
        (progress: UploadProgress) => {
          // Update progress
          setFiles(prev => prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, progress: progress.percentage }
              : f
          ));
        }
      );

      if (result.success && result.downloadURL) {
        // Update with download URL
        setFiles(prev => {
          const updated = prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, url: result.downloadURL, uploading: false, progress: 100 }
              : f
          );
          onFilesChange(updated);
          return updated;
        });
      } else {
        // Update with error
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, uploading: false, error: result.error || 'Upload failed' }
            : f
        ));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f =>
        f.id === uploadedFile.id
          ? { ...f, uploading: false, error: 'Upload failed' }
          : f
      ));
    }
  };

  // Handle file selection
  // Takes a plain array rather than a live `FileList`: this is async, and the
  // file input is cleared the moment it is read (see the picker below), which
  // empties the FileList out from under anything still holding a reference.
  const handleFiles = async (selectedFiles: File[] | null) => {
    if (!selectedFiles) return;

    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      alert(`You can only upload up to ${maxFiles} files`);
      return;
    }

    const filesToAdd = selectedFiles.slice(0, remainingSlots);

    for (const file of filesToAdd) {
      // Validate file
      const validation = firebaseStorageService.validateMessageAttachment(file);

      if (!validation.isValid) {
        alert(validation.error || 'Invalid file');
        continue;
      }

      const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const preview = await generatePreview(file, validation.type || 'document');

      const newFile: UploadedFile = {
        id: fileId,
        file,
        type: validation.type || 'document',
        uploading: true,
        progress: 0,
        preview
      };

      setFiles(prev => {
        const updated = [...prev, newFile];
        // Start upload after state is updated
        setTimeout(() => uploadFile(newFile), 0);
        return updated;
      });
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    handleFiles(Array.from(e.dataTransfer.files));
  };

  // Remove file
  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    updateFiles(updatedFiles);
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      {files.length < maxFiles && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary/50'
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600 mb-1">
            Drag and drop files here, or click to select
          </p>
          <p className="text-xs text-gray-500">
            Images (JPG, PNG, GIF, WebP - max 50MB) • Videos (MP4, MOV, AVI, WebM - max 1GB) • Documents (PDF - max 25MB)
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {files.length} of {maxFiles} files uploaded
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm,application/pdf"
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files ? Array.from(e.target.files) : [];
              // Clear the input as soon as it has been read. A file input fires
              // no `change` event when its value is unchanged, so re-picking the
              // same file did nothing at all and the picker looked dead until
              // the page was remounted.
              e.target.value = '';
              handleFiles(picked);
            }}
          />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              {/* Preview or Icon */}
              <div className="flex-shrink-0">
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                    {getFileIcon(file.type)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="h-6 w-6 p-0"
                    disabled={file.uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Progress or Error */}
                {file.uploading && (
                  <div className="mt-2 space-y-1">
                    <Progress value={file.progress} className="h-1" />
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <p className="text-xs text-gray-600">
                        Uploading... {Math.round(file.progress)}%
                      </p>
                    </div>
                  </div>
                )}

                {file.error && (
                  <p className="text-xs text-red-600 mt-1">{file.error}</p>
                )}

                {file.url && !file.uploading && (
                  <p className="text-xs text-green-600 mt-1">Upload complete</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
