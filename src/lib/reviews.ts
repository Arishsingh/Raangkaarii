export type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  body: string;
  createdAt: number;
};

const STORAGE_KEY = "rangkaarii:reviews";

/** Shipped with the catalogue so a new piece is never a blank page. */
export const seedReviews: Review[] = [
  { id: "r1", productId: "p1", author: "Meher K.", rating: 5, body: "The thread work is even lovelier in person. Softer than I expected and the fit is true to size.", createdAt: 1754000000000 },
  { id: "r2", productId: "p1", author: "Simran B.", rating: 4, body: "Beautiful kurta. I sized up for a looser drape and it worked well.", createdAt: 1754259200000 },
  { id: "r3", productId: "p1", author: "Ritika J.", rating: 5, body: "Wore it to work and to a family lunch the same week. Holds its shape after a wash.", createdAt: 1754518400000 },
  { id: "r4", productId: "p2", author: "Ananya R.", rating: 5, body: "Wore this to a wedding and was asked about it all evening. The zari catches the light beautifully.", createdAt: 1754777600000 },
  { id: "r5", productId: "p2", author: "Preeti M.", rating: 4, body: "Stunning sharara. The organza needs careful ironing, but worth the effort.", createdAt: 1755036800000 },
  { id: "r6", productId: "p3", author: "Kiran S.", rating: 4, body: "Very breathable for Jammu summers. The waist runs slightly loose.", createdAt: 1755296000000 },
  { id: "r7", productId: "p3", author: "Divya N.", rating: 5, body: "My most worn trousers now. Pairs with every kurta I own.", createdAt: 1755555200000 },
  { id: "r8", productId: "p4", author: "Harleen G.", rating: 5, body: "The velvet is rich without feeling heavy. Perfect for a winter function.", createdAt: 1755814400000 },
  { id: "r9", productId: "p4", author: "Ishita P.", rating: 4, body: "Gorgeous colour. Took two weeks as it is made to order, but the finish is worth it.", createdAt: 1756073600000 },
  { id: "r10", productId: "p5", author: "Tanvi A.", rating: 5, body: "Exactly the everyday shirt I was looking for. Soft from the first wear.", createdAt: 1756332800000 },
  { id: "r11", productId: "p5", author: "Neha D.", rating: 4, body: "Great cotton. I would like it a touch longer at the hem.", createdAt: 1756592000000 },
  { id: "r12", productId: "p6", author: "Noor A.", rating: 5, body: "The frill collar is such a lovely detail. Washes well too.", createdAt: 1756851200000 },
  { id: "r13", productId: "p6", author: "Sana Q.", rating: 4, body: "Gauze is light and airy. Slightly sheer, so I layer it.", createdAt: 1757110400000 },
  { id: "r14", productId: "p7", author: "Pooja V.", rating: 5, body: "Cool and comfortable through humid nights. The block print has not faded.", createdAt: 1757369600000 },
  { id: "r15", productId: "p7", author: "Mahira S.", rating: 4, body: "Lovely print and generous fit. Ordered a second in another colour.", createdAt: 1757628800000 },
  { id: "r16", productId: "p8", author: "Aditi C.", rating: 4, body: "The bias cut is very flattering. Runs small, size up.", createdAt: 1757888000000 },
  { id: "r17", productId: "p8", author: "Zoya H.", rating: 5, body: "Elegant and simple. Dressed it up with the zari dupatta from here.", createdAt: 1758147200000 },
  { id: "r18", productId: "p9", author: "Sneha T.", rating: 5, body: "Perfect travel co-ord. Barely creases in a suitcase.", createdAt: 1758406400000 },
  { id: "r19", productId: "p9", author: "Rhea L.", rating: 4, body: "Comfortable and well stitched. The stripes are woven, not printed.", createdAt: 1758665600000 },
  { id: "r20", productId: "p10", author: "Gurleen K.", rating: 5, body: "The chikankari is so fine. Received compliments all through Eid.", createdAt: 1758924800000 },
  { id: "r21", productId: "p10", author: "Aarushi S.", rating: 5, body: "Beautiful sweep when you walk. Lining is soft and not itchy.", createdAt: 1759184000000 },
  { id: "r22", productId: "p10", author: "Fatima R.", rating: 4, body: "Delivery took a few days longer than estimated, but the piece is lovely.", createdAt: 1759443200000 },
  { id: "r23", productId: "p11", author: "Jasleen B.", rating: 5, body: "Lifts a plain kurta instantly. The zari border is neatly finished.", createdAt: 1759702400000 },
  { id: "r24", productId: "p11", author: "Ayesha M.", rating: 4, body: "Sheer and light. Handle gently and it lasts.", createdAt: 1759961600000 },
  { id: "r25", productId: "p12", author: "Komal D.", rating: 5, body: "Feather light mul cotton, exactly as described. Bought three.", createdAt: 1760220800000 },
  { id: "r26", productId: "p12", author: "Sakshi P.", rating: 4, body: "Very comfortable for daily wear. The drawstring could be sturdier.", createdAt: 1760480000000 },
];

export function loadReviews(): Review[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Review[]) : [];
  } catch {
    return [];
  }
}

export function saveReviews(reviews: Review[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // Storage unavailable — the review still shows for this session.
  }
}

export function averageRating(reviews: Review[]) {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}
