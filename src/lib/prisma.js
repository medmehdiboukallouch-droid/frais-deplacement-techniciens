import { PrismaClient } from "@prisma/client";

// Singleton Prisma : une seule instance partagée pour éviter
// d'épuiser le pool de connexions Postgres en développement
// (rechargements à chaud) comme en production.
const globalForPrisma = globalThis;

const prisma =
    globalForPrisma.__prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === "production"
                ? ["error"]
                : ["warn", "error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__prisma = prisma;
}

export default prisma;
