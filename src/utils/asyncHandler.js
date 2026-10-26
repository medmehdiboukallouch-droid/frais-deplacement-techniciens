// Wrapper qui capture toute exception rejetée par un handler async
// et la transmet au middleware d'erreur centralisé via next(err).
// Évite d'avoir à écrire un try/catch dans chaque contrôleur.
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
