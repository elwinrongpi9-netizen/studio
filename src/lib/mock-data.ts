
import { Restaurant } from './types';

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'rongpi-wok',
    name: 'Rongpi Chinese Wok',
    cuisine: 'Chinese, North Indian, Biryani',
    rating: 4.9,
    deliveryTime: '20-30 min',
    image: 'https://picsum.photos/seed/rongpi/600/400',
    priceRange: '$$',
    priceForTwo: 500,
    dishes: [
      { id: 'rp1', name: 'Chilli Chicken', description: 'Spicy stir-fried chicken with bell peppers and onions.', price: 2.25, image: 'https://picsum.photos/seed/chilli/400/300', category: 'Starters' },
      { id: 'rp2', name: 'Chicken 65', description: 'Deep-fried spicy chicken appetizer with curry leaves.', price: 2.50, image: 'https://picsum.photos/seed/c65/400/300', category: 'Starters' },
      { id: 'rp3', name: 'Veg Manchurian', description: 'Crispy veg balls in a tangy manchurian sauce.', price: 1.80, image: 'https://picsum.photos/seed/manch/400/300', category: 'Starters' },
      { id: 'rp4', name: 'Chicken Lollipop', description: 'Classic fried chicken wings with schezwan dip.', price: 2.80, image: 'https://picsum.photos/seed/lolly/400/300', category: 'Starters' },
      { id: 'rp5', name: 'Chicken Fried Rice', description: 'Fragrant rice tossed with chicken, egg and veggies.', price: 2.00, image: 'https://picsum.photos/seed/cfr/400/300', category: 'Rice' },
      { id: 'rp6', name: 'Egg Fried Rice', description: 'Street-style fried rice with scrambled eggs.', price: 1.60, image: 'https://picsum.photos/seed/efr/400/300', category: 'Rice' },
      { id: 'rp7', name: 'Chicken Noodle', description: 'Wok-tossed noodles with shredded chicken.', price: 1.90, image: 'https://picsum.photos/seed/cn/400/300', category: 'Noodles' },
      { id: 'rp8', name: 'Egg Noodle', description: 'Soft noodles tossed with egg and spicy sauces.', price: 1.50, image: 'https://picsum.photos/seed/en/400/300', category: 'Noodles' },
      { id: 'rp9', name: 'Chicken Dum Biriyani', description: 'Authentic slow-cooked dum biryani with tender chicken pieces.', price: 3.20, image: 'https://picsum.photos/seed/biry/400/300', category: 'Main Course' },
      { id: 'rp10', name: 'Hot & Sour Soup', description: 'Zesty and spicy soup with mushrooms and bamboo shoots.', price: 1.25, image: 'https://picsum.photos/seed/soup/400/300', category: 'Soup' }
    ]
  },
  {
    id: '1',
    name: 'Zomato Italiano',
    cuisine: 'Italian, Pizza, Pasta',
    rating: 4.5,
    deliveryTime: '25-35 min',
    image: 'https://picsum.photos/seed/res1/600/400',
    priceRange: '$$',
    priceForTwo: 800,
    dishes: [
      { id: 'd1', name: 'Margherita Pizza', description: 'Fresh tomatoes, mozzarella, and basil.', price: 12.99, image: 'https://picsum.photos/seed/dish1/400/300', category: 'Pizza' },
      { id: 'd2', name: 'Truffle Mushroom Risotto', description: 'Creamy Arborio rice with wild mushrooms and truffle oil.', price: 18.50, image: 'https://picsum.photos/seed/dish2/400/300', category: 'Pasta' }
    ]
  }
];
