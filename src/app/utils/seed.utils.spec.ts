import { generateSeed } from './seed.utils';

describe('generateSeed', () => {
  it('should return a 55-character string', () => {
    const seed = generateSeed();
    expect(seed.length).toBe(55);
  });

  it('should only contain lowercase letters', () => {
    const seed = generateSeed();
    expect(seed).toMatch(/^[a-z]{55}$/);
  });

  it('should generate different seeds on successive calls', () => {
    const seeds = new Set(Array.from({ length: 50 }, () => generateSeed()));
    expect(seeds.size).toBe(50);
  });

  it('should use crypto.getRandomValues', () => {
    const spy = spyOn(crypto, 'getRandomValues').and.callThrough();
    generateSeed();
    expect(spy).toHaveBeenCalledWith(jasmine.any(Uint8Array));
    expect((spy.calls.first().args[0] as Uint8Array).length).toBe(55);
  });

  it('should use all letters of the alphabet', () => {
    // Generate enough seeds that every letter should appear at least once
    const combined = Array.from({ length: 100 }, () => generateSeed()).join('');
    const uniqueChars = new Set(combined.split(''));
    expect(uniqueChars.size).toBe(26);
  });
});
