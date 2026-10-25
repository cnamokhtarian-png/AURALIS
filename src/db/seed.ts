import { count } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  conversations,
  messages,
  orderItems,
  orders,
  products,
  storeSettings,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";

const globalForSeed = globalThis as typeof globalThis & {
  __auralisSeedPromise?: Promise<void>;
  __auralisSeeded?: boolean;
};

function daysAgo(days: number, hours = 0) {
  return new Date(Date.now() - days * 86400000 - hours * 3600000);
}

function demoReceiptSvg(amount: string, ref: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="860" viewBox="0 0 640 860">
  <rect width="640" height="860" fill="#f6f1e8"/>
  <rect x="40" y="40" width="560" height="780" rx="24" fill="#ffffff" stroke="#d9c7a3" stroke-width="2"/>
  <circle cx="320" cy="140" r="44" fill="#e9f7ef" stroke="#2f9e62" stroke-width="3"/>
  <path d="M298 140 l15 15 l30 -34" fill="none" stroke="#2f9e62" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="320" y="230" text-anchor="middle" font-family="Tahoma, sans-serif" font-size="28" fill="#1f1f1f" font-weight="bold">انتقال وجه موفق</text>
  <text x="320" y="270" text-anchor="middle" font-family="Tahoma, sans-serif" font-size="16" fill="#777">کارت به کارت - نمونه رسید</text>
  <line x1="90" y1="310" x2="550" y2="310" stroke="#eee"/>
  <text x="550" y="360" text-anchor="end" font-family="Tahoma, sans-serif" font-size="18" fill="#777">مبلغ</text>
  <text x="90" y="360" text-anchor="start" font-family="Tahoma, sans-serif" font-size="20" fill="#1f1f1f" font-weight="bold">${amount} ریال</text>
  <text x="550" y="420" text-anchor="end" font-family="Tahoma, sans-serif" font-size="18" fill="#777">کارت مقصد</text>
  <text x="90" y="420" text-anchor="start" font-family="Tahoma, sans-serif" font-size="20" fill="#1f1f1f">6037-99**-****-5678</text>
  <text x="550" y="480" text-anchor="end" font-family="Tahoma, sans-serif" font-size="18" fill="#777">شماره پیگیری</text>
  <text x="90" y="480" text-anchor="start" font-family="Tahoma, sans-serif" font-size="20" fill="#1f1f1f">${ref}</text>
  <text x="550" y="540" text-anchor="end" font-family="Tahoma, sans-serif" font-size="18" fill="#777">بانک</text>
  <text x="90" y="540" text-anchor="start" font-family="Tahoma, sans-serif" font-size="20" fill="#1f1f1f">بلوبانک (بانک سامان)</text>
  <line x1="90" y1="600" x2="550" y2="600" stroke="#eee"/>
  <text x="320" y="700" text-anchor="middle" font-family="Georgia, serif" font-size="34" letter-spacing="10" fill="#c9a96e">AURALIS</text>
  <text x="320" y="740" text-anchor="middle" font-family="Tahoma, sans-serif" font-size="14" fill="#aaa">این تصویر صرفاً نمونه آزمایشی رسید است</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function runSeed() {
  const [{ value: userCount }] = await db.select({ value: count() }).from(users);
  if (userCount > 0) return;

  // ---- Users ----
  const [admin, sara, negar, maryam, elham] = await db
    .insert(users)
    .values([
      {
        name: "مدیر آورالیس",
        email: "admin@auralis.ir",
        phone: "09120000000",
        passwordHash: hashPassword("Admin1234"),
        role: "admin",
      },
      {
        name: "سارا محمدی",
        email: "sara@example.com",
        phone: "09121234567",
        passwordHash: hashPassword("12345678"),
        role: "customer",
        province: "تهران",
        city: "تهران",
        address: "سعادت‌آباد، بلوار دریا، کوچه نسیم، پلاک ۱۲، واحد ۴",
        postalCode: "1998765432",
        createdAt: daysAgo(60),
      },
      {
        name: "نگار احمدی",
        email: "negar@example.com",
        phone: "09131112233",
        passwordHash: hashPassword("12345678"),
        role: "customer",
        province: "فارس",
        city: "شیراز",
        address: "معالی‌آباد، خیابان بهاران، مجتمع ارغوان، واحد ۷",
        postalCode: "7187654321",
        createdAt: daysAgo(45),
      },
      {
        name: "مریم رضایی",
        email: "maryam@example.com",
        phone: "09355556677",
        passwordHash: hashPassword("12345678"),
        role: "customer",
        province: "اصفهان",
        city: "اصفهان",
        address: "خیابان چهارباغ بالا، کوچه گلستان، پلاک ۳",
        postalCode: "8163456789",
        createdAt: daysAgo(20),
      },
      {
        name: "الهام کریمی",
        email: "elham@example.com",
        phone: "09187778899",
        passwordHash: hashPassword("12345678"),
        role: "customer",
        province: "البرز",
        city: "کرج",
        address: "گوهردشت، فاز ۲، خیابان یازدهم شرقی، پلاک ۲۱",
        postalCode: "3146789012",
        createdAt: daysAgo(9),
      },
    ])
    .returning();

  // ---- Categories ----
  const [bags, boxes, keychains, hair, decor] = await db
    .insert(categories)
    .values([
      {
        name: "کیف‌های مرواریدی",
        slug: "pearl-bags",
        description: "کیف‌های دست‌دوز مجلسی و روزمره با مرواریدهای صدفی درجه یک",
        image: "/images/products/pearl-clutch.jpg",
        sortOrder: 1,
      },
      {
        name: "جعبه و صندوقچه",
        slug: "pearl-boxes",
        description: "جعبه‌های جواهر و صندوقچه‌های یادگاری با روکش مروارید",
        image: "/images/products/pearl-box.jpg",
        sortOrder: 2,
      },
      {
        name: "جاکلیدی و آویز",
        slug: "keychains",
        description: "هدیه‌های کوچک و خاص؛ جاکلیدی و آویزهای مرواریدی",
        image: "/images/products/pearl-keychain.jpg",
        sortOrder: 3,
      },
      {
        name: "اکسسوری مو",
        slug: "hair-accessories",
        description: "گیره، تل و سنجاق‌های مرواریدی برای مراسم و روزهای خاص",
        image: "/images/products/pearl-hairclip.jpg",
        sortOrder: 4,
      },
      {
        name: "دکور و میز آرایش",
        slug: "home-decor",
        description: "سینی، آینه و لوازم تزیینی مرواریدی برای خانه‌ای لوکس",
        image: "/images/products/pearl-tray.jpg",
        sortOrder: 5,
      },
    ])
    .returning();

  // ---- Products ----
  const insertedProducts = await db
    .insert(products)
    .values([
      {
        name: "کیف شب «آورا» — امضای آورالیس",
        slug: "aura-signature-evening-bag",
        shortDescription: "شاهکار دست‌دوز با بیش از ۱۲۰۰ مروارید صدفی و زنجیر آبکاری طلا",
        description:
          "کیف شب «آورا» محصول امضای برند آورالیس است؛ بیش از ۱۲۰۰ مروارید صدفی درجه یک با دست و یک‌به‌یک روی بدنه ساتن ابریشمی دوخته شده‌اند. زنجیر آبکاری طلای ۱۸ عیار، آستر مخمل شامپاینی و قفل مغناطیسی پنهان، این کیف را به انتخابی بی‌نقص برای مراسم عروسی و مهمانی‌های رسمی تبدیل می‌کند. هر کیف در آتلیه ما به‌صورت سفارشی و با شماره سریال اختصاصی تولید می‌شود.",
        price: 3900000,
        compareAtPrice: 4400000,
        categoryId: bags.id,
        images: ["/images/hero.jpg", "/images/products/pearl-clutch.jpg"],
        stock: 2,
        isFeatured: true,
        materials: "مروارید صدفی درجه یک، ساتن ابریشمی، زنجیر آبکاری طلا، آستر مخمل",
        dimensions: "۲۴ × ۱۴ × ۶ سانتی‌متر",
        craftTime: "۱۰ روز کاری",
        createdAt: daysAgo(80),
      },
      {
        name: "کیف دستی مجلسی «لونا»",
        slug: "luna-pearl-clutch",
        shortDescription: "کلاچ تمام‌مروارید با بند زنجیری ظریف؛ مناسب مجالس و عروسی",
        description:
          "کیف «لونا» با مرواریدهای صدفی هم‌اندازه و براق پوشیده شده و بند زنجیری ظریف آن قابل جداشدن است تا بتوانید آن را به‌صورت کلاچ نیز استفاده کنید. فضای داخلی برای گوشی، رژ لب و کارت‌ها کافی است. بسته‌بندی هدیه در جعبه مخملی آورالیس انجام می‌شود.",
        price: 2850000,
        categoryId: bags.id,
        images: ["/images/products/pearl-clutch.jpg"],
        stock: 4,
        isFeatured: true,
        materials: "مروارید صدفی، پارچه ساتن، زنجیر استیل آبکاری طلا",
        dimensions: "۲۲ × ۱۲ × ۵ سانتی‌متر",
        craftTime: "۷ روز کاری",
        createdAt: daysAgo(70),
      },
      {
        name: "کیف مینی کراس‌بادی «سلن»",
        slug: "selene-mini-crossbody",
        shortDescription: "کیف گرد و کوچک با دسته مرواریدی و بند زنجیری بلند",
        description:
          "«سلن» یک کیف مینی روزمره و در عین حال مجلسی است. دسته‌ی مرواریدی سفت و بند زنجیری بلند، امکان استفاده دستی یا کراس‌بادی را می‌دهد. بدنه‌ی کیف با فوم و آستر ضخیم فرم‌دهی شده تا شکل گرد خود را حفظ کند.",
        price: 2150000,
        categoryId: bags.id,
        images: ["/images/products/pearl-mini-bag.jpg"],
        stock: 6,
        isFeatured: true,
        materials: "مروارید صدفی، چرم مصنوعی کرم، زنجیر آبکاری طلا",
        dimensions: "قطر ۱۶ سانتی‌متر، عمق ۶ سانتی‌متر",
        craftTime: "۶ روز کاری",
        createdAt: daysAgo(55),
      },
      {
        name: "جعبه جواهر مرواریدی «آریا»",
        slug: "aria-pearl-jewelry-box",
        shortDescription: "جعبه چوبی با روکش کامل مروارید و داخل مخمل صورتی پودری",
        description:
          "جعبه جواهر «آریا» روی بدنه چوبی دست‌ساز با مرواریدهای سفید و منجوق‌های طلایی تزیین شده است. فضای داخلی مخمل صورتی پودری با جداکننده‌ی حلقه و گردن‌بند دارد. انتخابی ایده‌آل برای هدیه‌ی عروس یا کادوی تولد.",
        price: 1680000,
        categoryId: boxes.id,
        images: ["/images/products/pearl-box.jpg"],
        stock: 8,
        isFeatured: true,
        materials: "چوب MDF، مروارید صدفی، منجوق طلایی، مخمل",
        dimensions: "۱۸ × ۱۸ × ۹ سانتی‌متر",
        craftTime: "۵ روز کاری",
        createdAt: daysAgo(50),
      },
      {
        name: "صندوقچه یادگاری «نوا» — سایز بزرگ",
        slug: "nova-keepsake-chest",
        shortDescription: "صندوقچه بزرگ مرواریدی با دو طبقه و قفل برنجی",
        description:
          "صندوقچه «نوا» برای نگهداری یادگاری‌ها، نامه‌ها و جواهرات ارزشمند طراحی شده است. دو طبقه مخمل‌کوب، قفل برنجی و روکش کامل مروارید روی درب و بدنه، آن را به قطعه‌ای دکوراتیو و ماندگار تبدیل می‌کند.",
        price: 2400000,
        compareAtPrice: 2700000,
        categoryId: boxes.id,
        images: ["/images/products/pearl-box.jpg"],
        stock: 3,
        isFeatured: false,
        materials: "چوب راش، مروارید صدفی، قفل برنجی، مخمل",
        dimensions: "۲۸ × ۲۰ × ۱۴ سانتی‌متر",
        craftTime: "۱۲ روز کاری",
        createdAt: daysAgo(40),
      },
      {
        name: "جاکلیدی مرواریدی «تارا»",
        slug: "tara-pearl-keychain",
        shortDescription: "خوشه مروارید با حلقه طلایی و منگوله ابریشمی",
        description:
          "جاکلیدی «تارا» با خوشه‌ای از مرواریدهای درشت و ریز، حلقه استیل آبکاری طلا و منگوله ابریشمی کرم ساخته شده است. وزن سبک و دوام بالا آن را به هدیه‌ای محبوب برای همه سنین تبدیل کرده است. امکان حک حرف اول نام روی پلاک طلایی وجود دارد.",
        price: 385000,
        categoryId: keychains.id,
        images: ["/images/products/pearl-keychain.jpg"],
        stock: 25,
        isFeatured: true,
        materials: "مروارید صدفی، استیل آبکاری طلا، منگوله ابریشمی",
        dimensions: "طول ۱۲ سانتی‌متر",
        craftTime: "۲ روز کاری",
        createdAt: daysAgo(35),
      },
      {
        name: "ست دو عددی جاکلیدی «دو مروارید»",
        slug: "two-pearls-keychain-set",
        shortDescription: "ست هدیه دو جاکلیدی هماهنگ برای زوج‌ها و دوستان",
        description:
          "ست «دو مروارید» شامل دو جاکلیدی هماهنگ با رنگ‌بندی سفید و شامپاینی است که در یک جعبه مخملی مشترک ارائه می‌شود. هدیه‌ای خاص برای سالگرد، نامزدی یا دوستی‌های ماندگار.",
        price: 690000,
        categoryId: keychains.id,
        images: ["/images/products/pearl-keychain.jpg"],
        stock: 12,
        isFeatured: false,
        materials: "مروارید صدفی و شامپاینی، استیل آبکاری طلا",
        dimensions: "هر عدد ۱۱ سانتی‌متر",
        craftTime: "۳ روز کاری",
        createdAt: daysAgo(30),
      },
      {
        name: "آینه دستی مرواریدی «مهتاب»",
        slug: "mahtab-pearl-hand-mirror",
        shortDescription: "آینه وینتیج با قاب و دسته تمام‌مروارید",
        description:
          "آینه «مهتاب» الهام‌گرفته از آینه‌های سلطنتی قرن نوزدهم است. قاب و دسته با سه سایز مروارید و حاشیه طلایی کار شده و شیشه آینه با کیفیت بالا و لبه‌ی تراش‌خورده است. روی میز آرایش یا به عنوان بخشی از ست عروس می‌درخشد.",
        price: 1250000,
        categoryId: decor.id,
        images: ["/images/products/pearl-mirror.jpg"],
        stock: 5,
        isFeatured: true,
        materials: "بدنه رزین، مروارید صدفی، شیشه آینه تراش‌دار",
        dimensions: "طول ۲۶ سانتی‌متر، قطر قاب ۱۳ سانتی‌متر",
        craftTime: "۶ روز کاری",
        createdAt: daysAgo(28),
      },
      {
        name: "ست گیره موی مرواریدی «شکوفه»",
        slug: "shokufeh-pearl-hair-clips",
        shortDescription: "ست سه‌تایی گیره و سنجاق مو با برگ‌های طلایی",
        description:
          "ست «شکوفه» شامل یک گیره بزرگ و دو سنجاق کوچک است که با مروارید و برگ‌های فلزی طلایی تزیین شده‌اند. سبک، محکم و مناسب برای مدل موهای عروس، نامزدی و مهمانی.",
        price: 540000,
        categoryId: hair.id,
        images: ["/images/products/pearl-hairclip.jpg"],
        stock: 15,
        isFeatured: false,
        materials: "مروارید صدفی، آلیاژ آبکاری طلا",
        dimensions: "گیره ۹ سانتی‌متر، سنجاق‌ها ۶ سانتی‌متر",
        craftTime: "۳ روز کاری",
        createdAt: daysAgo(22),
      },
      {
        name: "سینی میز آرایش «ونوس»",
        slug: "venus-vanity-tray",
        shortDescription: "سینی بیضی با لبه مرواریدی و حاشیه طلایی",
        description:
          "سینی «ونوس» با لبه‌ی تمام‌مروارید و کف آینه‌ای، محل شایسته‌ای برای عطرها، شمع و جواهرات شماست. پایه‌های کوچک طلایی مانع خش‌افتادن روی سطح میز می‌شود.",
        price: 1950000,
        categoryId: decor.id,
        images: ["/images/products/pearl-tray.jpg"],
        stock: 4,
        isFeatured: true,
        materials: "فلز آبکاری طلا، آینه، مروارید صدفی",
        dimensions: "۳۲ × ۲۲ سانتی‌متر",
        craftTime: "۸ روز کاری",
        createdAt: daysAgo(15),
      },
      {
        name: "جعبه دستمال کاغذی «الماس سفید»",
        slug: "white-diamond-tissue-box",
        shortDescription: "کاور جعبه دستمال با روکش مروارید و منجوق طلایی",
        description:
          "کاور جعبه دستمال کاغذی «الماس سفید» با الگوی لوزی از مروارید و منجوق‌های طلایی دوخته شده و کف آن باز می‌شود تا جعبه دستمال استاندارد را درون خود جای دهد. تکمیل‌کننده‌ی ست دکور مرواریدی پذیرایی شما.",
        price: 1120000,
        categoryId: decor.id,
        images: ["/images/products/pearl-tissue-box.jpg"],
        stock: 7,
        isFeatured: false,
        materials: "چوب MDF، مروارید صدفی، منجوق طلایی",
        dimensions: "۲۵ × ۱۳ × ۹ سانتی‌متر",
        craftTime: "۴ روز کاری",
        createdAt: daysAgo(10),
      },
    ])
    .returning();

  const bySlug = Object.fromEntries(insertedProducts.map((p) => [p.slug, p]));
  const luna = bySlug["luna-pearl-clutch"];
  const aria = bySlug["aria-pearl-jewelry-box"];
  const tara = bySlug["tara-pearl-keychain"];
  const mahtab = bySlug["mahtab-pearl-hand-mirror"];
  const venus = bySlug["venus-vanity-tray"];
  const shokufeh = bySlug["shokufeh-pearl-hair-clips"];
  const selene = bySlug["selene-mini-crossbody"];
  const aura = bySlug["aura-signature-evening-bag"];

  // ---- Settings ----
  await db.insert(storeSettings).values({
    cardNumber: "6037997512345678",
    cardHolder: "فاطمه موسوی",
    bankName: "بانک ملی ایران",
    shebaNumber: "IR120170000000123456789012",
    shippingFee: 85000,
    freeShippingThreshold: 3000000,
    announcement: "ارسال رایگان برای سفارش‌های بالای ۳ میلیون تومان · بسته‌بندی هدیه رایگان",
    supportPhone: "09120000000",
    instagram: "auralis.pearl",
    address: "تهران، خیابان ولیعصر، نرسیده به پارک ساعی، آتلیه آورالیس",
  });

  // ---- Orders ----
  const SHIP = 85000;
  const mk = (subtotal: number) => ({
    subtotal,
    shippingFee: subtotal >= 3000000 ? 0 : SHIP,
    total: subtotal >= 3000000 ? subtotal : subtotal + SHIP,
  });

  const o1Sub = luna.price + tara.price * 2;
  const o2Sub = aria.price;
  const o3Sub = mahtab.price + shokufeh.price;
  const o4Sub = venus.price;
  const o5Sub = selene.price;
  const o6Sub = tara.price;
  const o7Sub = aura.price;

  const [o1, o2, o3, o4, o5, o6, o7] = await db
    .insert(orders)
    .values([
      {
        orderNumber: "AUR-1001",
        userId: sara.id,
        status: "delivered",
        ...mk(o1Sub),
        customerName: sara.name,
        phone: sara.phone!,
        province: sara.province!,
        city: sara.city!,
        address: sara.address!,
        postalCode: sara.postalCode,
        note: "لطفاً بسته‌بندی هدیه انجام شود.",
        receiptImage: demoReceiptSvg((o1Sub + SHIP) * 10 + "", "148273910"),
        receiptRef: "148273910",
        receiptSubmittedAt: daysAgo(24),
        paidAt: daysAgo(23),
        shippedAt: daysAgo(21),
        deliveredAt: daysAgo(18),
        trackingCode: "RP123456789IR",
        createdAt: daysAgo(25),
        updatedAt: daysAgo(18),
      },
      {
        orderNumber: "AUR-1002",
        userId: negar.id,
        status: "shipped",
        ...mk(o2Sub),
        customerName: negar.name,
        phone: negar.phone!,
        province: negar.province!,
        city: negar.city!,
        address: negar.address!,
        postalCode: negar.postalCode,
        receiptImage: demoReceiptSvg((o2Sub + SHIP) * 10 + "", "209384756"),
        receiptRef: "209384756",
        receiptSubmittedAt: daysAgo(6),
        paidAt: daysAgo(5),
        shippedAt: daysAgo(2),
        trackingCode: "RP987654321IR",
        createdAt: daysAgo(7),
        updatedAt: daysAgo(2),
      },
      {
        orderNumber: "AUR-1003",
        userId: maryam.id,
        status: "receipt_submitted",
        ...mk(o3Sub),
        customerName: maryam.name,
        phone: maryam.phone!,
        province: maryam.province!,
        city: maryam.city!,
        address: maryam.address!,
        postalCode: maryam.postalCode,
        note: "آینه برای هدیه است، لطفاً فاکتور داخل بسته نباشد.",
        receiptImage: demoReceiptSvg((o3Sub + SHIP) * 10 + "", "556677889"),
        receiptRef: "556677889",
        receiptNote: "از حساب همسرم واریز شد.",
        receiptSubmittedAt: daysAgo(0, 5),
        createdAt: daysAgo(1),
        updatedAt: daysAgo(0, 5),
      },
      {
        orderNumber: "AUR-1004",
        userId: sara.id,
        status: "awaiting_payment",
        ...mk(o4Sub),
        customerName: sara.name,
        phone: sara.phone!,
        province: sara.province!,
        city: sara.city!,
        address: sara.address!,
        postalCode: sara.postalCode,
        createdAt: daysAgo(0, 3),
        updatedAt: daysAgo(0, 3),
      },
      {
        orderNumber: "AUR-1005",
        userId: elham.id,
        status: "paid",
        ...mk(o5Sub),
        customerName: elham.name,
        phone: elham.phone!,
        province: elham.province!,
        city: elham.city!,
        address: elham.address!,
        postalCode: elham.postalCode,
        receiptImage: demoReceiptSvg((o5Sub + SHIP) * 10 + "", "778899001"),
        receiptRef: "778899001",
        receiptSubmittedAt: daysAgo(2),
        paidAt: daysAgo(1),
        adminNote: "دسته کیف طبق درخواست مشتری کمی بلندتر دوخته شود.",
        createdAt: daysAgo(3),
        updatedAt: daysAgo(1),
      },
      {
        orderNumber: "AUR-1006",
        userId: negar.id,
        status: "cancelled",
        ...mk(o6Sub),
        customerName: negar.name,
        phone: negar.phone!,
        province: negar.province!,
        city: negar.city!,
        address: negar.address!,
        postalCode: negar.postalCode,
        adminNote: "به درخواست مشتری لغو شد.",
        createdAt: daysAgo(12),
        updatedAt: daysAgo(11),
      },
      {
        orderNumber: "AUR-1007",
        userId: maryam.id,
        status: "awaiting_payment",
        ...mk(o7Sub),
        customerName: maryam.name,
        phone: maryam.phone!,
        province: maryam.province!,
        city: maryam.city!,
        address: maryam.address!,
        postalCode: maryam.postalCode,
        createdAt: daysAgo(0, 1),
        updatedAt: daysAgo(0, 1),
      },
    ])
    .returning();

  await db.insert(orderItems).values([
    { orderId: o1.id, productId: luna.id, productName: luna.name, productImage: luna.images[0], unitPrice: luna.price, quantity: 1 },
    { orderId: o1.id, productId: tara.id, productName: tara.name, productImage: tara.images[0], unitPrice: tara.price, quantity: 2 },
    { orderId: o2.id, productId: aria.id, productName: aria.name, productImage: aria.images[0], unitPrice: aria.price, quantity: 1 },
    { orderId: o3.id, productId: mahtab.id, productName: mahtab.name, productImage: mahtab.images[0], unitPrice: mahtab.price, quantity: 1 },
    { orderId: o3.id, productId: shokufeh.id, productName: shokufeh.name, productImage: shokufeh.images[0], unitPrice: shokufeh.price, quantity: 1 },
    { orderId: o4.id, productId: venus.id, productName: venus.name, productImage: venus.images[0], unitPrice: venus.price, quantity: 1 },
    { orderId: o5.id, productId: selene.id, productName: selene.name, productImage: selene.images[0], unitPrice: selene.price, quantity: 1 },
    { orderId: o6.id, productId: tara.id, productName: tara.name, productImage: tara.images[0], unitPrice: tara.price, quantity: 1 },
    { orderId: o7.id, productId: aura.id, productName: aura.name, productImage: aura.images[0], unitPrice: aura.price, quantity: 1 },
  ]);

  // ---- Conversations & messages ----
  const [c1, c2, c3, c4] = await db
    .insert(conversations)
    .values([
      {
        userId: sara.id,
        productId: luna.id,
        subject: "موجودی رنگ کرم کیف لونا",
        status: "open",
        createdAt: daysAgo(2),
        lastMessageAt: daysAgo(0, 2),
      },
      {
        userId: maryam.id,
        productId: null,
        subject: "پیگیری رسید سفارش AUR-1003",
        status: "open",
        createdAt: daysAgo(0, 5),
        lastMessageAt: daysAgo(0, 4),
      },
      {
        userId: negar.id,
        productId: null,
        subject: "زمان ارسال به شیراز",
        status: "closed",
        createdAt: daysAgo(8),
        lastMessageAt: daysAgo(7),
      },
      {
        userId: elham.id,
        productId: tara.id,
        subject: "حک حرف روی جاکلیدی تارا",
        status: "open",
        createdAt: daysAgo(0, 1),
        lastMessageAt: daysAgo(0, 1),
      },
    ])
    .returning();

  await db.insert(messages).values([
    { conversationId: c1.id, senderId: sara.id, body: "سلام وقت بخیر. کیف لونا رو در رنگ کرم یا شامپاینی هم دارید؟ برای عروسی خواهرم می‌خوام.", isRead: true, createdAt: daysAgo(2) },
    { conversationId: c1.id, senderId: admin.id, body: "سلام سارا جان، خوش آمدید 🌸 بله، لونا رو با مروارید شامپاینی هم می‌تونیم براتون بدوزیم. زمان آماده‌سازی حدود ۸ روز کاریه و قیمت تغییری نمی‌کنه.", isRead: true, createdAt: daysAgo(1, 20) },
    { conversationId: c1.id, senderId: sara.id, body: "عالیه! پس همون شامپاینی رو می‌خوام. تا تاریخ ۲۵ ماه می‌رسه؟ اگر بله همین امروز سفارش رو ثبت می‌کنم.", isRead: false, createdAt: daysAgo(0, 2) },

    { conversationId: c2.id, senderId: maryam.id, body: "سلام، رسید سفارش AUR-1003 رو چند ساعت پیش ثبت کردم. لطفاً بررسی بفرمایید چون آینه هدیه‌ست و زمان برام مهمه 🙏", isRead: false, createdAt: daysAgo(0, 4) },

    { conversationId: c3.id, senderId: negar.id, body: "سلام، زمان ارسال به شیراز معمولاً چند روزه؟", isRead: true, createdAt: daysAgo(8) },
    { conversationId: c3.id, senderId: admin.id, body: "سلام نگار عزیز. بعد از تأیید پرداخت، سفارش شما با پست پیشتاز ارسال میشه و معمولاً ۲ تا ۳ روز کاری به شیراز می‌رسه. کد رهگیری هم در پنل کاربری‌تون ثبت میشه.", isRead: true, createdAt: daysAgo(7, 22) },
    { conversationId: c3.id, senderId: negar.id, body: "ممنون از پاسخ سریعتون 🌹", isRead: true, createdAt: daysAgo(7) },

    { conversationId: c4.id, senderId: elham.id, body: "سلام. امکان حک دو حرف لاتین روی پلاک جاکلیدی تارا هست؟ هزینه‌اش چقدر میشه؟", isRead: false, createdAt: daysAgo(0, 1) },
  ]);
}

export async function seedIfEmpty() {
  // Demo seed data is opt-in for local development only.
  // Production starts clean: set ALLOW_DEMO_SEED=true only if you really
  // want the sample products/orders/users (incl. the demo admin account).
  if (process.env.ALLOW_DEMO_SEED !== "true") return;
  if (globalForSeed.__auralisSeeded) return;
  if (!globalForSeed.__auralisSeedPromise) {
    globalForSeed.__auralisSeedPromise = runSeed()
      .then(() => {
        globalForSeed.__auralisSeeded = true;
      })
      .catch((err) => {
        console.error("Seed failed:", err);
        globalForSeed.__auralisSeedPromise = undefined;
      });
  }
  await globalForSeed.__auralisSeedPromise;
}
