const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

// Registrar doação com verificação de meta
router.post('/', auth, async (req, res) => {
    const { ID_Campanha, ID_Evento, ID_Convidado, Valor_Doacao } = req.body;
    const valor = parseFloat(Valor_Doacao || 0);

    try {
        // Usamos transação para garantir que nada se perca
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Cria a doação
            const doacao = await tx.doacao.create({
                data: { ID_Campanha, ID_Evento, ID_Convidado, Valor_Doacao: valor }
            });

            // 2. Busca dados da campanha
            const campanha = await tx.campanha.findUnique({
                where: { ID_Campanha },
                include: { Doacoes: { select: { Valor_Doacao: true } } }
            });

            if (campanha) {
                const total = campanha.Doacoes.reduce((acc, curr) => acc + curr.Valor_Doacao, 0);

                // 3. Se atingiu a meta, encerra
                if (campanha.Meta_Financeira_Campanha > 0 && 
                    total >= campanha.Meta_Financeira_Campanha && 
                    campanha.Status_Campanha !== 'ENCERRADA') {
                    
                    await tx.campanha.update({
                        where: { ID_Campanha },
                        data: { Status_Campanha: 'ENCERRADA' }
                    });
                    console.log(`💰 Campanha ${ID_Campanha} atingiu a meta e foi encerrada!`);
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