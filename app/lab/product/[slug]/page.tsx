import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LabProductPage } from "@/components/lab/LabPages";
import { LAB_PRODUCTS, labProduct } from "@/lib/lab/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return LAB_PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: labProduct(slug)?.name ?? "Product" };
}

export default async function LabProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!labProduct(slug)) notFound();
  return <LabProductPage slug={slug} />;
}
