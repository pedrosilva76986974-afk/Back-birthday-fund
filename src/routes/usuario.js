const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gerenciamento de usuários
 */

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Listar todos os usuários
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso
 *       401:
 *         description: Token inválido ou não informado
 */
router.get('/', async (req, res) => {
    const users = await prisma.usuario.findMany({
        select: { ID_Usuario: true, Nome_Usuario: true, Email_Usuario: true }
    });
    res.json(users);
});

/**
 * @swagger
 * /usuario/{id}:
 *   get:
 *     summary: Obter um usuário pelo ID
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário a ser buscado
 *         example: 1
 *     responses:
 *       200:
 *         description: Usuário encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ID_Usuario:
 *                   type: integer
 *                   example: 1
 *                 Nome_Usuario:
 *                   type: string
 *                   example: João Silva
 *                 Email_Usuario:
 *                   type: string
 *                   example: joao@example.com
 *       401:
 *         description: Token inválido ou não informado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', auth, async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await prisma.usuario.findUnique({
        where: { ID_Usuario: id },
        select: { ID_Usuario: true, Nome_Usuario: true, Email_Usuario: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
});

/**
 * @swagger
 * /usuario/me:
 *   delete:
 *     summary: Excluir o próprio usuário autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuário excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Token inválido ou não informado
 */
router.delete('/me', auth, async (req, res) => {
    const userId = req.user.userId;
    await prisma.usuario.delete({ where: { ID_Usuario: userId } });
    res.json({ ok: true });
});

module.exports = router;
