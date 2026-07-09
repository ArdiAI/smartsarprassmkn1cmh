import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BorrowingEmailRequest {
  borrower_name: string;
  borrower_email: string;
  item_name: string;
  borrow_date: string;
  return_date: string;
  status: 'approved' | 'rejected';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { borrower_name, borrower_email, item_name, borrow_date, return_date, status } = await req.json() as BorrowingEmailRequest;

    if (!borrower_email || !borrower_name || !item_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const dateRange = `${formatDate(borrow_date)} - ${return_date ? formatDate(return_date) : formatDate(borrow_date)}`;

    let subject: string;
    let htmlBody: string;

    if (status === 'approved') {
      subject = 'Peminjaman Disetujui';
      htmlBody = `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #3b82f6, #06b6d4); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Peminjaman Disetujui</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Halo <strong>${borrower_name}</strong>,</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 12px; color: #475569;">Permohonan peminjaman <strong style="color: #1e293b;">${item_name}</strong> pada tanggal <strong style="color: #1e293b;">${dateRange}</strong> telah <span style="color: #059669; font-weight: 600;">disetujui</span>.</p>
              <p style="margin: 0; color: #475569;">Silakan ambil barang/ruangan sesuai jadwal yang telah ditentukan.</p>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Terima kasih.</p>
            <p style="color: #64748b; font-size: 14px;"><strong>Tim Sarana dan Prasarana SMKN 1 Cimahi</strong></p>
          </div>
        </div>
      `;
    } else {
      subject = 'Peminjaman Ditolak';
      htmlBody = `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #ef4444, #f97316); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Peminjaman Ditolak</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Halo <strong>${borrower_name}</strong>,</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 12px; color: #475569;">Mohon maaf, permohonan peminjaman <strong style="color: #1e293b;">${item_name}</strong> pada tanggal <strong style="color: #1e293b;">${dateRange}</strong> <span style="color: #dc2626; font-weight: 600;">tidak dapat disetujui</span>.</p>
              <p style="margin: 0; color: #475569;">Silakan hubungi petugas sarpras untuk informasi lebih lanjut.</p>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Terima kasih.</p>
            <p style="color: #64748b; font-size: 14px;"><strong>Tim Sarana dan Prasarana SMKN 1 Cimahi</strong></p>
          </div>
        </div>
      `;
    }

    // Send email via Supabase built-in email (using Resend)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use Supabase auth admin API to send email via the built-in mailer
    // Alternatively, use Resend directly if available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sarana Prasarana SMKN 1 Cimahi <noreply@smkn1cimahi.sarpras.id>',
          to: [borrower_email],
          subject,
          html: htmlBody,
        }),
      });

      if (!emailResponse.ok) {
        const err = await emailResponse.text();
        console.error('Resend error:', err);
        return new Response(JSON.stringify({ error: 'Failed to send email', details: err }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Email sent' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no Resend key, log and return success (dev mode)
    console.log(`[EMAIL] To: ${borrower_email}, Subject: ${subject}`);
    console.log(`[EMAIL] Item: ${item_name}, Date: ${dateRange}, Status: ${status}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email logged (no RESEND_API_KEY configured)',
      preview: { to: borrower_email, subject }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
