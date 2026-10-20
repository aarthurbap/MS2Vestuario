import { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../config/database";
import { Usuario } from "../types/usuario";

interface UsuarioRow extends RowDataPacket {
    id: number;
    nome: string;
    login: string;
    senha: string;
    perfil: "caixa" | "gerente";
}

export class UsuarioModel {
    static async create(
        usuario: Omit<Usuario, "id">
    ): Promise<number> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                INSERT INTO usuarios (
                    nome,
                    login,
                    senha,
                    perfil
                )
                VALUES (?, ?, ?, ?)
            `,
            [
                usuario.nome,
                usuario.login,
                usuario.senha,
                usuario.perfil
            ]
        );

        return result.insertId;
    }

    static async findById(
        id: number
    ): Promise<Usuario | null> {
        const [rows] = await database.execute<UsuarioRow[]>(
            `
                SELECT
                    id,
                    nome,
                    login,
                    senha,
                    perfil
                FROM usuarios
                WHERE id = ?
            `,
            [id]
        );

        if (rows.length === 0) {
            return null;
        }

        return {
            id: rows[0].id,
            nome: rows[0].nome,
            login: rows[0].login,
            senha: rows[0].senha,
            perfil: rows[0].perfil
        };
    }

    static async findAll(): Promise<Usuario[]> {
        const [rows] = await database.execute<UsuarioRow[]>(
            `
                SELECT
                    id,
                    nome,
                    login,
                    senha,
                    perfil
                FROM usuarios
            `
        );

        return rows.map((row) => ({
            id: row.id,
            nome: row.nome,
            login: row.login,
            senha: row.senha,
            perfil: row.perfil
        }));
    }

    static async update(
        id: number,
        usuario: Omit<Usuario, "id">
    ): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                UPDATE usuarios
                SET
                    nome = ?,
                    login = ?,
                    senha = ?,
                    perfil = ?
                WHERE id = ?
            `,
            [
                usuario.nome,
                usuario.login,
                usuario.senha,
                usuario.perfil,
                id
            ]
        );

        return result.affectedRows > 0;
    }

    static async delete(
        id: number
    ): Promise<boolean> {
        const [result] = await database.execute<ResultSetHeader>(
            `
                DELETE FROM usuarios
                WHERE id = ?
            `,
            [id]
        );

        return result.affectedRows > 0;
    }

    static async findByLogin(
        login: string
    ): Promise<Usuario | null> {
        const [rows] = await database.execute<UsuarioRow[]>(
            `
                SELECT
                    id,
                    nome,
                    login,
                    senha,
                    perfil
                FROM usuarios
                WHERE login = ?
            `,
            [login]
        );

        if (rows.length === 0) {
            return null;
        }

        return {
            id: rows[0].id,
            nome: rows[0].nome,
            login: rows[0].login,
            senha: rows[0].senha,
            perfil: rows[0].perfil
        };
    }
}