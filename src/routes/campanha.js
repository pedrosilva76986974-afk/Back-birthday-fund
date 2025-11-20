const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

// criar campanha
router.post('/', auth, async (req, res) => {
    const { ID_Evento, ID_Banco, Meta_Financeira_Campanha, Chave_Pix_Campanha, QRCode_Pix_URL_Campanha, Status_Campanha } = req.body;
    const campanha = await prisma.campanha.create({
        data: { ID_Evento, ID_Banco, Meta_Financeira_Campanha: parseFloat(Meta_Financeira_Campanha || 0), Chave_Pix_Campanha, QRCode_Pix_URL_Campanha, Status_Campanha }
    });
    res.status(201).json(campanha);
});

// listar campanhas
router.get('/', async (req, res) => {
    const campanhas = await prisma.campanha.findMany();
    res.json(campanhas);
});

module.exports = router;
