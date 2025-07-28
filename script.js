const showMoreBtn = document.getElementById("exploreBtn");
const showLessBtn = document.getElementById("showLessBtn");
const swiperSection = document.getElementById("swiperSection");
const swiperWrapper = document.getElementById("swiperWrapper");
const gridSection = document.getElementById("gridSection");

const cardGrid = document.getElementById("cardGrid");
const cards = cardGrid.querySelectorAll(".gridscard");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageIndicator = document.getElementById("pageIndicator");
let currentPage = 0;
let cardsPerPage = 12;

function showPage(pageIndex) {
  const totalPages = Math.ceil(allImages.length / cardsPerPage);
  pageIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));
  currentPage = pageIndex;

  cardGrid.innerHTML = "";

  const start = pageIndex * cardsPerPage;
  const end = start + cardsPerPage;

  const visibleCards = allImages.slice(start, end);
  visibleCards.forEach((imgObj, i) => {
    const gridCard = document.createElement("div");
    gridCard.className = "gridscard tilt-card";
    gridCard.setAttribute("data-index", start + i);

    const imageElem = document.createElement("img");
    imageElem.src = imgObj.thumb;
    imageElem.alt = `img${i}`;
    imageElem.setAttribute("draggable", "false");
    imageElem.style.userSelect = "none";
    imageElem.addEventListener("contextmenu", (e) => e.preventDefault());
    imageElem.addEventListener("dragstart", (e) => e.preventDefault());

    gridCard.appendChild(imageElem);
    cardGrid.appendChild(gridCard);

    gridCard.addEventListener("click", () => {
      sessionStorage.setItem("selectedImages", JSON.stringify(imgObj.fullPages));
      sessionStorage.setItem("selectedTempId", imgObj.id);
      window.location.href = "./main/index.html";
    });
  });

  enhanceCardsIn("#cardGrid", ".gridscard");
  addTiltToWeddingCards();

  pageIndicator.textContent = `${pageIndex + 1}`;
  prevPage.disabled = pageIndex === 0;
  nextPage.disabled = pageIndex === totalPages - 1;
}

function enhanceCardsIn(containerSelector, cardClass = ".tilt-card") {
  document.querySelectorAll(`${containerSelector} ${cardClass}`).forEach((originalCard, i) => {
    const thumbImg = originalCard.querySelector("img");
    const thumbUrl = thumbImg?.src || "";
    const folderName = thumbImg?.alt || `card-${i}`;

    const cardWrapper = document.createElement("div");
    cardWrapper.className = "card-wrapper";
    cardWrapper.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;

    const weddingCard = document.createElement("div");
    weddingCard.className = "wedding-card";
    weddingCard.id = `card_items_${folderName}`;
    weddingCard.style.cssText = `
      width: 247px;
      border-radius: 10px;
      position: relative;
      will-change: transform;
      z-index: 10;
      background-image: url('${thumbUrl}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    `;

    weddingCard.innerHTML = `
      <div class="glow"></div>
      <canvas height="900" width="600"
        style="width: 100%; height: 100%; opacity: 1; transition: opacity 1s ease-in-out;"></canvas>
    `;

    cardWrapper.appendChild(weddingCard);
    originalCard.innerHTML = "";
    originalCard.appendChild(cardWrapper);
  });
}

function updateGridView() {
  cardsPerPage = window.innerWidth <= 1100 ? 6 : 12;
  showPage(0);
}

prevPage.addEventListener("click", () => showPage(currentPage - 1));
nextPage.addEventListener("click", () => showPage(currentPage + 1));

showMoreBtn.addEventListener("click", () => {
  swiperSection.style.display = "none";
  gridSection.style.display = "block";
  paginationControls.style.display = "flex";
  updateGridView();
  updatePageIndicator();
});

showLessBtn.addEventListener("click", () => {
  swiperSection.style.display = "block";
  gridSection.style.display = "none";
});

window.addEventListener("resize", () => {
  if (gridSection.style.display === "block") {
    updateGridView();
  }
});

function updatePageIndicator() {
  const pageIndicatorSpan = document.getElementById("pageIndicator");
  pageIndicatorSpan.textContent = `${currentPage + 1}`;
  pageIndicatorSpan.classList.add("active");
}

document.querySelectorAll(".swiper-slide").forEach((card) => {
  card.addEventListener("click", () => {
    const clickedIndex = parseInt(card.getAttribute("data-index"));
    swiper.slideTo(clickedIndex);
  });
});

const faqs = document.querySelectorAll(".faq");
faqs.forEach((faq) => {
  faq.addEventListener("click", () => {
    faq.classList.toggle("active");
    if (faq.classList.contains("active")) {
      faq.style.height = "fit-content";
    } else {
      faq.style.height = "auto";
    }
  });
});

const menuItems = document.querySelectorAll(".menu-item");
menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    menuItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
  });
});

const accessKey = "-pbe454CFdVksD-J9zzvau1gk4hMSpCIOJ8BhHThZH0";

const firebaseConfig = {
  apiKey: "AIzaSyDnSKxr4jT0O-VeKPTD5GqedsnL90zfrY0",
  authDomain: "milan-4590e.firebaseapp.com",
  databaseURL: "https://milan-4590e.firebaseio.com",
  projectId: "milan-4590e",
  storageBucket: "milan-4590e.appspot.com",
  messagingSenderId: "830076097684",
  appId: "1:830076097684:web:33dc0f6df44dd52cce1081"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

async function loadImagesFromStorage() {
  try {
    showLoader();

    const storage = firebase.storage();
    const shorterRef = storage.ref("carousel/shorter");

    const listResult = await shorterRef.listAll();
    const thumbImageRefs = listResult.items.filter(item => /[0-9]+a\.jpg$/i.test(item.name));

    swiperWrapper.innerHTML = "";
    allImages = [];

    const thumbUrls = await Promise.all(
      thumbImageRefs.map(ref => ref.getDownloadURL().catch(err => null))
    );

    thumbImageRefs.forEach((aRef, i) => {
      const fileName = aRef.name;
      const folderId = fileName.replace("a.jpg", ""); 
      const thumbUrl = thumbUrls[i];

      if (!thumbUrl) return; 

      allImages.push({ id: folderId, thumb: thumbUrl });

      const swiperCard = document.createElement("div");
      swiperCard.className = "swiper-slide card tilt-card";
      swiperCard.dataset.index = i;
      swiperCard.innerHTML = `
        <img src="${thumbUrl}" alt="Template ${folderId}" draggable="false" style="user-select: none;">
      `;
      swiperWrapper.appendChild(swiperCard);

      swiperCard.addEventListener("click", async () => {
        try {
          const [frontUrl, backUrl] = await Promise.all([
            storage.ref(`carousel/larger/Front/${folderId}b.jpg`).getDownloadURL(),
            storage.ref(`carousel/larger/Back/${folderId}c.jpg`).getDownloadURL()
          ]);

          sessionStorage.setItem("selectedImages", JSON.stringify([frontUrl, backUrl]));
          sessionStorage.setItem("selectedTempId", folderId);
          window.location.href = "./main/index.html";
        } catch (err) {
          console.error(`Error loading full images for ID ${folderId}:`, err);
        }
      });
    });

    enhanceSwiperCards();
    addTiltToWeddingCards();

    if (window.swiperInstance) window.swiperInstance.destroy(true, true);

    const swiperEl = document.querySelector(".swiper-container");
    if (swiperEl) {
      window.swiperInstance = new Swiper(".mySwiper", {
        slidesPerView: 3.5,
        spaceBetween: 20,
        breakpoints: {
          320: { slidesPerView: 1.2 },
          480: { slidesPerView: 2.2 },
          768: { slidesPerView: 3.5 },
        },
      });
    }

    updateGridView();
  } catch (err) {
    console.error("Error loading images:", err);
  } finally {
    hideLoader();
  }
}



function enhanceSwiperCards() {
  document.querySelectorAll(".swiper-slide.card").forEach((originalCard, i) => {
    const thumbImg = originalCard.querySelector("img");
    const thumbUrl = thumbImg?.src || "";
    const folderName = thumbImg?.alt || `card-${i}`;

    const cardWrapper = document.createElement("div");
    cardWrapper.className = "card-wrapper";
    cardWrapper.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;

    const weddingCard = document.createElement("div");
    weddingCard.className = "wedding-card";
    weddingCard.id = `card_items_${folderName}`;
    weddingCard.style.cssText = `
      width: 247px;
      border-radius: 10px;
      position: relative;
      will-change: transform;
      z-index: 10;
      background-image: url('${thumbUrl}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    `;

    weddingCard.innerHTML = `
      <div class="glow"></div>
      <canvas height="900" width="600"
        style="width: 100%; height: 100%; opacity: 1; transition: opacity 1s ease-in-out;"></canvas>
    `;

    cardWrapper.appendChild(weddingCard);

    originalCard.innerHTML = "";
    originalCard.appendChild(cardWrapper);
  });
}

function addTiltToWeddingCards() {
  let currentWrapper = null;
  let animationFrameId = null;

  function rotateToMouse(e) {
    if (!currentWrapper) return;

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    animationFrameId = requestAnimationFrame(() => {
      if (!currentWrapper) return;
      const bounds = currentWrapper.getBoundingClientRect();

      const { clientX: mouseX, clientY: mouseY } = e;

      const centerX = mouseX - (bounds.left + bounds.width / 2);
      const centerY = mouseY - (bounds.top + bounds.height / 2);

      const rotateX = (centerY / bounds.height) * 30;
      const rotateY = -(centerX / bounds.width) * 30;

      const rotatingCard = currentWrapper.closest(".swiper-slide.card, .gridscard");


      rotatingCard.style.transform = `
        perspective(600px)
        scale(1.05)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        translate3d(0, 0, 0)
      `;

      rotatingCard.style.willChange = "transform";
      rotatingCard.style.zIndex = 10;

      const glow = rotatingCard.querySelector(".glow");
      if (glow) {
        glow.style.backgroundImage = `
          radial-gradient(
            circle at ${centerX + bounds.width / 2}px ${centerY + bounds.height / 2}px,
            rgba(255, 255, 255, 0.3),
            rgba(0, 0, 0, 0.1)
          )
        `;
      }
    });
  }

  document.querySelectorAll(".card-wrapper").forEach((wrapper) => {
    wrapper.addEventListener("mouseenter", () => {
      currentWrapper = wrapper;
    });

    wrapper.addEventListener("mousemove", rotateToMouse);

    wrapper.addEventListener("mouseleave", () => {
      const rotatingCard = wrapper.closest(".swiper-slide.card, .gridscard");
      if (rotatingCard) {
        rotatingCard.style.transition = "transform 0.3s ease-out";
        rotatingCard.style.transform = "perspective(600px) scale(1) rotateX(0deg) rotateY(0deg)";
        rotatingCard.style.willChange = "auto";
        rotatingCard.style.zIndex = "auto";
      }
      currentWrapper = null;
    });
  });
}

let swiper = document.querySelectorAll(".swiper-container");
console.log(swiper)


window.onload = loadImagesFromStorage;

function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "flex";
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
}

const headCards = document.querySelectorAll(".head-card");

function getAngle(card) {
  return getComputedStyle(card).getPropertyValue("--angle") || "0deg";
}

function hasArrow(card) {
  return card.querySelector(".arrow-icon") !== null;
}

headCards.forEach((card) => {
  card.addEventListener("mouseenter", () => {
    headCards.forEach((otherCard) => {
      otherCard.style.transition = "transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)";
      otherCard.style.transform = "rotate(0deg) scale(0.95)";
      otherCard.style.animation = "none";
      otherCard.offsetHeight; 
    });

  });

  card.addEventListener("mouseleave", () => {
    headCards.forEach((otherCard) => {
      otherCard.style.transition = "transform 0.6s ease-in-out";

      const angle = hasArrow(otherCard) ? "0deg" : getAngle(otherCard);
      otherCard.style.transform = `rotate(${angle}) scale(0.95)`;
    });
  });
});




const readMoreButton = document.querySelector('.read-more');

if (readMoreButton) {
  readMoreButton.addEventListener('click', function (e) {
    e.preventDefault();
    const contentWrapper = document.querySelector('.content-wrapper-new');
    contentWrapper.classList.toggle('expanded');
    this.textContent = contentWrapper.classList.contains('expanded') ? 'Read less' : 'Read more';
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const faqs = document.querySelectorAll(".faq");
  const showFaqBtn = document.getElementById("showMore");
  let isExpanded = false;
  const initialVisibleCount = 5;

  faqs.forEach((faq, index) => {
    if (index >= initialVisibleCount) {
      faq.style.display = "none";
    }
  });

  showFaqBtn.addEventListener("click", function () {
    isExpanded = !isExpanded;

    faqs.forEach((faq, index) => {
      if (index >= initialVisibleCount) {
        faq.style.display = isExpanded ? "block" : "none";
      }
    });

    showFaqBtn.classList.toggle("expanded", isExpanded);
  });
});


document.querySelector(".scroll-up .container").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
