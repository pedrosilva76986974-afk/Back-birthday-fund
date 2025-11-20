import FormData from "form-data";
import Mailgun from "mailgun.js";

const mailgun = new Mailgun(FormData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
  url: process.env.MAILGUN_API_URL || "https://api.mailgun.net", // Use endpoint EU se necessário
});

export async function sendMail({ to, subject, text, html }) {
  try {
    const domain = process.env.MAILGUN_DOMAIN;

    if (!domain || !process.env.MAILGUN_API_KEY) {
      console.error("❌ MAILGUN_DOMAIN ou MAILGUN_API_KEY não configurados.");
      return false;
    }

    const data = await mg.messages.create(domain, {
      from: process.env.MAILGUN_FROM || `Convites <mailgun@${domain}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    });

    console.log("✅ Email enviado:", data.id);
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
    return false;
  }
}
