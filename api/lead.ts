/**
 * LEAD INTAKE
 * -----------
 * Where the quiz's email capture lands. The browser posts here same-origin,
 * which is the whole point of the endpoint living in this project: the app is
 * served from quiz.lcbt.co.uk while LCBT's systems are on www.lcbt.co.uk, so a
 * direct browser call would need CORS negotiating on their side, and any CRM
 * credential would have to be readable in the bundle. Neither is true here.
 *
 * The row is written before anything is forwarded anywhere. LCBT's CRM does
 * not exist yet (see DECISIONS.md), and leads captured in the meantime should
 * not be lost waiting for it — `forwarded_at` is what lets them be replayed
 * once there is somewhere to replay them to.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

/** Generous for a real submission, mean enough to stop anyone posting a book. */
const MAX_IDS = 50;
const MAX_ID_LEN = 64;
const MAX_EMAIL_LEN = 254;
const MAX_SOURCE_LEN = 64;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LEAD_TYPES = new Set(["matches", "registration"]);

interface Lead {
  email: string;
  leadType: string;
  marketingConsent: boolean;
  answers: unknown;
  savedCourseIds: string[];
  matchedCourseIds: string[];
  source: string;
  submittedAt: string | null;
}

function idList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_IDS) return null;
  if (!value.every((v) => typeof v === "string" && v.length > 0 && v.length <= MAX_ID_LEN)) {
    return null;
  }
  return value as string[];
}

/**
 * Returns the lead, or the reason it was rejected. The endpoint is public, so
 * nothing about the shape of the body can be assumed.
 */
export function parse(body: unknown): { lead: Lead } | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "body must be an object" };
  const b = body as Record<string, unknown>;

  const email = typeof b.email === "string" ? b.email.trim() : "";
  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    return { error: "invalid email" };
  }

  if (typeof b.leadType !== "string" || !LEAD_TYPES.has(b.leadType)) {
    return { error: "invalid leadType" };
  }
  if (typeof b.marketingConsent !== "boolean") {
    return { error: "marketingConsent must be a boolean" };
  }
  if (typeof b.answers !== "object" || b.answers === null || Array.isArray(b.answers)) {
    return { error: "answers must be an object" };
  }

  const saved = idList(b.savedCourseIds);
  const matched = idList(b.matchedCourseIds);
  if (!saved || !matched) return { error: "invalid course ids" };

  /* The browser's own timestamp is kept alongside the server's rather than
     instead of it — a wrong device clock should not become the only record of
     when this happened. Unparseable is stored as null, not rejected: it is
     not worth losing a lead over. */
  const submittedAt =
    typeof b.submittedAt === "string" && !Number.isNaN(Date.parse(b.submittedAt))
      ? new Date(b.submittedAt).toISOString()
      : null;

  const source =
    typeof b.source === "string" && b.source.length <= MAX_SOURCE_LEN ? b.source : "unknown";

  return {
    lead: {
      email,
      leadType: b.leadType,
      marketingConsent: b.marketingConsent,
      answers: b.answers,
      savedCourseIds: saved,
      matchedCourseIds: matched,
      source,
      submittedAt,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Loudly, rather than accepting the lead and dropping it. The capture
    // screen shows its error state, which is the truth.
    console.error("[lead] DATABASE_URL is not set");
    return res.status(503).json({ error: "storage not configured" });
  }

  const parsed = parse(req.body);
  if ("error" in parsed) {
    console.warn("[lead] rejected:", parsed.error);
    return res.status(400).json({ error: parsed.error });
  }
  const lead = parsed.lead;

  try {
    const sql = neon(connectionString);
    /* JSON.stringify with an explicit ::jsonb cast, rather than handing the
       driver objects and arrays to map itself. One less thing between the
       payload and the column. */
    const rows = await sql`
      insert into leads (
        email, lead_type, marketing_consent,
        answers, saved_course_ids, matched_course_ids,
        source, submitted_at
      ) values (
        ${lead.email}, ${lead.leadType}, ${lead.marketingConsent},
        ${JSON.stringify(lead.answers)}::jsonb,
        ${JSON.stringify(lead.savedCourseIds)}::jsonb,
        ${JSON.stringify(lead.matchedCourseIds)}::jsonb,
        ${lead.source}, ${lead.submittedAt}
      )
      returning id
    `;
    // Deliberately not logging the email address: these logs are readable by
    // anyone with project access and the id is enough to find the row.
    console.info(`[lead] stored #${rows[0]?.id} (${lead.leadType})`);
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[lead] insert failed:", err);
    return res.status(500).json({ error: "could not store lead" });
  }
}
