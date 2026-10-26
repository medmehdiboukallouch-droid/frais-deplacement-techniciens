import { ApiError } from "../utils/ApiError.js";

// Middleware 404 : déclenché si aucune route n'a matché.
export const notFoundHandler = (req, _res, next) => {
    next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} introuvable`));
};
