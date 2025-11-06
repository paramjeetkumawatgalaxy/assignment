document.addEventListener("DOMContentLoaded", function () {
const quickViewButtons = document.querySelectorAll(".quick-view-btn");

quickViewButtons.forEach((button) => {
  button.addEventListener("click", async function (e) {
    e.preventDefault();

    const handle = this.dataset.handle;
    const popup = document.getElementById("quick-view-popup");
    const popupBody = document.getElementById("quick-view-body");
    if (!popup || !popupBody) return;

    popup.classList.add("active");
    document.body.classList.add("no-scroll");
    popupBody.innerHTML = "<p>Loading...</p>";

    try {
      const response = await fetch(`/products/${handle}.js`);
      const product = await response.json();

      const order = window.quickViewBlocks || [
        "image",
        "title",
        "price",
        "variants",
        "description",
        "add_to_cart",
      ];

      // --- Image Slider for popup---
      const imageHTML = `
      <div class="qv-slider">
        <button class="qv-prev" aria-label="Previous">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="var(--icon-stroke-width)" vector-effect="non-scaling-stroke" d="M4.25 10h11.5m0 0-4-4m4 4-4 4"></path></svg>
        </button>
        <div class="qv-slider-wrapper">
          ${product.images
            .map(
              (img, i) =>
                `<img class="qv-slide ${i === 0 ? "active" : ""}" src="${img}" alt="${product.title}">`
            )
            .join("")}
        </div>
        <button class="qv-next" aria-label="Next">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="var(--icon-stroke-width)" vector-effect="non-scaling-stroke" d="M4.25 10h11.5m0 0-4-4m4 4-4 4"></path></svg>
        </button>
      </div>`;

      // --- Build variant option selectors ---
      let variantOptionsHTML = "";
      if (product.options && product.options.length > 0) {
        variantOptionsHTML = product.options
          .map(
            (opt) => `
              <div class="qv-option-block" data-option="${opt.name}">
                <label>${opt.name}</label>
                <div class="qv-option-values">
                  ${opt.values
                    .map(
                      (val, i) => `
                        <button 
                          type="button"
                          class="qv-option-btn ${i === 0 ? "active" : ""}"
                          data-option-name="${opt.name}"
                          data-option-value="${val}">
                          ${val}
                        </button>`
                    )
                    .join("")}
                </div>
              </div>
            `
          )
          .join("");
      }

      // --- Build popup HTML ---
      const htmlParts = {
        image: imageHTML,
        title: `<h4 class="qv-title">${product.title}</h4>`,
        price: `<div id="qv-price" class="qv-price">$${(
          product.price / 100
        ).toFixed(2)}</div>`,
        variants:
          product.variants.length > 1
            ? `<div class="qv-variants">${variantOptionsHTML}</div>`
            : "",
        description: `<div class="qv-description">${product.description}</div>`,
        add_to_cart: `<button class="qv-atc-btn button add-to-cart-button" data-variant="${product.variants[0].id}">
            <span class="add-to-cart-text__content">Add to Cart</span>
          </button>`,
      };

      // --- Combine final HTML ---
      let finalHTML = "";
      order.forEach((blockType) => {
        if (htmlParts[blockType]) finalHTML += htmlParts[blockType];
      });

      popupBody.innerHTML = finalHTML;

      // --- Image Slider logic ---
      const slides = popupBody.querySelectorAll(".qv-slide");
      const prevBtn = popupBody.querySelector(".qv-prev");
      const nextBtn = popupBody.querySelector(".qv-next");
      let currentSlide = 0;

      const showSlide = (index) => {
        slides.forEach((s, i) => s.classList.toggle("active", i === index));
      };

      prevBtn.addEventListener("click", () => {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
      });

      nextBtn.addEventListener("click", () => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
      });

      // --- Variant selection on popup ---
      const optionButtons = popupBody.querySelectorAll(".qv-option-btn");
      const priceEl = popupBody.querySelector("#qv-price");
      const atcBtn = popupBody.querySelector(".qv-atc-btn");

      let selectedOptions = {};
      product.options.forEach((opt) => {
        selectedOptions[opt.name] = opt.values[0]; // default first value
      });

      function findMatchingVariant() {
        return product.variants.find((v) =>
          v.options.every(
            (val, idx) => val === selectedOptions[product.options[idx].name]
          )
        );
      }

      optionButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const optionName = btn.dataset.optionName;
          const optionValue = btn.dataset.optionValue;

          btn
            .closest(".qv-option-values")
            .querySelectorAll(".qv-option-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");

          selectedOptions[optionName] = optionValue;

          const matchingVariant = findMatchingVariant();
          if (matchingVariant) {
            if (priceEl)
              priceEl.textContent = `$${(
                matchingVariant.price / 100
              ).toFixed(2)}`;
            if (atcBtn) atcBtn.dataset.variant = matchingVariant.id;

            if (matchingVariant.featured_image) {
              const newImg = matchingVariant.featured_image.src;
              slides.forEach((s) => s.classList.remove("active"));
              const matchSlide = Array.from(slides).find(
                (s) => s.src === newImg
              );
              if (matchSlide) matchSlide.classList.add("active");
            }
          }
        });
      });

      // --- Add to Cart ---
      if (atcBtn) {
        atcBtn.addEventListener("click", async () => {
          const variantId = atcBtn.dataset.variant;
          atcBtn.disabled = true;
          atcBtn.textContent = "Adding...";

          try {
            const res = await fetch("/cart/add.js", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: variantId, quantity: 1 }),
            });
            if (!res.ok) throw new Error("Add to cart failed");
            await res.json();

            atcBtn.textContent = "Added!";
            setTimeout(() => {
              atcBtn.textContent = "Add to Cart";
              atcBtn.disabled = false;
            }, 1000);
          } catch (err) {
            console.error("Add to cart error:", err);
            atcBtn.textContent = "Add to Cart";
            atcBtn.disabled = false;
          }
        });
      }
    } catch (err) {
      console.error("Quick View error:", err);
      popupBody.innerHTML = "<p>Error loading product details.</p>";
    }
  });
});

  // close/open handlers for Quick View
  (function () {
    const popup = document.getElementById("quick-view-popup");
    const popupBody = document.getElementById("quick-view-body");
    const overlaySelector = "[data-qv-overlay]";
    const closeSelector = "[data-qv-close]";

    if (!popup || !popupBody) {
      console.warn("Quick View: popup elements not found");
      return;
    }

    // use where you already open
    window.openQuickView = function () {
      popup.classList.add("active");
      popup.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      // focus the body to capture keyboard events
      popupBody.focus();
    };

    // Close helper
    window.closeQuickView = function () {
      popup.classList.remove("active");
      popup.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");
    };

    // Delegated click handler (works even if content replaced)
    document.addEventListener("click", function (e) {
      // close when clicking close button or overlay
      if (e.target.closest(closeSelector) || e.target.closest(overlaySelector)) {
        e.preventDefault();
        window.closeQuickView();
        return;
      }
    }, { passive: false });

    // Stop overlay closing when clicking inside the content area
    popupBody.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    // Escape key to close
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Esc") {
        if (popup.classList.contains("active")) {
          window.closeQuickView();
        }
      }
    });

  })();

});