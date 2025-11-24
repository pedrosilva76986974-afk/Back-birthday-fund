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

// ... códigos anteriores (imports, create, encerrar, etc)

/**
 * @swagger
 * /campanha/minhas:
 * get:
 * summary: Listar apenas as campanhas do usuário logado
 * tags: [Campanhas]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Lista das minhas campanhas
 */
router.get('/minhas', auth, async (req, res) => {
    try {
        const userId = req.user.userId; // Pega o ID de quem está logado

        const minhasCampanhas = await prisma.campanha.findMany({
            where: {
                Evento: {
                    ID_Usuario_Criador: userId // Filtra pelo dono do evento
                }
            },
            include: {
                Evento: true // Traz os dados do evento junto (Título, Data, etc)
            }
        });

        res.json(minhasCampanhas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar campanhas do usuário' });
    }
});

/**
 * @swagger
 * /campanha/usuario/{id}:
 * get:
 * summary: Listar campanhas de um usuário específico pelo ID
 * tags: [Campanhas]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Lista de campanhas do usuário solicitado
 */
router.get('/usuario/:id', auth, async (req, res) => {
    try {
        const idUsuarioAlvo = parseInt(req.params.id);

        const campanhas = await prisma.campanha.findMany({
            where: {
                Evento: {
                    ID_Usuario_Criador: idUsuarioAlvo
                }
            },
            include: {
                Evento: true
            }
        });

        res.json(campanhas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar campanhas' });
    }
});

module.exports = router;