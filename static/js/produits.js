// Charge et affiche la liste des produits
async function chargerProduits() {
    const reponse = await fetch("/api/produits");
    const produits = await reponse.json();

    const tbody = document.getElementById("tableau-produits");
    tbody.innerHTML = "";

    produits.forEach((produit) => {
        const stockBas = produit.quantite_stock <= produit.seuil_alerte;

        const ligne = document.createElement("tr");
        ligne.innerHTML = `
            <td>${produit.nom}</td>
            <td>${produit.categorie || "-"}</td>
            <td>${produit.unite}</td>
            <td>${produit.prix_unitaire} FCFA</td>
            <td class="${stockBas ? "stock-bas" : ""}">${produit.quantite_stock}</td>
            <td>
                <button class="secondary" onclick="modifierProduit(${produit.id})">Modifier</button>
                <button class="danger" onclick="supprimerProduit(${produit.id})">Supprimer</button>
            </td>
        `;
        tbody.appendChild(ligne);
    });
}

// Affiche le formulaire pour un nouveau produit
function ouvrirFormulaire() {
    document.getElementById("form-titre").textContent = "Nouveau produit";
    document.getElementById("produit-id").value = "";
    document.getElementById("nom").value = "";
    document.getElementById("categorie").value = "";
    document.getElementById("unite").value = "piece";
    document.getElementById("prix_unitaire").value = "";
    document.getElementById("quantite_stock").value = "";
    document.getElementById("seuil_alerte").value = "5";
    document.getElementById("form-produit").style.display = "block";
}

// Ferme le formulaire
function fermerFormulaire() {
    document.getElementById("form-produit").style.display = "none";
}


// Charge un produit existant dans le formulaire pour modification
async function modifierProduit(id) {
    const reponse = await fetch(`/api/produits/${id}`);
    const produit = await reponse.json();

    document.getElementById("form-titre").textContent = "Modifier le produit";
    document.getElementById("produit-id").value = produit.id;
    document.getElementById("nom").value = produit.nom;
    document.getElementById("categorie").value = produit.categorie || "";
    document.getElementById("unite").value = produit.unite;
    document.getElementById("prix_unitaire").value = produit.prix_unitaire;
    document.getElementById("quantite_stock").value = produit.quantite_stock;
    document.getElementById("seuil_alerte").value = produit.seuil_alerte;

   
    document.getElementById("form-produit").style.display = "block";
}

// Enregistre (création ou modification) un produit
async function enregistrerProduit() {
    const id = document.getElementById("produit-id").value;

    const donnees = {
        nom: document.getElementById("nom").value,
        categorie: document.getElementById("categorie").value,
        unite: document.getElementById("unite").value,
        prix_unitaire: parseFloat(document.getElementById("prix_unitaire").value),
        quantite_stock: parseFloat(document.getElementById("quantite_stock").value),
        seuil_alerte: parseFloat(document.getElementById("seuil_alerte").value),
    };

    if (!donnees.nom || isNaN(donnees.prix_unitaire)) {
        alert("Le nom et le prix unitaire sont obligatoires.");
        return;
    }

    let url = "/api/produits";
    let methode = "POST";

    if (id) {
        url = `/api/produits/${id}`;
        methode = "PUT";
    }

    const reponse = await fetch(url, {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees),
    });

    if (reponse.ok) {
        fermerFormulaire();
        chargerProduits();
    } else {
        const erreur = await reponse.json();
        alert("Erreur : " + erreur.erreur);
    }
}

// Supprime un produit
async function supprimerProduit(id) {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) {
        return;
    }

    const reponse = await fetch(`/api/produits/${id}`, { method: "DELETE" });

    if (reponse.ok) {
        chargerProduits();
    } else {
        alert("Erreur lors de la suppression.");
    }
}

// Au chargement de la page
chargerProduits();