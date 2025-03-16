/**
 * Archive helper functions
 */

/**
 * Convert a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // convert camelCase to kebab-case
    .replace(/[\s_]+/g, '-') // convert spaces and underscores to hyphens
    .toLowerCase(); // convert to lowercase
}

/**
 * Decompress gzip data using Web Streams API
 */
export async function decompressGzip(gzipData: Uint8Array): Promise<Uint8Array> {
  try {
    // Use DecompressionStream API which is available in Cloudflare Workers
    const ds = new DecompressionStream('gzip');
    const stream = new Response(gzipData).body;
    
    if (!stream) {
      throw new Error('Failed to create stream from data');
    }
    
    const decompressedStream = stream.pipeThrough(ds);
    const decompressedResponse = new Response(decompressedStream);
    const decompressed = await decompressedResponse.arrayBuffer();
    
    // Return as Uint8Array
    return new Uint8Array(decompressed);
  } catch (e) {
    console.error('Error decompressing gzip data:', e);
    throw e;
  }
}

/**
 * Extract specific file content from a tar buffer
 * This is a simple implementation that scans the tar buffer for files
 * Tar format spec: https://en.wikipedia.org/wiki/Tar_(computing)#File_format
 */
export function extractFileFromTar(tarBuffer: Uint8Array, targetFileName: string): Uint8Array | null {
  const decoder = new TextDecoder();
  let position = 0;
  
  // Process tar entries
  while (position + 512 <= tarBuffer.length) {
    // Read header block
    const headerBlock = tarBuffer.slice(position, position + 512);
    
    // Check for null block (end of archive)
    if (headerBlock.every(byte => byte === 0)) {
      break;
    }
    
    // Extract filename from header (first 100 bytes)
    const filenameBytes = headerBlock.slice(0, 100);
    let filename = '';
    for (let i = 0; i < filenameBytes.length; i++) {
      if (filenameBytes[i] === 0) break;
      filename += String.fromCharCode(filenameBytes[i]);
    }
    
    // Clean up filename (remove leading ./ if present)
    filename = filename.replace(/^\.\//, '');
    
    // Extract the typeflag (byte 156)
    const typeflag = headerBlock[156];
    
    // Log for debugging
    console.log('Found file in tar:', filename, 'typeflag:', typeflag);
    
    // Skip if not a regular file (0 or null is a regular file)
    // 48 is ASCII for '0', 0 is null
    if (typeflag !== 48 && typeflag !== 0) {
      console.log('Skipping non-regular file:', filename, 'typeflag:', typeflag);
      position += 512; // Skip header
      continue;
    }
    
    // Extract file size (bytes 124-136)
    const fileSizeOctal = decoder.decode(headerBlock.slice(124, 136)).trim();
    const fileSize = parseInt(fileSizeOctal, 8);
    
    if (isNaN(fileSize)) {
      console.log('Invalid file size for:', filename);
      position += 512; // Skip header
      continue;
    }
    
    // Move to file content
    position += 512;
    
    if (filename === targetFileName || filename.endsWith('/' + targetFileName)) {
      // We found our target file, extract its content
      console.log('Found target file:', targetFileName, 'with size:', fileSize);
      
      // Make sure we have enough bytes for the file content
      if (position + fileSize > tarBuffer.length) {
        console.log('Warning: File extends beyond buffer bounds');
        return tarBuffer.slice(position, tarBuffer.length);
      }
      
      // Skip empty files
      if (fileSize === 0) {
        console.log('File is empty');
        return new Uint8Array(0);
      }
      
      // Return the file content
      const content = tarBuffer.slice(position, position + fileSize);
      
      // Validate content is not just metadata
      if (fileSize > 16) {
        const contentPreview = decoder.decode(content.slice(0, 16));
        if (contentPreview.includes('mtime=') || contentPreview.includes('LIBARCHIVE')) {
          console.log('Warning: Content appears to be metadata, not file content');
          console.log('Full content preview:', decoder.decode(content.slice(0, 100)));
        }
      }
      
      return content;
    }
    
    // Move to next header, accounting for padding
    position += Math.ceil(fileSize / 512) * 512;
  }
  
  return null;
}

/**
 * List all files in a tar archive
 */
export function listTarFiles(tarBuffer: Uint8Array): string[] {
  const decoder = new TextDecoder();
  let position = 0;
  const files: string[] = [];
  
  // Process tar entries
  while (position + 512 <= tarBuffer.length) {
    // Read header block
    const headerBlock = tarBuffer.slice(position, position + 512);
    
    // Check for null block (end of archive)
    if (headerBlock.every(byte => byte === 0)) {
      break;
    }
    
    // Extract filename from header (first 100 bytes)
    const filenameBytes = headerBlock.slice(0, 100);
    let filename = '';
    for (let i = 0; i < filenameBytes.length; i++) {
      if (filenameBytes[i] === 0) break;
      filename += String.fromCharCode(filenameBytes[i]);
    }
    
    // Clean up filename (remove leading ./ if present)
    filename = filename.replace(/^\.\//, '');
    
    // Add to files list
    files.push(filename);
    
    // Extract file size (bytes 124-136)
    const fileSizeOctal = decoder.decode(headerBlock.slice(124, 136)).trim();
    const fileSize = parseInt(fileSizeOctal, 8);
    
    // Move to next header
    position += 512 + Math.ceil(fileSize / 512) * 512;
  }
  
  return files;
}

/**
 * Clean and parse potentially malformed JSON
 */
export function safeParseJson(jsonString: string): any {
  // Log the raw string for debugging
  console.log('Raw JSON content (first 100 chars):', jsonString.substring(0, 100));
  
  try {
    // First try to parse it as is
    return JSON.parse(jsonString);
  } catch (e) {
    console.log('Initial JSON parse failed, attempting to clean up...');
    
    // Check if the content looks like archive metadata rather than JSON
    if (jsonString.includes('mtime=') || jsonString.includes('LIBARCHIVE') || jsonString.includes('SCHILY')) {
      console.log('Content appears to be archive metadata, not JSON');
      throw new Error('Content appears to be archive metadata attributes, not a valid JSON file');
    }
    
    // Try to clean up the string
    let cleanedJson = jsonString.trim();
    
    // Remove any null bytes and other non-printable characters
    cleanedJson = cleanedJson.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Find the outermost JSON object if there's garbage before/after it
    const firstBrace = cleanedJson.indexOf('{');
    const lastBrace = cleanedJson.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
      console.log('Extracted JSON object:', cleanedJson.substring(0, 100));
      
      // Try parsing again
      try {
        return JSON.parse(cleanedJson);
      } catch (e2) {
        console.log('Failed to parse extracted JSON object');
        throw e2;
      }
    } else {
      console.log('Could not find valid JSON object structure');
      throw e;
    }
  }
} 