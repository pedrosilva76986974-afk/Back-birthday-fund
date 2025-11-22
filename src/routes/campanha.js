const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

// Criar campanha
router.post('/', auth, async (req, res) => {
    const { ID_Evento, ID_Banco, Meta_Financeira_Campanha, Chave_Pix_Campanha, QRCode_Pix_URL_Campanha, Status_Campanha } = req.body;
    
    try {
        const campanha = await prisma.campanha.create({
            data: { 
                ID_Evento, 
                ID_Banco, 
                Meta_Financeira_Campanha: parseFloat(Meta_Financeira_Campanha || 0), 
                Chave_Pix_Campanha, 
                QRCode_Pix_URL_Campanha, 
                // Se não enviar status, define como ATIVA por padrão (se seu banco permitir) ou usa o enviado
                Status_Campanha: Status_Campanha || 'ATIVA' 
            }
        });
        res.status(201).json(campanha);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar campanha' });
    }
});

// ROTA NOVA: Encerrar campanha manualmente
router.patch('/:id/encerrar', auth, async (req, res) => {
    const id = parseInt(req.params.id);
    
    try {
        const campanha = await prisma.campanha.findUnique({
            where: { ID_Campanha: id },
            include: { Evento: true }
        });

        if (!campanha) return res.status(404).json({ error: 'Campanha não encontrada' });

        // Verifica se quem está tentando encerrar é o dono do evento
        if (campanha.Evento.ID_Usuario_Criador !== req.user.userId) {
            return res.status(403).json({ error: 'Apenas o criador do evento pode encerrar a campanha.' });
        }

        const campanhaAtualizada = await prisma.campanha.update({
            where: { ID_Campanha: id },
            data: { Status_Campanha: 'ENCERRADA' }
        });

        res.json(campanhaAtualizada);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao encerrar campanha' });
    }
});

// Listar campanhas
router.get('/', async (req, res) => {
    const campanhas = await prisma.campanha.findMany();
    res.json(campanhas);
});

module.exports = router;