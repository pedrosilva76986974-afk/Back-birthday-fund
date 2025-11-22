const FormData = require("form-data");
const Mailgun = require("mailgun.js");

async function sendMail({ to, subject, text, html }) {
  try {
    // VERIFICAÇÃO DE SEGURANÇA
    // Se não tiver chave configurada, ele avisa e não quebra o servidor
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.log("⚠️ AVISO: Email não enviado. Chaves do Mailgun não configuradas no .env");
      return false;
    }

    const mailgun = new Mailgun(FormData);
    
    // Configura o cliente APENAS na hora de enviar
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_API_URL || "https://api.mailgun.net",
    });

    const domain = process.env.MAILGUN_DOMAIN;

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
    // Não quebra a aplicação, apenas retorna falso
    return false;
  }
}

module.exports = { sendMail };