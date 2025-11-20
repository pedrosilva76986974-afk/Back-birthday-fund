const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

// criar convidado
router.post('/', auth, async (req, res) => {
    const { Nome_Convidado, Email_Convidado, Senha_Convidado } = req.body;
    const hash = await require('bcrypt').hash(Senha_Convidado || Math.random().toString(36).slice(-8), 10);
    const convidado = await prisma.convidado.create({ data: { Nome_Convidado, Email_Convidado, Senha_Convidado: hash } });
    res.status(201).json(convidado);
});

// listar convidados
router.get('/', async (req, res) => {
    const convidados = await prisma.convidado.findMany({ select: { ID_Convidado: true, Nome_Convidado: true, Email_Convidado: true } });
    res.json(convidados);
});

module.exports = router;
