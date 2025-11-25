const express = require("express");
const router = express.Router();
const { gerarPix } = require("../services/mercadoPago");

router.post("/pix", async (req, res) => {
    try {
        const { amount, description, payer } = req.body;

        if (!amount || !description || !payer) {
            return res.status(400).json({ error: "Dados incompletos." });
        }

        const pix = await gerarPix(amount, description, payer);

        return res.json({
            ok: true,
            pix
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: "Erro ao gerar cobrança PIX."
        });
    }
});

module.exports = router;
