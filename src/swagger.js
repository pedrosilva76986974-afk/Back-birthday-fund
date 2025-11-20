// src/swagger.js
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Convites API",
      version: "1.0.0",
      description: "API para sistema de convites de aniversário.",
      contact: {
        name: "Dayvid Weslley dos Santos Lopes <dayvid.weslley@souunit.com.br",
        email: "dayvid.weslley@souunit.com.br",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/",
        description: "Servidor Local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = {
  swaggerUiServe: swaggerUi.serve,
  swaggerUiSetup: swaggerUi.setup(swaggerSpec),
};
