import { ApiError } from "../utils/ApiError.js";

/**
 * Middleware générique de validation Joi.
 *
 * @param {import('joi').Schema} schema - Schéma Joi à appliquer
 * @param {'body'|'query'|'params'} property - Source à valider
 * @returns Middleware Express
 *
 * Particularité Express 5 : `req.query` est désormais un getter en lecture
 * seule (basé sur `req.url`). Toute mutation est silencieusement perdue.
 *
 * Pour rester compatible et homogène, on stocke le résultat validé dans
 * une propriété dédiée :
 *   - body   -> req.body (écrasé, fonctionne car mutable)
 *   - params -> req.params (écrasé, fonctionne car mutable)
 *   - query  -> req.validatedQuery (req.query reste intact)
 *
 * Les contrôleurs qui valident la query doivent donc lire `req.validatedQuery`.
 */
export const validate = (schema, property = "body") => (req, _res, next) => {
    const source = req[property] ?? {};

    const { error, value } = schema.validate(source, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
    });

    if (error) {
        const details = error.details.map((d) => ({
            field: d.path.join("."),
            message: d.message,
        }));
        return next(ApiError.badRequest("Données invalides", details));
    }

    if (property === "query") {
        req.validatedQuery = value;
    } else {
        req[property] = value;
    }

    next();
};
