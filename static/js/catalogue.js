let panier = [];
let produitsDisponibles = [];

// Charge et affiche les produits en grille
async function chargerCatalogue() {
    const reponse = await fetch("/api/produits");
    produitsDisponibles = await reponse.json();

    const grid = document.getElementById("catalogue-grid");
    grid.innerHTML = "";

    const produitsEnStock = produitsDisponibles.filter(p => p.quantite_stock > 0);

    if (produitsEnStock.length === 0) {
        grid.innerHTML = "<p>Aucun produit disponible pour le moment.</p>";
        return;
    }

    produitsEnStock.forEach((produit) => {
        const card = document.createElement("div");
        card.className = "produit-card";
        card.innerHTML = `
            <h3>${produit.nom}</h3>
            ${produit.categorie ? `<small>${produit.categorie}</small>` : ""}
            <div class="prix">${produit.prix_unitaire} FCFA / ${produit.unite}</div>
            <div class="stock-dispo">Disponible : ${produit.quantite_stock} ${produit.unite}(s)</div>
            <div class="qte-row">
                <input type="number" id="qte-${produit.id}" value="1" min="1" max="${produit.quantite_stock}">
                <button onclick="ajouterAuPanier(${produit.id})">Ajouter</button>
            </div>
        `;
        grid.appendChild(card);
    });
}
//recherche et filtre les produits affichés en fonction du texte saisi dans la barre de recherche
function filtrerProduits() {
    const texte = document.getElementById("recherche").value.toLowerCase();
    const cards = document.querySelectorAll(".produit-card");

    cards.forEach((card) => {
        const nom = card.querySelector("h3").textContent.toLowerCase();
        const categorie = card.querySelector("small") ? card.querySelector("small").textContent.toLowerCase() : "";
        if (nom.includes(texte) || categorie.includes(texte)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

// Ajoute un produit au panier
function ajouterAuPanier(produitId) {
    const produit = produitsDisponibles.find(p => p.id === produitId);
    const quantite = parseFloat(document.getElementById(`qte-${produitId}`).value);

    if (!quantite || quantite <= 0) {
        alert("Quantité invalide.");
        return;
    }

    if (quantite > produit.quantite_stock) {
        alert(`Stock insuffisant. Maximum disponible : ${produit.quantite_stock}`);
        return;
    }

    const ligneExistante = panier.find(l => l.produit_id === produitId);

    if (ligneExistante) {
        const nouvQte = ligneExistante.quantite + quantite;
        if (nouvQte > produit.quantite_stock) {
            alert(`Stock insuffisant. Vous avez déjà ${ligneExistante.quantite} dans votre panier.`);
            return;
        }
        ligneExistante.quantite = nouvQte;
        ligneExistante.sous_total = nouvQte * ligneExistante.prix_unitaire;
    } else {
        panier.push({
            produit_id: produit.id,
            nom: produit.nom,
            unite: produit.unite,
            prix_unitaire: produit.prix_unitaire,
            quantite: quantite,
            sous_total: quantite * produit.prix_unitaire,
        });
    }

    mettreAJourBoutonPanier();
    alert(`"${produit.nom}" ajouté au panier !`);
}

// Met à jour le bouton flottant
function mettreAJourBoutonPanier() {
    const nbArticles = panier.reduce((acc, l) => acc + l.quantite, 0);
    document.getElementById("nb-articles").textContent = nbArticles;
    document.getElementById("btn-panier").style.display = panier.length > 0 ? "block" : "none";
}

// Ouvre le modal panier
function ouvrirPanier() {
    afficherPanier();
    document.getElementById("modal-panier").classList.add("actif");
}

// Ferme le modal panier
function fermerPanier() {
    document.getElementById("modal-panier").classList.remove("actif");
}

// Affiche les lignes du panier dans le modal
function afficherPanier() {
    const tbody = document.getElementById("panier-lignes");
    tbody.innerHTML = "";

    let total = 0;

    panier.forEach((ligne) => {
        total += ligne.sous_total;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${ligne.nom}</td>
            <td>${ligne.quantite} ${ligne.unite}</td>
            <td>${ligne.prix_unitaire} FCFA</td>
            <td>${ligne.sous_total} FCFA</td>
            <td><button class="danger" onclick="retirerDuPanier(${ligne.produit_id})">✕</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("panier-total").textContent = total + " FCFA";
}

// Retire un produit du panier
function retirerDuPanier(produitId) {
    panier = panier.filter(l => l.produit_id !== produitId);
    afficherPanier();
    mettreAJourBoutonPanier();
}

// Envoie la commande au serveur
async function validerCommande() {
    if (panier.length === 0) {
        alert("Votre panier est vide.");
        return;
    }

    const lignes = panier.map(l => ({
        produit_id: l.produit_id,
        quantite: l.quantite,
    }));

    const reponse = await fetch("/api/ventes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lignes, statut: "en_attente" }),
    });

    const resultat = await reponse.json();

    if (!reponse.ok) {
        alert("Erreur : " + resultat.erreur);
        return;
    }

    // Affiche la confirmation avec le numéro de commande
document.getElementById("numero-commande").textContent = resultat.vente_id;
document.getElementById("vue-panier").style.display = "none";
document.getElementById("vue-confirmation").style.display = "block";
panier = [];
mettreAJourBoutonPanier();
}

// Réinitialise pour une nouvelle commande
function nouvelleCommande() {
    document.getElementById("vue-panier").style.display = "block";
    document.getElementById("vue-confirmation").style.display = "none";
    fermerPanier();
    chargerCatalogue();
}

// Au chargement
chargerCatalogue();