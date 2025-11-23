const prisma = require('../prismaClient');

module.exports = {
  // Cria a notificação e avisa em Tempo Real
  createNotification: async (userId, title, message, io) => {
    try {
      //Salva no Banco
      const notification = await prisma.notification.create({
        data: {
          userId: parseInt(userId), // Garante que é número conforme seu Schema
          title,
          message,
        },
      });

      // Tempo Real
      if (io) {
        // Envia para a "sala" específica do usuário
        io.to(userId.toString()).emit('nova_notificacao', notification);
        
        // Opcional: Emitir a nova contagem também para atualizar o badge
        const count = await prisma.notification.count({
          where: { userId: parseInt(userId), read: false }
        });
        io.to(userId.toString()).emit('atualizar_contagem', count);
      }

      return notification;
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
      throw error;
    }
  },

  // Lista as notificações
  listByUser: async (userId) => {
    return await prisma.notification.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: 'desc' }, // Mais recentes primeiro
      take: 20 // Limita às últimas 20
    });
  },

  // Marca como lida
  markAsRead: async (notificationId) => {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  },

  // Conta não lidas
  countUnread: async (userId) => {
    return await prisma.notification.count({
      where: { 
        userId: parseInt(userId),
        read: false 
      }
    });
  }
};