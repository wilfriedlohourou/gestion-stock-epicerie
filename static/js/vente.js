// Le panier en mémoire : liste de { produit_id, nom, prix_unitaire, quantite, sous_total }
let panier = [];

// Liste des produits disponibles (chargée depuis l'API)
let produitsDisponibles = [];

// Charge la liste des produits dans le menu déroulant
async function chargerProduitsDisponibles() {
    const reponse = await fetch("/api/produits");
    produitsDisponibles = await reponse.json();

    const select = document.getElementById("select-produit");
    select.innerHTML = "";

    produitsDisponibles.forEach((produit) => {
        const option = document.createElement("option");
        option.value = produit.id;
        option.textContent = `${produit.nom} (${produit.prix_unitaire} FCFA) - Stock: ${produit.quantite_stock}`;
        select.appendChild(option);
    });
}

// Ajoute le produit sélectionné au panier
function ajouterAuPanier() {
    const produitId = parseInt(document.getElementById("select-produit").value);
    const quantite = parseFloat(document.getElementById("quantite-produit").value);

    if (!produitId || !quantite || quantite <= 0) {
        alert("Sélectionnez un produit et une quantité valide.");
        return;
    }

    const produit = produitsDisponibles.find((p) => p.id === produitId);

    if (!produit) {
        alert("Produit introuvable.");
        return;
    }

    // Vérifie si le produit est déjà dans le panier
    const ligneExistante = panier.find((l) => l.produit_id === produitId);

    const quantiteTotale = ligneExistante ? ligneExistante.quantite + quantite : quantite;

    if (quantiteTotale > produit.quantite_stock) {
        alert(`Stock insuffisant. Disponible : ${produit.quantite_stock}`);
        return;
    }

    if (ligneExistante) {
        ligneExistante.quantite = quantiteTotale;
        ligneExistante.sous_total = ligneExistante.quantite * ligneExistante.prix_unitaire;
    } else {
        panier.push({
            produit_id: produit.id,
            nom: produit.nom,
            prix_unitaire: produit.prix_unitaire,
            quantite: quantite,
            sous_total: quantite * produit.prix_unitaire,
        });
    }

    document.getElementById("quantite-produit").value = 1;
    afficherPanier();
}

// Retire une ligne du panier
function retirerDuPanier(produitId) {
    panier = panier.filter((l) => l.produit_id !== produitId);
    afficherPanier();
}

// Vide complètement le panier
function viderPanier() {
    panier = [];
    afficherPanier();
}

// Met à jour l'affichage du tableau panier + total
function afficherPanier() {
    const tbody = document.getElementById("tableau-panier");
    tbody.innerHTML = "";

    let total = 0;

    panier.forEach((ligne) => {
        total += ligne.sous_total;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${ligne.nom}</td>
            <td>${ligne.quantite}</td>
            <td>${ligne.prix_unitaire} FCFA</td>
            <td>${ligne.sous_total} FCFA</td>
            <td><button class="danger" onclick="retirerDuPanier(${ligne.produit_id})">Retirer</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("total-panier").textContent = total + " FCFA";
}

// Envoie la vente au serveur et affiche la facture
async function validerVente() {
    if (panier.length === 0) {
        alert("Le panier est vide.");
        return;
    }

    const lignes = panier.map((l) => ({
        produit_id: l.produit_id,
        quantite: l.quantite,
    }));

    const reponse = await fetch("/api/ventes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lignes }),
    });

    const resultat = await reponse.json();

    if (!reponse.ok) {
        alert("Erreur : " + resultat.erreur);
        return;
    }

    afficherFacture(resultat.vente_id);
}

// Affiche la facture après validation
async function afficherFacture(venteId) {
    const reponse = await fetch(`/api/ventes/${venteId}`);
    const vente = await reponse.json();

    document.getElementById("facture-id").textContent = vente.id;
    document.getElementById("facture-total").textContent = vente.total + " FCFA";
    document.getElementById("lien-pdf").href = `/api/ventes/${venteId}/pdf`;

    const tbody = document.getElementById("facture-lignes");
    tbody.innerHTML = "";

    vente.lignes.forEach((ligne) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${ligne.nom_produit}</td>
            <td>${ligne.quantite}</td>
            <td>${ligne.prix_unitaire} FCFA</td>
            <td>${ligne.sous_total} FCFA</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("facture").style.display = "block";
}

// Réinitialise pour une nouvelle vente
function nouvelleVente() {
    panier = [];
    afficherPanier();
    document.getElementById("facture").style.display = "none";
    chargerProduitsDisponibles(); // recharge les stocks à jour
}

// Au chargement de la page
chargerProduitsDisponibles();