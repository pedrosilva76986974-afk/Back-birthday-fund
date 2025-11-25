const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendMail } = require('../utils/email');
const auth = require('../middlewares/auth');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
const RESET_MINUTES = parseInt(process.env.RESET_TOKEN_EXPIRE_MINUTES || '30');
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Rotas de autenticação e gerenciamento de senha
 */
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Nome_Usuario
 *               - Email_Usuario
 *               - Senha_Usuario
 *             properties:
 *               Nome_Usuario:
 *                 type: string
 *                 example: João Silva
 *               Email_Usuario:
 *                 type: string
 *                 example: joao@example.com
 *               Senha_Usuario:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Dados incompletos
 *       409:
 *         description: E-mail já cadastrado
 */
router.post('/register', async (req, res) => {
  try {
    const { Nome_Usuario, Email_Usuario, Senha_Usuario } = req.body;
    if (!Nome_Usuario || !Email_Usuario || !Senha_Usuario) return res.status(400).json({ error: 'Dados incompletos' });

    const existing = await prisma.usuario.findUnique({ where: { Email_Usuario } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

    const hash = await bcrypt.hash(Senha_Usuario, SALT_ROUNDS);
    const user = await prisma.usuario.create({ data: { Nome_Usuario, Email_Usuario, Senha_Usuario: hash } });

    return res.status(201).json({ ID_Usuario: user.ID_Usuario, Nome_Usuario: user.Nome_Usuario, Email_Usuario: user.Email_Usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza login do usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Email_Usuario
 *               - Senha_Usuario
 *             properties:
 *               Email_Usuario:
 *                 type: string
 *                 example: joao@example.com
 *               Senha_Usuario:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login realizado com sucesso (retorna token JWT)
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', async (req, res) => {
  try {
    const { Email_Usuario, Senha_Usuario } = req.body;
    if (!Email_Usuario || !Senha_Usuario) return res.status(400).json({ error: 'Dados incompletos' });

    const user = await prisma.usuario.findUnique({ where: { Email_Usuario } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(Senha_Usuario, user.Senha_Usuario);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ userId: user.ID_Usuario, email: user.Email_Usuario }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    return res.json({ user: { userId: user.ID_Usuario, userName: user.Nome_Usuario, email: user.Email_Usuario }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

/**
 * @swagger
 * /auth/update-profile:
 *   put:
 *     summary: Atualizar nome e/ou senha do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Nome_Usuario:
 *                 type: string
 *                 example: João Atualizado
 *               senhaAtual:
 *                 type: string
 *                 example: 123456
 *               novaSenha:
 *                 type: string
 *                 example: novaSenhaSegura123
 *     responses:
 *       200:
 *         description: Alterações aplicadas com sucesso
 *       400:
 *         description: Requisição inválida
 *       401:
 *         description: Senha atual incorreta
 */
router.put('/update-profile', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { Nome_Usuario, senhaAtual, novaSenha } = req.body;

    if (!Nome_Usuario && !senhaAtual && !novaSenha) {
      return res.status(400).json({
        error: "Nenhum dado enviado para atualização."
      });
    }

    const updates = {};

    // 🔹 Atualizar nome se enviado
    if (Nome_Usuario) {
      updates.Nome_Usuario = Nome_Usuario;
    }

    // 🔹 Atualizar senha se senhaAtual + novaSenha forem enviados
    if (senhaAtual || novaSenha) {

      // Verificar se ambos foram enviados
      if (!senhaAtual || !novaSenha) {
        return res.status(400).json({
          error: "Para alterar a senha, envie 'senhaAtual' e 'novaSenha'."
        });
      }

      const user = await prisma.usuario.findUnique({
        where: { ID_Usuario: userId }
      });

      const senhaCorreta = await bcrypt.compare(senhaAtual, user.Senha_Usuario);
      if (!senhaCorreta) {
        return res.status(401).json({
          error: "Senha atual incorreta."
        });
      }

      const novaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
      updates.Senha_Usuario = novaHash;
    }

    // 🚀 Aplicar alterações
    const updatedUser = await prisma.usuario.update({
      where: { ID_Usuario: userId },
      data: updates,
      select: {
        ID_Usuario: true,
        Nome_Usuario: true,
        Email_Usuario: true
      }
    });

    res.json({
      ok: true,
      message: "Perfil atualizado com sucesso!",
      usuario: updatedUser
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

/**
 * @swagger
 * /auth/update-name:
 *   put:
 *     summary: Atualizar nome do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Nome_Usuario:
 *                 type: string
 *                 example: João da Silva Atualizado
 *     responses:
 *       200:
 *         description: Nome atualizado com sucesso
 *       400:
 *         description: Nome não informado
 *       401:
 *         description: Token inválido ou não informado
 */
router.put('/update-name', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { Nome_Usuario } = req.body;

    if (!Nome_Usuario)
      return res.status(400).json({ error: "Nome é obrigatório" });

    const updated = await prisma.usuario.update({
      where: { ID_Usuario: userId },
      data: { Nome_Usuario },
      select: { ID_Usuario: true, Nome_Usuario: true, Email_Usuario: true }
    });

    res.json({ ok: true, usuario: updated });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

/**
 * @swagger
 * /auth/update-password:
 *   put:
 *     summary: Atualizar senha do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senhaAtual
 *               - novaSenha
 *             properties:
 *               senhaAtual:
 *                 type: string
 *                 example: 123456
 *               novaSenha:
 *                 type: string
 *                 example: novaSenha123
 *     responses:
 *       200:
 *         description: Senha atualizada com sucesso
 *       400:
 *         description: Dados incompletos
 *       401:
 *         description: Senha atual incorreta
 */
router.put('/update-password', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha)
      return res.status(400).json({ error: "Dados incompletos" });

    const user = await prisma.usuario.findUnique({
      where: { ID_Usuario: userId }
    });

    const senhaCorreta = await bcrypt.compare(senhaAtual, user.Senha_Usuario);
    if (!senhaCorreta)
      return res.status(401).json({ error: "Senha atual incorreta" });

    const novaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);

    await prisma.usuario.update({
      where: { ID_Usuario: userId },
      data: { Senha_Usuario: novaHash }
    });

    res.json({ ok: true, message: "Senha atualizada com sucesso!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Solicitar redefinição de senha
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Email_Usuario
 *             properties:
 *               Email_Usuario:
 *                 type: string
 *                 example: joao@example.com
 *     responses:
 *       200:
 *         description: E-mail de redefinição enviado (ou resposta genérica)
 *       400:
 *         description: Email obrigatório
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { Email_Usuario } = req.body;
    if (!Email_Usuario) return res.status(400).json({ error: 'Email obrigatório' });

    const user = await prisma.usuario.findUnique({ where: { Email_Usuario } });
    if (!user) return res.json({ ok: true }); // não revelar existência

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.ID_Usuario,
        tokenHash,
        expiresAt,
        used: false
      }
    });

    const resetLink = `${process.env.APP_BASE_URL}/reset-password?token=${token}&email=${encodeURIComponent(Email_Usuario)}`;

    await sendMail({
      to: Email_Usuario,
      subject: 'Redefinição de senha - Convites',
      html: `<p>Você solicitou a redefinição de senha.</p><a href="${resetLink}">Clique aqui para redefinir (válido por ${RESET_MINUTES} minutos)</a>`
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Redefinir senha com token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Email_Usuario
 *               - token
 *               - newPassword
 *             properties:
 *               Email_Usuario:
 *                 type: string
 *                 example: joao@example.com
 *               token:
 *                 type: string
 *                 example: 123abc456def
 *               newPassword:
 *                 type: string
 *                 example: nova_senha
 *     responses:
 *       200:
 *         description: Senha redefinida com sucesso
 *       400:
 *         description: Token inválido ou expirado
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { Email_Usuario, token, newPassword } = req.body;
    if (!Email_Usuario || !token || !newPassword) return res.status(400).json({ error: 'Dados incompletos' });

    const user = await prisma.usuario.findUnique({ where: { Email_Usuario } });
    if (!user) return res.status(400).json({ error: 'Requisição inválida' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const prt = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.ID_Usuario,
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!prt) return res.status(400).json({ error: 'Token inválido ou expirado' });

    const hashedNew = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.usuario.update({ where: { ID_Usuario: user.ID_Usuario }, data: { Senha_Usuario: hashedNew } }),
      prisma.passwordResetToken.update({ where: { id: prt.id }, data: { used: true } })
    ]);

    return res.json({ ok: true, message: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

module.exports = router;
