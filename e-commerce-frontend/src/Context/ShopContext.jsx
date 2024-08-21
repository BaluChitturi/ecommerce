import React, { createContext, useEffect, useState } from "react";

export const ShopContext = createContext(null);

const ShopContextProvider = (props) => {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState(getDefaultCart());

  const getDefaultCart = () => {
    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }
    return cart;
  };

  useEffect(() => {
    // Fetch products from the live backend
    fetch('https://ecommerce-backend-w15r.onrender.com/allproducts')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((error) => console.error('Error fetching products:', error));

    // Fetch cart items if user is authenticated
    const token = localStorage.getItem("auth-token");
    if (token) {
      fetch('https://ecommerce-backend-w15r.onrender.com/getcart', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'auth-token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty body is fine here
      })
      .then((resp) => resp.json())
      .then((data) => setCartItems(data))
      .catch((error) => console.error('Error fetching cart items:', error));
    }
  }, []);

  const getTotalCartAmount = () => {
    let totalAmount = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        let itemInfo = products.find((product) => product.id === Number(item));
        if (itemInfo) {
          totalAmount += cartItems[item] * itemInfo.new_price;
        }
      }
    }
    return totalAmount;
  };

  const getTotalCartItems = () => {
    let totalItem = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        totalItem += cartItems[item];
      }
    }
    return totalItem;
  };

  const addToCart = (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));

    const token = localStorage.getItem("auth-token");
    if (token) {
      fetch('https://ecommerce-backend-w15r.onrender.com/addtocart', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'auth-token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      })
      .then((resp) => resp.json())
      .then((data) => console.log('Added to cart:', data))
      .catch((error) => console.error('Error adding to cart:', error));
    }
  };

  const removeFromCart = (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));

    const token = localStorage.getItem("auth-token");
    if (token) {
      fetch('https://ecommerce-backend-w15r.onrender.com/removefromcart', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'auth-token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      })
      .then((resp) => resp.json())
      .then((data) => console.log('Removed from cart:', data))
      .catch((error) => console.error('Error removing from cart:', error));
    }
  };

  const contextValue = {
    products,
    getTotalCartItems,
    cartItems,
    addToCart,
    removeFromCart,
    getTotalCartAmount
  };

  return (
    <ShopContext.Provider value={contextValue}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;
