import os
from flask import Flask, jsonify, request, render_template
from database import get_connection, init_db
from flask import Flask, jsonify, request, render_template, send_file
from facture_pdf import generer_facture_pdf
app = Flask(__name__)


# ---------------------------------------------------------
# PAGES WEB
# ---------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")
@app.route("/produits-page")
def produits_page():
    return render_template("produits.html")
@app.route("/vente-page")
def vente_page():
    return render_template("vente.html")
@app.route("/historique-page")
def historique_page():
    return render_template("historique.html")
@app.route("/catalogue")
def catalogue_page():
    return render_template("catalogue.html")
@app.route("/commandes-page")
def commandes_page():
    return render_template("commandes.html")
# ---------------------------------------------------------
# API : PRODUITS
# ---------------------------------------------------------

@app.route("/api/produits", methods=["GET"])
def get_produits():
    conn = get_connection()
    produits = conn.execute("SELECT * FROM produits ORDER BY nom").fetchall()
    conn.close()
    return jsonify([dict(p) for p in produits])


@app.route("/api/produits/<int:produit_id>", methods=["GET"])
def get_produit(produit_id):
    conn = get_connection()
    produit = conn.execute(
        "SELECT * FROM produits WHERE id = ?", (produit_id,)
    ).fetchone()
    conn.close()

    if produit is None:
        return jsonify({"erreur": "Produit non trouvé"}), 404

    return jsonify(dict(produit))


@app.route("/api/produits", methods=["POST"])
def create_produit():
    data = request.get_json()

    nom = data.get("nom")
    categorie = data.get("categorie", "")
    unite = data.get("unite", "piece")
    prix_unitaire = data.get("prix_unitaire")
    quantite_stock = data.get("quantite_stock", 0)
    seuil_alerte = data.get("seuil_alerte", 5)

    if not nom or prix_unitaire is None:
        return jsonify({"erreur": "Le nom et le prix unitaire sont obligatoires"}), 400

    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO produits (nom, categorie, unite, prix_unitaire, quantite_stock, seuil_alerte)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (nom, categorie, unite, prix_unitaire, quantite_stock, seuil_alerte),
    )
    conn.commit()
    nouvel_id = cursor.lastrowid
    conn.close()

    return jsonify({"message": "Produit créé", "id": nouvel_id}), 201


@app.route("/api/produits/<int:produit_id>", methods=["PUT"])
def update_produit(produit_id):
    data = request.get_json()
    conn = get_connection()

    produit = conn.execute(
        "SELECT * FROM produits WHERE id = ?", (produit_id,)
    ).fetchone()

    if produit is None:
        conn.close()
        return jsonify({"erreur": "Produit non trouvé"}), 404

    nom = data.get("nom", produit["nom"])
    categorie = data.get("categorie", produit["categorie"])
    unite = data.get("unite", produit["unite"])
    prix_unitaire = data.get("prix_unitaire", produit["prix_unitaire"])
    quantite_stock = data.get("quantite_stock", produit["quantite_stock"])
    seuil_alerte = data.get("seuil_alerte", produit["seuil_alerte"])

    conn.execute(
        """UPDATE produits
           SET nom = ?, categorie = ?, unite = ?, prix_unitaire = ?,
               quantite_stock = ?, seuil_alerte = ?
           WHERE id = ?""",
        (nom, categorie, unite, prix_unitaire, quantite_stock, seuil_alerte, produit_id),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Produit mis à jour"})


@app.route("/api/produits/<int:produit_id>", methods=["DELETE"])
def delete_produit(produit_id):
    conn = get_connection()
    produit = conn.execute(
        "SELECT * FROM produits WHERE id = ?", (produit_id,)
    ).fetchone()

    if produit is None:
        conn.close()
        return jsonify({"erreur": "Produit non trouvé"}), 404

    conn.execute("DELETE FROM produits WHERE id = ?", (produit_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Produit supprimé"})

# ---------------------------------------------------------
# API : VENTES / FACTURATION
# ---------------------------------------------------------

@app.route("/api/ventes", methods=["POST"])
def create_vente():
    """
    Crée une commande à partir d'une liste de lignes :
    {
        "lignes": [
            { "produit_id": 1, "quantite": 2 },
            { "produit_id": 3, "quantite": 1 }
        ],
        "statut": "en_attente"  (optionnel, défaut = "confirmee")
    }

    - statut "en_attente" : commande client, stock NON déduit
    - statut "confirmee"  : vente directe (comptoir), stock déduit immédiatement
    """
    data = request.get_json()
    lignes = data.get("lignes", [])
    statut = data.get("statut", "confirmee")

    if statut not in ("en_attente", "confirmee"):
        return jsonify({"erreur": "Statut invalide"}), 400

    if not lignes:
        return jsonify({"erreur": "La vente doit contenir au moins une ligne"}), 400

    conn = get_connection()

    # 1. Vérifier le stock disponible pour chaque produit
    produits_info = []
    for ligne in lignes:
        produit_id = ligne.get("produit_id")
        quantite = ligne.get("quantite")

        if not produit_id or not quantite or quantite <= 0:
            conn.close()
            return jsonify({"erreur": "Chaque ligne doit avoir un produit_id et une quantite > 0"}), 400

        produit = conn.execute(
            "SELECT * FROM produits WHERE id = ?", (produit_id,)
        ).fetchone()

        if produit is None:
            conn.close()
            return jsonify({"erreur": f"Produit {produit_id} introuvable"}), 404

        if produit["quantite_stock"] < quantite:
            conn.close()
            return jsonify({
                "erreur": f"Stock insuffisant pour '{produit['nom']}' "
                          f"(disponible: {produit['quantite_stock']}, demandé: {quantite})"
            }), 400

        produits_info.append({"produit": produit, "quantite": quantite})

    # 2. Calculer le total
    total = sum(p["produit"]["prix_unitaire"] * p["quantite"] for p in produits_info)

    # 3. Créer la vente avec le statut demandé
    cursor = conn.execute(
        "INSERT INTO ventes (total, statut) VALUES (?, ?)", (total, statut)
    )
    vente_id = cursor.lastrowid

    # 4. Créer les lignes de vente
    for item in produits_info:
        produit = item["produit"]
        quantite = item["quantite"]
        sous_total = produit["prix_unitaire"] * quantite

        conn.execute(
            """INSERT INTO lignes_vente
               (vente_id, produit_id, nom_produit, quantite, prix_unitaire, sous_total)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (vente_id, produit["id"], produit["nom"], quantite, produit["prix_unitaire"], sous_total),
        )

        # 5. Déduire le stock UNIQUEMENT si la vente est confirmée immédiatement
        if statut == "confirmee":
            conn.execute(
                "UPDATE produits SET quantite_stock = quantite_stock - ? WHERE id = ?",
                (quantite, produit["id"]),
            )

    conn.commit()
    conn.close()

    return jsonify({"message": "Vente enregistrée", "vente_id": vente_id, "total": total, "statut": statut}), 201
@app.route("/api/ventes/<int:vente_id>/confirmer", methods=["POST"])
def confirmer_vente(vente_id):
    """Confirme une commande en attente : déduit le stock et passe le statut à 'confirmee'."""
    conn = get_connection()

    vente = conn.execute(
        "SELECT * FROM ventes WHERE id = ?", (vente_id,)
    ).fetchone()

    if vente is None:
        conn.close()
        return jsonify({"erreur": "Vente non trouvée"}), 404

    if vente["statut"] == "confirmee":
        conn.close()
        return jsonify({"erreur": "Cette commande est déjà confirmée"}), 400

    lignes = conn.execute(
        "SELECT * FROM lignes_vente WHERE vente_id = ?", (vente_id,)
    ).fetchall()

    # Vérifier le stock disponible avant de confirmer
    for ligne in lignes:
        produit = conn.execute(
            "SELECT * FROM produits WHERE id = ?", (ligne["produit_id"],)
        ).fetchone()

        if produit is None or produit["quantite_stock"] < ligne["quantite"]:
            conn.close()
            return jsonify({
                "erreur": f"Stock insuffisant pour '{ligne['nom_produit']}' "
                          f"pour confirmer cette commande"
            }), 400

    # Déduire le stock pour chaque ligne
    for ligne in lignes:
        conn.execute(
            "UPDATE produits SET quantite_stock = quantite_stock - ? WHERE id = ?",
            (ligne["quantite"], ligne["produit_id"]),
        )

    # Mettre à jour le statut
    conn.execute(
        "UPDATE ventes SET statut = 'confirmee' WHERE id = ?", (vente_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Commande confirmée, stock mis à jour"})

@app.route("/api/ventes/<int:vente_id>/annuler", methods=["POST"])
def annuler_vente(vente_id):
    """Annule une commande en attente (la supprime)."""
    conn = get_connection()

    vente = conn.execute(
        "SELECT * FROM ventes WHERE id = ?", (vente_id,)
    ).fetchone()

    if vente is None:
        conn.close()
        return jsonify({"erreur": "Vente non trouvée"}), 404

    if vente["statut"] == "confirmee":
        conn.close()
        return jsonify({"erreur": "Impossible d'annuler une commande déjà confirmée"}), 400

    conn.execute("DELETE FROM ventes WHERE id = ?", (vente_id,))
    conn.execute("DELETE FROM lignes_vente WHERE vente_id = ?", (vente_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Commande annulée"})

@app.route("/api/ventes", methods=["GET"])
def get_ventes():
    conn = get_connection()
    ventes = conn.execute(
        "SELECT * FROM ventes ORDER BY date_vente DESC"
    ).fetchall()
    conn.close()
    return jsonify([dict(v) for v in ventes])

@app.route("/api/ventes/en_attente", methods=["GET"])
def get_ventes_en_attente():
    conn = get_connection()
    ventes = conn.execute(
        "SELECT * FROM ventes WHERE statut = 'en_attente' ORDER BY date_vente ASC"
    ).fetchall()
    conn.close()
    return jsonify([dict(v) for v in ventes])

@app.route("/api/ventes/<int:vente_id>/pdf", methods=["GET"])
def get_vente_pdf(vente_id):
    conn = get_connection()

    vente = conn.execute(
        "SELECT * FROM ventes WHERE id = ?", (vente_id,)
    ).fetchone()

    if vente is None:
        conn.close()
        return jsonify({"erreur": "Vente non trouvée"}), 404

    lignes = conn.execute(
        "SELECT * FROM lignes_vente WHERE vente_id = ?", (vente_id,)
    ).fetchall()

    conn.close()

    vente_dict = dict(vente)
    vente_dict["lignes"] = [dict(l) for l in lignes]

    buffer = generer_facture_pdf(vente_dict)

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"facture_{vente_id}.pdf",
    )

@app.route("/api/ventes/<int:vente_id>", methods=["GET"])
def get_vente(vente_id):
    conn = get_connection()

    vente = conn.execute(
        "SELECT * FROM ventes WHERE id = ?", (vente_id,)
    ).fetchone()

    if vente is None:
        conn.close()
        return jsonify({"erreur": "Vente non trouvée"}), 404

    lignes = conn.execute(
        "SELECT * FROM lignes_vente WHERE vente_id = ?", (vente_id,)
    ).fetchall()

    conn.close()

    resultat = dict(vente)
    resultat["lignes"] = [dict(l) for l in lignes]

    return jsonify(resultat)

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)