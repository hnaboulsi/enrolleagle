import * as cheerio from 'cheerio';
import { normalizeText } from '@/src/providers/utils';

export function htmlToLines(html: string) {
  const $ = cheerio.load(html);
  $('br').replaceWith('\n');
  $('p, h1, h2, h3, h4, h5, h6, li, tr, div, span').each((_, el) => {
    const text = $(el).text();
    if (text && !text.endsWith('\n')) {
      $(el).append('\n');
    }
  });
  return $('body').text().replace(/\r/g, '').split('\n').map((line) => normalizeText(line));
}
