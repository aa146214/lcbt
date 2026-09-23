/**
 * MAILGUN
 * -------
 * A thin wrapper over Mailgun's messages endpoint. No SDK: it is one
 * form-encoded POST, and a dependency for that is a dependency to keep
 * up to date for no gain.
 *
 * Region matters. Mailgun runs separate US and EU stacks with separate
 * hostnames, and an account on one returns 401 against the other — the
 * failure looks like a bad key rather than a wrong region, which is a
 * miserable hour if you don't know to look. It is an environment variable
 * with an EU default, because the sending domain sits alongside UK learner
 * data.
 */

const DEFAULT_BASE_URL = "https://api.eu.mailgun.net";

export interface Message {
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  /** Groups sends in Mailgun's dashboard, so staff and learner mail can be
   *  told apart when someone asks "did it send?". */
  tag?: string;
}

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  baseUrl: string;
  from: string;
}

/**
 * Returns the config, or null when Mailgun is not set up. Null rather than a
 * throw: email is not allowed to be the reason a lead is lost, so the caller
 * carries on without it.
 */
export function mailgunConfig(): MailgunConfig | null {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.LEAD_EMAIL_FROM;
  if (!apiKey || !domain || !from) return null;
  return {
    apiKey,
    domain,
    from,
    baseUrl: process.env.MAILGUN_BASE_URL || DEFAULT_BASE_URL,
  };
}

export async function send(config: MailgunConfig, message: Message): Promise<void> {
  const body = new URLSearchParams();
  body.set("from", config.from);
  for (const recipient of message.to) body.append("to", recipient);
  body.set("subject", message.subject);
  body.set("text", message.text);
  body.set("html", message.html);
  if (message.replyTo) body.set("h:Reply-To", message.replyTo);
  if (message.tag) body.set("o:tag", message.tag);

  const res = await fetch(`${config.baseUrl}/v3/${config.domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    // The body carries Mailgun's reason — unverified domain, recipient not on
    // the sandbox allow-list, wrong region. Worth having in the log.
    const detail = await res.text().catch(() => "");
    throw new Error(`Mailgun ${res.status}: ${detail.slice(0, 300)}`);
  }
}
