import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  type: 'new_request' | 'next_approver' | 'borrower_step_advance' | 'final_decision';
  borrowing_id: string;
  borrowing_item_id?: string;
  borrower_name: string;
  borrower_email: string;
  purpose?: string;
  borrow_date: string;
  return_date: string;
  item_name?: string;
  item_quantity?: number;
  items?: { name: string; quantity: number; type: string }[];
  status?: 'approved' | 'rejected';
  next_step_label?: string;
  next_step_role?: string;
  workflow_template_id?: string;
}

function getEmailTemplate(req: EmailRequest): { subject: string; html: string; to: string } {
  const baseStyle = 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;';
  const headerStyle = 'background: linear-gradient(135deg, #3b82f6, #06b6d4); color: white; padding: 24px; border-radius: 12px 12px 0 0;';
  const bodyStyle = 'background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;';
  const dateStr = new Date(req.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const returnStr = new Date(req.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  switch (req.type) {
    case 'new_request': {
      const itemsList = (req.items || []).map(i => `<li>${i.name} (${i.quantity}x) - ${i.type === 'ruangan' ? 'Ruangan' : 'Barang'}</li>`).join('');
      return {
        subject: 'Pengajuan Peminjaman Baru Menunggu Persetujuan',
        to: req.borrower_email,
        html: `<div style="${baseStyle}">
          <div style="${headerStyle}"><h1 style="margin:0;font-size:20px;">Pengajuan Diterima</h1></div>
          <div style="${bodyStyle}">
            <p>Halo <strong>${req.borrower_name}</strong>,</p>
            <p>Pengajuan peminjaman Anda telah diterima dan sedang menunggu persetujuan bertahap.</p>
            <p><strong>Tujuan:</strong> ${req.purpose || '-'}<br/>
            <strong>Tanggal:</strong> ${dateStr} - ${returnStr}</p>
            <p><strong>Item yang dipinjam:</strong></p>
            <ul>${itemsList}</ul>
            <p>Anda akan menerima notifikasi di setiap tahap persetujuan.</p>
          </div>
        </div>`,
      };
    }
    case 'next_approver': {
      return {
        subject: `Pengajuan Menunggu Persetujuan: ${req.next_step_label || ''}`,
        to: '', // Will be filled by caller with approver email
        html: `<div style="${baseStyle}">
          <div style="${headerStyle}"><h1 style="margin:0;font-size:20px;">Menunggu Persetujuan Anda</h1></div>
          <div style="${bodyStyle}">
            <p>Ada pengajuan peminjaman yang menunggu persetujuan Anda.</p>
            <p><strong>Peminjam:</strong> ${req.borrower_name}<br/>
            <strong>Tujuan:</strong> ${req.purpose || '-'}<br/>
            <strong>Item:</strong> ${req.item_name || '-'} (${req.item_quantity || 1}x)<br/>
            <strong>Tanggal:</strong> ${dateStr} - ${returnStr}<br/>
            <strong>Tahap:</strong> ${req.next_step_label || ''}</p>
            <p>Silakan login ke dashboard admin untuk memproses persetujuan.</p>
          </div>
        </div>`,
      };
    }
    case 'borrower_step_advance': {
      return {
        subject: `Pengajuan Anda Maju ke Tahap: ${req.next_step_label || ''}`,
        to: req.borrower_email,
        html: `<div style="${baseStyle}">
          <div style="${headerStyle}"><h1 style="margin:0;font-size:20px;">Pengajuan Maju ke Tahap Berikutnya</h1></div>
          <div style="${bodyStyle}">
            <p>Halo <strong>${req.borrower_name}</strong>,</p>
            <p>Pengajuan peminjaman Anda untuk <strong>${req.item_name || '-'}</strong> telah disetujui di tahap sebelumnya dan kini menunggu persetujuan di tahap: <strong>${req.next_step_label || ''}</strong>.</p>
            <p><strong>Tanggal:</strong> ${dateStr} - ${returnStr}</p>
            <p>Mohon tunggu, Anda akan diberi tahu ketika ada perkembangan berikutnya.</p>
          </div>
        </div>`,
      };
    }
    case 'final_decision': {
      const approved = req.status === 'approved';
      const color = approved ? '#10b981' : '#ef4444';
      const title = approved ? 'Peminjaman Disetujui' : 'Peminjaman Ditolak';
      return {
        subject: title,
        to: req.borrower_email,
        html: `<div style="${baseStyle}">
          <div style="background: linear-gradient(135deg, ${approved ? '#10b981, #059669' : '#ef4444, #dc2626'}); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin:0;font-size:20px;">${title}</h1>
          </div>
          <div style="${bodyStyle}">
            <p>Halo <strong>${req.borrower_name}</strong>,</p>
            <p>Pengajuan peminjaman Anda untuk <strong>${req.item_name || '-'}</strong> (${req.item_quantity || 1}x) telah <strong style="color: ${color}">${approved ? 'DISETUJUI' : 'DITOLAK'}</strong>.</p>
            <p><strong>Tanggal:</strong> ${dateStr} - ${returnStr}</p>
            ${approved ? '<p>Silakan ambil barang/fasilitas sesuai jadwal yang ditentukan.</p>' : '<p>Untuk informasi lebih lanjut, silakan hubungi admin.</p>'}
          </div>
        </div>`,
      };
    }
    default:
      return { subject: 'Notifikasi Sistem', html: '', to: req.borrower_email };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const emailTemplate = getEmailTemplate(body);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("[DEV MODE] Email would be sent:", emailTemplate.subject, "to:", emailTemplate.to || '(no recipient)');
      console.log("[DEV MODE] Email body:", emailTemplate.html.substring(0, 200) + '...');
      return new Response(JSON.stringify({ success: true, dev_mode: true, message: "Email logged (no RESEND_API_KEY)" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If next_approver type, look up approver email from admin_users by role
    let recipientEmail = emailTemplate.to;
    if (body.type === 'next_approver' && body.workflow_template_id) {
      // The caller should pass the approver email, but if not, we can look it up
      // For now, use the borrower email as fallback (the admin dashboard handles routing)
      recipientEmail = body.borrower_email; // Fallback - in production, look up by role
    }

    if (!recipientEmail) {
      console.log("[SKIP] No recipient email for:", body.type);
      return new Response(JSON.stringify({ success: true, skipped: true, message: "No recipient" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sistem Sarpras <noreply@sarpras.id>",
        to: recipientEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      return new Response(JSON.stringify({ success: false, error: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
