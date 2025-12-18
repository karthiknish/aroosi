import { NextRequest } from 'next/server';
import { withFirebaseAuth } from '@/lib/auth/firebaseAuth';
import { searchUsers } from '@/lib/userProfile/search';

export async function GET(request: NextRequest) {
  return withFirebaseAuth(async (_user, req, _ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const filters: any = {};
      const mapInt = (k: string) => { const v = searchParams.get(k); return v ? parseInt(v, 10) : undefined; };
      const mapFloat = (k: string) => { const v = searchParams.get(k); return v ? parseFloat(v) : undefined; };
      const boolTrue = (k: string) => searchParams.get(k) === 'true';

      if (searchParams.get('gender')) filters.gender = searchParams.get('gender');
      const minAge = mapInt('minAge'); if (minAge) filters.minAge = minAge;
      const maxAge = mapInt('maxAge'); if (maxAge) filters.maxAge = maxAge;
      if (searchParams.get('city')) filters.city = searchParams.get('city');
      if (searchParams.get('country')) filters.country = searchParams.get('country');
      if (searchParams.get('religion')) filters.religion = searchParams.get('religion');
      if (searchParams.get('caste')) filters.caste = searchParams.get('caste');
      if (searchParams.get('education')) filters.education = searchParams.get('education');
      if (searchParams.get('occupation')) filters.occupation = searchParams.get('occupation');
      const minIncome = mapFloat('minIncome'); if (minIncome !== undefined) filters.minIncome = minIncome;
      const maxIncome = mapFloat('maxIncome'); if (maxIncome !== undefined) filters.maxIncome = maxIncome;
      if (boolTrue('hasPhoto')) filters.hasPhoto = true;
      if (boolTrue('isPremium')) filters.isPremium = true;
      const limit = mapInt('limit'); if (limit) filters.limit = limit;
      if (searchParams.get('cursor')) filters.cursor = searchParams.get('cursor') || undefined;

      const { users, nextCursor } = await searchUsers(filters);
      return new Response(JSON.stringify({ success: true, data: users, count: users.length, nextCursor }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      console.error('Error searching users:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to search users' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  })(request, {});
}
