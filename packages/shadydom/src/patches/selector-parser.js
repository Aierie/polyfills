/**
 * Arrays of compound selectors and combinators that form a complex selector
 * when interleaved.
 *
 * @typedef {{
 *   compoundSelectors: !Array<string>,
 *   combinators: !Array<string>,
 * }}
 */
export let ComplexSelectorParts;

/**
 * @type {!Map<string, {end: string, matchNestedParens: boolean}>}
 */
const PARENS = new Map([
  ['(', {end: ')', matchNestedParens: true}],
  ['[', {end: ']', matchNestedParens: true}],
  ['"', {end: '"', matchNestedParens: false}],
  ["'", {end: "'", matchNestedParens: false}],
]);

/**
 * @param {string} str
 * @param {number} start
 * @param {!Array<string>} queryChars
 * @param {boolean} matchNestedParens
 * @return {number}
 */
const findNext = (str, start, queryChars, matchNestedParens = true) => {
  for (let i = start; i < str.length; i++) {
    if (str[i] === '\\' && i < str.length - 1 && str[i + 1] !== '\n') {
      // Skip escaped character.
      i++;
    } else if (queryChars.indexOf(str[i]) !== -1) {
      return i;
    } else if (matchNestedParens && PARENS.has(str[i])) {
      const parenInfo = PARENS.get(str[i]);
      i = findNext(str, i + 1, [parenInfo.end], parenInfo.matchNestedParens);
      continue;
    }

    // Do nothing, let `i++` happen.
  }

  // Reached the end of the string without finding a final char.
  return str.length;
};

/**
 * @param {string} str
 * @return {!Array<!ComplexSelectorParts>}
 */
export const parseSelectorList = (str) => {
  /**
   * @type {!Array<!ComplexSelectorParts>}
   */
  const results = [];

  /**
   * @type {!Array<string>}
   */
  const chunks = [];

  const complexSelectorBoundary = () => {
    if (chunks.length > 0) {
      while (chunks[chunks.length - 1] === ' ') {
        chunks.pop();
      }
      results.push({
        compoundSelectors: chunks.filter((x, i) => i % 2 === 0),
        combinators: chunks.filter((x, i) => i % 2 === 1),
      });
      chunks.length = 0;
    }
  };

  for (let i = 0; i < str.length; ) {
    const prev = chunks[chunks.length - 1];
    const nextIndex = findNext(str, i, [',', ' ', '>', '+', '~']);
    const next = nextIndex === i ? str[i] : str.substring(i, nextIndex);

    if (next === ',') {
      complexSelectorBoundary();
    } else if (
      [undefined, ' ', '>', '+', '~'].indexOf(prev) !== -1 &&
      next === ' '
    ) {
      // Do nothing.
    } else if (prev === ' ' && ['>', '+', '~'].indexOf(next) !== -1) {
      chunks[chunks.length - 1] = next;
    } else {
      chunks.push(next);
    }

    i = nextIndex + (nextIndex === i ? 1 : 0);
  }

  complexSelectorBoundary();

  return results;
};
