
import { Restaurant } from './types';

export const RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'Zomato Italiano',
    cuisine: 'Italian, Pizza',
    rating: 4.5,
    deliveryTime: '25-35 min',
    image: 'https://picsum.photos/seed/res1/600/400',
    priceRange: '$$',
    dishes: [
      { id: 'd1', name: 'Margherita Pizza', description: 'Fresh tomatoes, mozzarella, and basil.', price: 12.99, image: 'https://picsum.photos/seed/dish1/400/300', category: 'Pizza' },
      { id: 'd2', name: 'Truffle Mushroom Risotto', description: 'Creamy Arborio rice with wild mushrooms and truffle oil.', price: 18.50, image: 'https://picsum.photos/seed/dish2/400/300', category: 'Pasta' },
      { id: 'd3', name: 'Spaghetti Bolognese', description: 'Classic Italian meat sauce with fresh herbs.', price: 14.99, image: 'https://picsum.photos/seed/pasta/400/300', category: 'Pasta' }
    ]
  },
  {
    id: '2',
    name: 'Burger Haven',
    cuisine: 'American, Fast Food',
    rating: 4.2,
    deliveryTime: '15-25 min',
    image: 'https://picsum.photos/seed/res2/600/400',
    priceRange: '$',
    dishes: [
      { id: 'd4', name: 'Bacon Cheeseburger', description: 'Crispy bacon, cheddar cheese, and signature sauce.', price: 10.99, image: 'https://picsum.photos/seed/dish3/400/300', category: 'Burgers' },
      { id: 'd5', name: 'Spicy Chicken Burger', description: 'Zesty fried chicken breast with jalapeños.', price: 9.50, image: 'https://picsum.photos/seed/chicken/400/300', category: 'Burgers' }
    ]
  },
  {
    id: '3',
    name: 'Sushi Zen',
    cuisine: 'Japanese, Seafood',
    rating: 4.8,
    deliveryTime: '30-45 min',
    image: 'https://picsum.photos/seed/res3/600/400',
    priceRange: '$$$',
    dishes: [
      { id: 'd6', name: 'Salmon Nigiri Set', description: '8 pieces of premium salmon nigiri.', price: 22.00, image: 'https://picsum.photos/seed/dish4/400/300', category: 'Sushi' },
      { id: 'd7', name: 'Dragon Roll', description: 'Shrimp tempura, eel, avocado, and unagi sauce.', price: 16.50, image: 'https://picsum.photos/seed/dragon/400/300', category: 'Sushi' }
    ]
  },
  {
    id: '4',
    name: 'Curry Delight',
    cuisine: 'Indian, Curries',
    rating: 4.4,
    deliveryTime: '20-30 min',
    image: 'https://picsum.photos/seed/res4/600/400',
    priceRange: '$$',
    dishes: [
      { id: 'd8', name: 'Butter Chicken', description: 'Rich tomato-based curry with tender chicken.', price: 15.99, image: 'https://picsum.photos/seed/dish5/400/300', category: 'Main Course' },
      { id: 'd9', name: 'Garlic Naan', description: 'Freshly baked tandoori bread with garlic butter.', price: 3.50, image: 'https://picsum.photos/seed/naan/400/300', category: 'Sides' }
    ]
  }
];
