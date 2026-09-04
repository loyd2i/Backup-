// Gabarit HTML partagé pour les documents imprimables (facture, reçu).
// Génération 100% JS : la page s'imprime automatiquement (window.print()),
// l'utilisateur choisit "Enregistrer en PDF" dans la boîte de dialogue d'impression.

export function renderDocumentHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
    background: #f5f5f5;
    margin: 0;
    padding: 40px 20px;
  }
  .doc {
    max-width: 700px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    padding: 48px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #6366f1;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  .brand { font-size: 24px; font-weight: 800; color: #6366f1; }
  .brand-tagline { font-size: 12px; color: #888; margin-top: 4px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 20px; margin: 0; }
  .doc-title p { font-size: 13px; color: #888; margin: 4px 0 0; }
  .section { margin-bottom: 28px; }
  .section h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    margin: 0 0 8px;
  }
  .parties { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 32px; }
  .party { flex: 1; }
  .party p { margin: 2px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { text-align: left; padding: 10px 4px; font-size: 14px; }
  thead th { border-bottom: 1px solid #e0e0e0; color: #888; font-weight: 600; font-size: 12px; text-transform: uppercase; }
  tbody td { border-bottom: 1px solid #f0f0f0; }
  .totals { margin-left: auto; width: 280px; margin-top: 16px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .totals-row.total { border-top: 1px solid #1a1a1a; margin-top: 8px; padding-top: 12px; font-size: 17px; font-weight: 700; }
  .totals-row.commission { color: #f59e0b; }
  .totals-row.net { color: #22c55e; font-weight: 700; font-size: 16px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center; color: #aaa; font-size: 12px; }
  .print-hint { text-align: center; color: #aaa; font-size: 12px; margin-top: 16px; }
  @media print {
    body { background: #fff; padding: 0; }
    .doc { box-shadow: none; border-radius: 0; padding: 0; }
    .print-hint { display: none; }
  }
</style>
</head>
<body>
  <div class="doc">
    ${bodyHtml}
  </div>
  <p class="print-hint">Cette page s'imprime automatiquement — utilisez "Enregistrer en PDF" dans la boîte de dialogue d'impression.</p>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
