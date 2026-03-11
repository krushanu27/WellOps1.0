import { http } from "../../shared/api/http";

export interface ConsentRecord {
  id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
}

export async function fetchConsent(): Promise<ConsentRecord[]> {
  const res = await http.get("/ethics/consent");
  return res.data;
}

export async function grantConsent(consentType: string): Promise<ConsentRecord> {
  const res = await http.post("/ethics/consent", { consent_type: consentType });
  return res.data;
}

export async function revokeConsent(consentType: string): Promise<void> {
  await http.delete(`/ethics/consent/${consentType}`);
}
