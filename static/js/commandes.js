async function chargerCommandes() {
    const reponse = await fetch("/api/ventes/en_attente");
    const commandes = await reponse.json();

    const container = document.getElementById("liste-commandes");
    container.innerHTML = "";

    if (commandes.length === 0) {
        container.innerHTML = "<p>Aucune commande en attente.</p>";
        return;
    }

    for (const commande of commandes) {
        // Charger le détail de chaque commande
        const repDetail = await fetch(`/api/ventes/${commande.id}`);
        const detail = await repDetail.json();

        const div = document.createElement("div");
        div.style = "border:1px solid var(--gray-border); border-radius:8px; padding:1.5rem; margin-bottom:1rem;";

        // Construire le tableau des lignes
        let lignesHTML = detail.lignes.map(l => `
            <tr>
                <td>${l.nom_produit}</td>
                <td>${l.quantite}</td>
                <td>${l.prix_unitaire} FCFA</td>
                <td>${l.sous_total} FCFA</td>
            </tr>
        `).join("");

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div>
                    <strong>Commande #${commande.id}</strong>
                    <span style="color:var(--gray-text); margin-left:1rem; font-size:0.85rem;">${commande.date_vente}</span>
                </div>
                <span style="background:#fff3cd; color:#856404; padding:0.3rem 0.8rem; border-radius:50px; font-size:0.8rem; font-weight:600;">
                    En attente
                </span>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Produit</th>
                        <th>Quantité</th>
                        <th>Prix unitaire</th>
                        <th>Sous-total</th>
                    </tr>
                </thead>
                <tbody>${lignesHTML}</tbody>
            </table>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
                <strong>Total : ${commande.total} FCFA</strong>
                <div style="display:flex; gap:0.5rem;">
                    <button onclick="confirmerCommande(${commande.id})">✅ Confirmer</button>
                    <button class="danger" onclick="annulerCommande(${commande.id})">✕ Annuler</button>
                </div>
            </div>
        `;

        container.appendChild(div);
    }
}

async function confirmerCommande(id) {
    if (!confirm("Confirmer cette commande ? Le stock sera déduit.")) return;

    const reponse = await fetch(`/api/ventes/${id}/confirmer`, {
        method: "POST",
    });

    const resultat = await reponse.json();

    if (reponse.ok) {
        alert("Commande confirmée !");
        chargerCommandes();
    } else {
        alert("Erreur : " + resultat.erreur);
    }
}

async function annulerCommande(id) {
    if (!confirm("Annuler cette commande ?")) return;

    const reponse = await fetch(`/api/ventes/${id}/annuler`, {
        method: "POST",
    });

    const resultat = await reponse.json();

    if (reponse.ok) {
        alert("Commande annulée.");
        chargerCommandes();
    } else {
        alert("Erreur : " + resultat.erreur);
    }
}

// Au chargement
chargerCommandes();