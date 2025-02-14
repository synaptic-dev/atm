'use client'

import { Download } from "lucide-react"
import JSZip from 'jszip'

interface DownloadCapabilityProps {
  name: string;
  schema: any;
  runnerCode: string;
}

export function DownloadCapability({ name, schema, runnerCode }: DownloadCapabilityProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Create a new zip file
      const zip = new JSZip();
      
      // Create a folder for the capability
      const folder = zip.folder(name.toLowerCase().replace(/\s+/g, '-'));
      
      if (folder) {
        // Add files to the folder
        folder.file('schema.json', JSON.stringify(schema, null, 2));
        folder.file('runner.ts', runnerCode);
        
        // Generate zip file
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Download the zip
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.toLowerCase().replace(/\s+/g, '-')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to create zip:', error);
    }
  };

  return (
    <div 
      onClick={handleDownload}
      className="inline-flex h-7 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleDownload(e as any);
        }
      }}
    >
      <Download className="h-4 w-4" />
      Download
    </div>
  );
} 