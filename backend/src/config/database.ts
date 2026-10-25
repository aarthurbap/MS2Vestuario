import mysql from "mysql2/promise";
import "dotenv/config";

// Cria o pool de conexões MySQL usando as variáveis definidas no ambiente.
// O pool permite reutilizar conexões e limita a quantidade simultânea.
export const database = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Mantém o nome pool como um alias para compatibilidade com outros módulos.
export const pool = database;
