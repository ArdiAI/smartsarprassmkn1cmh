import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "sarpras";

    if (!file) {
      return new Response(JSON.stringify({ error: "File tidak ditemukan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Ukuran file maksimal 10 MB." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate type
    if (!ALLOWED_MIME.includes(file.type)) {
      return new Response(JSON.stringify({ error: "Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau PDF." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleCredentials = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const driveFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");

    if (!googleCredentials || !driveFolderId) {
      // Fallback: return a placeholder when Google Drive is not configured
      const fileName = `${Date.now()}_${file.name}`;
      return new Response(JSON.stringify({
        fileId: `local_${Date.now()}`,
        fileUrl: "",
        fileName,
        message: "Google Drive tidak dikonfigurasi. Simpan file secara manual.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse Google service account credentials
    const credentials = JSON.parse(googleCredentials);

    // Build JWT for Google OAuth
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // Encode JWT parts
    const enc = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signingInput = `${enc(header)}.${enc(payload)}`;

    // Import RSA private key
    const pemKey = credentials.private_key.replace(/\\n/g, "\n");
    const pemBody = pemKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
    const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8", binaryDer.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5", cryptoKey,
      new TextEncoder().encode(signingInput)
    );

    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = `${signingInput}.${sigB64}`;

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      throw new Error(`OAuth token error: ${tokenErr}`);
    }

    const { access_token } = await tokenRes.json();

    // Upload file to Google Drive using multipart upload
    const fileName = `${folder}_${Date.now()}_${file.name}`;
    const metadata = JSON.stringify({
      name: fileName,
      parents: [driveFolderId],
    });

    const fileBuffer = await file.arrayBuffer();
    const boundary = "sarpras_boundary_" + Date.now();
    const metaPart = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`;
    const filePart = `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`;
    const endPart = `\r\n--${boundary}--`;

    const encoder = new TextEncoder();
    const metaBytes = encoder.encode(metaPart);
    const fileHeaderBytes = encoder.encode(filePart);
    const endBytes = encoder.encode(endPart);
    const fileBytes = new Uint8Array(fileBuffer);

    const body = new Uint8Array(metaBytes.length + fileHeaderBytes.length + fileBytes.length + endBytes.length);
    let offset = 0;
    body.set(metaBytes, offset); offset += metaBytes.length;
    body.set(fileHeaderBytes, offset); offset += fileHeaderBytes.length;
    body.set(fileBytes, offset); offset += fileBytes.length;
    body.set(endBytes, offset);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      throw new Error(`Drive upload error: ${uploadErr}`);
    }

    const driveFile = await uploadRes.json();

    // Make file publicly readable
    await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });

    return new Response(JSON.stringify({
      fileId: driveFile.id,
      fileUrl: `https://drive.google.com/file/d/${driveFile.id}/view`,
      fileName: driveFile.name,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
