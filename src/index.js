require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { swaggerUiServe, swaggerUiSetup } = require("./swagger");

// --- IMPORTAÇÃO DO SERVIÇO DE CRON ---
const { iniciarCronJobs } = require('./services/cronService'); 

const app = express();

// Configura CORS para permitir conexões do Front-end
app.use(cors({ origin: "*" }));     
app.use(express.json());

// --- CONFIGURAÇÃO DO SERVIDOR COM SOCKET.IO ---
const server = http.createServer(app); // Cria o servidor HTTP cru
const io = new Server(server, {
    cors: {
        origin: "*", // Permite conexão de qualquer origem (ajuste para produção depois)
        methods: ["GET", "POST"]
    }
});

// Disponibiliza o 'io' para as rotas usarem (req.app.get('io'))
app.set('io', io);

// Lógica de conexão do Socket
io.on('connection', (socket) => {
    console.log(`Cliente conectado via Socket: ${socket.id}`);
    
    // Entrar na sala do usuário para receber notificações privadas
    socket.on('join_room', (userId) => {
        if(userId) socket.join(userId.toString());
    });
});

// --- ROTAS ---
app.use('/auth', require('./routes/auth'));
app.use('/usuario', require('./routes/usuario'));
app.use('/eventos', require('./routes/evento'));
app.use('/convidado', require('./routes/convidado'));
app.use('/campanha', require('./routes/campanha'));
app.use('/doacao', require('./routes/doacao'));
// app.use("/pagamento", require("./routes/pagamento"));

// --- ROTA NOTIFICAÇÕES ---
// app.use('/notificacoes', require('./routes/notificationRoutes'));

// --- ROTA SWAGGER ---
app.use("/swagger", swaggerUiServe, swaggerUiSetup);

// --- ROTA DE TESTE ---
app.get('/', (req, res) => res.json({ ok: true }));

// --- INICIAR CRON JOBS ---
// iniciarCronJobs();

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));