"use client";

import { useState } from "react";
import CategoryManager from "./CategoryManager";
import styles from "./Expenses.module.css";

// Starting choices for the category dropdown (colours are CSS variables in globals.css).
// They are only choices: the page shows a category only after it has an expense.
const DEFAULT_CATEGORIES = [
  { name: "Stay", color: "var(--violet)" },
  { name: "Food", color: "var(--lime)" },
  { name: "Transport", color: "var(--pink)" },
  { name: "Fun", color: "var(--cat-fun)" },
  { name: "Other", color: "var(--cat-other)" },
];
const OTHER = DEFAULT_CATEGORIES[4];
const PALETTE_SIZE = 6; // --cat-1 ... --cat-6 in globals.css
const NEW_CATEGORY = "__new__"; // value of the "+ New category" option
const MAX_NAME = 20;

// Everything for one getaway is saved in one localStorage item:
// { expenses: [...], categories: [...], colorCounter: number }
function loadData(storageKey) {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    // blocked or broken data: start fresh
  }

  // the first version saved just a list of expenses
  const expenses = Array.isArray(saved) ? saved : Array.isArray(saved?.expenses) ? saved.expenses : [];
  const categories = Array.isArray(saved?.categories) ? [...saved.categories] : [...DEFAULT_CATEGORIES];
  const colorCounter = Number(saved?.colorCounter) || 0;

  // every expense must have a category that exists in the list
  for (const e of expenses) {
    if (!categories.some((c) => c.name === e.category)) {
      categories.push({ name: e.category, color: "var(--cat-other)" });
    }
  }
  return { expenses, categories, colorCounter };
}

function money(value) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function firstCategoryName(categories) {
  return categories.length > 0 ? categories[0].name : NEW_CATEGORY;
}

export default function Expenses({ tripKey, currency, budgetTotal }) {
  const storageKey = `holiday-planner:expenses:${tripKey}`;

  // this component only shows after the user picked a getaway (never on the
  // server), so it is safe to read localStorage when the state is created
  const [data, setData] = useState(() => loadData(storageKey));
  const { expenses, categories } = data;

  // form state
  const [formOpen, setFormOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [category, setCategory] = useState(() => firstCategoryName(data.categories));
  const [newName, setNewName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null); // { field, message }
  const [confirmId, setConfirmId] = useState(null); // row waiting for "are you sure?"

  function colorOf(name) {
    return categories.find((c) => c.name === name)?.color || "var(--cat-other)";
  }

  // one place that changes the data AND saves it
  function update(next) {
    setData(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // saving failed, the app still works until the page is refreshed
    }
  }

  // ----- open / close the form -----
  function resetForm() {
    setCategory(firstCategoryName(categories));
    setNewName("");
    setAmount("");
    setError(null);
  }

  function toggleAddForm() {
    if (formOpen && editingId === null) {
      setFormOpen(false);
      return;
    }
    resetForm();
    setEditingId(null);
    setConfirmId(null);
    setFormOpen(true);
  }

  function startEdit(expense) {
    setEditingId(expense.id);
    setCategory(expense.category);
    setNewName("");
    setAmount(String(expense.amount));
    setError(null);
    setConfirmId(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    resetForm();
  }

  // ----- add / save an expense -----
  function handleSubmit(event) {
    event.preventDefault();

    const value = Number(amount);
    if (!amount || !(value > 0)) {
      setError({ field: "amount", message: "Enter an amount greater than 0." });
      return;
    }

    let nextCategories = categories;
    let colorCounter = data.colorCounter;
    let categoryName = category;

    if (category === NEW_CATEGORY) {
      const name = newName.trim();
      if (!name) {
        setError({ field: "name", message: "Give the new category a name." });
        return;
      }

      const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        categoryName = existing.name; // already exists, just use it
      } else {
        // new categories take the palette colours one after another
        const color = `var(--cat-${(colorCounter % PALETTE_SIZE) + 1})`;
        nextCategories = [...categories, { name, color }];
        colorCounter += 1;
        categoryName = name;
      }
    }

    let nextExpenses;
    if (editingId) {
      nextExpenses = expenses.map((e) =>
        e.id === editingId ? { ...e, category: categoryName, amount: value } : e
      );
    } else {
      const id = expenses.reduce((max, e) => Math.max(max, e.id), 0) + 1; // next free number
      nextExpenses = [{ id, category: categoryName, amount: value }, ...expenses];
    }

    update({ expenses: nextExpenses, categories: nextCategories, colorCounter });
    closeForm();
  }

  function deleteExpense(id) {
    update({ ...data, expenses: expenses.filter((e) => e.id !== id) });
    setConfirmId(null);
    if (editingId === id) closeForm();
  }

  // ----- rename / delete a category (used by CategoryManager) -----
  // returns an error message, or "" when it worked
  function renameCategory(oldName, rawName) {
    const name = rawName.trim();
    if (!name) return "Enter a name.";
    if (name === oldName) return "";

    const taken = categories.some((c) => c.name !== oldName && c.name.toLowerCase() === name.toLowerCase());
    if (taken) return "You already have a category with that name.";

    update({
      ...data,
      categories: categories.map((c) => (c.name === oldName ? { ...c, name } : c)),
      expenses: expenses.map((e) => (e.category === oldName ? { ...e, category: name } : e)),
    });
    if (category === oldName) setCategory(name); // keep the open form in sync
    return "";
  }

  function deleteCategory(name) {
    const used = expenses.some((e) => e.category === name);
    let nextCategories = categories.filter((c) => c.name !== name);
    let nextExpenses = expenses;

    if (used) {
      // the expenses move to "Other" (it is added back if it was deleted before)
      if (!nextCategories.some((c) => c.name === OTHER.name)) nextCategories = [...nextCategories, OTHER];
      nextExpenses = expenses.map((e) => (e.category === name ? { ...e, category: OTHER.name } : e));
    }

    update({ ...data, categories: nextCategories, expenses: nextExpenses });
    if (category === name) setCategory(used ? OTHER.name : firstCategoryName(nextCategories));
  }

  // ----- totals: only categories that have at least one expense -----
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const summary = categories
    .map((c) => ({ ...c, spent: expenses.filter((e) => e.category === c.name).reduce((s, e) => s + e.amount, 0) }))
    .filter((c) => expenses.some((e) => e.category === c.name));
  const overBudget = budgetTotal > 0 && totalSpent > budgetTotal;

  return (
    <>
      <div className={styles.head}>
        <h2>Expenses</h2>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.manageButton}
            onClick={() => setManageOpen(!manageOpen)}
            aria-expanded={manageOpen}
          >
            Categories
          </button>
          <button
            type="button"
            className={styles.addButton}
            onClick={toggleAddForm}
            aria-expanded={formOpen && editingId === null}
          >
            + Add expense
          </button>
        </div>
      </div>

      {manageOpen && (
        <CategoryManager
          categories={categories}
          expenses={expenses}
          onRename={renameCategory}
          onDelete={deleteCategory}
        />
      )}

      {formOpen && (
        <form
          key={editingId ?? "new"}
          className={styles.form}
          onSubmit={handleSubmit}
          onKeyDown={(e) => e.key === "Escape" && closeForm()}
          noValidate
          aria-label={editingId ? "Edit expense" : "Add expense"}
        >
          <div className={styles.field}>
            <label htmlFor="expense-category">Category</label>
            <select
              id="expense-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setError(null);
              }}
            >
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value={NEW_CATEGORY}>+ New category</option>
            </select>
          </div>

          {category === NEW_CATEGORY && (
            <div className={styles.field}>
              <label htmlFor="expense-new-name">New category name</label>
              <input
                id="expense-new-name"
                type="text"
                maxLength={MAX_NAME}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={error?.field === "name" ? styles.invalid : ""}
                aria-invalid={error?.field === "name"}
                aria-describedby={error?.field === "name" ? "expense-name-error" : undefined}
                autoFocus
              />
              {error?.field === "name" && (
                <p id="expense-name-error" className={styles.error} role="alert">
                  {error.message}
                </p>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="expense-amount">Amount ({currency})</label>
            <input
              id="expense-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={error?.field === "amount" ? styles.invalid : ""}
              aria-invalid={error?.field === "amount"}
              aria-describedby={error?.field === "amount" ? "expense-amount-error" : undefined}
              autoFocus={category !== NEW_CATEGORY}
            />
            {error?.field === "amount" && (
              <p id="expense-amount-error" className={styles.error} role="alert">
                {error.message}
              </p>
            )}
          </div>

          <div className={styles.formButtons}>
            <button type="submit" className={styles.saveButton}>
              {editingId ? "Save" : "Add"}
            </button>
            <button type="button" className={styles.cancelButton} onClick={closeForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {expenses.length === 0 ? (
        <p className={styles.empty}>No expenses yet. Use “+ Add expense” to add your first one.</p>
      ) : (
        <>
          {budgetTotal > 0 && (
            <p className={styles.summary}>
              Spent {money(totalSpent)} of {money(budgetTotal)} {currency}
              {overBudget && (
                <span className={styles.over}> · over budget by {money(totalSpent - budgetTotal)}</span>
              )}
            </p>
          )}

          <ul className={styles.bars}>
            {summary.map((c) => {
              const percent = budgetTotal > 0 ? Math.min((c.spent / budgetTotal) * 100, 100) : 0;
              return (
                <li key={c.name}>
                  <span>{c.name}</span>
                  <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${percent}%`, background: c.color }} />
                  </div>
                  <span className={styles.amount}>
                    {money(c.spent)} {currency}
                  </span>
                </li>
              );
            })}
          </ul>

          <h3 className={styles.listTitle}>Your expenses</h3>
          <ul className={styles.rows}>
            {expenses.map((e) => (
              <li key={e.id} className={`${styles.row} ${editingId === e.id ? styles.rowEditing : ""}`}>
                <span className={styles.dot} style={{ background: colorOf(e.category) }} aria-hidden="true" />
                <span className={styles.rowName}>{e.category}</span>
                <span className={styles.rowAmount}>
                  {money(e.amount)} {currency}
                </span>

                {confirmId === e.id ? (
                  <div className={styles.rowActions} role="group" aria-label="Confirm delete">
                    <span className={styles.confirmText}>Delete this expense?</span>
                    <button
                      type="button"
                      className={`${styles.smallButton} ${styles.dangerSolid}`}
                      onClick={() => deleteExpense(e.id)}
                    >
                      Delete
                    </button>
                    <button type="button" className={styles.smallButton} onClick={() => setConfirmId(null)} autoFocus>
                      Keep
                    </button>
                  </div>
                ) : (
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.smallButton}
                      onClick={() => startEdit(e)}
                      aria-label={`Edit ${e.category} expense of ${money(e.amount)} ${currency}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${styles.smallButton} ${styles.dangerButton}`}
                      onClick={() => setConfirmId(e.id)}
                      aria-label={`Delete ${e.category} expense of ${money(e.amount)} ${currency}`}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
