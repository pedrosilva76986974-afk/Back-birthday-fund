const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

// registrar doação
router.post('/', auth, async (req, res) => {
    const { ID_Campanha, ID_Evento, ID_Convidado, Valor_Doacao } = req.body;
    const doacao = await prisma.doacao.create({
        data: { ID_Campanha, ID_Evento, ID_Convidado, Valor_Doacao: parseFloat(Valor_Doacao || 0) }
    });
    res.status(201).json(doacao);
});

// listar doações
router.get('/', async (req, res) => {
    const doacoes = await prisma.doacao.findMany();
    res.json(doacoes);
});

module.exports = router;
