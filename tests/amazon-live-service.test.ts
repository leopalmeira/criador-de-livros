import { afterEach, describe, it, expect, vi } from 'vitest';
import { AmazonLiveService } from '../src/services/amazon-live-service';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AmazonLiveService', () => {
  it('parses Amazon book suggestions from a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      suggestions: [
        { value: 'suspense books' },
        { value: 'psychological suspense' },
        { value: '' }
      ]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const suggestions = await AmazonLiveService.getLiveSuggestions('suspense');
    expect(suggestions).toEqual(['suspense books', 'psychological suspense']);
  });

  it('parses book data from Amazon search HTML', async () => {
    const html = `
      <div data-component-type="s-search-result" data-asin="B012345678">
        <h2><span>Coloring Book for Adults</span></h2>
        <img class="s-image" src="https://images-na.ssl-images-amazon.com/images/I/test-cover.jpg">
        <span class="a-price"><span class="a-offscreen">$12.99</span></span>
        <span class="a-icon-alt">4.7 out of 5 stars</span>
        <span class="a-size-base s-underline-text">1234</span>
        <div class="a-row a-size-base a-color-secondary"><div class="a-row">by Test Author</div></div>
        <span class="a-badge-text">Best Seller</span>
      </div>
    `;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })));

    const books = await AmazonLiveService.searchAmazonBooks('coloring book', 4);
    expect(books).toEqual([{
      asin: 'B012345678',
      title: 'Coloring Book for Adults',
      author: 'Test Author',
      priceUsd: 12.99,
      royaltyEstUsd: 9.09,
      rating: 4.7,
      reviewsCount: 1234,
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/test-cover.jpg',
      amazonUrl: 'https://www.amazon.com/dp/B012345678',
      badge: 'Best Seller'
    }]);
  });
});
