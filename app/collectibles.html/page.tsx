import type { Metadata } from 'next';
import { PublicRoute } from '@/components/public-route';
import { pageMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> { return pageMetadata('collectibles'); }
export default function CollectiblesPage() { return <PublicRoute slug="collectibles" />; }
