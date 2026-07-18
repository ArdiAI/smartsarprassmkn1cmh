/**
 * Upload a file to Google Drive via the upload-file edge function.
 */
export async function uploadFileToDrive(
  file: File,
  fileName?: string,
): Promise<{ url: string; fileId: string } | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (fileName) formData.append('fileName', fileName);

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/upload-file`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.error('Upload failed:', await res.text());
      return null;
    }

    const data = await res.json();
    if (data.success && data.url) {
      return { url: data.url, fileId: data.fileId };
    }
    console.error('Upload error:', data.error);
    return null;
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}
