
export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  image: string;
  priceRange: string;
  priceForTwo?: number;
  dishes: Dish[];
}

export interface CartItem extends Dish {
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'Preparing' | 'Out for delivery' | 'Delivered';
  createdAt: string;
  restaurantName: string;
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Pending';
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  address?: string;
  role: 'user' | 'admin';
  walletBalance?: number;
  wingoBalance?: number;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  upiId: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  createdAt: string;
}

export interface WingoConfig {
  id: string;
  periodId: string;
  number: number;
}
