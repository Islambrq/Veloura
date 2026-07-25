import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { ToastProvider } from '@/components/ui/Toast';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { AdminRoute } from '@/routes/AdminRoute';

import { HomePage } from '@/pages/HomePage';
import { ProductListPage } from '@/pages/ProductListPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { CheckoutSuccessPage } from '@/pages/CheckoutSuccessPage';
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { WishlistPage } from '@/pages/WishlistPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AccountPage } from '@/pages/AccountPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage';
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage';
import { AdminProductFormPage } from '@/pages/admin/AdminProductFormPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminCouponsPage } from '@/pages/admin/AdminCouponsPage';
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage';
import { AdminOrderDetailPage } from '@/pages/admin/AdminOrderDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductListPage />} />
                  <Route path="/products/:slug" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <CheckoutPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <OrdersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders/:orderId"
                    element={
                      <ProtectedRoute>
                        <OrderConfirmationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/wishlist"
                    element={
                      <ProtectedRoute>
                        <WishlistPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute>
                        <AccountPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminDashboardPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <AdminRoute>
                        <AdminAnalyticsPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/products"
                    element={
                      <AdminRoute>
                        <AdminProductsPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/products/:productId"
                    element={
                      <AdminRoute>
                        <AdminProductFormPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/categories"
                    element={
                      <AdminRoute>
                        <AdminCategoriesPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/coupons"
                    element={
                      <AdminRoute>
                        <AdminCouponsPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/orders"
                    element={
                      <AdminRoute>
                        <AdminOrdersPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/orders/:orderId"
                    element={
                      <AdminRoute>
                        <AdminOrderDetailPage />
                      </AdminRoute>
                    }
                  />

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

