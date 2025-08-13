import { Resend } from "resend";

import env from "@/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail({ to, subject, react, text, html }: { to: string; subject: string; react?: React.ReactNode; text?: string; html?: string }) {
  const { data, error } = await resend.emails.send({
    from: "help@oluwasetemi.dev",
    to,
    subject,
    react,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
