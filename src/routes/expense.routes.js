import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    createExpenseSchema,
    updateExpenseSchema,
    idParamSchema,
    listExpensesQuerySchema,
} from "../validations/expense.validation.js";
import {
    createExpense,
    getExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
} from "../controllers/expense.controller.js";

const router = Router();

// POST /expenses
router.post(
    "/",
    validate(createExpenseSchema, "body"),
    asyncHandler(createExpense)
);

// GET /expenses?page=&limit=&sort=&type=
router.get(
    "/",
    validate(listExpensesQuerySchema, "query"),
    asyncHandler(getExpenses)
);

// GET /expenses/:id
router.get(
    "/:id",
    validate(idParamSchema, "params"),
    asyncHandler(getExpenseById)
);

// PUT /expenses/:id
router.put(
    "/:id",
    validate(idParamSchema, "params"),
    validate(updateExpenseSchema, "body"),
    asyncHandler(updateExpense)
);

// DELETE /expenses/:id
router.delete(
    "/:id",
    validate(idParamSchema, "params"),
    asyncHandler(deleteExpense)
);

export default router;
