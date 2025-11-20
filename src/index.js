// import { swaggerUiServe, swaggerUiSetup } from "./swagger.js";
require('dotenv').config();
const express = require('express');
const app = express();
const { swaggerUiServe, swaggerUiSetup } = require("./swagger");
app.use(express.json());


// rotas
app.use('/auth', require('./routes/auth'));
app.use('/usuario', require('./routes/usuario'));
app.use('/eventos', require('./routes/evento'));
app.use('/convidado', require('./routes/convidado'));
app.use('/campanha', require('./routes/campanha'));
app.use('/doacao', require('./routes/doacao'));

// Rota Swagger
app.use("/api/docs", swaggerUiServe, swaggerUiSetup);


// rota de teste
app.get('/', (req, res) => res.json({ ok: true }));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));