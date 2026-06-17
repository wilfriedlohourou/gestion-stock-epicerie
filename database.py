import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "stock.db"


def get_connection():
    """Retourne une connexion à la base de données SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # permet d'accéder aux colonnes par nom
    return conn


def init_db():
    """Crée les tables si elles n'existent pas encore."""
    conn = get_connection()
    cursor = conn.cursor()

    # Table des produits
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            categorie TEXT,
            unite TEXT NOT NULL DEFAULT 'piece',
            prix_unitaire REAL NOT NULL,
            quantite_stock REAL NOT NULL DEFAULT 0,
            seuil_alerte REAL NOT NULL DEFAULT 5,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # Table des ventes (en-tête de facture)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ventes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date_vente TEXT DEFAULT (datetime('now')),
            total REAL NOT NULL DEFAULT 0,
            statut TEXT NOT NULL DEFAULT 'confirmee'
        )
    """)

    # Table des lignes de vente (détails de la facture)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lignes_vente (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vente_id INTEGER NOT NULL,
            produit_id INTEGER NOT NULL,
            nom_produit TEXT NOT NULL,
            quantite REAL NOT NULL,
            prix_unitaire REAL NOT NULL,
            sous_total REAL NOT NULL,
            FOREIGN KEY (vente_id) REFERENCES ventes (id) ON DELETE CASCADE,
            FOREIGN KEY (produit_id) REFERENCES produits (id)
        )
    """)

    conn.commit()
    conn.close()
    print(f"Base de données initialisée : {DB_PATH}")


if __name__ == "__main__":
    init_db()