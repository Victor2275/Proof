/*
 * The seven-segment cell, as geometry.
 *
 * Two surfaces draw these digits and they cannot draw them differently. The app
 * fills them through the theme's tokens; the Instagram export fills them with
 * literal hex, because an exported card is rasterised by html2canvas outside the
 * document's cascade — a class-driven fill would serialise into the canvas with
 * no rule behind it and come out black. Keeping the tables here means the two
 * fill strategies can never drift into two different-looking displays.
 */

/** Which of the seven segments are lit for each character. */
export const SEGMENT_GLYPHS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcfgd',
  '-': 'g',
  ' ': '',
};

/** Segment polygons on a 0 0 60 100 grid, bevelled like a moulded cell. */
export const SEGMENT_SHAPES: Record<string, string> = {
  a: '10,4 50,4 44,12 16,12',
  b: '52,6 56,14 52,44 46,40 46,14',
  c: '52,56 56,86 52,94 46,86 46,60',
  d: '16,88 44,88 50,96 10,96',
  e: '8,56 14,60 14,86 8,94 4,86',
  f: '8,6 14,14 14,40 8,44 4,14',
  g: '16,46 44,46 50,50 44,54 16,54',
};
