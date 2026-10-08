import { prisma } from '../src/config/prisma.js';
import fs from 'fs';
import path from 'path';

const SUPABASE_PROJECT_REF = 'xjdoamerrmoubwmyzrvh';
const BUCKET_NAME = 'food-catalog';
const BASE_STORAGE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${BUCKET_NAME}`;

const ALIASES: Record<string, string> = {
  'ayam_opor': 'opor_ayam',
  'gado-gado': 'gado_gado',
  'krupuk': 'kerupuk',
  'martabak_asin': 'martabak_telur',
  'spahgetti': 'spaghetti',
  'tahu_goreng': 'tahu',
  'tempe_goreng': 'tempe',
};

export async function updateFoodCatalogImages() {
  const imagesDir = path.resolve(process.cwd(), '../nu-track images');
  if (!fs.existsSync(imagesDir)) {
    throw new Error(`Directory not found: ${imagesDir}`);
  }

  const files = fs.readdirSync(imagesDir).filter((f) => f.endsWith('.png'));
  console.log(`Found ${files.length} image files in ${imagesDir}`);

  const catalogs = await prisma.foodCatalog.findMany({
    select: { id: true, name: true, defaultImageUrl: true },
  });

  let updatedCount = 0;

  for (const file of files) {
    const rawName = file.replace('.png', '').toLowerCase().trim();
    const targetName = ALIASES[rawName] || rawName;

    const cat = catalogs.find(
      (c) =>
        c.name.toLowerCase().trim() === targetName ||
        c.name.toLowerCase().replace(/_/g, ' ').trim() === targetName.replace(/_/g, ' ')
    );

    if (cat) {
      const imageUrl = `${BASE_STORAGE_URL}/${encodeURIComponent(file)}`;
      await prisma.foodCatalog.update({
        where: { id: cat.id },
        data: { defaultImageUrl: imageUrl },
      });
      console.log(`[UPDATED] ${cat.name} -> ${imageUrl}`);
      updatedCount++;
    } else {
      console.warn(`[SKIPPED] No catalog match for: ${file}`);
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} food catalog items with Supabase Storage URLs!`);
}

if (process.argv[1]?.endsWith('update_food_catalog_images.ts')) {
  updateFoodCatalogImages()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
