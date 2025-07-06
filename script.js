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
  visibleCards.forEach((img, i) => {
    const gridCard = document.createElement("div");
    gridCard.className = "gridscard tilt-card";
    gridCard.setAttribute("data-index", i);

    const imageElem = document.createElement("img");
    imageElem.src = img;
    imageElem.alt = `img${i}`;
    imageElem.setAttribute("draggable", "false");
    imageElem.style.userSelect = "none";
    imageElem.addEventListener("contextmenu", (e) => e.preventDefault());
    imageElem.addEventListener("dragstart", (e) => e.preventDefault());

    gridCard.appendChild(imageElem);
    cardGrid.appendChild(gridCard);
  });

  cardGrid.querySelectorAll(".tilt-card").forEach(addTiltEffect);

  cardGrid.querySelectorAll(".gridscard").forEach((card) => {
    card.addEventListener("click", () => {
      const clickedIndex = parseInt(card.getAttribute("data-index"));
      const imageUrl = "../assets/image/Bio Data.jpg";
      sessionStorage.setItem("selectedImage", imageUrl);
      window.location.href = "./main/index.html";
    });

  });


  pageIndicator.textContent = `${pageIndex + 1}`;
  prevPage.disabled = pageIndex === 0;
  nextPage.disabled = pageIndex === totalPages - 1;
}

function updateGridView() {
  cardsPerPage = window.innerWidth <= 500 ? 2 : 12;
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
    faq.style.height = "fit-content";
  });
});

const menuItems = document.querySelectorAll(".menu-item");
menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    menuItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
  });
});

let allImages = [];
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

firebase.auth().signInWithEmailAndPassword("ganeshdholi2000@gmail.com", "Ganeshdholisunstar086421")
  .then((userCredential) => {
    console.log("Signed in as developer:", userCredential.user.uid);
    loadImagesFromStorage();
  })
  .catch((error) => {
    console.error("Auth error:", error.message);
  });


async function loadImagesFromStorage() {
  try {
    showLoader();
    const storageRef = firebase.storage().ref("carousel");
    const result = await storageRef.listAll();

    allImages = await Promise.all(
      result.items.map((item) => item.getDownloadURL())
    );

    swiperWrapper.innerHTML = "";
    allImages.slice(0, 12).forEach((img, i) => {
      const swiperCard = document.createElement("div");
      swiperCard.className = "swiper-slide card tilt-card";
      swiperCard.setAttribute("data-index", i);

      const imageElem = document.createElement("img");
      imageElem.src = img;
      imageElem.alt = `img${i}`;
      imageElem.setAttribute("draggable", "false");
      imageElem.style.userSelect = "none";
      imageElem.addEventListener("contextmenu", (e) => e.preventDefault());
      imageElem.addEventListener("dragstart", (e) => e.preventDefault());

      swiperCard.appendChild(imageElem);

      swiperWrapper.appendChild(swiperCard);
      imageUrl = "../assets/image/Bio Data.jpg";
      swiperCard.addEventListener("click", () => {
        sessionStorage.setItem("selectedImage", imageUrl);
        window.location.href = "./main/index.html";
      });
    });

    new Swiper(".mySwiper", {
      slidesPerView: 3.5,
      spaceBetween: 20,
      allowTouchMove: true,
      breakpoints: {
        320: { slidesPerView: 1.2 },
        480: { slidesPerView: 2.2 },
        768: { slidesPerView: 3.5 },
      },
    });

    swiperWrapper.querySelectorAll(".tilt-card").forEach(addTiltEffect);
    updateGridView();
  } catch (err) {
    console.error("Error loading images from Storage", err);
  } finally {
    hideLoader();
  }
}

window.onload = loadImagesFromStorage;

function addTiltEffect(card) {
  let bounding = null;
  let animationFrame;

  card.addEventListener("mouseenter", () => {
    bounding = card.getBoundingClientRect();
  });

  card.addEventListener("mouseleave", () => {
    bounding = null;
    cancelAnimationFrame(animationFrame);
    card.style.setProperty("--x-rotation", `0deg`);
    card.style.setProperty("--y-rotation", `0deg`);
    card.style.transformOrigin = `center center`;
  });

  card.addEventListener("mousemove", (e) => {
    if (!bounding) return;

    const x = e.clientX - bounding.left;
    const y = e.clientY - bounding.top;

    const percentX = x / bounding.width;
    const percentY = y / bounding.height;

    const maxTilt = 12;
    const rotateX = (0.5 - percentY) * maxTilt * 2;
    const rotateY = (percentX - 0.5) * maxTilt * 2;

    const originX = `${percentX * 100}%`;
    const originY = `${percentY * 100}%`;

    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => {
      card.style.setProperty("--x-rotation", `${rotateX.toFixed(2)}deg`);
      card.style.setProperty("--y-rotation", `${rotateY.toFixed(2)}deg`);
      card.style.setProperty("--shine-x", `${x}px`);
      card.style.setProperty("--shine-y", `${y}px`);
      card.style.transformOrigin = `${originX} ${originY}`;
    });
  });
}

function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "flex";
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
}

document.querySelector(".scroll-top").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
