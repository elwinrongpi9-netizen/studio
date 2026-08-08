
import { Restaurant } from './types';

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'rongpi-wok',
    name: 'Rongpi Chinese Wok',
    cuisine: 'Authentic Chinese • North Indian • Signature Biryani',
    rating: 4.9,
    deliveryTime: '25-35 min',
    image: 'https://picsum.photos/seed/rongpi/1200/800',
    priceRange: 'Rs. Rs.',
    priceForTwo: 500,
    dishes: [
      { id: 'rp1', name: 'Elite Chilli Chicken', description: 'Our master-chef signature stir-fried chicken with premium bell peppers and toasted sesame.', price: 180, image: 'https://picsum.photos/seed/chilli/600/500', category: 'Starters' },
      { id: 'rp2', name: 'Imperial Chicken 65', description: 'Twice-fried spicy chicken morsels infused with fresh curry leaves and mountain spices.', price: 220, image: 'https://picsum.photos/seed/c65/600/500', category: 'Starters' },
      { id: 'rp3', name: 'Manchurian Excellence', description: 'Crispy hand-rolled vegetable pearls in a velvety ginger-garlic reduction.', price: 160, image: 'https://picsum.photos/seed/manch/600/500', category: 'Starters' },
      { id: 'rp4', name: 'Fire-Wok Lollipop', description: 'Succulent chicken drumettes tossed in a high-heat wok with house-special schezwan dip.', price: 240, image: 'https://picsum.photos/seed/lolly/600/500', category: 'Starters' },
      { id: 'rp5', name: 'Signature Fried Rice', description: 'Long-grain jasmine rice wok-tossed with farm-fresh chicken, golden eggs and herbs.', price: 190, image: 'https://picsum.photos/seed/cfr/600/500', category: 'Rice' },
      { id: 'rp6', name: 'Golden Egg Fried Rice', description: 'Wok-charred rice with double scrambled eggs and charred scallions.', price: 150, image: 'https://picsum.photos/seed/efr/600/500', category: 'Rice' },
      { id: 'rp7', name: 'Silk Road Noodles', description: 'Hand-stretched soft noodles tossed with fire-charred chicken strips.', price: 170, image: 'https://picsum.photos/seed/cn/600/500', category: 'Noodles' },
      { id: 'rp8', name: 'Egg Hakka Noodles', description: 'Street-style thin noodles prepared in a high-heat wok with spicy umami sauces.', price: 140, image: 'https://picsum.photos/seed/en/600/500', category: 'Noodles' },
      { id: 'rp9', name: 'Karbi Royal Biriyani', description: 'Authentic slow-cooked dum biryani using heritage spices and tender local chicken.', price: 320, image: 'https://picsum.photos/seed/biry/600/500', category: 'Main Course' },
      { id: 'rp10', name: 'Hearty Hot & Sour', description: 'A complex, restorative soup with wild mushrooms, bamboo shoots and cracked pepper.', price: 110, image: 'https://picsum.photos/seed/soup/600/500', category: 'Soup' },
      { id: 'rp11', name: 'Fried Ice Cream', description: 'Crispy, warm outer shell with a cold vanilla center, topped with chocolate drizzle.', price: 160, image: 'https://picsum.photos/seed/fic/600/500', category: 'Desserts' },
      { id: 'rp12', name: 'Chocolate Spring Rolls', description: 'Wok-fried crispy rolls stuffed with rich molten dark chocolate.', price: 150, image: 'https://picsum.photos/seed/csr/600/500', category: 'Desserts' },
      { id: 'rp13', name: 'Fresh Fruit Beer', description: 'Our signature non-alcoholic brewed fruit beer, perfect for spicy wok flavors.', price: 120, image: 'https://picsum.photos/seed/fbeer/600/500', category: 'Drinks' },
      { id: 'rp14', name: 'Lemon Iced Tea', description: 'House-brewed tea with a citrus punch and fresh mint leaves.', price: 90, image: 'https://picsum.photos/seed/litea/600/500', category: 'Drinks' }
    ]
  }
];
