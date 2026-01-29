import { NextRequest, NextResponse } from 'next/server';
import { globalSmartSearch } from '@/lib/search-service';

/**
 * GET /api/search - Global search endpoint
 *
 * Uses pg_trgm fuzzy search via globalSmartSearch service.
 *
 * @query q - Search query (min 2 characters)
 * @returns Array of search results
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        const rawResults = await globalSmartSearch(query);

        // Normalize for frontend consumption (lowercase types)
        const results = rawResults.map(r => ({
            ...r,
            type: r.type.toLowerCase(),
        }));

        return NextResponse.json({ results });

    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}