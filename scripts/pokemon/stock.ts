// ==UserScript==
// @name         Pokemon Product Stock Tracker with Debug Buttons
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Track product stock changes on Pokemon Center with debug buttons
// @author       Your Name
// @match        https://www.pokemoncenter.com/category/elite-trainer-box*
// @match        https://www.pokemoncenter.com/category/trading-card-game*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

/**
 * https://www.pokemoncenter.com/category/trading-card-game?ps=96&category=S0105-0001-0000%2CS0105-0001-0001%2Cboxed-sets%2CS0105-0001-0007%2CS0105-0001-0002%2CS0105-0001-0003
https://www.pokemoncenter.com/category/trading-card-game?ps=96&category=S0105-0001-0000%2CS0105-0001-0001%2Cboxed-sets%2CS0105-0001-0007%2CS0105-0001-0002%2CS0105-0001-0003&page=2
https://www.pokemoncenter.com/category/trading-card-game?ps=96&category=S0105-0001-0000%2CS0105-0001-0001%2Cboxed-sets%2CS0105-0001-0007%2CS0105-0001-0002%2CS0105-0001-0003&page=3
https://www.pokemoncenter.com/category/trading-card-game?ps=96&category=S0105-0001-0000%2CS0105-0001-0001%2Cboxed-sets%2CS0105-0001-0007%2CS0105-0001-0002%2CS0105-0001-0003&page=4
 * 
 */

(function () {
  "use strict";

  let trackedItems = new Map(); // Stores the current stock status of items
  const itemsToNotify = []; // Stores new items or items that became in stock
  /**
   * pageScanCount is a Map: pageKey -> number (how many times we've scanned this page).
   * 0 means we haven't scanned yet (first load).
   * If it's 1, that means we've loaded once (on the second load, it becomes 2), etc.
   */
  let pageScanCount = new Map();
  const debugFakeItemName = "Fake Product";
  const period = 5 * 60 * 1000;
  const discordWebhookUrl =
    "https://discord.com/api/webhooks/1327545689533583442/LeqCAyb0vP66R6sZTbLvXxXfO1dquZN5TRN74JNqYrRh7qjBj9vD49HBuTXxGVb6Nig6";
  const localStorageKey = "pokemonTrackerState0";

  // Helper to identify the current page.
  // You could make this more elaborate if needed (e.g., domain + path).
  function getCurrentPageKey() {
    // Return both the pathname and the query string (search)
    // You can optionally add the hash if you want: + window.location.hash
    return window.location.pathname + window.location.search;
  }

  // -----------------------------
  //  1) Load/Store to localStorage, return error
  // -----------------------------
  function loadStateFromLocalStorage() {
    try {
      const rawState = localStorage.getItem(localStorageKey);
      if (!rawState) return false; // continue with intialized maps

      const parsed = JSON.parse(rawState);
      if (parsed && typeof parsed === "object") {
        // Recover pageScanCount
        if (parsed.pageScanCountArray) {
          pageScanCount = new Map(parsed.pageScanCountArray);
        }
        if (parsed.trackedItemsArray) {
          // Convert stored array back into a Map
          trackedItems = new Map(parsed.trackedItemsArray);
        }
        return false;
      }
    } catch (e) {
      console.error("Error parsing localStorage state:", e);
      return true;
    }
  }

  function storeStateToLocalStorage() {
    try {
      const state = {
        pageScanCountArray: Array.from(pageScanCount.entries()),
        // Convert Map to an array so we can serialize in JSON
        trackedItemsArray: Array.from(trackedItems.entries()),
      };
      localStorage.setItem(localStorageKey, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving state to localStorage:", e);
    }
  }

  // Function to scrape product data
  const scrapeProducts = () => {
    let productBoxes = document.querySelectorAll("div[class^='product-box--']");

    let products = Array.from(productBoxes).map((box) => {
      const titleElement = box.querySelector("h1[class^='product-title--']");
      const productName = titleElement
        ? titleElement.textContent.trim()
        : "Unknown Product";

      const outOfStockElement = box.querySelector(
        "div[class^='product-image-oos--']"
      );
      const isOutOfStock = !!outOfStockElement;

      const linkElement = box.querySelector("a");
      const productLink = linkElement
        ? `https://www.pokemoncenter.com${linkElement.getAttribute("href")}`
        : null;

      const imageElement = box.querySelector(
        "img[class^='product-image-main--']"
      );
      const productImage = imageElement
        ? imageElement.getAttribute("src")
        : null; // Extract image source

      return {
        name: productName,
        inStock: !isOutOfStock,
        link: productLink, // Add the product link
        element: box, // Reference to the DOM element
        image: productImage, // Add the product image
      };
    });

    return products;
  };

  // Function to send a Discord message
  const sendDiscordMessage = (items) => {
    const embeds = items.map((item) => ({
      title: item.name,
      description:
        item.status === "Back In Stock"
          ? "Back in stock!"
          : "New item available!",
      url: item.link, // Add the product link
      color: item.status === "Back In Stock" ? 0x00ff00 : 0x0000ff, // Green for back in stock, blue for new item
      image: { url: item.image }, // Add the product image
    }));

    GM_xmlhttpRequest({
      method: "POST",
      url: discordWebhookUrl,
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        embeds, // Send embeds for structured messages
      }),
      onload: (response) => {
        if (response.status >= 200 && response.status < 300) {
          console.log("Discord message sent successfully for items:", items);
        } else {
          console.error(
            "Failed to send Discord message:",
            response.status,
            response.statusText
          );
        }
      },
      onerror: (error) => {
        console.error("Error sending Discord message:", error);
      },
    });
  };

  // Function to notify users
  const notifyUsers = async (items) => {
    if (items.length === 0) {
      console.log("No items to notify.");
      return;
    }

    console.log("Notifying users about these items: ", items.length, " items");

    // Send the message to Discord
    await sendDiscordMessage(items);

    // Update the stock status in trackedItems to mark them as processed
    items.forEach((item) => {
      trackedItems.set(item.name, true); // Assume item is now in stock after notification
      console.log(`Marked ${item.name} as processed in trackedItems.`);
    });

    // Clear itemsToNotify after processing
    itemsToNotify.length = 0;
  };

  // Function to perform periodic scans
  const runPeriodicScan = () => {
    // console.log("add fake item");
    // addFakeItem();
    // console.log("toggle first item stock status");
    // toggleFirstItem();

    const currentPageKey = getCurrentPageKey();
    const currentScanCount = pageScanCount.get(currentPageKey) || 0;

    console.log(
      `Starting scan #${currentScanCount + 1} on page: ${currentPageKey}`
    );

    const products = scrapeProducts();
    const itemsToNotifyThisRound = checkForUpdates(products);

    if (currentScanCount >= 1) {
      console.log("Items to Notify:", itemsToNotifyThisRound);

      // Call the notifyUsers function to process itemsToNotify
      notifyUsers(itemsToNotifyThisRound);
    } else {
      console.log("First run: Initializing stock status...");
    }

    // Increment the scan count for this page
    pageScanCount.set(currentPageKey, currentScanCount + 1);

    // Store the updated state to localStorage
    storeStateToLocalStorage();

    // Reload the page after `reloadInterval` ms
    setTimeout(() => {
      console.log(`Reloading the page in ${period / 1000} seconds...`);
      location.reload();
    }, period);
  };
  // Function to toggle the stock status of the first item in the map
  const toggleFirstItem = () => {
    const firstItem = Array.from(trackedItems.keys())[0];
    if (firstItem) {
      const currentStatus = trackedItems.get(firstItem);
      trackedItems.set(firstItem, !currentStatus); // Toggle the status
      console.log(
        `Toggled stock status for: ${firstItem} - Now: ${
          !currentStatus ? "In Stock" : "Out of Stock"
        }`
      );
    } else {
      console.log("No items to toggle in trackedItems.");
    }
  };

  // Function to add a fake new item by cloning the first item's DOM
  const addFakeItem = () => {
    const grid = document.querySelector("div[class^='category-products-grid']");
    if (grid) {
      const firstItem = grid.querySelector("div[class^='product--']");
      if (firstItem && !trackedItems.has(debugFakeItemName)) {
        // Clone the first item's DOM
        const clonedItem = firstItem.cloneNode(true);

        // Update the cloned item's title
        const titleElement = clonedItem.querySelector(
          "h1[class^='product-title--']"
        );
        if (titleElement) {
          titleElement.textContent = debugFakeItemName; // Set the fake title
        }

        // Optional: Update other properties like price or image (if needed)
        const priceElement = clonedItem.querySelector(
          "div[class^='product-price--']"
        );
        if (priceElement) {
          priceElement.textContent = "$0.00"; // Set a fake price
        }

        // Add the cloned item to the grid
        grid.appendChild(clonedItem);

        // Add the fake item to trackedItems
        console.log(`Added fake item: ${debugFakeItemName}`);
      } else {
        console.log("Fake item already exists or no items found to clone.");
      }
    } else {
      console.log("Product grid not found on the page.");
    }
  };

  // Function to remove the fake item
  const removeFakeItem = () => {
    const grid = document.querySelector("div[class^='category-products-grid']");
    const fakeItem = Array.from(
      grid?.querySelectorAll("div.product-box--fake") || []
    )[0];
    if (fakeItem && trackedItems.has(debugFakeItemName)) {
      fakeItem.remove(); // Remove from DOM
      trackedItems.delete(debugFakeItemName); // Remove from trackedItems
      console.log(`Removed fake item: ${debugFakeItemName}`);
    } else {
      console.log("No fake item found to remove.");
    }
  };

  // Add debug buttons to the page
  const addDebugButtons = () => {
    const buttonContainer = document.createElement("div");
    buttonContainer.style.position = "fixed";
    buttonContainer.style.bottom = "10px";
    buttonContainer.style.left = "10px";
    buttonContainer.style.backgroundColor = "white";
    buttonContainer.style.border = "1px solid black";
    buttonContainer.style.padding = "10px";
    buttonContainer.style.zIndex = "9999";

    const toggleButton = document.createElement("button");
    toggleButton.textContent = "Toggle First Item";
    toggleButton.onclick = toggleFirstItem;

    const addButton = document.createElement("button");
    addButton.textContent = "Add Fake Item";
    addButton.onclick = addFakeItem;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove Fake Item";
    removeButton.onclick = removeFakeItem;

    buttonContainer.appendChild(toggleButton);
    buttonContainer.appendChild(addButton);
    buttonContainer.appendChild(removeButton);
    document.body.appendChild(buttonContainer);
  };

  // Function to check for updates
  const checkForUpdates = (products) => {
    const currentPageKey = getCurrentPageKey();
    const currentPageScanCount = pageScanCount.get(currentPageKey) || 0;
    // If scan count is 0, it's effectively the first load on this page
    const isFirstLoadForPage = currentPageScanCount === 0;

    products.forEach((product) => {
      const { name, inStock, link, image } = product;

      if (isFirstLoadForPage) {
        // Initialize the tracked items on the first run
        trackedItems.set(name, inStock);
      } else {
        if (trackedItems.has(name)) {
          const previousStatus = trackedItems.get(name);

          // If stock status changed to in stock, add to notification list
          if (!previousStatus && inStock) {
            console.log(`Item back in stock: ${name}`);
            itemsToNotify.push({ name, link, image, status: "Back In Stock" });
          }
        } else {
          // New product detected
          console.log(`New item detected: ${name}`);
          itemsToNotify.push({ name, link, image, status: "New Item" });
        }

        // Update the tracked items
        trackedItems.set(name, inStock);
      }
    });

    return [...itemsToNotify];
  };

  // Initial run
  window.addEventListener("load", () => {
    console.log("Page loaded. Starting stock tracker...");
    const stateLoadingError = loadStateFromLocalStorage();
    // addDebugButtons(); // Add debug buttons on load
    if (!stateLoadingError) {
      runPeriodicScan();
    }
  });
})();
