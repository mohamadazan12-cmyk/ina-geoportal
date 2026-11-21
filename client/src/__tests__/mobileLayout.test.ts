import { describe, it, expect } from 'vitest';
import { FigmaTopBar } from '../components/figma/FigmaTopBar';

describe('Mobile Layout & FigmaTopBar Validation', () => {
  it('FigmaTopBar returns null so no black pill / dynamic island is rendered on mobile', () => {
    const result = FigmaTopBar({});
    expect(result).toBeNull();
  });
});
