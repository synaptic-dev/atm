'use client'

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import JSZip from 'jszip';

interface DownloadCapabilityProps {
  schema: string;
  runner: string;
  name: string;
}

interface FileContent {
  name: string;
  content: string;
}

export function DownloadCapability({ schema, runner, name }: DownloadCapabilityProps) {
  const [downloading, setDownloading] = useState(false);

  const downloadFiles = async () => {
    setDownloading(true);
    try {
      const files: FileContent[] = [
        { name: 'schema.ts', content: schema },
        { name: 'runner.ts', content: runner }
      ];

      // Create a zip file
      const zip = new JSZip();
      files.forEach(file => {
        zip.file(file.name, file.content);
      });

      // Generate the zip file
      const content = await zip.generateAsync({ type: 'blob' });

      // Create a download link
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}-capability.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Error downloading capability:', error instanceof Error ? error.message : error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button onClick={downloadFiles} disabled={downloading} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      {downloading ? 'Downloading...' : 'Download'}
    </Button>
  );
} 