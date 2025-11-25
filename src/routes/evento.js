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
    try {
        const { 
            Titulo_Evento, Data_Evento, Local_Evento, Horario_Evento, 
            Descricao_Evento, Convidados, Campanha 
        } = req.body;

        // 1. Validação do Usuário
        const idUsuario = req.user.userId || req.user.ID_Usuario || req.body.ID_Usuario_Criador;
        if (!idUsuario) return res.status(400).json({ error: "Usuário não identificado." });

        // 2. Tratamento de Data
        const dataFormatada = new Date(Data_Evento);
        const dataHoraString = `${Data_Evento.split('T')[0]}T${Horario_Evento}:00.000Z`; 
        const horarioFormatado = new Date(dataHoraString);

        // 3. Transação (Salva tudo ou nada)
        const resultado = await prisma.$transaction(async (tx) => {
            
            // A. Criar Evento
            const novoEvento = await tx.evento.create({
                data: {
                    ID_Usuario_Criador: parseInt(idUsuario),
                    Titulo_Evento,
                    Data_Evento: dataFormatada,
                    Local_Evento,
                    Horario_Evento: isValidDate(horarioFormatado) ? horarioFormatado : new Date(),
                }
            });

            // B. Convidados
            if (Convidados) {
                const listaEmails = Array.isArray(Convidados) ? Convidados : Convidados.split(',').map(e => e.trim()).filter(e => e);
                for (const email of listaEmails) {
                    let convidado = await tx.convidado.findUnique({ where: { Email_Convidado: email } });
                    if (!convidado) {
                        convidado = await tx.convidado.create({
                            data: { Nome_Convidado: email.split('@')[0], Email_Convidado: email, Senha_Convidado: "temp123" }
                        });
                    }
                    await tx.evento_Convidado.create({
                        data: { ID_Evento: novoEvento.ID_Evento, ID_Convidado: convidado.ID_Convidado }
                    });
                }
            }

            // C. Campanha (CORREÇÃO AQUI: CRIA BANCO SE NÃO EXISTIR)
            if (Campanha && (Campanha.meta > 0 || Campanha.chavePix)) {
                
                // Tenta achar qualquer banco
                let banco = await tx.banco.findFirst();
                
                // Se não existir nenhum banco, cria um "Genérico" para não travar
                if (!banco) {
                    console.log("⚠️ Nenhum banco encontrado. Criando Banco Padrão...");
                    banco = await tx.banco.create({
                        data: {
                            Nome_Banco: "Banco Padrão", // Nome genérico
                            Codigo_Banco: "000"
                        }
                    });
                }

                await tx.campanha.create({
                    data: {
                        ID_Evento: novoEvento.ID_Evento,
                        ID_Banco: banco.ID_Banco, // Agora usa um ID válido que existe com certeza
                        Meta_Financeira_Campanha: parseFloat(Campanha.meta || 0),
                        Chave_Pix_Campanha: Campanha.chavePix || "Não informada",
                        QRCode_Pix_URL_Campanha: "",
                        Status_Campanha: "ATIVA"
                    }
                });
            }

            return novoEvento;
        });

        res.status(201).json(resultado);

    } catch (error) {
        console.error("Erro ao criar evento:", error);
        res.status(500).json({ error: 'Erro interno ao processar evento.' });
    }
});

// Função auxiliar para validar data
function isValidDate(d) { return d instanceof Date && !isNaN(d); }

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
                    some: { Convidado: { Email_Convidado: { equals: email, mode: 'insensitive' } } }
                }
            },
            include: {
                // Traz dados do dono do evento
                UsuarioCriador: { select: { Nome_Usuario: true, Email_Usuario: true } },
                // Traz o ID do Convidado ESPECÍFICO deste email neste evento
                EventoConvidado: {
                    where: { Convidado: { Email_Convidado: { equals: email, mode: 'insensitive' } } },
                    select: { ID_Convidado: true } 
                }
            },
            orderBy: { Data_Evento: 'asc' }
        });
        res.json(eventos);
    } catch (error) {
        console.error("Erro convites:", error);
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

router.get('/:id/convidados', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const convidados = await prisma.evento_Convidado.findMany({
            where: { ID_Evento: id },
            include: {
                Convidado: { select: { ID_Convidado: true, Nome_Convidado: true, Email_Convidado: true } }
            }
        });
        res.json(convidados);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar convidados.' });
    }
});

// ADICIONAR CONVIDADO A EVENTO EXISTENTE
router.post('/:id/convidar', auth, async (req, res) => {
    try {
        const idEvento = parseInt(req.params.id);
        const { email } = req.body; // Espera { "email": "joao@gmail.com" }

        if (!email) return res.status(400).json({ error: "E-mail obrigatório." });

        // Transação para garantir integridade
        await prisma.$transaction(async (tx) => {
            // 1. Acha ou cria o convidado
            let convidado = await tx.convidado.findUnique({ where: { Email_Convidado: email } });
            
            if (!convidado) {
                convidado = await tx.convidado.create({
                    data: {
                        Nome_Convidado: email.split('@')[0], // Nome temporário
                        Email_Convidado: email,
                        Senha_Convidado: "convite123" // Senha placeholder
                    }
                });
            }

            // 2. Verifica se já foi convidado
            const jaConvidado = await tx.evento_Convidado.findFirst({
                where: { ID_Evento: idEvento, ID_Convidado: convidado.ID_Convidado }
            });

            if (jaConvidado) throw new Error("Pessoa já convidada.");

            // 3. Cria o vínculo
            await tx.evento_Convidado.create({
                data: { ID_Evento: idEvento, ID_Convidado: convidado.ID_Convidado }
            });
        });

        res.json({ message: "Convite enviado com sucesso!" });

    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message || "Erro ao convidar." });
    }
});

// REMOVER CONVIDADO
router.delete('/:id/convidar/:idConvidado', auth, async (req, res) => {
    try {
        const idEvento = parseInt(req.params.id);
        const idConvidado = parseInt(req.params.idConvidado);

        // O prisma não tem chave composta direta no delete, usamos deleteMany com filtro
        await prisma.evento_Convidado.deleteMany({
            where: {
                ID_Evento: idEvento,
                ID_Convidado: idConvidado
            }
        });

        res.json({ message: "Convidado removido." });
    } catch (error) {
        res.status(500).json({ error: "Erro ao remover convidado." });
    }
});

module.exports = router;
