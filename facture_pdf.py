from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet


def generer_facture_pdf(vente):
    """
    Génère un PDF de facture à partir d'une vente (dict avec id, date_vente, total, lignes).
    Retourne un buffer BytesIO contenant le PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    elements = []

    # En-tête
    elements.append(Paragraph("Épicerie - Facture", styles["Title"]))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"Facture N° {vente['id']}", styles["Normal"]))
    elements.append(Paragraph(f"Date : {vente['date_vente']}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    # Tableau des lignes
    data = [["Produit", "Quantité", "Prix unitaire (FCFA)", "Sous-total (FCFA)"]]

    for ligne in vente["lignes"]:
        data.append([
            ligne["nom_produit"],
            str(ligne["quantite"]),
            f"{ligne['prix_unitaire']:.0f}",
            f"{ligne['sous_total']:.0f}",
        ])

    data.append(["", "", "Total", f"{vente['total']:.0f} FCFA"])

    table = Table(data, colWidths=[7*cm, 3*cm, 4*cm, 4*cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.black),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -2), 0.5, colors.grey),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
    ]))

    elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    return buffer