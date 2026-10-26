import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

/**
 * Middleware d'erreur centralisé.
 *
 * Convertit toute erreur (ApiError, Prisma, native) en réponse JSON
 * homogène : { success, message, details?, stack? }
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
    let statusCode = 500;
    let message = "Erreur interne du serveur";
    let details;

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details;
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Erreurs Prisma documentées :
        // https://www.prisma.io/docs/reference/api-reference/error-reference
        switch (err.code) {
            case "P2002":
                statusCode = 409;
                message = "Conflit : valeur déjà existante (contrainte unique)";
                details = { target: err.meta?.target };
                break;
            case "P2025":
                statusCode = 404;
                message = "Ressource introuvable";
                break;
            default:
                statusCode = 400;
                message = "Erreur base de données";
                details = { code: err.code };
        }
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = "Requête Prisma invalide";
    } else if (err?.type === "entity.parse.failed") {
        statusCode = 400;
        message = "JSON invalide dans le corps de la requête";
    } else if (err?.message) {
        message = err.message;
    }

    if (process.env.NODE_ENV !== "test") {
        console.error(`[Error] ${statusCode} - ${message}`, err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(details ? { details } : {}),
        ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
    });
};
