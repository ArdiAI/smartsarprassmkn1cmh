import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UploadResponse {
  success: boolean;
  url?: string;
  fileId?: string;
  error?: string;
}

async function uploadToGoogleDrive(
  fileData: Uint8Array,
  fileName: string,
  mimeType: string,
): Promise<{ url: string; fileId: string } | null> {
  const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_DRIVE_REFRESH_TOKEN");
  const folderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("Missing Google Drive credentials");
    return null;
  }

  // Exchange refresh token for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Failed to refresh Google Drive token:", await tokenRes.text());
    return null;
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Build multipart/related body for Drive API v3 upload
  const boundary = "smart_sarpras_boundary_" + Math.random().toString(36).slice(2);
  const metadata: any = { name: fileName, mimeType };
  if (folderId) metadata.parents = [folderId];

  const metadataJson = JSON.stringify(metadata);
  const encoder = new TextEncoder();

  const metadataPart = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataJson}\r\n`,
  );
  const filePartHeader = encoder.encode(
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const closing = encoder.encode(`\r\n--${boundary}--\r\n`);

  const body = new Uint8Array(metadataPart.length + filePartHeader.length + fileData.length + closing.length);
  body.set(metadataPart, 0);
  body.set(filePartHeader, metadataPart.length);
  body.set(fileData, metadataPart.length + filePartHeader.length);
  body.set(closing, metadataPart.length + filePartHeader.length + fileData.length);

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!uploadRes.ok) {
    console.error("Google Drive upload failed:", await uploadRes.text());
    return null;
  }

  const uploaded = await uploadRes.json();
  const fileId = uploaded.id;
  const url = uploaded.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  // Make the file publicly viewable so the URL works without login
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });
  } catch (e) {
    console.error("Failed to set public permission:", e);
  }

  return { url, fileId };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      const result: UploadResponse = { success: false, error: "No file provided" };
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileData = new Uint8Array(await file.arrayBuffer());
    const fileName = (formData.get("fileName") as string) || file.name || `upload_${Date.now()}`;
    const mimeType = file.type || "application/octet-stream";

    const uploaded = await uploadToGoogleDrive(fileData, fileName, mimeType);

    if (!uploaded) {
      const result: UploadResponse = {
        success: false,
        error: "Upload ke Google Drive gagal. Pastikan kredensial Google Drive sudah dikonfigurasi.",
      };
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result: UploadResponse = { success: true, url: uploaded.url, fileId: uploaded.fileId };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Upload error:", e);
    const result: UploadResponse = { success: false, error: String(e) };
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
