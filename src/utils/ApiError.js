// Classe d'erreur métier permettant de propager un code HTTP précis
// jusqu'au middleware d'erreur centralisé.
export class ApiError extends Error {
    constructor(statusCode, message, details = undefined) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace?.(this, this.constructor);
    }

    static badRequest(message, details) {
        return new ApiError(400, message, details);
    }

    static notFound(message = "Ressource introuvable") {
        return new ApiError(404, message);
    }

    static conflict(message) {
        return new ApiError(409, message);
    }

    static internal(message = "Erreur interne du serveur") {
        return new ApiError(500, message);
    }
}
