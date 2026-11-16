/**
 * Monta o padrão de busca parcial para ILIKE ("contém", sem diferenciar
 * maiúsculas). % e _ são curingas no LIKE: escapamos para que um nome com
 * "_" seja procurado literalmente. O valor segue como PARÂMETRO da consulta,
 * nunca colado no SQL (RNF02).
 */
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
