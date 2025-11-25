const mercadopago = require("mercadopago");

// configura Mercado Pago
const client = new mercadopago.MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
// mercadopago.configure({
//     access_token: process.env.MP_ACCESS_TOKEN
// });
const preference = new mercadopago.Preference(client);
preference.create({
  body: {
    items: [
      {
        title: 'Meu produto',
        quantity: 1,
        unit_price: 2000
      }
    ],
    operation_type: 'PIX',
  }
})
.then(console.log)
.catch(console.log);
/**
 * Criar pagamento PIX com Mercado Pago
 * @param {number} amount - valor da cobrança
 * @param {string} description - descrição da cobrança
 * @param {object} payer - comprador
 */
async function gerarPix(amount, description, payer) {
    try {
        const body = {
            transaction_amount: parseFloat(amount),
            description,
            payment_method_id: "pix",
            payer: {
                email: payer.email,
                first_name: payer.nome,
                last_name: payer.sobrenome || "",
                identification: {
                    type: "CPF",
                    number: payer.cpf
                }
            }
        };

        const response = await mercadopago.payment.create(body);

        const { point_of_interaction } = response.response;

        return {
            id: response.response.id,
            status: response.response.status,
            status_detail: response.response.status_detail,
            qr_code: point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: point_of_interaction?.transaction_data?.ticket_url, // link de pagamento
        };

    } catch (error) {
        console.error("Erro ao gerar PIX:", error);
        throw error;
    }
}

module.exports = { gerarPix };
