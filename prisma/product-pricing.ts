const PRICE_RULES: Array<[string, number]> = [
  ['dien thoai xiaomi', 18_990_000],
  ['may tinh bang ipad', 24_990_000],
  ['camera sony', 32_990_000],
  ['man hinh cong', 6_990_000],
  ['ghe gaming', 4_990_000],
  ['ban phim co', 1_690_000],
  ['chuot gaming', 990_000],
  ['loa bluetooth', 1_990_000],
  ['pin du phong', 890_000],
  ['de tan nhiet', 690_000],
  ['sac nhanh', 490_000],
  ['cap lightning', 350_000],
  ['op lung', 250_000],
  ['bao da', 450_000],
  ['quan jeans', 690_000],
  ['ao so mi', 490_000],
  ['vay xoe', 650_000],
  ['chan vay', 550_000],
  ['quan short', 390_000],
  ['ao polo', 450_000],
  ['ao sweater', 590_000],
  ['ao cardigan', 650_000],
  ['ao croptop', 290_000],
  ['quan jogger', 490_000],
  ['mu the thao', 390_000],
  ['dep quai ngang', 350_000],
  ['tat socks', 120_000],
  ['khan an', 190_000],
  ['that lung', 590_000],
  ['tui xach', 890_000],
  ['vi da', 550_000],
  ['day chuyen bac', 790_000],
  ['vong tay', 490_000],
  ['nhan bac', 650_000],
  ['kem chong nang', 350_000],
  ['mat na giay', 150_000],
  ['toner', 320_000],
  ['sua rua mat', 280_000],
  ['kem duong am', 420_000],
  ['mascara', 290_000],
  ['phan mat', 350_000],
  ['son li', 320_000],
  ['kem ma hong', 300_000],
  ['tay trang', 280_000],
  ['chan mem', 590_000],
  ['goi cao su', 790_000],
  ['nem memory foam', 5_990_000],
  ['drap giuong', 690_000],
  ['vo goi', 250_000],
];

function normalized(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
}

function roundToTenThousand(value: number) {
  return Math.max(100_000, Math.round(value / 10_000) * 10_000);
}

export function realisticProductPrice(name: string, index = 0, fallback?: number) {
  const cleanName = normalized(name);
  const rule = PRICE_RULES.find(([keyword]) => cleanName.includes(keyword));
  const basePrice = rule?.[1] ?? fallback ?? 500_000;
  const variant = Math.floor(index / 50) % 4;
  const multiplier = [0.95, 1, 1.05, 1.1][variant];
  return roundToTenThousand(basePrice * multiplier);
}

export function realisticOriginalPrice(price: number, hasDiscount: boolean, index = 0) {
  if (!hasDiscount) return null;
  const markup = 1.15 + (index % 4) * 0.05;
  return roundToTenThousand(price * markup);
}