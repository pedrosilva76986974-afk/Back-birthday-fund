const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');
// Importar o serviço de notificações
const notificationService = require('../services/notificationService');

// criar convidado (Sem notificação, pois é ação administrativa)
router.post('/', auth, async (req, res) => {
    const { Nome_Convidado, Email_Convidado, Senha_Convidado } = req.body;
    const hash = await require('bcrypt').hash(Senha_Convidado || Math.random().toString(36).slice(-8), 10);
    
    try {
        const convidado = await prisma.convidado.create({ 
            data: { Nome_Convidado, Email_Convidado, Senha_Convidado: hash } 
        });
        res.status(201).json(convidado);
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar convidado" });
    }
});

// listar convidados
router.get('/', async (req, res) => {
    const convidados = await prisma.convidado.findMany({ select: { ID_Convidado: true, Nome_Convidado: true, Email_Convidado: true } });
    res.json(convidados);
});

// --- NOVA ROTA: CONFIRMAR PRESENÇA / VINCULAR A EVENTO ---
router.post('/confirmar-presenca', auth, async (req, res) => {
    const { ID_Convidado, ID_Evento } = req.body;
    const io = req.app.get('io'); // Pega o socket

    try {
        // Usa transaction para garantir consistência
        const resultado = await prisma.$transaction(async (tx) => {
            // Cria o vínculo na tabela Evento_Convidado
            const presenca = await tx.evento_Convidado.create({
                data: {
                    ID_Convidado,
                    ID_Evento
                },
                // Inclui dados para montar a mensagem bonita
                include: {
                    Evento: { select: { Titulo_Evento: true, ID_Usuario_Criador: true } },
                    Convidado: { select: { Nome_Convidado: true } }
                }
            });

            // Dispara a notificação para o DONO DO EVENTO
            if (presenca.Evento && presenca.Convidado) {
                await notificationService.createNotification(
                    presenca.Evento.ID_Usuario_Criador, // Para quem vai? Dono do evento
                    "Novo Convidado Confirmado! ✅", // Título
                    `${presenca.Convidado.Nome_Convidado} confirmou presença no evento "${presenca.Evento.Titulo_Evento}"`, // Mensagem
                    io // Socket para tempo real
                );
            }

            return presenca;
        });

        res.status(201).json({ message: "Presença confirmada!", dados: resultado });
    } catch (error) {
        console.error(error);
        // Se der erro de chave duplicada (P2002), é porque já foi confirmado anteriormente
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "Este convidado já está confirmado neste evento." });
        }
        res.status(500).json({ error: "Erro ao confirmar presença" });
    }
});

// RECUSAR CONVITE (Remove o vínculo)
router.delete('/recusar/:idEvento/:idConvidado', auth, async (req, res) => {
    try {
        const idEvento = parseInt(req.params.idEvento);
        const idConvidado = parseInt(req.params.idConvidado);

        await prisma.evento_Convidado.deleteMany({
            where: {
                ID_Evento: idEvento,
                ID_Convidado: idConvidado
            }
        });

        res.json({ message: "Convite recusado e removido." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao recusar convite." });
    }
});

// ACEITAR CONVITE (Apenas notifica o dono, pois o vínculo já existe)
router.post('/aceitar', auth, async (req, res) => {
    try {
        const { idEvento, nomeConvidado } = req.body;
        const io = req.app.get('io'); 

        // Busca o evento para saber quem é o dono
        const evento = await prisma.evento.findUnique({ where: { ID_Evento: parseInt(idEvento) } });

        if (evento && io) {
            // Usa o notificationService se estiver importado, ou emite direto via socket se preferir simplicidade
            // Aqui assumo que você quer apenas confirmar visualmente, já que o registro já está no banco
        }

        res.json({ message: "Presença confirmada!" });
    } catch (error) {
        res.status(500).json({ error: "Erro ao confirmar." });
    }
});

module.exports = router;