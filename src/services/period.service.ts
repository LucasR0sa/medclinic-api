/**
 * Um período meio-aberto [start, end): o instante final NÃO pertence a ele.
 * Os números podem ser minutos do dia (turnos) ou milissegundos (consultas).
 */
export interface Period {
  start: number;
  end: number;
}

/**
 * RN05 e RN08: dois períodos se sobrepõem quando um começa antes de o outro
 * terminar. A comparação é ESTRITA, então períodos encostados (10:00-10:30 e
 * 10:30-11:00) não conflitam. Repare que não basta comparar o início: 10:00-10:30
 * e 10:20-10:50 começam em horários diferentes e mesmo assim conflitam.
 */
export function periodsOverlap(a: Period, b: Period): boolean {
  return a.start < b.end && b.start < a.end;
}
