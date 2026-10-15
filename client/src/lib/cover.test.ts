import { describe, expect, it } from 'vitest';
import { TONES, streetName, toneFor } from './cover';

describe('streetName', () => {
  it('drops the house number', () => {
    expect(streetName('45 Sterling St')).toBe('Sterling St');
    expect(streetName('1280 Main St W')).toBe('Main St W');
    expect(streetName('45A Sterling St')).toBe('Sterling St');
    expect(streetName('12-14 Haddon Ave S')).toBe('Haddon Ave S');
  });

  it('drops a unit written before the street', () => {
    expect(streetName('Unit 2, 45 Sterling St')).toBe('Sterling St');
    expect(streetName('Apt 3B, 100 Forsyth Ave S')).toBe('Forsyth Ave S');
  });

  it('keeps an address with no number as it is', () => {
    expect(streetName('Westdale Village')).toBe('Westdale Village');
  });
});

describe('toneFor', () => {
  it('is stable for a listing', () => {
    const id = '3087522c-db52-4c74-bf0a-2636fe474f5c';
    expect(toneFor(id)).toBe(toneFor(id));
  });

  it('spreads listings across all five tones', () => {
    const used = new Set(Array.from({ length: 200 }, (_, i) => toneFor(`listing-${i}`)));
    expect(used).toEqual(new Set(TONES));
  });
});
