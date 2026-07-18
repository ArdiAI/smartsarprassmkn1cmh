const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

export interface UploadResult {
  url: string;
  fileId: string;
}

export async function uploadFileToDrive(
  file: File,
  fileName?: string,
): Promise<UploadResult | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (fileName) {
      formData.append('fileName', fileName);
    }
    const res = await fetch(`${supabaseUrl}/functions/v2/upload-file`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.url && data?.fileId) {
      return { url: data.url, fileId: data.fileId };
    }
    return null;
  } catch {
    return null;
  }
}
