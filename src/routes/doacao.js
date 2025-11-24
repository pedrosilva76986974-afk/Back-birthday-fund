const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');
// 1. IMPORTANTE: Importar o serviço
const notificationService = require('../services/notificationService');
// Registrar doação com verificação de meta
router.post('/', auth, async (req, res) => {
    const { ID_Campanha, ID_Evento, ID_Convidado, Valor_Doacao } = req.body;
    const valor = parseFloat(Valor_Doacao || 0);
    // Pega a instância do IO para tempo real
    const io = req.app.get('io'); 

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Cria a doação e JÁ BUSCA quem é o dono do evento para notificar
            const doacao = await tx.doacao.create({
                data: { ID_Campanha, ID_Evento, ID_Convidado, Valor_Doacao: valor },
                include: { 
                    Evento: { select: { ID_Usuario_Criador: true, Titulo_Evento: true } },
                    Convidado: { select: { Nome_Convidado: true } }
                }
            });

            const idDono = doacao.Evento.ID_Usuario_Criador;
            const nomeDoador = doacao.Convidado?.Nome_Convidado || "Anônimo";

            // --- NOTIFICAÇÃO: NOVA DOAÇÃO RECEBIDA ---
            // Enviamos fora da espera (sem await) para não travar a transação se o socket demorar
            notificationService.createNotification(
                idDono,
                "Nova Doação! 💸",
                `${nomeDoador} doou R$ ${valor.toFixed(2)} para ${doacao.Evento.Titulo_Evento}`,
                io
            );

            //Busca dados da campanha
            const campanha = await tx.campanha.findUnique({
                where: { ID_Campanha },
                include: { Doacoes: { select: { Valor_Doacao: true } } }
            });

            if (campanha) {
                const total = campanha.Doacoes.reduce((acc, curr) => acc + curr.Valor_Doacao, 0);

                //Se atingiu a meta, encerra e NOTIFICA
                if (campanha.Meta_Financeira_Campanha > 0 && 
                    total >= campanha.Meta_Financeira_Campanha && 
                    campanha.Status_Campanha !== 'ENCERRADA') {
                    
                    await tx.campanha.update({
                        where: { ID_Campanha },
                        data: { Status_Campanha: 'ENCERRADA' }
                    });

                    // --- NOTIFICAÇÃO: META ATINGIDA ---
                    console.log(`💰 Campanha ${ID_Campanha} atingiu a meta!`);
                    
                    notificationService.createNotification(
                        idDono,
                        "META ATINGIDA! 🏆",
                        `Parabéns! A campanha do evento atingiu 100% da meta e foi encerrada com sucesso.`,
                        io
                    );
                }
            }
            return doacao;
        });
        res.status(201).json(resultado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar doação' });
    }
});

// Listar doações
router.get('/', async (req, res) => {
    const doacoes = await prisma.doacao.findMany();
    res.json(doacoes);
});

module.exports = router;