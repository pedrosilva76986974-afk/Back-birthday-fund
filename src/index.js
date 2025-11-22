require('dotenv').config();
const express = require('express');
const { swaggerUiServe, swaggerUiSetup } = require("./swagger");

// --- IMPORTAÇÃO DO SERVIÇO DE CRON ---
const { iniciarCronJobs } = require('./services/cronService'); 

const app = express();
app.use(express.json());

// --- ROTAS ---
app.use('/auth', require('./routes/auth'));
app.use('/usuario', require('./routes/usuario'));
app.use('/eventos', require('./routes/evento'));
app.use('/convidado', require('./routes/convidado'));
app.use('/campanha', require('./routes/campanha'));
app.use('/doacao', require('./routes/doacao'));

// --- ROTA SWAGGER ---
app.use("/api/docs", swaggerUiServe, swaggerUiSetup);

// --- ROTA DE TESTE ---
app.get('/', (req, res) => res.json({ ok: true }));

// --- INICIAR CRON JOBS ---
// Isso inicia o relógio interno para verificar as campanhas
iniciarCronJobs();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));