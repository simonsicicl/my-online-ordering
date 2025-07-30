// src/item.js
// This file handles the item page functionality, including fetching item data,
// displaying item details, and managing user interactions such as adding items to the cart.
// It retrieves item data from localStorage, constructs the item page,
// and handles the submission of item options and quantities.
// The code is designed to be modular and reusable, allowing for easy updates and maintenance.
// It is expected to be used in conjunction with other files such as menu.js and config.js


import {restaurantApiUrl, restaurantDataExample} from './config.js';

async function fetchItem() {
    // Initialize variables
    var item_page_info, under_combo, item, menu;

    // Load and parse menu and item-page-info from localStorage, and extract item or sub_item
    try {
        item_page_info = JSON.parse(localStorage.getItem('itemPageInfo'));
        under_combo = item_page_info.under_combo;
        item = item_page_info.under_combo ? item_page_info.sub_item : item_page_info.item;
        const restaurant = JSON.parse(localStorage.getItem('restaurant'));
        menu = restaurant.menu || [];
    } catch (error) {
        console.error('Loading item-page-info from localStorage failed:', error);
        return;
    }

    // Load the item and options into the page, and set the Submit behavior
    try {
        if (!item.is_available) {
            alert('This item is not available.');
            window.location.href = 'menu.html';
        }
        document.getElementById('item-name').textContent = item.name;
        document.getElementById('item-price').textContent = `$${item.price}`;
        document.getElementById('item-description').textContent = item.description;
        document.getElementById('item-image').src = item.image_url;
        document.getElementById('quantity').max = `${item_page_info.max_quantity}`;
        
        if (under_combo)
            document.getElementById('submit-button').textContent = 'Add to Combo';
        else
            document.getElementById('submit-button').textContent = 'Add to Cart';
        if (item.is_combo) {
            updateComboItems(item, menu, item_page_info)
            showSelectedComboItems(item, item_page_info.order);
        } else if (item.is_optional) {
            updateOptions(item.option_groups);
        }

        // Add to Cart (Form Submit)
        document.getElementById('item-form').addEventListener('submit', function (e) {

            e.preventDefault(); // Prevent the form from being submitted

            const quantity = parseInt(document.getElementById('quantity').value, 10);
            const note = document.getElementById('note').value;

            // Collect option data
            const optionGroups = document.querySelectorAll('#options fieldset');
            const selectedOptions = [];

            optionGroups.forEach(group => {
                const inputs = group.querySelectorAll('input:checked');
                inputs.forEach(input => {
                    selectedOptions.push({
                        groupId: parseInt(input.name.replace('option-group-', ''), 10),
                        optionId: parseInt(input.value, 10)
                    });
                });
            });

            // Save to localStorage (design key as needed)
            if (under_combo) {
                const new_item = {
                    item_id: item_page_info.sub_item.item_id,
                    name: item_page_info.sub_item.name,
                    quantity: quantity,
                    note: note
                }

                item_page_info.order.combo_item_groups[item_page_info.group_id].push(new_item)

                item_page_info.under_combo = false;
                item_page_info.sub_item = null;
                item_page_info.group_id = null;
                item_page_info.max_quantity = 10;

                localStorage.setItem('itemPageInfo', JSON.stringify(item_page_info));
                window.location.href = 'item.html';
            } else {
                item_page_info.order.quantity = quantity;
                item_page_info.order.note = note;
                item_page_info.order.options = selectedOptions;

                const cart = JSON.parse(localStorage.getItem('cart')) || [];
                cart.push(item_page_info.order);
                localStorage.setItem('cart', JSON.stringify(cart));
                window.location.href = 'menu.html';
            }
        });
    } catch (error) {
        console.error('Error loading item page info:', error);
    }
}

function updateComboItems(combo, menu, item_page_info) {
    const combo_item_groups = combo.combo_item_groups;
    const comboItemsDiv = document.getElementById('combo-items');
    comboItemsDiv.innerHTML = ''; // Clear previous content

    // Create a Map for quick item lookup by item_id
    const itemMap = new Map(menu.map(item => [item.item_id, item]));

    combo_item_groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'combo-group';

        const groupTitle = document.createElement('h3');
        groupTitle.textContent = `${group.group_name} (Choose ${group.quantity} items)`;
        groupDiv.appendChild(groupTitle);

        const selected_items_div = document.createElement('div');
        selected_items_div.className = 'selected-items';
        selected_items_div.id = `selected-items-${group.item_group_id}`;
        groupDiv.appendChild(selected_items_div);

        const itemList = document.createElement('ul');
        const selectLi = document.createElement('li');
        selectLi.textContent = 'Select Item';
        selectLi.onclick = () => openItemPopup(group, itemMap, item_page_info);
        itemList.appendChild(selectLi);
        groupDiv.appendChild(itemList);
        
        comboItemsDiv.appendChild(groupDiv);
    });
}




function updateOptions(optionsData) {
    const optionsDiv = document.getElementById('options');
    optionsDiv.innerHTML = ''; // Clear previous content

    optionsData.forEach(group => {
        const groupContainer = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = group.group_name + (group.is_required ? ' *' : '');
        groupContainer.appendChild(legend);

        group.options.forEach(option => {
            const input = document.createElement('input');
            const label = document.createElement('label');
            const inputId = `option-${group.option_group_id}-${option.option_id}`;

            input.type = group.is_multiple ? 'checkbox' : 'radio';
            input.name = `option-group-${group.option_group_id}`;
            input.value = option.option_id;
            input.id = inputId;

            if (group.default_option_id === option.option_id) {
                input.checked = true;
            }

            label.htmlFor = inputId;
            label.textContent = `${option.option_name}${option.price_delta > 0 ? `（+${option.price_delta}元）` : ''}`;

            const wrapper = document.createElement('div');
            wrapper.appendChild(input);
            wrapper.appendChild(label);

            groupContainer.appendChild(wrapper);
        });

        optionsDiv.appendChild(groupContainer);
    });
}

function showSelectedComboItems(combo, order) {
    combo.combo_item_groups.forEach(group => {
        const selected_items_div = document.getElementById(`selected-items-${group.item_group_id}`);
        order.combo_item_groups[group.item_group_id].forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'selected-item';
        
            const name = document.createElement('p');
            name.textContent = `✔ Selected: ${item.name} * ${item.quantity}`;

            const note = document.createElement('p');
            note.textContent = item.note ? `Note: ${item.note}` : '';

            itemDiv.appendChild(name);
            if (item.note) itemDiv.appendChild(note);
        
            selected_items_div.appendChild(itemDiv);
        });
    })
    
}

function openItemPopup(group, itemMap, item_page_info) {
    const popup = document.getElementById('item-popup');
    const list = document.getElementById('popup-item-list');
    list.innerHTML = '';
  
    group.items.forEach(itemId => {
      const item = itemMap.get(itemId);
      if (item) {
        const itemLi = document.createElement('li');
        const img = document.createElement('img');
        img.src = item.image_url;
        img.alt = item.name;
        img.style.width = '100px';
        img.style.display = 'block';

        const text = document.createElement('span');
        text.textContent = `${item.name} - NT$${item.price}`;

        itemLi.appendChild(text);
        itemLi.appendChild(img);
        
        itemLi.onclick = () => {
          item_page_info.under_combo = true;
          item_page_info.sub_item = item;
          item_page_info.group_id = group.item_group_id;
          item_page_info.max_quantity = group.quantity;
          localStorage.setItem('itemPageInfo', JSON.stringify(item_page_info));
          window.location.href = 'item.html';
        };
        list.appendChild(itemLi);
      }
    });
  
    popup.showModal();
  }  
  

fetchItem();