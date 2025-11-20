const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Eventos
 *   description: Gerenciamento de eventos
 */

/**
 * @swagger
 * /eventos:
 *   post:
 *     summary: Criar novo evento
 *     tags: [Eventos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ID_Usuario_Criador
 *               - Titulo_Evento
 *               - Data_Evento
 *               - Local_Evento
 *               - Horario_Evento
 *             properties:
 *               ID_Usuario_Criador:
 *                 type: integer
 *                 example: 1
 *               Titulo_Evento:
 *                 type: string
 *                 example: Aniversário João
 *               Data_Evento:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-12-10T00:00:00Z
 *               Local_Evento:
 *                 type: string
 *                 example: Rua das Flores, 123
 *               Horario_Evento:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-12-10T19:00:00Z
 *     responses:
 *       201:
 *         description: Evento criado com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/', auth, async (req, res) => {
    const { Titulo_Evento, Data_Evento, Local_Evento, Horario_Evento } = req.body;
    const ID_Usuario_Criador = req.user.userId;
    const evento = await prisma.evento.create({
        data: { Titulo_Evento, Data_Evento: new Date(Data_Evento), Local_Evento, Horario_Evento: new Date(Horario_Evento), ID_Usuario_Criador }
    });
    res.status(201).json(evento);
});

/**
 * @swagger
 * /eventos:
 *   get:
 *     summary: Listar todos os eventos
 *     tags: [Eventos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de eventos retornada com sucesso
 *       401:
 *         description: Token inválido ou não informado
 */
router.get('/', async (req, res) => {
    const eventos = await prisma.evento.findMany();
    res.json(eventos);
});

/**
 * @swagger
 * /eventos/{id}:
 *   get:
 *     summary: Obter um evento pelo ID
 *     tags: [Eventos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do evento a ser buscado
 *         example: 1
 *     responses:
 *       200:
 *         description: Evento encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ID_Evento:
 *                   type: integer
 *                   example: 1
 *                 ID_Usuario_Criador:
 *                   type: integer
 *                   example: 1
 *                 Titulo_Evento:
 *                   type: string
 *                   example: Aniversário João
 *                 Data_Evento:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-12-10T00:00:00Z
 *                 Local_Evento:
 *                   type: string
 *                   example: Rua das Flores, 123
 *                 Horario_Evento:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-12-10T19:00:00Z
 *       401:
 *         description: Token inválido ou não informado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const evento = await prisma.evento.findUnique({ where: { ID_Evento: id } });
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
    res.json(evento);
});

module.exports = router;
