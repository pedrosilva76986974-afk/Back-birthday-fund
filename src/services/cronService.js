const cron = require('node-cron');
const prisma = require('../prismaClient');

function iniciarCronJobs() {
    // Agendamento: Roda todo minuto 0 de cada hora (ex: 13:00, 14:00, 15:00)
    cron.schedule('0 * * * *', async () => {
        console.log('🔄 Cron Job: Verificando campanhas expiradas...');
        
        const agora = new Date();

        try {
            // Busca campanhas que NÃO estão encerradas e cuja data do evento já passou
            const campanhasExpiradas = await prisma.campanha.findMany({
                where: {
                    Status_Campanha: { not: 'ENCERRADA' },
                    Evento: {
                        Data_Evento: { lt: agora } // "lt" = less than (menor que agora)
                    }
                },
                select: { ID_Campanha: true }
            });

            if (campanhasExpiradas.length > 0) {
                const idsParaFechar = campanhasExpiradas.map(c => c.ID_Campanha);

                // Atualiza todas para ENCERRADA
                await prisma.campanha.updateMany({
                    where: {
                        ID_Campanha: { in: idsParaFechar }
                    },
                    data: {
                        Status_Campanha: 'ENCERRADA'
                    }
                });

                console.log(`✅ ${idsParaFechar.length} campanhas encerradas automaticamente por data.`);
            } 
        } catch (error) {
            console.error('❌ Erro ao rodar verificação de campanhas:', error);
        }
    });

    console.log('⏰ Serviço de monitoramento de campanhas iniciado.');
}

module.exports = { iniciarCronJobs };