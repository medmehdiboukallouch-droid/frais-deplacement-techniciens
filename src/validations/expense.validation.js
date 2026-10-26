import Joi from "joi";

// Messages personnalisés en français pour une meilleure UX côté client.
const messages = {
    "any.required": "Le champ {#label} est obligatoire",
    "string.empty": "Le champ {#label} ne peut pas être vide",
    "string.base": "Le champ {#label} doit être une chaîne de caractères",
    "string.max": "Le champ {#label} ne peut pas dépasser {#limit} caractères",
    "number.base": "Le champ {#label} doit être un nombre",
    "number.positive": "Le champ {#label} doit être strictement positif",
    "date.base": "Le champ {#label} doit être une date valide (ISO 8601)",
};

/**
 * Schéma de création d'une demande de frais.
 * Tous les champs sont obligatoires.
 */
export const createExpenseSchema = Joi.object({
    type: Joi.string().trim().min(1).max(100).required().label("type").messages(messages),
    amount: Joi.number().positive().precision(2).required().label("amount").messages(messages),
    date: Joi.date().iso().required().label("date").messages(messages),
    description: Joi.string().trim().min(1).max(1000).required().label("description").messages(messages),
});

/**
 * Schéma de mise à jour : tous les champs sont optionnels,
 * mais au moins un doit être fourni.
 */
export const updateExpenseSchema = Joi.object({
    type: Joi.string().trim().min(1).max(100).label("type").messages(messages),
    amount: Joi.number().positive().precision(2).label("amount").messages(messages),
    date: Joi.date().iso().label("date").messages(messages),
    description: Joi.string().trim().min(1).max(1000).label("description").messages(messages),
}).min(1).messages({
    "object.min": "Au moins un champ doit être fourni pour la mise à jour",
});

/**
 * Validation des paramètres d'URL : :id (entier positif).
 */
export const idParamSchema = Joi.object({
    id: Joi.number().integer().positive().required().label("id").messages(messages),
});

/**
 * Validation des query params pour la liste :
 *   - page (>=1, défaut 1)
 *   - limit (1..100, défaut 10)
 *   - sort (asc|desc sur la date, défaut desc)
 *   - type (filtre exact insensible à la casse)
 *   - status (filtre par statut)
 */
export const listExpensesQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).label("page").messages(messages),
    limit: Joi.number().integer().min(1).max(100).default(10).label("limit").messages(messages),
    sort: Joi.string().valid("asc", "desc").default("desc").label("sort"),
    type: Joi.string().trim().min(1).max(100).label("type").messages(messages),
    status: Joi.string().valid("pending", "approved", "rejected").label("status"),
});
