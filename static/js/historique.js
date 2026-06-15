async function chargerHistorique() {
    const reponse = await fetch("/api/ventes");
    const ventes = await reponse.json();

    const tbody = document.getElementById("tableau-historique");
    tbody.innerHTML = "";

    if (ventes.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4'>Aucune vente enregistrée.</td></tr>";
        return;
    }

    ventes.forEach((vente) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${vente.id}</td>
            <td>${vente.date_vente}</td>
            <td>${vente.total} FCFA</td>
            <td><a class="btn" href="/api/ventes/${vente.id}/pdf" target="_blank">Télécharger PDF</a></td>
        `;
        tbody.appendChild(tr);
    });
}

chargerHistorique();