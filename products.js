const IMG_FOLDER = "image";

const products = [
  { id: 1, name: "سماعات لاسلكية", category: "إلكترونيات", price: 299, rating: 4.5, image: "1.jpeg",
    description: "سماعات بلوتوث بصوت نقي وبطارية تعمل حتى 20 ساعة." },
  { id: 2, name: "ساعة ذكية", category: "إلكترونيات", price: 550, rating: 4.2, image: "2.jpeg",
    description: "ساعة ذكية تتابع خطواتك ونبضك وتعرض إشعارات الهاتف." },
  { id: 3, name: "حذاء رياضي", category: "ملابس", price: 340, rating: 4.7, image: "3.jpeg",
    description: "حذاء خفيف ومريح للجري والمشي اليومي." },
  { id: 4, name: "حقيبة ظهر", category: "ملابس", price: 180, rating: 4.0, image: "4.jpeg",
    description: "حقيبة واسعة بجيب مخصص للابتوب." },
  { id: 5, name: "رواية", category: "كتب", price: 60, rating: 4.8, image: "5.jpeg",
    description: "رواية ممتعة من الأكثر مبيعاً." },
  { id: 6, name: "مصباح مكتب", category: "المنزل", price: 120, rating: 3.9, image: "6.jpeg",
    description: "مصباح مكتب بإضاءة هادئة مناسبة للمذاكرة." }
];

for (let i = 7; i <= 40; i++) {
  products.push({
    id: i,
    name: "منتج تجريبي " + i,
    category: ["إلكترونيات", "ملابس", "كتب", "المنزل"][i % 4],
    price: 50 + i * 7,
    rating: Number((3.5 + (i % 15) / 10).toFixed(1)),
    image: "placeholder.jpeg",
    description: "وصف المنتج التجريبي."
  });
}