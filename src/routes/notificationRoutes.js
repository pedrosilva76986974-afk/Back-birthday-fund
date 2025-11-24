const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

//Listar notificações de um usuário
router.get('/:userId', async (req, res) => {
    try {
        const notifications = await notificationService.listByUser(req.params.userId);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
});

//Contagem de não lidas (para a badge/sininho)
router.get('/:userId/count', async (req, res) => {
    try {
        const count = await notificationService.countUnread(req.params.userId);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao contar notificações' });
    }
});

//Marcar uma notificação específica como lida
router.patch('/:id/read', async (req, res) => {
    try {
        const updated = await notificationService.markAsRead(req.params.id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao marcar como lida' });
    }
});

// ROTA DE TESTE (Apenas para você simular o envio sem precisar criar um evento real agora)
// POST /notificacoes/test-send
router.post('/test-send', async (req, res) => {
    const { userId, title, message } = req.body;
    const io = req.app.get('io'); // Pega a instância do Socket configurada no index.js

    try {
        const notif = await notificationService.createNotification(userId, title, message, io);
        res.json({ message: 'Notificação enviada e salva!', data: notif });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;