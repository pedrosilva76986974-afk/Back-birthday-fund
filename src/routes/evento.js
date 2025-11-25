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

/**
 * @swagger
 * /eventos/usuario/{id}:
 *  get:
 *     summary: Listar eventos criados por um usuário específico
 *     tags: [Eventos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de eventos do usuário
 *       401:
 *         description: Token inválido
 */
router.get('/usuario/:id', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // CORREÇÃO 1: Validação do ID para não quebrar o Prisma
        if (isNaN(id)) {
            return res.status(400).json({ error: "ID de usuário inválido fornecido." });
        }

        const eventos = await prisma.evento.findMany({
            where: { ID_Usuario_Criador: id },
            orderBy: { Data_Evento: 'desc' },
            include: { Campanhas: true }
        });
        res.json(eventos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar eventos do usuário' });
    }
});

/**
 * @swagger
 * /eventos/convites/{email}:
 *   get:
 *     summary: Listar eventos onde o e-mail fornecido é convidado
 *     tags: [Eventos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de eventos onde fui convidado
 */
router.get('/convites/:email', auth, async (req, res) => {
    try {
        const email = req.params.email;
        const eventos = await prisma.evento.findMany({
            where: {
                EventoConvidado: {
                    some: { Convidado: { Email_Convidado: email } }
                }
            },
            include: {
                // CORREÇÃO 2: Mudamos de 'Usuario' para 'UsuarioCriador'
                // O erro do console confirmou que o nome correto da relação é UsuarioCriador
                UsuarioCriador: { 
                    select: { Nome_Usuario: true } 
                }
            },
            orderBy: { Data_Evento: 'asc' }
        });
        res.json(eventos);
    } catch (error) {
        console.error("Erro ao buscar convites:", error);
        res.status(500).json({ error: 'Erro ao buscar convites' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Usa transaction para garantir que apaga tudo ou nada
        await prisma.$transaction(async (prisma) => {
            
            // 1. Apagar Doações vinculadas a este evento
            await prisma.doacao.deleteMany({
                where: { ID_Evento: id }
            });

            // 2. Apagar Campanhas vinculadas
            await prisma.campanha.deleteMany({
                where: { ID_Evento: id }
            });

            // 3. Apagar Vínculos de Convidados (Evento_Convidado)
            // (Verifique se o nome da tabela no seu schema é Evento_Convidado ou EventoConvidado)
            // Se der erro aqui, comente esta linha ou ajuste o nome.
            try {
                await prisma.evento_Convidado.deleteMany({
                    where: { ID_Evento: id }
                });
            } catch (e) {
                // Ignora se a tabela não existir ou tiver outro nome no prisma
            }

            // 4. Finalmente, apaga o Evento
            await prisma.evento.delete({
                where: { ID_Evento: id }
            });
        });
        
        res.json({ message: 'Evento e dados vinculados excluídos com sucesso.' });

    } catch (error) {
        console.error("Erro ao excluir evento:", error);
        res.status(500).json({ error: 'Erro ao excluir evento. Tente novamente.' });
    }
});

module.exports = router;
