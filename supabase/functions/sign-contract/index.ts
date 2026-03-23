import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CANONICAL_APP_URL = "https://udp.lovable.app";

async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token", error_code: "missing_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: Fetch contract info for signing page
    if (req.method === "GET") {
      const { data: signingToken, error } = await supabase
        .from("signing_tokens")
        .select(`
          *,
          employee_documents (
            id,
            document_name,
            document_type,
            file_path
          ),
          employees (
            id,
            forename,
            surname,
            email,
            department
          )
        `)
        .eq("token", token)
        .maybeSingle();

      if (error || !signingToken) {
        return new Response(JSON.stringify({ error: "This signing link is not valid. Please request a new one from your employer.", error_code: "invalid_token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(signingToken.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "This signing link has expired. Please ask your employer to send a new one.", error_code: "expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (signingToken.used_at) {
        return new Response(JSON.stringify({ error: "This contract has already been signed.", error_code: "already_signed", already_signed: true }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!signingToken.employee_documents) {
        return new Response(JSON.stringify({ error: "The contract document could not be found. Please contact your employer.", error_code: "missing_document" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check existing signatures
      const { data: existingSigs } = await supabase
        .from("contract_signatures")
        .select("signer_type, signer_name, signed_at, signature_data")
        .eq("employee_document_id", signingToken.employee_document_id);

      const existingSignerTypes = (existingSigs || []).map((s: any) => s.signer_type);

      const { data: signedUrl } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(signingToken.employee_documents.file_path, 3600);

      const documentContent = `${signingToken.employee_documents.id}:${signingToken.employee_documents.file_path}:${signingToken.employee_documents.document_name}`;
      const docHash = await sha256(documentContent);

      return new Response(JSON.stringify({
        signer_type: signingToken.signer_type,
        employee_name: `${signingToken.employees.forename} ${signingToken.employees.surname}`,
        employee_email: signingToken.employees.email || null,
        document_name: signingToken.employee_documents.document_name,
        document_url: signedUrl?.signedUrl || null,
        document_hash: docHash,
        expires_at: signingToken.expires_at,
        existing_signatures: existingSignerTypes,
        // Include signature details for display on signing page
        signature_details: (existingSigs || []).map((s: any) => ({
          signer_type: s.signer_type,
          signer_name: s.signer_name,
          signed_at: s.signed_at,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Submit signature
    if (req.method === "POST") {
      const body = await req.json();
      const { typed_name, consent_given, signature_data, signature_type, consent_text, document_hash } = body;

      if (!typed_name?.trim()) {
        return new Response(JSON.stringify({ error: "Please type your full legal name", error_code: "missing_name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!consent_given) {
        return new Response(JSON.stringify({ error: "You must agree to the consent statement", error_code: "missing_consent" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!signature_data) {
        return new Response(JSON.stringify({ error: "Please draw your signature", error_code: "missing_signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch and validate token with relations
      const { data: signingToken, error } = await supabase
        .from("signing_tokens")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            email
          )
        `)
        .eq("token", token)
        .maybeSingle();

      if (error || !signingToken) {
        return new Response(JSON.stringify({ error: "This signing link is not valid.", error_code: "invalid_token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(signingToken.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "This signing link has expired. Please ask your employer to send a new one.", error_code: "expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (signingToken.used_at) {
        return new Response(JSON.stringify({ error: "This contract has already been signed.", error_code: "already_signed" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      const userAgent = req.headers.get("user-agent") || "unknown";
      const signedByEmail = signingToken.employees?.email || null;
      const signedAt = new Date().toISOString();
      const currentSignerType = signingToken.signer_type;

      // Record signature
      const { error: sigError } = await supabase
        .from("contract_signatures")
        .insert({
          employee_document_id: signingToken.employee_document_id,
          employee_id: signingToken.employee_id,
          tenant_id: signingToken.tenant_id,
          signing_token_id: signingToken.id,
          signer_type: currentSignerType,
          signer_name: typed_name.trim(),
          typed_name: typed_name.trim(),
          signed_by_email: signedByEmail,
          signature_type: signature_type || "drawn",
          signature_data: signature_data,
          consent_given: true,
          consent_text: consent_text || `I confirm that I have read and understood this contract, I agree to sign this document electronically, and this electronic signature represents my legal signature.`,
          document_hash: document_hash || null,
          ip_address: ip,
          user_agent: userAgent,
          signed_at: signedAt,
        });

      if (sigError) {
        console.error("Signature insert error:", sigError);
        return new Response(JSON.stringify({
          error: "Your signature could not be recorded. Please try again.",
          error_code: "save_failed",
          detail: sigError.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark token as used ONLY after successful signature save
      await supabase
        .from("signing_tokens")
        .update({
          used_at: signedAt,
          used_by_ip: ip,
          used_by_user_agent: userAgent,
        })
        .eq("id", signingToken.id);

      if (document_hash) {
        await supabase
          .from("employee_documents")
          .update({ final_document_hash: document_hash })
          .eq("id", signingToken.employee_document_id);
      }

      // Check if BOTH signatures now exist
      const { data: allSigs } = await supabase
        .from("contract_signatures")
        .select("signer_type, signed_at, signer_name, signature_data, ip_address, user_agent, signed_by_email")
        .eq("employee_document_id", signingToken.employee_document_id);

      const signerTypes = (allSigs || []).map((s: any) => s.signer_type);
      const hasEmployee = signerTypes.includes("employee");
      const hasEmployer = signerTypes.includes("employer");
      const fullySignedNow = hasEmployee && hasEmployer;

      // Update employee_documents contract_send_status based on signing stage
      if (fullySignedNow) {
        // Fetch the original document to get file_path as the durable reference
        const { data: docRecord } = await supabase
          .from("employee_documents")
          .select("file_path")
          .eq("id", signingToken.employee_document_id)
          .maybeSingle();

        // Compute final document hash for integrity
        const finalContent = `${signingToken.employee_document_id}:${docRecord?.file_path || ""}:fully_signed:${signedAt}`;
        const finalHash = await sha256(finalContent);

        // Store durable file path reference
        await supabase
          .from("employee_documents")
          .update({
            contract_send_status: "fully_signed",
            final_signed_pdf_url: docRecord?.file_path || null,
            final_document_hash: finalHash,
          } as any)
          .eq("id", signingToken.employee_document_id);
      } else if (currentSignerType === "employee") {
        await supabase
          .from("employee_documents")
          .update({
            contract_send_status: "employee_signed",
          } as any)
          .eq("id", signingToken.employee_document_id);
      } else if (currentSignerType === "employer") {
        await supabase
          .from("employee_documents")
          .update({
            contract_send_status: "employer_signed",
          } as any)
          .eq("id", signingToken.employee_document_id);
      }

      // Insert audit log entry
      await supabase.from("audit_log").insert({
        action: "create",
        table_name: "contract_signatures",
        record_id: signingToken.employee_document_id,
        tenant_id: signingToken.tenant_id,
        ip_address: ip,
        user_agent: userAgent,
        new_data: {
          event: "contract_signed",
          employee_id: signingToken.employee_id,
          employee_document_id: signingToken.employee_document_id,
          signing_token_id: signingToken.id,
          signer_type: currentSignerType,
          signed_by_email: signedByEmail,
          signed_at: signedAt,
          document_hash: document_hash || null,
          signature_type: signature_type || "drawn",
          fully_signed: fullySignedNow,
        },
      });

      // Send stage-appropriate email
      const firstName = signingToken.employees?.forename || "there";
      const employeeName = `${signingToken.employees?.forename || ""} ${signingToken.employees?.surname || ""}`.trim();
      const formattedDate = new Date(signedAt).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      if (fullySignedNow) {
        // ── FULLY SIGNED ──
        // Generate a fresh download link for the email
        const { data: docRecord2 } = await supabase
          .from("employee_documents")
          .select("file_path")
          .eq("id", signingToken.employee_document_id)
          .maybeSingle();

        let emailDownloadUrl = "";
        if (docRecord2?.file_path) {
          const { data: freshSignedUrl } = await supabase.storage
            .from("employee-documents")
            .createSignedUrl(docRecord2.file_path, 60 * 60 * 24 * 7); // 7-day link
          emailDownloadUrl = freshSignedUrl?.signedUrl || "";
        }

        // Send completion email to EMPLOYEE
        const recipientEmail = signingToken.employees?.email;
        if (recipientEmail) {
          try {
            await supabase.functions.invoke("send-notification", {
              body: {
                to: recipientEmail,
                subject: "Your contract is now complete",
                type: "contract_fully_signed",
                data: {
                  employee_name: employeeName,
                  first_name: firstName,
                  signed_at: formattedDate,
                  final_contract_url: emailDownloadUrl,
                },
                tenant_id: signingToken.tenant_id,
              },
            });
          } catch (emailErr) {
            console.error("Contract fully-signed email to employee failed:", emailErr);
          }
        }

        // Send completion email to MANAGER(S) too
        try {
          const { data: admins } = await supabase
            .from("tenant_members")
            .select("user_id")
            .eq("tenant_id", signingToken.tenant_id)
            .in("role", ["company_admin", "manager"])
            .eq("is_active", true);

          if (admins && admins.length > 0) {
            for (const admin of admins) {
              const { data: { user: adminUser } } = await supabase.auth.admin.getUserById(admin.user_id);
              const adminEmail = adminUser?.email;
              if (adminEmail) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("user_id", admin.user_id)
                  .maybeSingle();

                await supabase.functions.invoke("send-notification", {
                  body: {
                    to: adminEmail,
                    subject: `Contract complete — ${employeeName}`,
                    type: "contract_fully_signed_manager",
                    data: {
                      employee_name: employeeName,
                      admin_name: profile?.full_name || "Manager",
                      signed_at: formattedDate,
                      final_contract_url: emailDownloadUrl,
                    },
                    tenant_id: signingToken.tenant_id,
                  },
                });
              }
            }
          }
        } catch (notifyErr) {
          console.error("Manager completion notification failed:", notifyErr);
        }

        // Log fully signed event
        await supabase.from("audit_log").insert({
          action: "create",
          table_name: "contract_signatures",
          record_id: signingToken.employee_document_id,
          tenant_id: signingToken.tenant_id,
          new_data: {
            event: "contract_fully_signed",
            employee_id: signingToken.employee_id,
            employee_document_id: signingToken.employee_document_id,
            signed_at: signedAt,
            all_signatures: (allSigs || []).map((s: any) => ({
              signer_type: s.signer_type,
              signer_name: s.signer_name,
              signed_at: s.signed_at,
              signed_by_email: s.signed_by_email,
              ip_address: s.ip_address,
            })),
          },
        });
      } else if (currentSignerType === "employee") {
        // ── EMPLOYEE SIGNED ── Send acknowledgment to employee
        if (signedByEmail) {
          try {
            await supabase.functions.invoke("send-notification", {
              body: {
                to: signedByEmail,
                subject: "Your signature has been received",
                type: "contract_signature_received",
                data: {
                  employee_name: employeeName,
                  first_name: firstName,
                  signed_at: formattedDate,
                },
                tenant_id: signingToken.tenant_id,
              },
            });
          } catch (emailErr) {
            console.error("Signature received email failed:", emailErr);
          }
        }

        // ── AUTO-GENERATE EMPLOYER SIGNING TOKEN & SEND TO MANAGER ──
        try {
          const { data: admins } = await supabase
            .from("tenant_members")
            .select("user_id")
            .eq("tenant_id", signingToken.tenant_id)
            .in("role", ["company_admin", "manager"])
            .eq("is_active", true);

          if (admins && admins.length > 0) {
            // Generate employer signing token
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const { data: employerToken, error: tokenErr } = await supabase
              .from("signing_tokens")
              .insert({
                employee_document_id: signingToken.employee_document_id,
                employee_id: signingToken.employee_id,
                signer_type: "employer",
                expires_at: expiresAt.toISOString(),
                tenant_id: signingToken.tenant_id,
              })
              .select()
              .single();

            if (tokenErr) {
              console.error("Failed to auto-generate employer token:", tokenErr);
            } else {
              const employerSigningUrl = `${CANONICAL_APP_URL}/sign/${employerToken.token}`;

              // Send signing link to each admin/manager
              for (const admin of admins) {
                const { data: { user: adminUser } } = await supabase.auth.admin.getUserById(admin.user_id);
                const adminEmail = adminUser?.email;

                if (adminEmail) {
                  const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("user_id", admin.user_id)
                    .maybeSingle();

                  await supabase.functions.invoke("send-notification", {
                    body: {
                      to: adminEmail,
                      subject: `Countersignature required — ${employeeName}'s contract`,
                      type: "contract_employer_sign_now",
                      data: {
                        employee_name: employeeName,
                        admin_name: profile?.full_name || "Manager",
                        signed_at: formattedDate,
                        signing_url: employerSigningUrl,
                      },
                      tenant_id: signingToken.tenant_id,
                    },
                  });
                }
              }

              // Audit log for auto-generated employer token
              await supabase.from("audit_log").insert({
                action: "create",
                table_name: "signing_tokens",
                record_id: employerToken.id,
                tenant_id: signingToken.tenant_id,
                new_data: {
                  event: "employer_signing_token_auto_generated",
                  employee_document_id: signingToken.employee_document_id,
                  employee_id: signingToken.employee_id,
                  triggered_by: "employee_signature",
                },
              });
            }
          }
        } catch (notifyErr) {
          console.error("Manager auto-signing notification failed (non-critical):", notifyErr);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: fullySignedNow
          ? "Contract fully signed"
          : "Signature recorded successfully",
        signed_at: signedAt,
        signer_type: currentSignerType,
        fully_signed: fullySignedNow,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again.", error_code: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
