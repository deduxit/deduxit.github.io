// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A finite structure for a first-order sequent, as deduxit writes it (`ordinary::Structure`) and
 * as the countermodel view changes it: a domain `0 … size−1`, an element for every constant, a
 * table for every function symbol, and the tuples each predicate holds of. deduxit's
 * `ordinary_structure` is the only judge of what it makes of the sequent; this module only
 * edits it and reads the sequent's symbols off its JSON.
 */

/** A structure in deduxit's JSON form. A predicate left out holds of nothing. */
export interface Structure {
  readonly size: number;
  readonly constants: readonly (readonly [string, number])[];
  /** Each function's values, its argument tuples in lexicographic order. */
  readonly functions?: readonly (readonly [string, readonly number[]])[];
  readonly predicates: readonly (readonly [string, readonly (readonly number[])[]])[];
}

/** A symbol of the sequent with its arity. */
export interface NamedSymbol {
  readonly name: string;
  readonly arity: number;
}

/** What a structure must interpret: the predicates, and the function symbols (constants at 0). */
export interface Signature {
  readonly predicates: readonly NamedSymbol[];
  readonly functions: readonly NamedSymbol[];
}

/** What deduxit's check answers: the verdict, its reason, and each formula's value. */
export interface Evaluated {
  readonly refutes: boolean;
  readonly reason?: string;
  readonly left: readonly { readonly formula: string; readonly true: boolean }[];
  readonly right: readonly { readonly formula: string; readonly true: boolean }[];
}

/** The most elements the view offers: a table grows with the size to the arity. */
export const MOST_ELEMENTS = 8;

/** The most rows the view draws for one symbol; past it the symbol is said, not drawn. */
export const MOST_ROWS = 64;

/** Equality, which every structure reads as identity and none lists. */
const EQUALS = "=";

/** Whether an ordinary sequent's JSON is first-order: it has symbols, or binders. */
export const isFirstOrder = (sequent: unknown): boolean => {
  const doc = sequent as {
    readonly symbols?: readonly unknown[];
    readonly binders?: readonly unknown[];
  };
  return (doc.symbols?.length ?? 0) > 0 || (doc.binders?.length ?? 0) > 0;
};

/**
 * The symbols an ordinary sequent's JSON names: a predicate is a symbol an atom applies (or a
 * nullary atom written by name), every other symbol a function, a constant at arity 0.
 */
export function signatureOf(sequent: unknown): Signature {
  const doc = sequent as {
    readonly symbols?: readonly (readonly [string, number])[];
    readonly atoms?: readonly unknown[];
  };
  const symbols = doc.symbols ?? [];
  const predicates = new Map<string, number>();
  for (const atom of doc.atoms ?? []) {
    if (typeof atom === "string") predicates.set(atom, 0);
    else {
      const p = (atom as { P?: readonly [number, readonly number[]] }).P;
      const symbol = p ? symbols[p[0]] : undefined;
      if (symbol) predicates.set(symbol[0], symbol[1]);
    }
  }
  predicates.delete(EQUALS);
  const functions = symbols
    .filter(([name]) => !predicates.has(name) && name !== EQUALS)
    .map(([name, arity]) => ({ name, arity }));
  return {
    predicates: [...predicates].map(([name, arity]) => ({ name, arity })),
    functions,
  };
}

/** Every tuple of `arity` elements of a domain of `size`, in lexicographic order. */
export function tuples(size: number, arity: number): number[][] {
  let all: number[][] = [[]];
  for (let k = 0; k < arity; k += 1)
    all = all.flatMap((t) => Array.from({ length: size }, (_, e) => [...t, e]));
  return all;
}

/** A tuple's place in its table: `Σ dᵢ·size^(k−1−i)`, as deduxit indexes a function's table. */
const placeOf = (tuple: readonly number[], size: number) =>
  tuple.reduce((at, d) => at * size + d, 0);

/** The structure of one element where nothing holds: every constant and value the element 0. */
export function blank(signature: Signature): Structure {
  return complete({ size: 1, constants: [], predicates: [] }, signature);
}

/**
 * The structure with every symbol of the signature in it: a constant or a table it lacks gets
 * the element 0, a predicate it leaves out holds of nothing (written so, to be edited).
 */
export function complete(structure: Structure, signature: Signature): Structure {
  const { size } = structure;
  const constants = new Map(structure.constants);
  const functions = new Map(structure.functions ?? []);
  const predicates = new Map(structure.predicates);
  for (const f of signature.functions) {
    if (f.arity === 0) {
      if (!constants.has(f.name)) constants.set(f.name, 0);
    } else if (functions.get(f.name)?.length !== size ** f.arity)
      functions.set(f.name, Array<number>(size ** f.arity).fill(0));
  }
  for (const p of signature.predicates) if (!predicates.has(p.name)) predicates.set(p.name, []);
  return {
    size,
    constants: [...constants],
    ...(functions.size ? { functions: [...functions] } : {}),
    predicates: [...predicates],
  };
}

/** Whether a predicate holds of a tuple. */
export const holds = (structure: Structure, name: string, tuple: readonly number[]) =>
  (structure.predicates.find(([p]) => p === name)?.[1] ?? []).some(
    (t) => t.length === tuple.length && t.every((d, i) => d === tuple[i]),
  );

/** The structure with the predicate flipped at the tuple. */
export function flip(structure: Structure, name: string, tuple: readonly number[]): Structure {
  const on = holds(structure, name, tuple);
  const same = (t: readonly number[]) =>
    t.length === tuple.length && t.every((d, i) => d === tuple[i]);
  const predicates = structure.predicates.some(([p]) => p === name)
    ? structure.predicates
    : [...structure.predicates, [name, []] as const];
  return {
    ...structure,
    predicates: predicates.map(([p, ts]) =>
      p !== name ? [p, ts] : [p, on ? ts.filter((t) => !same(t)) : [...ts, [...tuple]]],
    ),
  };
}

/** The element a function symbol gives the arguments (a constant: none). */
export function elementOf(structure: Structure, name: string, args: readonly number[]): number {
  if (args.length === 0) return structure.constants.find(([c]) => c === name)?.[1] ?? 0;
  const table = structure.functions?.find(([f]) => f === name)?.[1] ?? [];
  return table[placeOf(args, structure.size)] ?? 0;
}

/** The structure with the function symbol giving `value` to the arguments. */
export function setValue(
  structure: Structure,
  name: string,
  args: readonly number[],
  value: number,
): Structure {
  if (args.length === 0)
    return {
      ...structure,
      constants: structure.constants.map(([c, e]) => [c, c === name ? value : e]),
    };
  const at = placeOf(args, structure.size);
  return {
    ...structure,
    functions: (structure.functions ?? []).map(([f, table]) => [
      f,
      f === name ? table.map((v, i) => (i === at ? value : v)) : table,
    ]),
  };
}

/** The structure with a new element, the last: every new value of a table the element 0. */
export function addElement(structure: Structure, signature: Signature): Structure {
  const size = structure.size + 1;
  return {
    ...structure,
    size,
    functions: (structure.functions ?? []).map(([f, table]) => {
      const arity = arityIn(signature, f);
      return [
        f,
        tuples(size, arity).map((t) =>
          t.every((d) => d < structure.size) ? (table[placeOf(t, structure.size)] ?? 0) : 0,
        ),
      ];
    }),
  };
}

/**
 * The structure without element `k`: the later elements move down by one, a tuple holding `k`
 * goes, and a constant or a value that was `k` becomes the element 0.
 */
export function removeElement(structure: Structure, k: number, signature: Signature): Structure {
  const size = structure.size - 1;
  const down = (e: number) => (e === k ? 0 : e > k ? e - 1 : e);
  const up = (e: number) => (e >= k ? e + 1 : e);
  return {
    size,
    constants: structure.constants.map(([c, e]) => [c, down(e)]),
    ...(structure.functions?.length
      ? {
          functions: structure.functions.map(([f, table]) => {
            const arity = arityIn(signature, f);
            return [
              f,
              tuples(size, arity).map((t) => down(table[placeOf(t.map(up), structure.size)] ?? 0)),
            ];
          }),
        }
      : {}),
    predicates: structure.predicates.map(([p, ts]) => [
      p,
      ts.filter((t) => !t.includes(k)).map((t) => t.map(down)),
    ]),
  };
}

/** A function symbol's arity in the signature (a table's length cannot say it in a domain of one). */
const arityIn = (signature: Signature, name: string) =>
  signature.functions.find((f) => f.name === name)?.arity ?? 0;

/** The structure as deduxit reads it: `functions` left out where there is none. */
export function structureJson(structure: Structure): string {
  const { functions, ...rest } = structure;
  return JSON.stringify(functions?.length ? { ...rest, functions } : rest);
}

/** A tuple written as its arguments: `p(0, 1)`, `q` for none. */
export const applied = (name: string, tuple: readonly number[]) =>
  tuple.length ? `${name}(${tuple.join(", ")})` : name;

/** What identifies a session's sequent while its arena grows: the root's sides and the arena so far. */
export interface Root {
  readonly left: readonly number[];
  readonly right: readonly number[];
  readonly formulas: readonly unknown[];
  readonly atoms: readonly unknown[];
  readonly symbols: readonly unknown[];
}

/** A session document's arena and root, as an ordinary session writes them. */
interface Rooted {
  readonly sequent: {
    readonly formulas?: readonly unknown[];
    readonly atoms?: readonly unknown[];
    readonly symbols?: readonly unknown[];
  };
  readonly inferences: readonly {
    readonly left: readonly number[];
    readonly right: readonly number[];
  }[];
}

/** The root of an ordinary session: its sides, and the formulas, atoms and symbols up to now. */
export function rootOf(session: Rooted): Root {
  const root = session.inferences[0] ?? { left: [], right: [] };
  return {
    left: root.left,
    right: root.right,
    formulas: session.sequent.formulas ?? [],
    atoms: session.sequent.atoms ?? [],
    symbols: session.sequent.symbols ?? [],
  };
}

/**
 * Whether a session still proves the sequent a root was taken of: a session's arena only grows
 * by appending (instances of the proof's steps), so the same sequent keeps the root's sides and
 * every formula, atom and symbol the root had, in place.
 */
export function sameRoot(root: Root, session: Rooted): boolean {
  const now = rootOf(session);
  const prefix = (a: readonly unknown[], b: readonly unknown[]) =>
    JSON.stringify(b.slice(0, a.length)) === JSON.stringify(a);
  return (
    JSON.stringify([root.left, root.right]) === JSON.stringify([now.left, now.right]) &&
    prefix(root.formulas, now.formulas) &&
    prefix(root.atoms, now.atoms) &&
    prefix(root.symbols, now.symbols)
  );
}
