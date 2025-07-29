// src/cart.js
// This file handles the shopping cart functionality, including displaying cart contents,
// removing items, and submitting orders.
// It retrieves cart data from localStorage, constructs the cart page, 
// and handles user interactions such as removing items and submitting orders.
// The code is designed to be modular and reusable, allowing for easy updates and maintenance.
// It is expected to be used in conjunction with other files such as menu.js and config.js


import {restaurantApiUrl, restaurantDataExample} from './config.js';

// Get cart data from localStorage
const cart = JSON.parse(localStorage.getItem('cart')) || [];

// Display cart contents
function renderCart() {
  const cartList = document.getElementById('cart-list');
  const totalAmount = document.getElementById('total-amount');
  cartList.innerHTML = '';
  let total = 0;

  cart.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${item.name}</strong> x ${item.quantity} - $${item.price * item.quantity}<br>
      <em>${item.note || ''}</em><br>
      <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
    `;
    cartList.appendChild(li);
    total += item.price * item.quantity;
  });

  totalAmount.textContent = `$${total.toFixed(2)}`;
}

// Remove item
function removeItem(index) {
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}

// Submit order
function submitOrder() {
  if (cart.length === 0) {
    alert('The cart is empty. Please add items before submitting.');
    return;
  }

  fetch('https://yqya5f6a21.execute-api.ap-northeast-3.amazonaws.com/Stage_1/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: cart })
  })
  .then(response => response.json())
  .then(result => {
    alert('Order submitted successfully! Order ID: ' + result.orderId);
    localStorage.removeItem('cart');
    renderCart();
  })
  .catch(error => {
    console.error('Failed to submit order:', error);
    alert('Failed to submit order. Please try again later.');
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', renderCart);
