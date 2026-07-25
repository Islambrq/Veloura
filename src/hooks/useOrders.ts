import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';

export function useOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('placed_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data ?? []) as Order[]);
        setIsLoading(false);
      });
  }, [userId]);

  return { orders, isLoading };
}

export function useOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data }) => {
        setOrder((data as Order) ?? null);
        setIsLoading(false);
      });
  }, [orderId]);

  return { order, isLoading };
}
