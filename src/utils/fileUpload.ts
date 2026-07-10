/**
 * File upload validation and Google Drive upload utility.
 * Validates file size (10 MB max) and type (jpg, jpeg, png, pdf).
 * Uploads via the upload-file edge function, storing only the Drive URL.
 */

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'pdf'];

export interface FileValidationError {
  type: 'size' | 'format';
  message: string;
}

export function validateFile(file: File): FileValidationError | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXT.includes(ext) || !ALLOWED_MIME.includes(file.type)) {
    return { type: 'format', message: 'Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau PDF.' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { type: 'size', message: 'Ukuran file maksimal 10 MB.' };
  }
  return null;
}

export interface UploadResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
}

export async function uploadFile(
  file: File,
  folder: string = 'sarpras'
): Promise<UploadResult> {
  const validationError = validateFile(file);
  if (validationError) throw new Error(validationError.message);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch(`${supabaseUrl}/functions/v1/upload-file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${anonKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Upload gagal' }));
    throw new Error(err.error || `Upload gagal (${response.status})`);
  }

  const data = await response.json();
  if (!data.fileUrl) throw new Error('Respons upload tidak valid');
  return data as UploadResult;
}
