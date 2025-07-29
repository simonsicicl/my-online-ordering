// src/menu.js
// This file is responsible for fetching and displaying the restaurant menu.
// It retrieves restaurant data from an API or uses example data for testing,
// constructs the menu page, and handles user interactions.
// The menu items are displayed with their images, names, and prices.
// It also handles navigation to individual item pages for more details.
// The code includes error handling for data fetching and parsing.
// The restaurant data is stored in localStorage for later use.
// The menu is dynamically generated based on the fetched or example data.
// The code is designed to be modular and reusable, allowing for easy updates and maintenance.
// The file is part of a larger online ordering system for restaurants.
// It is expected to be used in conjunction with other files such as item.js and config.js


import {restaurantApiUrl, restaurantDataExample} from './config.js';

async function fetchMenu() {
    // Initialize variables
    var restaurantData = restaurantDataExample; // Use the example data for testing
    var merchant_id, merchant_info, categories, tags, menu;

    // Download and save restaurant information and menu
    try {
        // // Fetch the restaurant data from the API
        // const response = await fetch(restaurantApiUrl);
        // restaurantData = await response.json();
        if (!restaurantData || !restaurantData.merchant_id || !restaurantData.merchant_info || !restaurantData.categories || !restaurantData.tags || !restaurantData.menu)
            throw new Error('Restaurant information or menu format error - items may be missing');
        if (restaurantData.merchant_info.is_active === false) 
            throw new Error('Merchant is not active');
        if (!Array.isArray(restaurantData.menu) || !Array.isArray(restaurantData.categories) || !Array.isArray(restaurantData.tags))
            throw new Error('Menu, categories or tags are not arrays');
        // Extract necessary data
        ({ merchant_id, merchant_info, categories, tags, menu } = restaurantData);
        // Save to localStorage
        localStorage.setItem('restaurant', JSON.stringify(restaurantData));
    } catch (error) {
        console.error('Download or save restaurant information and menu failed:', error);
        return;
    }

    // Construct the page with the restaurant information and menu
    try {
        // Set the document title and merchant information
        document.title = `${merchant_info.name} - Menu`;
        document.getElementById('merchant-name').textContent = merchant_info.name;
        document.getElementById('merchant-description').textContent = merchant_info.description;
        document.getElementById('merchant-address').textContent = merchant_info.address;
        document.getElementById('merchant-phone').textContent = merchant_info.phone;

        // Create the menu list
        const menuList = document.getElementById('menu-list');
        menu.forEach(item => {
            // Skip items that are not available
            if (!item.is_available) return;
            // Create a list item for each menu item
            const li = document.createElement('li');
            li.className = 'menu-item';
            // Create an image and text for the menu item
            const img = document.createElement('img');
            img.src = item.image_url;
            img.alt = item.name;
            img.style.width = '100px';
            img.style.display = 'block';
            const text = document.createElement('span');
            text.textContent = `${item.name} - $${item.price}`;
            // If the item is a combo, prepare the combo item groups
            const combo_item_groups = {};
            if (item.is_combo) {
                item.combo_item_groups.forEach(group => {
                    combo_item_groups[group['item_group_id']] = []
                })
            }
            // Prepare the item page information
            const item_page_info = {
                under_combo: false,
                item: item,
                sub_item: null,
                group_id: null,
                quantity: 1,
                note: null,
                max_quantity: 10,
                order: {
                    item_id: item.item_id,
                    quantity: 1,
                    note: null,
                    is_combo: item.is_combo,
                    combo_item_groups: combo_item_groups,
                    options: []
                }
            }
            // Add the text and image to the list item
            li.appendChild(text);
            li.appendChild(img);
            // Add click event to the list item to navigate to the item page
            li.onclick = () => {
                localStorage.setItem('itemPageInfo', JSON.stringify(item_page_info));
                window.location.href = 'item.html';
            };
            // Add the list item to the menu list
            menuList.appendChild(li);
        });
    } catch (error) {
        console.error('Construct menu items failed:', error);
    }
}

fetchMenu();
