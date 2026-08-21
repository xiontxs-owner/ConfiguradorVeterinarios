const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAIL_VENTAS = "ventas@kantekpremium.mx";
const MAIL_GERENCIA = "gerencia.comercial@maxpro.com.mx";

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function splitEmails(raw: unknown): string[] {
  return String(raw || "")
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter((part) => part && part !== "-" && part.includes("@"));
}

function uniqueEmails(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of list) {
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

function cleanExcelBase64(raw: unknown): string {
  let s = String(raw || "").trim();
  const marker = "base64,";
  const idx = s.toLowerCase().indexOf(marker);
  if (s.toLowerCase().startsWith("data:") && idx !== -1) {
    s = s.slice(idx + marker.length);
  }
  return s.replace(/\s+/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const folio = String(payload?.folio || "").trim();
    const asunto =
      String(payload?.asunto || "").trim() ||
      `Transfer KNTK CVDL '26 ${folio}`.trim();
    const nombreArchivo =
      String(payload?.nombreArchivo || "").trim() ||
      `Transfer-${folio || "SIN-FOLIO"}.xlsx`;
    const excelBase64 = cleanExcelBase64(payload?.excelBase64);

    const to = uniqueEmails([
      ...splitEmails(payload?.clienteEmail),
      ...splitEmails(payload?.mailDistribuidor),
      ...splitEmails(payload?.mailAgente),
      MAIL_VENTAS,
      MAIL_GERENCIA,
    ]);

    console.log("[send-transfer-email] request", {
      folio,
      to,
      nombreArchivo,
      asunto,
      excelBase64Chars: excelBase64.length,
      from: "Transferencias KANTEK <noreply@kantek.mx>",
    });

    if (!to.length) {
      return jsonResponse(400, {
        ok: false,
        error: "No hay destinatarios para el correo.",
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.log("[send-transfer-email] falta RESEND_API_KEY");
      return jsonResponse(500, {
        ok: false,
        error: "Falta RESEND_API_KEY en los secrets de la función.",
      });
    }

    const resendBody: Record<string, unknown> = {
      from: "Transferencias KANTEK <noreply@kantek.mx>",
      to,
      subject: asunto,
      html: `<p>Se adjunta el transfer <strong>${folio || "(sin folio)"}</strong>.</p>`,
      text: `Se adjunta el transfer ${folio || "(sin folio)"}.`,
    };

    if (excelBase64) {
      resendBody.attachments = [
        {
          filename: nombreArchivo,
          content: excelBase64,
        },
      ];
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    });

    const resendText = await resendRes.text();
    let resendJson: unknown = resendText;
    try {
      resendJson = JSON.parse(resendText);
    } catch {
      /* keep raw text */
    }

    if (!resendRes.ok) {
      console.log("[send-transfer-email] Resend error completo", {
        status: resendRes.status,
        statusText: resendRes.statusText,
        body: resendJson,
        raw: resendText,
      });
      return jsonResponse(400, {
        ok: false,
        resendStatus: resendRes.status,
        error: resendJson,
        message:
          (resendJson &&
            typeof resendJson === "object" &&
            "message" in resendJson &&
            String((resendJson as { message: unknown }).message)) ||
          (resendJson &&
            typeof resendJson === "object" &&
            "error" in resendJson &&
            JSON.stringify((resendJson as { error: unknown }).error)) ||
          resendText ||
          "Error de Resend",
      });
    }

    console.log("[send-transfer-email] enviado", resendJson);
    return jsonResponse(200, { ok: true, data: resendJson });
  } catch (err) {
    console.log("[send-transfer-email] unexpected error", err);
    return jsonResponse(500, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
