import { NextResponse } from "next/server";
import { getSearchSettings, updateSearchSettings } from "@/lib/config";

export async function GET() {
  const settings = await getSearchSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const partial: {
    searchAreas?: string[];
    categories?: string[];
    targetLeadCount?: number;
  } = {};

  if (Array.isArray(body.searchAreas)) {
    partial.searchAreas = body.searchAreas.filter((s: unknown) => typeof s === "string" && s.trim());
  }
  if (Array.isArray(body.categories)) {
    partial.categories = body.categories.filter((s: unknown) => typeof s === "string" && s.trim());
  }
  if (typeof body.targetLeadCount === "number" && body.targetLeadCount > 0) {
    partial.targetLeadCount = Math.floor(body.targetLeadCount);
  }

  await updateSearchSettings(partial);
  const settings = await getSearchSettings();
  return NextResponse.json(settings);
}
