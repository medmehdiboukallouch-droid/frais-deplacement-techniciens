import prisma from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * POST /expenses
 * Crée une nouvelle demande de frais.
 */
export const createExpense = async (req, res) => {
    const { type, amount, date, description } = req.body;

    const expense = await prisma.expense.create({
        data: {
            type,
            amount,
            date: new Date(date),
            description,
        },
    });

    res.status(201).json({
        success: true,
        message: "Demande de frais créée avec succès",
        data: expense,
    });
};

/**
 * GET /expenses
 * Liste paginée, triée par date, filtrable par type et statut.
 *
 * Note : on lit `req.validatedQuery` car Express 5 rend `req.query`
 * en lecture seule (cf. validate.middleware.js).
 */
export const getExpenses = async (req, res) => {
    const { page, limit, sort, type, status } = req.validatedQuery;

    const skip = (page - 1) * limit;

    const where = {};
    if (type) where.type = { equals: type, mode: "insensitive" };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
        prisma.expense.findMany({
            where,
            orderBy: { date: sort },
            skip,
            take: limit,
        }),
        prisma.expense.count({ where }),
    ]);

    res.json({
        success: true,
        data: items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    });
};

/**
 * GET /expenses/:id
 * Récupère une demande par son identifiant.
 */
export const getExpenseById = async (req, res) => {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({ where: { id } });

    if (!expense) {
        throw ApiError.notFound(`Aucune demande de frais avec l'id ${id}`);
    }

    res.json({ success: true, data: expense });
};

/**
 * PUT /expenses/:id
 * Met à jour une demande existante.
 */
export const updateExpense = async (req, res) => {
    const { id } = req.params;
    const data = { ...req.body };

    if (data.date) {
        data.date = new Date(data.date);
    }

    // findUnique d'abord pour renvoyer un 404 explicite plutôt
    // que de laisser Prisma lever P2025 (déjà géré, mais plus clair ici).
    const exists = await prisma.expense.findUnique({ where: { id } });
    if (!exists) {
        throw ApiError.notFound(`Aucune demande de frais avec l'id ${id}`);
    }

    const expense = await prisma.expense.update({
        where: { id },
        data,
    });

    res.json({
        success: true,
        message: "Demande de frais mise à jour avec succès",
        data: expense,
    });
};

/**
 * DELETE /expenses/:id
 * Supprime une demande.
 */
export const deleteExpense = async (req, res) => {
    const { id } = req.params;

    const exists = await prisma.expense.findUnique({ where: { id } });
    if (!exists) {
        throw ApiError.notFound(`Aucune demande de frais avec l'id ${id}`);
    }

    await prisma.expense.delete({ where: { id } });

    res.json({
        success: true,
        message: "Demande de frais supprimée avec succès",
    });
};
