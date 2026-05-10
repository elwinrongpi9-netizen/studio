
import { Restaurant } from './types';

export const RESTAURANTS: Restaurant[] = [
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
      { id: 'd2', name: 'Truffle Mushroom Risotto', description: 'Creamy Arborio rice with wild mushrooms and truffle oil.', price: 18.50, image: 'https://picsum.photos/seed/dish2/400/300', category: 'Pasta' },
      { id: 'd3', name: 'Spaghetti Bolognese', description: 'Classic Italian meat sauce with fresh herbs.', price: 14.99, image: 'https://picsum.photos/seed/pasta/400/300', category: 'Pasta' }
    ]
  },
  {
    id: '2',
    name: 'Burger Haven',
    cuisine: 'American, Fast Food, Burgers',
    rating: 4.2,
    deliveryTime: '15-25 min',
    image: 'https://picsum.photos/seed/res2/600/400',
    priceRange: '$',
    priceForTwo: 400,
    dishes: [
      { id: 'd4', name: 'Bacon Cheeseburger', description: 'Crispy bacon, cheddar cheese, and signature sauce.', price: 10.99, image: 'https://picsum.photos/seed/dish3/400/300', category: 'Burgers' },
      { id: 'd5', name: 'Spicy Chicken Burger', description: 'Zesty fried chicken breast with jalapeños.', price: 9.50, image: 'https://picsum.photos/seed/chicken/400/300', category: 'Burgers' }
    ]
  },
  {
    id: '3',
    name: 'Sushi Zen',
    cuisine: 'Japanese, Seafood, Sushi',
    rating: 4.8,
    deliveryTime: '30-45 min',
    image: 'https://picsum.photos/seed/res3/600/400',
    priceRange: '$$$',
    priceForTwo: 1500,
    dishes: [
      { id: 'd6', name: 'Salmon Nigiri Set', description: '8 pieces of premium salmon nigiri.', price: 22.00, image: 'https://picsum.photos/seed/dish4/400/300', category: 'Sushi' },
      { id: 'd7', name: 'Dragon Roll', description: 'Shrimp tempura, eel, avocado, and unagi sauce.', price: 16.50, image: 'https://picsum.photos/seed/dragon/400/300', category: 'Sushi' }
    ]
  },
  {
    id: '4',
    name: 'Curry Delight',
    cuisine: 'Indian, Curries, North Indian',
    rating: 4.4,
    deliveryTime: '20-30 min',
    image: 'https://picsum.photos/seed/res4/600/400',
    priceRange: '$$',
    priceForTwo: 600,
    dishes: [
      { id: 'd8', name: 'Butter Chicken', description: 'Rich tomato-based curry with tender chicken.', price: 15.99, image: 'https://picsum.photos/seed/dish5/400/300', category: 'Main Course' },
      { id: 'd9', name: 'Garlic Naan', description: 'Freshly baked tandoori bread with garlic butter.', price: 3.50, image: 'https://picsum.photos/seed/naan/400/300', category: 'Sides' }
    ]
  },
  {
    id: '5',
    name: 'Bao & Dimsum',
    cuisine: 'Chinese, Asian',
    rating: 4.1,
    deliveryTime: '25-40 min',
    image: 'https://picsum.photos/seed/res5/600/400',
    priceRange: '$$',
    priceForTwo: 700,
    dishes: [
      { id: 'd10', name: 'Pork Bao', description: 'Steamed buns with juicy pork filling.', price: 8.99, image: 'https://picsum.photos/seed/bao/400/300', category: 'Starters' }
    ]
  },
  {
    id: '6',
    name: 'Green Kitchen',
    cuisine: 'Healthy, Salads, Vegan',
    rating: 4.6,
    deliveryTime: '20-35 min',
    image: 'https://picsum.photos/seed/res6/600/400',
    priceRange: '$$',
    priceForTwo: 550,
    dishes: [
      { id: 'd11', name: 'Quinoa Bowl', description: 'Healthy quinoa with roasted vegetables.', price: 11.99, image: 'https://picsum.photos/seed/salad/400/300', category: 'Healthy' }
    ]
  }
];
