// N'autorise que http(s) pour les URLs fournies par les utilisateurs (réseaux
// sociaux, liens personnalisés, site web) et rendues telles quelles en href
// sur des pages publiques (fiches studio/artiste). Un schéma comme
// javascript: y exécuterait du code arbitraire chez tout visiteur cliquant
// le lien.
export function isSafeHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
