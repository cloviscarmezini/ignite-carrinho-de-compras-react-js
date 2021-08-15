import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProduct = cart.find(cartProduct => cartProduct.id === productId);

      if(cartProduct) {
        updateProductAmount({
          productId: productId,
          amount: cartProduct.amount + 1
        });

        return;
      }

      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);

      if(!productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return false;
      }

      const { data: product } = await api.get(`/products/${productId}`);

      const newProduct = {
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        amount: 1
      };
      
      const updatedCart = [...cart, newProduct];

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

      setCart(updatedCart);
    } catch(error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartProduct = cart.find(cartProduct => cartProduct.id === productId);
      if(!cartProduct) {
        throw new Error('Produto não encontrado no carrinho');
      }
      const updatedCart = cart.filter(product=>product.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        throw new Error('Não é possível atualizar remover mais unidades');
      }

      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);

      if(amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return false;
      }

      const updatedCart = cart.map(product=>{
        return product.id === productId
        ? {
          id: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          amount: amount
        } : product;
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

      setCart(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
