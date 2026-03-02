import { NextResponse } from 'next/server';
import { rewriteArticleContent } from '@/utils/botLogic';

export async function POST(req) {
  try {
    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

    const result = await rewriteArticleContent(content);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Rewrite error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
