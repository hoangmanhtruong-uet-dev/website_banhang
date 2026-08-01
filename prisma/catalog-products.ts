export type CatalogProduct = {
  code: string; slug: string; name: string; price: number; originalPrice: number | null;
  currency: 'VND'; description: string; category: string; rating: number; reviews: number;
  badge: string | null; emoji: string; gradient: string; image: string;
  stockQuantity: number; inStock: boolean;
};
type Variant = [string, number, number | null, number, string | null, number, number];
type Line = { category: string; image: string; description: string; variants: Variant[] };

const styles: Record<string, { emoji: string; gradient: string }> = {
  'Th\u1eddi trang': { emoji: '\ud83d\udc55', gradient: 'linear-gradient(135deg,#172033,#9a5a2b)' },
  'C\u00f4ng ngh\u1ec7': { emoji: '\ud83d\udcbb', gradient: 'linear-gradient(135deg,#0f172a,#1d4ed8)' },
  'L\u00e0m \u0111\u1eb9p': { emoji: '\u2728', gradient: 'linear-gradient(135deg,#3f0d16,#d97706)' },
  'Gia d\u1ee5ng': { emoji: '\ud83c\udfe0', gradient: 'linear-gradient(135deg,#292524,#b7793f)' },
};

const lines: Line[] = [
  { category: 'Th\u1eddi trang', image: '/images/products/denim-jacket.webp',
    description: '\u00c1o kho\u00e1c denim cao c\u1ea5p, form regular fit, \u0111\u01b0\u1eddng may ch\u1eafc ch\u1eafn v\u00e0 d\u1ec5 ph\u1ed1i \u0111\u1ed3.',
    variants: [
      ['\u00c1o Kho\u00e1c Denim Premium Indigo',1290000,1690000,42,'B\u00e1n ch\u1ea1y',5,184],
      ['\u00c1o Kho\u00e1c Denim Premium Wash Blue',1350000,1750000,31,'Hot',4.8,96],
      ['\u00c1o Kho\u00e1c Denim Premium Black',1390000,null,27,'M\u1edbi',4.7,58],
    ] },
  { category: 'Th\u1eddi trang', image: '/images/products/urban-sneakers.webp',
    description: 'Sneaker unisex \u0111\u1ebf nh\u1eb9, upper tho\u00e1ng kh\u00ed, l\u1edbp \u0111\u1ec7m \u00eam cho nhu c\u1ea7u h\u1eb1ng ng\u00e0y.',
    variants: [
      ['Gi\u00e0y Sneaker Urban White',1590000,1990000,55,'Sale',4.9,212],
      ['Gi\u00e0y Sneaker Urban Charcoal',1650000,null,38,'Hot',4.7,143],
      ['Gi\u00e0y Sneaker Urban Sand',1650000,null,24,'M\u1edbi',4.6,67],
    ] },
  { category: 'Th\u1eddi trang', image: '/images/products/travel-backpack.webp',
    description: 'Balo ch\u1ed1ng n\u01b0\u1edbc, ng\u0103n laptop ri\u00eang, kh\u00f3a k\u00e9o b\u1ec1n v\u00e0 quai \u0111eo tr\u1ee3 l\u1ef1c.',
    variants: [
      ['Balo Du L\u1ecbch Urban 28L',690000,null,64,'M\u1edbi',4.6,88],
      ['Balo Du L\u1ecbch Urban 35L',790000,990000,46,'Sale',4.8,126],
      ['Balo Du L\u1ecbch Urban 40L',890000,1190000,33,'B\u00e1n ch\u1ea1y',4.9,171],
    ] },
  { category: 'C\u00f4ng ngh\u1ec7', image: '/images/products/wireless-headphones.webp',
    description: 'Tai nghe kh\u00f4ng d\u00e2y, \u0111\u1ec7m memory foam, \u00e2m thanh c\u00e2n b\u1eb1ng v\u00e0 pin d\u00e0i.',
    variants: [
      ['Tai Nghe Bluetooth Air Lite',1290000,null,72,'M\u1edbi',4.6,91],
      ['Tai Nghe Bluetooth Air Pro ANC',2490000,2990000,48,'Hot',5,286],
      ['Tai Nghe Bluetooth Air Max',3290000,3790000,26,'Premium',4.9,154],
    ] },
  { category: 'C\u00f4ng ngh\u1ec7', image: '/images/products/gaming-laptop.webp',
    description: 'Laptop hi\u1ec7u n\u0103ng cao, m\u00e0n h\u00ecnh t\u1ea7n s\u1ed1 qu\u00e9t cao, SSD NVMe v\u00e0 t\u1ea3n nhi\u1ec7t k\u00e9p.',
    variants: [
      ['Laptop Gaming G15 RTX 4050',21990000,23990000,18,'Sale',4.8,74],
      ['Laptop Gaming G15 RTX 4060',25990000,28990000,14,'B\u00e1n ch\u1ea1y',5,138],
      ['Laptop Gaming G16 RTX 4070',35990000,null,8,'Premium',4.9,52],
    ] },
  { category: 'C\u00f4ng ngh\u1ec7', image: '/images/products/smart-watch.webp',
    description: '\u0110\u1ed3ng h\u1ed3 AMOLED, theo d\u00f5i v\u1eadn \u0111\u1ed9ng, nh\u1ecbp tim, SpO2 v\u00e0 ch\u1ed1ng n\u01b0\u1edbc.',
    variants: [
      ['\u0110\u1ed3ng H\u1ed3 Th\u00f4ng Minh Active 41mm',2490000,null,61,'M\u1edbi',4.7,105],
      ['\u0110\u1ed3ng H\u1ed3 Th\u00f4ng Minh Active 45mm',2990000,3490000,49,'Hot',4.9,192],
      ['\u0110\u1ed3ng H\u1ed3 Th\u00f4ng Minh Active Titan',4290000,null,21,'Premium',4.8,63],
    ] },
  { category: 'L\u00e0m \u0111\u1eb9p', image: '/images/products/vitamin-c-serum.webp',
    description: 'Serum vitamin C v\u00e0 hyaluronic acid, h\u1ed7 tr\u1ee3 l\u00e0m s\u00e1ng v\u00e0 duy tr\u00ec \u0111\u1ed9 \u1ea9m.',
    variants: [
      ['Serum Vitamin C 15% D\u1ecbu Nh\u1eb9',390000,null,85,'M\u1edbi',4.6,117],
      ['Serum Vitamin C 20% Chuy\u00ean S\u00e2u',490000,650000,68,'B\u00e1n ch\u1ea1y',5,264],
      ['Serum Vitamin C 30% Intensive',590000,null,34,'Premium',4.8,82],
    ] },
  { category: 'L\u00e0m \u0111\u1eb9p', image: '/images/products/unisex-perfume.webp',
    description: 'N\u01b0\u1edbc hoa unisex hi\u1ec7n \u0111\u1ea1i, m\u1edf \u0111\u1ea7u t\u01b0\u01a1i m\u00e1t v\u00e0 k\u1ebft th\u00fac b\u1eb1ng h\u01b0\u01a1ng g\u1ed7 \u1ea5m.',
    variants: [
      ['N\u01b0\u1edbc Hoa Unisex Amber 50ml',1190000,null,43,'M\u1edbi',4.7,79],
      ['N\u01b0\u1edbc Hoa Unisex Amber 75ml',1590000,1890000,36,'Hot',4.9,148],
      ['N\u01b0\u1edbc Hoa Unisex Amber 100ml',1990000,null,19,'Premium',4.8,65],
    ] },
  { category: 'L\u00e0m \u0111\u1eb9p', image: '/images/products/moisturizer-cream.webp',
    description: 'Kem d\u01b0\u1ee1ng \u1ea9m m\u1ecbn nh\u1eb9, h\u1ed7 tr\u1ee3 ph\u1ee5c h\u1ed3i h\u00e0ng r\u00e0o b\u1ea3o v\u1ec7 v\u00e0 l\u00e0m m\u1ec1m da.',
    variants: [
      ['Kem D\u01b0\u1ee1ng \u1ea8m Daily 30g',320000,null,92,'M\u1edbi',4.5,73],
      ['Kem D\u01b0\u1ee1ng \u1ea8m Daily 50g',450000,550000,76,'B\u00e1n ch\u1ea1y',4.9,221],
      ['Kem D\u01b0\u1ee1ng \u1ea8m Daily 80g',620000,null,41,'Premium',4.7,94],
    ] },
  { category: 'Gia d\u1ee5ng', image: '/images/products/smart-desk-lamp.webp',
    description: '\u0110\u00e8n b\u00e0n LED ch\u1ed1ng ch\u00f3i, \u0111i\u1ec1u ch\u1ec9nh \u0111\u1ed9 s\u00e1ng v\u00e0 nhi\u1ec7t m\u00e0u.',
    variants: [
      ['\u0110\u00e8n B\u00e0n LED Smart Mini',590000,null,71,'M\u1edbi',4.6,101],
      ['\u0110\u00e8n B\u00e0n LED Smart Pro',890000,1090000,53,'B\u00e1n ch\u1ea1y',4.9,176],
      ['\u0110\u00e8n B\u00e0n LED Smart Max',1190000,null,29,'Premium',4.8,69],
    ] },
  { category: 'Gia d\u1ee5ng', image: '/images/products/espresso-machine.webp',
    description: 'M\u00e1y pha espresso v\u1ecf inox, \u00e1p su\u1ea5t \u1ed5n \u0111\u1ecbnh v\u00e0 v\u00f2i \u0111\u00e1nh s\u1eefa.',
    variants: [
      ['M\u00e1y Pha C\u00e0 Ph\u00ea Espresso Mini',3990000,null,24,'M\u1edbi',4.6,54],
      ['M\u00e1y Pha C\u00e0 Ph\u00ea Espresso Pro',5890000,6890000,17,'Hot',5,119],
      ['M\u00e1y Pha C\u00e0 Ph\u00ea Espresso Barista',7990000,null,11,'Premium',4.9,77],
    ] },
  { category: 'Gia d\u1ee5ng', image: '/images/products/oak-work-desk.webp',
    description: 'B\u00e0n g\u1ed7 s\u1ed3i Scandinavian, ch\u00e2n th\u00e9p s\u01a1n t\u0129nh \u0111i\u1ec7n v\u00e0 ng\u0103n k\u00e9o ti\u1ec7n d\u1ee5ng.',
    variants: [
      ['B\u00e0n L\u00e0m Vi\u1ec7c G\u1ed7 S\u1ed3i 100cm',3290000,null,20,'M\u1edbi',4.6,48],
      ['B\u00e0n L\u00e0m Vi\u1ec7c G\u1ed7 S\u1ed3i 120cm',4590000,5190000,16,'B\u00e1n ch\u1ea1y',4.9,103],
      ['B\u00e0n L\u00e0m Vi\u1ec7c G\u1ed7 S\u1ed3i 140cm',5690000,null,9,'Premium',4.8,61],
    ] },
];

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const catalogProducts: CatalogProduct[] = lines.flatMap((line) => {
  const style = styles[line.category];
  return [line.variants[1]].map(([name, price, originalPrice, stock, badge, rating, reviews]) => ({
    code: '', slug: slugify(name), name, price, originalPrice, currency: 'VND' as const,
    description: line.description, category: line.category, rating, reviews, badge,
    emoji: style.emoji, gradient: style.gradient, image: line.image,
    stockQuantity: stock, inStock: stock > 0,
  }));
}).map((product, index) => ({ ...product, code: 'PR' + String(index + 1).padStart(3, '0') }));
