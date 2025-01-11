// ==UserScript==
// @name         Pokemon Product Stock Tracker with Redis
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Track product stock changes on Pokemon Center and save to Redis
// @author       Your Name
// @match        https://www.pokemoncenter.com/category/elite-trainer-box*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const Redis = require("ioredis");
  const redis = new Redis({
    host: "default@redis-18501.c285.us-west-2-2.ec2.redns.redis-cloud.com", // Replace with your Redis host
    port: 18501, // Replace with your Redis port
    password: "EwLAGweX8OBTvFYQGDXpBcNgfqViFXVz", // Add your Redis password if required
  });

  const itemsToNotify = []; // Stores new items or items that became in stock
  let isFirstRun = true; // Flag to indicate the first run

  // Function to scrape product data
  const scrapeProducts = () => {
    const productBoxes = document.querySelectorAll(
      "div[class^='product-box--']"
    );

    const products = Array.from(productBoxes).map((box) => {
      const titleElement = box.querySelector("h1[class^='product-title--']");
      const productName = titleElement
        ? titleElement.textContent.trim()
        : "Unknown Product";

      const outOfStockElement = box.querySelector(
        "div[class^='product-image-oos--']"
      );
      const isOutOfStock = !!outOfStockElement;

      return {
        name: productName,
        inStock: !isOutOfStock,
      };
    });

    return products;
  };

  // Function to save product stock status to Redis
  const saveToRedis = async (name, inStock) => {
    try {
      await redis.set(name, inStock ? "in_stock" : "out_of_stock");
      console.log(
        `Saved to Redis: ${name} - ${inStock ? "In Stock" : "Out of Stock"}`
      );
    } catch (error) {
      console.error("Error saving to Redis:", error);
    }
  };

  // Function to check for updates and save stock info to Redis
  const checkForUpdates = async (products) => {
    for (const product of products) {
      const { name, inStock } = product;

      if (isFirstRun) {
        // Save initial stock status to Redis
        await saveToRedis(name, inStock);
      } else {
        // Check current stock status in Redis
        const previousStatus = await redis.get(name);

        if (previousStatus === null) {
          // New product detected
          console.log(`New item detected: ${name}`);
          itemsToNotify.push({ name, status: "New Item" });
          await saveToRedis(name, inStock);
        } else if (previousStatus === "out_of_stock" && inStock) {
          // Item back in stock
          console.log(`Item back in stock: ${name}`);
          itemsToNotify.push({ name, status: "Back In Stock" });
          await saveToRedis(name, inStock);
        }
      }
    }
  };

  // Function to log and display notifications
  const displayNotifications = () => {
    if (itemsToNotify.length > 0) {
      console.log("Items to Notify:", itemsToNotify);

      let notifyContainer = document.getElementById("notify-container");
      if (!notifyContainer) {
        notifyContainer = document.createElement("div");
        notifyContainer.id = "notify-container";
        notifyContainer.style.position = "fixed";
        notifyContainer.style.top = "10px";
        notifyContainer.style.right = "10px";
        notifyContainer.style.backgroundColor = "white";
        notifyContainer.style.border = "1px solid black";
        notifyContainer.style.padding = "10px";
        notifyContainer.style.zIndex = "9999";
        notifyContainer.style.maxHeight = "300px";
        notifyContainer.style.overflowY = "auto";
        document.body.appendChild(notifyContainer);
      }

      notifyContainer.innerHTML = `<strong>Items to Notify:</strong><br>${itemsToNotify
        .map((item) => `${item.name} - ${item.status}`)
        .join("<br>")}`;
    }
  };

  // Function to perform periodic scans
  const runPeriodicScan = async () => {
    console.log("Starting a new scan...");
    const products = scrapeProducts();
    await checkForUpdates(products);

    if (!isFirstRun) {
      displayNotifications();
    } else {
      console.log("First run: Initializing stock status...");
      isFirstRun = false;
    }

    setTimeout(runPeriodicScan, 30000);
  };

  // Initial run
  window.addEventListener("load", () => {
    console.log("Page loaded. Starting stock tracker...");
    runPeriodicScan();
  });
})();
