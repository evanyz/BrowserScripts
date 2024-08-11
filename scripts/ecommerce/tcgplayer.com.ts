// ==UserScript==
// @name         Order Label printer
// @namespace    http://tampermonkey.net/
// @version      2024-08-11
// @description  To print a better version of order instead of website default one
// @author       YZ
// @match        https://store.tcgplayer.com/admin/orders/manageorder/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tcgplayer.com
// @grant        none
// ==/UserScript==

(async function() {
  'use strict';
  const LOOP_INTERVAL = 1000 // ms
  const MAX_TRY_TIMES = 10
  let current_time = 0
  let loaded = false
  console.log('scrip is running')

  const getNewPrintButton = () => {
    const button = document.createElement('button');
    button.textContent = 'slap hapi\'s but';
    button.id = 'new-order-label-print-button';
    button.className = 'button';
    button.style.marginLeft ='8px'
    button.style.backgroundColor = 'DarkOrange'
    button.style.color = 'white'
    // const buttonWrapper = document.createElement('div');
    // buttonWrapper.role = 'button'
    // buttonWrapper.appendChild(button)
    return button
  }

  const addButton = () => {
    const buttonParent = document.querySelector('#rightSide div.widgets > div:nth-child(1) > div:nth-child(1) > div:nth-child(2)  > div:nth-child(2)')
    if (buttonParent) {
      // append a new button as its child
      buttonParent.appendChild(getNewPrintButton())
      loaded = true
      console.log('button is added')
    } else {
      console.error('unable to find button parent node ', current_time)
    }
  }
 
  const getOrderInfo = () => {
    const result = {
      shipping_address: {
        name: null,
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        zipcode: null,
      },
      shipping_info: {
        method: null,
        est_delivery_date: null,
        tracking_num: null
      },
      general_info: {
        order_number: null,
        order_date: null,
      },
      transaction_details: {
        product_amount: null,
        shipping_cost: null,
        order_amount: null,
        fee_amount: null,
        net_amount: null
      },
      products: [{}]
    }
    // shipping address

    // shipping info

    // general info

    // transaction details

    // products
    return result
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  while (!loaded && current_time < MAX_TRY_TIMES) {
    addButton()
    current_time++
    await sleep(LOOP_INTERVAL)
  }
})();