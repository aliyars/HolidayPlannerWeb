"use client";

import { useState } from "react";
import styles from "./CategoryManager.module.css";

// Panel to rename or delete categories.
// It only asks the parent (Expenses) to do the change; the parent owns the data.
export default function CategoryManager({ categories, expenses, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(null); // name being renamed
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [confirming, setConfirming] = useState(null); // name waiting for "are you sure?"

  function countFor(name) {
    return expenses.filter((e) => e.category === name).length;
  }

  function startRename(name) {
    setRenaming(name);
    setRenameValue(name);
    setRenameError("");
    setConfirming(null);
  }

  function submitRename(event) {
    event.preventDefault();
    const error = onRename(renaming, renameValue);
    if (error) setRenameError(error);
    else setRenaming(null);
  }

  function startDelete(name) {
    setConfirming(name);
    setRenaming(null);
  }

  return (
    <section className={styles.panel} aria-label="Manage categories">
      <h3>Categories</h3>
      <p className={styles.hint}>
        These are the choices in the category list. Deleting one never deletes your expenses.
      </p>

      {categories.length === 0 && (
        <p className={styles.hint}>No categories. Choose “+ New category” when you add an expense.</p>
      )}

      <ul className={styles.list}>
        {categories.map((c) => {
          const used = countFor(c.name);
          const isOther = c.name === "Other";

          return (
            <li key={c.name} className={styles.row}>
              <span className={styles.dot} style={{ background: c.color }} aria-hidden="true" />

              {renaming === c.name ? (
                <form className={styles.renameForm} onSubmit={submitRename} noValidate>
                  <input
                    className={`${styles.renameInput} ${renameError ? styles.invalid : ""}`}
                    type="text"
                    maxLength={20}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                    aria-label={`New name for ${c.name}`}
                    aria-invalid={Boolean(renameError)}
                    autoFocus
                  />
                  <button type="submit" className={`${styles.button} ${styles.primary}`}>
                    Save
                  </button>
                  <button type="button" className={styles.button} onClick={() => setRenaming(null)}>
                    Cancel
                  </button>
                  {renameError && (
                    <p className={styles.error} role="alert">
                      {renameError}
                    </p>
                  )}
                </form>
              ) : (
                <>
                  <span className={styles.name}>{c.name}</span>
                  <span className={styles.count}>
                    {used} {used === 1 ? "expense" : "expenses"}
                  </span>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={() => startRename(c.name)}
                      aria-label={`Rename ${c.name}`}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.danger}`}
                      onClick={() => startDelete(c.name)}
                      aria-label={`Delete ${c.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}

              {confirming === c.name && (
                <div className={styles.confirm} role="group" aria-label={`Confirm delete ${c.name}`}>
                  {used > 0 && isOther ? (
                    <>
                      <span>
                        “Other” is where deleted categories send their expenses, and it still has {used}. Edit or
                        delete those expenses first.
                      </span>
                      <button type="button" className={styles.button} onClick={() => setConfirming(null)} autoFocus>
                        OK
                      </button>
                    </>
                  ) : (
                    <>
                      <span>
                        {used > 0
                          ? `${used} ${used === 1 ? "expense uses" : "expenses use"} “${c.name}”. They will move to “Other”.`
                          : `Delete “${c.name}”?`}
                      </span>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.dangerSolid}`}
                        onClick={() => {
                          onDelete(c.name);
                          setConfirming(null);
                        }}
                      >
                        {used > 0 ? "Delete and move" : "Delete"}
                      </button>
                      <button type="button" className={styles.button} onClick={() => setConfirming(null)} autoFocus>
                        Keep
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
