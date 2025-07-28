const formFields = document.getElementById("form-fields");
const cardImage = document.getElementById("card-image");
const prevBtn = document.getElementById("prev-template");
const pageNumber = document.getElementById("page_number");
const nextBtn = document.getElementById("next-template");
const addBtn = document.getElementById("add-field");
const textOverlay = document.getElementById("text-overlay");
const backPageBtn = document.getElementById("back-page");
const nextPageBtn = document.getElementById("next-page");
const modal = document.getElementById("editModal");
const labelField = document.getElementById("modalLabelInput");
const valueField = document.getElementById("modalValueInput");
const saveButton = document.querySelector(".save-btn");
const cardPreview = document.querySelector(".card-preview");
const checkSvg = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="18" fill="#4E9459"/>
    <path d="M12 18.5L16 22.5L24 14.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;


let ration = cardPreview.clientHeight / 1500;
let currentTemplate = 0;
let templates = [];
let template = null;
let selectedFont1 = "Arial";
let selectedFont2 = "Calibri";
let userDetailsJsonData = null;
let designJsonData = null;
let allFields = [];
let currentPageIndex = 0;
let totalOverlayPages = 0;
let templateNumber = 0;
let currentHeaderKey = null;
let bodyJson = {};
let headJson = {};
let currentBodyKey = "body_1";
let designJson = {};
let headerClickedThisSession = false;
let designcolor = [];
let pageIndex = 0;

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

// template load
async function loadTemplates() {
    try {

        const designDocRef = db.collection("biodata").doc("design");
        const designSnap = await designDocRef.get();

        if (!designSnap.exists) {
            return console.error("No design data found in Firestore.");
        }
        designJson = designSnap.data();
        const [headerResponse, bodyResponse, userDetailsResponse] = await Promise.all([
            fetch("./header.json"),
            fetch("./body.json"),
            fetch("./user_details.json")
        ]);

        headJson = await headerResponse.json();
        bodyJson = await bodyResponse.json();
        const userDetailsJsonData = await userDetailsResponse.json();

        const allDetails = userDetailsJsonData?.all_details;
        if (!allDetails) return console.error("Missing user details data.");

        const selectedImages = JSON.parse(sessionStorage.getItem("selectedImages") || "[]");
        const firstImage = selectedImages[0];
        if (!firstImage) return console.error("No image selected.");

        function extractFilename(url) {
            try {
                return url.split('/').pop().split('?')[0];
            } catch {
                return url;
            }
        }

        const firstImageFilename = extractFilename(firstImage);

        const matchedDesignKey = Object.keys(designJson).find(key => {
            const imageLinks = designJson[key].image_link || [];
            return imageLinks.some(link => extractFilename(link) === firstImageFilename);
        });

        if (!matchedDesignKey) return console.error("No matching design found for selected image.");

        const matchedDesign = designJson[matchedDesignKey];
        const templateNumber = parseInt(matchedDesignKey.replace("Design_", ""), 10);

        const head = headJson[`header_${templateNumber}`] || {};
        const body = bodyJson[`body_${templateNumber}`] || {};
       
        const containerArray = matchedDesign?.container_design || matchedDesign?.Container_design || [];
        const overlay = document.getElementById("overlay-page");

        let container = null;
        if (containerArray.length >= 4) {
            container = {
                top: parseInt(containerArray[0]) * ration + "px",
                left: parseInt(containerArray[1]) * ration + "px",
                width: parseInt(containerArray[2]) * ration + "px",
                height: parseInt(containerArray[3]) * ration + "px"
            };
        }
        if (overlay && container) {
            overlay.style.top = container.top;
            overlay.style.left = container.left;
            overlay.style.width = container.width;
            overlay.style.height = container.height;
        }

        document.querySelectorAll(".overlay-field").forEach(el => {
            el.style.fontSize = (parseFloat(el.dataset.baseFontSize || "16") * ration) + "px";
            el.style.padding = (parseFloat(el.dataset.basePadding || "4") * ration) + "px";
            el.style.borderRadius = (parseFloat(el.dataset.baseRadius || "4") * ration) + "px";
        });


        const normalize = str =>
            str.toLowerCase().replace(/\s+/g, "").replace(/\(.*\)/g, "").replace(/[^a-z0-9]/gi, "");

        const headings = allDetails.heading || {};
        const sectionOrder = ["personalFields", "familyFields", "contactFields"];

        const seen = new Set();
        const allFieldsRaw = [];

        sectionOrder.forEach(section => {
            (allDetails[section] || []).forEach(label => {
                const norm = normalize(label);
                if (!seen.has(norm)) {
                    seen.add(norm);
                    allFieldsRaw.push({ label, section });
                }
            });
        });

        const headerFields = Object.keys(head || {});
        const hasPhotoInHeader = headerFields.some(h => normalize(h).includes("photo"));

        if (hasPhotoInHeader && !allFieldsRaw.some(f => normalize(f.label).includes("photo"))) {
            allFieldsRaw.unshift({
                label: "Photo (optional)",
                section: "personalFields"
            });
        }

        const fields = allFieldsRaw.map(f => ({
            label: f.label,
            heading: headings[f.label] || "",
            section: f.section,
            value: "",
            hidden: false,
            page: 1,
            previewId: `${f.section}-${normalize(f.label)}-${templateNumber}`,
            labelStyle: {
                color: matchedDesign.color?.[0] || "#000",
                fontFamily: body.section_fields_style?.[0] || "Arial",
                fontWeight: "normal"
            },
            valueStyle: {
                color: matchedDesign.color?.[0] || "#000",
                fontFamily: body.section_fields_style?.[1] || "Arial",
                fontWeight: "normal"
            }
        }));

        const headerHeight =
            parseInt(head?.header_container?.height) ||
            parseInt(matchedDesign?.header?.front_page_container?.height) ||
            0;

        templates = [{
            imageUrls: matchedDesign.image_link,
            container,
            fields,
            style: {
                fontColor: matchedDesign.color || ["#000", "#000"],
                fontFamily: [
                    body.section_fields_style?.[0] || "Arial",
                    body.section_fields_style?.[1] || "Arial"
                ],
                fontWeight: ["normal", "normal"]
            },
            sectionHeadStyle: body.section_head_styling,
            sectionDetailsStyle: body.section_area_styling,
            headerHeight
        }];

        template = templates[0];
        allFields = template.fields;
        currentPageIndex = 0;


        setupNavigation();
        renderFormFields(headerFields, matchedDesignKey);
        setupHeaderDropdownWithLoad(headJson, matchedDesignKey);
        renderTemplate(currentTemplate, matchedDesignKey);

    } catch (err) {
        console.error("Error loading templates:", err);
    }
}

window.addEventListener("load", () => {
    sessionStorage.removeItem("headerHeightOffset");
});


// randering the template
function renderTemplate(templateIndex, matchedDesignKey) {
    const template = templates[templateIndex];
    if (!template) return;

    const overlayWrapper = document.getElementById("text-overlay");
    if (!overlayWrapper) return;
    overlayWrapper.innerHTML = "";
    document.querySelectorAll(".overlay-page").forEach(p => p.remove());

    const container = template.container || {};
    const fields = template.fields || [];
    const selectedImages = JSON.parse(sessionStorage.getItem("selectedImages") || "[]");
    const storedHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");

    const sectionOrder = ["personalFields", "familyFields", "contactFields"];
    const sectionTitles = {
        personalFields: "Personal Details",
        familyFields: "Family Details",
        contactFields: "Contact Details"
    };

    const bodyStyle = bodyJson?.[currentBodyKey] || {};
    const sectionStyles = bodyStyle.section_head_styling || [];
    const areaStyles = bodyStyle.section_area_styling || [];

    designcolor = designJson[matchedDesignKey]?.color || [];
    const fieldGap = parseInt(areaStyles.fieldGap || "10px") * ration;

    let backgroundColor = "transparent";
    if (areaStyles.backgroundColour?.startsWith("color")) {
        const index = parseInt(areaStyles.backgroundColour.replace("color", "")) - 1;
        backgroundColor = designcolor[index] || "transparent";
    }
    const maxHeight = parseInt(container.height);
    const matchedDesign = designJson?.[matchedDesignKey] || {};
    const hasHeaderContainerInDesign = !!matchedDesign?.header?.front_page_container;

    if (hasHeaderContainerInDesign) {
        sessionStorage.removeItem("activeHeader");
    }

    const headerDropdown = document.getElementById("headerDropdown");
    console.log(hasHeaderContainerInDesign, headerDropdown)
    if (headerDropdown) {
        headerDropdown.style.display = hasHeaderContainerInDesign ? "none" : "block";
    }

    const skipPreviewIds = [];
    if (hasHeaderContainerInDesign) {
        const header = matchedDesign?.header || {};
        const normalize = str => str.toLowerCase().replace(/\s+/g, "");
        Object.entries(header).forEach(([label]) => {
            if (label === "front_page_container") return;
            const field = template.fields.find(f => normalize(f.label) === normalize(label));
            if (field?.previewId) {
                skipPreviewIds.push(field.previewId);
                field._isHeaderField = true;
            }
        });
    }

    let currentPage = createPage(container);
    overlayWrapper.appendChild(currentPage);
    let currentHeight = 0;

    const dummy = document.createElement("div");
    Object.assign(dummy.style, {
        position: "absolute",
        visibility: "hidden",
        width: container.width
    });
    document.body.appendChild(dummy);


    let headerHeightOffset = 0;
    let isFirstOverlayPage = true;
    const headerOffsetFromStorage = sessionStorage.getItem("headerHeightOffset");
    const withDesignHeaderOffset = sessionStorage.getItem("headerHeight");
    if (hasHeaderContainerInDesign) {
        const headerContainer = matchedDesign?.header?.front_page_container;
        const headerHeight = parseInt(headerContainer?.height);
        if (headerHeight >= maxHeight && isFirstOverlayPage) {
            headerHeightOffset = 0;
            currentPage = createPage(container);
            overlayWrapper.appendChild(currentPage);
            currentHeight = 0;
            isFirstOverlayPage = false;
            console.log("full", headerHeightOffset)
        } else if (headerHeight && isFirstOverlayPage) {
            const storedHeader = parseInt(withDesignHeaderOffset) || 0;
            headerHeightOffset += storedHeader;
            console.log("stored", headerHeightOffset, storedHeader, isFirstOverlayPage);
        }
    } else if (headerOffsetFromStorage !== null && isFirstOverlayPage) {
        const storedOffset = parseInt(headerOffsetFromStorage) || 0;
        headerHeightOffset += storedOffset;
        console.log("enable", headerHeightOffset, storedOffset)
    }

    sectionOrder.forEach(section => {
        const sectionFields = fields.filter(f => f.section === section && !f._isHeaderField);
        if (!sectionFields.length) return;

        const heading = createSectionTitle(sectionTitles[section], sectionStyles);
        dummy.appendChild(heading);
        const headingHeight = heading.offsetHeight;
        dummy.removeChild(heading);
        const sectionHeight = currentHeight + headingHeight + headerHeightOffset;
        if (sectionHeight > maxHeight) {
            currentPage = createPage(container);
            overlayWrapper.appendChild(currentPage);
            currentHeight = 0;
            isFirstOverlayPage = false;
        }

        currentPage.appendChild(heading);
        currentHeight += headingHeight;

        sectionFields.forEach(field => {
            if (field.label.toLowerCase().includes("photo") || field.hidden) return;

            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.gap = `${fieldGap}px`;
            row.style.alignItems = "center";

            const label = document.createElement("span");
            label.textContent = `${field.label}:`;
            Object.assign(label.style, {
                fontFamily: selectedFont2 || "Arial",
                color: designcolor[1] || "#000",
                whiteSpace: "nowrap",
                fontSize: parseFloat(areaStyles.fontSize) * ration + "px"
            });

            const value = document.createElement("span");
            value.textContent = field.value || "";
            value.dataset.previewId = field.previewId;
            Object.assign(value.style, {
                fontFamily: selectedFont2 || "Arial",
                color: designcolor[1] || "#000",
                whiteSpace: "nowrap",
                fontSize: parseFloat(areaStyles.fontSize) * ration + "px"
            });

            row.appendChild(label);
            row.appendChild(value);

            dummy.appendChild(row);
            const rowHeight = row.offsetHeight + fieldGap;
            dummy.removeChild(row);

            const rowHeightMain = rowHeight + currentHeight + headerHeightOffset

            if (rowHeightMain > maxHeight) {
                currentPage = createPage(container);
                overlayWrapper.appendChild(currentPage);
                pageIndex++;
                currentHeight = 0;
                isFirstOverlayPage = false;
            }

            field.pageIndex = pageIndex; // however you're assigning fields
            currentPage.appendChild(row);
            currentHeight += rowHeight;

        });
    });

    document.body.removeChild(dummy);

    totalOverlayPages = document.querySelectorAll(".overlay-page").length;
    updatePageDisplay();
    document.getElementById("card-image").src = selectedImages[currentPageIndex] || selectedImages[0] || "";

    const pageNumber = document.getElementById("page_number");
    if (pageNumber) pageNumber.textContent = `Page ${currentPageIndex + 1}`;

    updateImagePage();

    const headerFieldsFromDesign = hasHeaderContainerInDesign
        ? Object.keys(matchedDesign?.header || {}).filter(k => k !== "front_page_container")
        : sectionOrder;


    if (hasHeaderContainerInDesign) {
        const templateNumber = parseInt(matchedDesignKey.replace("Design_", ""), 10);
        renderReadyMadeHeader(templateNumber);
    } else if (storedHeader) {
        const overlay = document.querySelector(".overlay-page");
        if (overlay) {
            overlay.querySelector(".header-overlay-box")?.remove();

            const headerBox = setupHeaderDropdownWithLoad(template, storedHeader);

            if (headerBox) {
                overlay.appendChild(headerBox);
            }
        }
    }


    renderFormFields(headerFieldsFromDesign, skipPreviewIds);

    function createPage(container) {
        const page = document.createElement("div");
        page.className = "overlay-page";
        Object.assign(page.style, {
            position: "absolute",
            top: container.top,
            left: container.left,
            width: container.width,
            height: container.height,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            overflow: "hidden",
            padding: ("30px", 1),
            alignItems: areaStyles.alignItem,
            gap: `${fieldGap}px`
        });
        return page;
    }

    function createSectionTitle(text, styles) {
        const el = document.createElement("div");
        el.textContent = text;
        Object.assign(el.style, {
            color: designcolor[0] || "#000",
            backgroundColor: backgroundColor || "transparent",
            fontWeight: styles[3] || "bold",
            fontSize: parseInt(styles.fontSize) * ration + "px",
            padding: parseInt(styles.padding) * ration + "px",
            borderRadius: "100px",
            textAlign: "left",
            alignSelf: sectionStyles.alignItem,
            fontFamily: selectedFont1 || "Roboto",
            textTransform: "uppercase",
            width: "fit-content"
        });
        return el;
    }
}



document.querySelectorAll("[data-font1][data-font2]").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();

        const font1 = e.currentTarget.dataset.font1;
        const font2 = e.currentTarget.dataset.font2;

        const dropdown = e.currentTarget.closest(".dropdown-main");
        const button = dropdown.querySelector(".dropdown-button-main");
        button.textContent = `${font1} + ${font2}`;

        // Assign both fonts at once
        selectedFont1 = font1;
        selectedFont2 = font2;

        // Re-render the template using the first selected image
        const selectedImages = JSON.parse(sessionStorage.getItem("selectedImages") || "[]");
        const firstImage = selectedImages[0];
        if (!firstImage) return console.error("No image selected.");

        function extractFilename(url) {
            try {
                return url.split('/').pop().split('?')[0];
            } catch {
                return url;
            }
        }

        const firstImageFilename = extractFilename(firstImage);

        const matchedDesignKey = Object.keys(designJson).find(key => {
            const imageLinks = designJson[key].image_link || [];
            return imageLinks.some(link => extractFilename(link) === firstImageFilename);
        });

        if (!matchedDesignKey) return console.error("No matching design found.");

        renderTemplate(currentTemplate, matchedDesignKey); // will use selectedFont1 and selectedFont2
    });
});

document.querySelectorAll("[data-body]").forEach(el => {
    el.addEventListener("click", (e) => {
        e.preventDefault();
        currentBodyKey = el.getAttribute("data-body");

        const selectedImages = JSON.parse(sessionStorage.getItem("selectedImages") || "[]");
        const firstImage = selectedImages[0];
        if (!firstImage) return console.error("No image selected.");

        function extractFilename(url) {
            try {
                return url.split('/').pop().split('?')[0];
            } catch {
                return url;
            }
        }

        const firstImageFilename = extractFilename(firstImage);

        const matchedDesignKey = Object.keys(designJson).find(key => {
            const imageLinks = designJson[key].image_link || [];
            return imageLinks.some(link => extractFilename(link) === firstImageFilename);
        });

        if (!matchedDesignKey) return console.error("No matching design found.");

        const matchedDesign = designJson[matchedDesignKey] || {};

        const hasHeaderContainer = !!matchedDesign?.header?.front_page_container;
        const storedHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
        sessionStorage.setItem("activeHeader", JSON.stringify(storedHeader));

        console.log(`Rendering body: ${currentBodyKey} | Design: ${matchedDesignKey}`);
        renderTemplate(currentTemplate, matchedDesignKey);
    });
});

document.querySelectorAll('.dropdown-main').forEach(dropdown => {
    let timeout;

    dropdown.addEventListener('mouseenter', () => {
        clearTimeout(timeout);
        dropdown.querySelectorAll('.dropdown-content-main-body, .dropdown-content-main-font, .dropdown-content-main-header')
            .forEach(menu => menu.style.display = 'grid');
    });

    dropdown.addEventListener('mouseleave', () => {
        timeout = setTimeout(() => {
            dropdown.querySelectorAll('.dropdown-content-main-body, .dropdown-content-main-font, .dropdown-content-main-header')
                .forEach(menu => menu.style.display = 'none');
        }, 200);
    });
});



function updateImagePage() {
    const template = templates[currentTemplate];
    if (!template || !template.fields) return;

    template.fields.forEach(field => {
        const previewId = field.previewId;
        const isPhotoField = field.label.toLowerCase().includes("photo") && field._isHeaderField;

        if (isPhotoField) {
            const oldImg = document.querySelector(`img[data-preview-id="${previewId}"]`);
            if (oldImg) oldImg.remove();

            if (field.value) {
                const overlayWrapper = document.getElementById("text-overlay");
                const img = document.createElement("img");
                img.src = field.value;
                img.alt = "Photo";
                img.dataset.previewId = previewId;
                img.id = previewId;

                Object.assign(img.style, {
                    position: "absolute",
                    top: field.valueStyle?.top || "60px",
                    left: field.valueStyle?.left || "370px",
                    width: field.valueStyle?.width || "130px",
                    height: field.valueStyle?.height || "160px",
                    objectFit: "cover"
                });

                overlayWrapper.appendChild(img);
            }

        } else {
            const previewSpans = document.querySelectorAll(`[data-preview-id="${previewId}"]`);
            previewSpans.forEach(span => {
                span.textContent = field.value;
                span.style.display = field.hidden ? "none" : "inline";
            });

            const previewLine = document.getElementById(previewId)?.closest("div");
            if (previewLine) {
                previewLine.style.display = field.hidden ? "none" : "flex";
            }
        }
    });
}

function setupNavigation() {
    backPageBtn.addEventListener("click", () => {
        if (currentPageIndex > 0) {
            currentPageIndex--;
            updatePageDisplay();

        }
    });

    nextPageBtn.addEventListener("click", () => {
        if (currentPageIndex < totalOverlayPages - 1) {
            currentPageIndex++;
            updatePageDisplay();
        }
    });
}

function renderReadyMadeHeader(templateNumber) {
    const templateKey = `Design_${templateNumber}`;
    const headerData = designJson?.[templateKey]?.header;
    const frontContainer = headerData?.front_page_container;
    const containerDesign = designJson?.[templateKey]?.container_design;
    if (!headerData || !frontContainer || !containerDesign) return;
    const firstOverlayPage = document.querySelector(".overlay-page");
    if (!firstOverlayPage) return;

    firstOverlayPage.querySelector(".ready-made-header-box")?.remove();


    const headerBox = document.createElement("div");
    headerBox.className = "ready-made-header-box";
    Object.assign(headerBox.style, {
        height: parseInt(frontContainer.height) * ration + "px",
        width: parseInt(frontContainer.width) * ration + "px",
        top: parseInt(frontContainer.top) * ration + "px",
        left: parseInt(frontContainer.left) * ration + "px",
        position: "relative",
        zIndex: 2,
        display: "flex",
        flexDirection: "row",
        gap: "6px",
    });
    sessionStorage.setItem("headerHeight", parseInt(frontContainer.height) * ration + "px");

    const normalize = str => str.toLowerCase().replace(/\s+/g, "");
    const usedPreviewIds = new Set();

    const storedHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
    if (storedHeader?.fields?.length) {
        for (const field of storedHeader.fields) {
            const matching = template.fields.find(f => f.previewId === field.previewId);
            if (matching && !matching.imageValue) {
                matching.imageValue = field.imageValue;
            }
        }
    }

    // Step 1: Create text wrapper div
    const textContentWrapper = document.createElement("div");
    Object.assign(textContentWrapper.style, {
        display: "flex",
        flexDirection: "column",
        gap: "6px"
    });

    // Step 2: Loop through all fields
    Object.entries(headerData).forEach(([label, style], idx) => {
        if (label === "front_page_container") return;

        const lowerLabel = normalize(label);
        const previewId = `personalFields-${lowerLabel}-${templateNumber}`;

        let field = template.fields.find(f => f.previewId === previewId);
        if (!field) {
            field = {
                label,
                section: "header",
                hidden: false,
                previewId,
                _isHeaderField: true,
                imageValue: "",
                textValue: ""
            };
            template.fields.push(field);
        }

        field._isHeaderField = true;
        field.previewId = previewId;
        field.imageValue ??= "";
        field.textValue ??= "";
        usedPreviewIds.add(previewId);

        // === IMAGE FIELD ===
        if (lowerLabel.includes("photo")) {
            const img = document.createElement("img");
            const savedImage = storedHeader?.fields?.find(f => f.previewId === previewId)?.imageValue;
            const imageSrc = field.imageValue?.startsWith("data:image") ? field.imageValue :
                savedImage?.startsWith("data:image") ? savedImage : "./assets/loard1.jpg";

            img.src = imageSrc;
            img.setAttribute("data-image-id", previewId);
            Object.assign(img.style, {
                top: parseInt(style[0]) * ration + "px",
                left: parseInt(style[1]) * ration + "px",
                width: parseInt(style[2]) * ration + "px",
                height: parseInt(style[3]) * ration + "px",
                borderRadius: parseInt(style[4]) || "4px" * ration + "px",
                objectFit: "cover",
                zIndex: 2
            });

            headerBox.appendChild(img);

            const inputElement = document.createElement("input");
            inputElement.type = "file";
            inputElement.accept = "image/*";
            inputElement.className = "input-value photo-input";
            inputElement.setAttribute("data-preview-id", previewId);

            Object.assign(inputElement.style, {
                position: "absolute",
                top: parseInt(style[0]) * ration + "px",
                left: parseInt(style[1]) * ration + "px",
                width: parseInt(style[2]) * ration + "px",
                height: parseInt(style[3]) * ration + "px",
                borderRadius: parseInt(style[4]) || "4px" * ration + "px",
                opacity: "0",
                cursor: "pointer",
                zIndex: 3
            });

            inputElement.addEventListener("change", e => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = ev => {
                    const imageUrl = ev.target.result;
                    field.imageValue = imageUrl;

                    const existing = template.fields.find(f => f.previewId === previewId);
                    if (existing) existing.imageValue = imageUrl;

                    sessionStorage.setItem("activeHeader", JSON.stringify({
                        fields: template.fields.filter(f => f._isHeaderField)
                    }));

                    const headerImg = document.querySelector(`.ready-made-header-box img[data-image-id="${previewId}"]`);
                    if (headerImg) headerImg.src = imageUrl;

                    try {
                        const storedHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
                        if (storedHeader?.fields) {
                            const match = storedHeader.fields.find(f => f.previewId === previewId);
                            if (match) {
                                match.imageValue = imageUrl;
                                match.isPhoto = true;
                                match.style ??= [style[0], style[1], style[2], style[3], style[4] || "4px"];
                                saveActiveHeaderForTemplate(template, storedHeader);
                            }
                        }
                    } catch (err) {
                        console.warn("Image save failed:", err);
                    }
                };
                reader.readAsDataURL(file);
            });

            headerBox.appendChild(inputElement);
        }

        // === TEXT FIELD ===
        else {
            const row = document.createElement("div");
            Object.assign(row.style, {
                position: "absolute",
                top: parseInt(style[0]) * ration + "px",
                left: parseInt(style[1]) * ration + "px",
                fontSize: parseInt(style[2] * ration + "px"),
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap"
            });

            if (normalize(label) !== "name") {
                const labelSpan = document.createElement("span");
                labelSpan.textContent = `${label}:`;
                Object.assign(labelSpan.style, {
                    fontFamily: "Arial",
                    fontSize: parseInt(style[2]) * ration + "px",
                    fontWeight: "bold",
                    color: designcolor[0],
                    whiteSpace: "nowrap"
                });
                row.appendChild(labelSpan);
            }

            const valueSpan = document.createElement("span");
            valueSpan.textContent = field.textValue || "";
            valueSpan.dataset.previewId = previewId;

            Object.assign(valueSpan.style, {
                fontFamily: "Arial",
                fontSize: parseInt(style[2]) * ration + "px",
                fontWeight: "normal",
                color: designcolor[0],
                whiteSpace: "nowrap"
            });

            row.appendChild(valueSpan);
            textContentWrapper.appendChild(row);
        }
    });

    // Step 3: Append text fields to headerBox
    headerBox.appendChild(textContentWrapper);

    // Final insert at the top of the overlay page
    firstOverlayPage.insertBefore(headerBox, firstOverlayPage.firstChild);



    renderFormFields([], Array.from(usedPreviewIds));
}



function updatePageDisplay() {
    const pages = document.querySelectorAll(".overlay-page");
    pages.forEach((page, index) => {
        page.style.display = index === currentPageIndex ? "flex" : "none";
    });

    const selectedImages = JSON.parse(sessionStorage.getItem("selectedImages") || "[]");
    document.getElementById("card-image").src = selectedImages[currentPageIndex] || selectedImages[0] || "";

    const pageNumber = document.getElementById("page_number");
    if (pageNumber) {
        pageNumber.textContent = `Page ${currentPageIndex + 1}`;
    }
}


function setupHeaderDropdownWithLoad(headJson, matchedDesignKey) {
    document.querySelectorAll('[data-header]').forEach(link => {
        link.addEventListener('click', () => {
            headerClickedThisSession = true;

            const headerKey = link.getAttribute('data-header');
            currentHeaderKey = headerKey;

            const headerData = headJson[headerKey];
            if (!headerData || !headerData.header_container) return;

            const normalize = str => str.toLowerCase().replace(/\s+/g, "").replace(/'/g, "");
            const container = headerData.header_container;
            const headerFields = Object.keys(headerData).filter(k => k !== "header_container");

            // Mark _isHeaderField flags
            const headerLabelSet = new Set(headerFields.map(normalize));
            template.fields.forEach(field => {
                field._isHeaderField = headerLabelSet.has(normalize(field.label));
            });

            // Sync live input text values to template
            template.fields.forEach(field => {
                const el = document.querySelector(`[data-preview-id="${CSS.escape(field.previewId)}"]`);
                if (el && el.tagName !== "IMG" && el.value !== undefined) {
                    field.value = el.value;
                }
            });

            sessionStorage.setItem("headerHeightOffset", parseInt(container.height) * (ration));
            // Refresh template body
            renderTemplate(currentTemplate, matchedDesignKey);  //issue have

            const overlay = document.querySelector(".overlay-page");
            if (!overlay || !container) return;
            overlay.querySelector(".header-overlay-box")?.remove();

            const headerBox = document.createElement("div");
            headerBox.className = "header-overlay-box";
            Object.assign(headerBox.style, {
                position: "absolute",
                top: parseInt(container.top) * ration + "px",
                left: parseInt(container.left) * ration + "px",
                width: parseInt(container.width) * ration + "px",
                height: parseInt(container.height) * ration + "px",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "5px"
            });
            const key = getTemplateKey(template); // you already have this helper
            const savedHeader = JSON.parse(sessionStorage.getItem(`activeHeader_${key}`) || "null") || {
                container,
                fields: []
            };


            const updatedFields = headerFields.map(label => {
                const style = headerData[label];
                if (!Array.isArray(style)) return null;

                const [top, left, widthOrFontSize, heightOrGap, borderRadius] = style;

                const normLabel = normalize(label);
                const field = template.fields.find(f => normalize(f.label) === normLabel);
                const previewId = field?.previewId || "";

                const existing = savedHeader.fields.find(f => f.previewId === previewId);
                const value = existing?.value || field?.value || "";

                const isPhoto = normLabel.includes("photo");

                if (isPhoto) {
                    const img = document.createElement("img");
                    img.src = value.startsWith("data:image") ? value : "./assets/loard1.jpg";
                    img.dataset.previewId = previewId;

                    Object.assign(img.style, {
                        position: "absolute",
                        top: parseInt(top) * ration + "px",
                        left: parseInt(left) * ration + "px",
                        width: parseInt(widthOrFontSize) * ration + "px",
                        height: parseInt(heightOrGap) * ration + "px",
                        objectFit: "cover",
                        borderRadius: parseInt(borderRadius) * ration + "px",
                        zIndex: 20
                    });
                    headerBox.appendChild(img);
                } else {
                    const row = document.createElement("div");
                    Object.assign(row.style, {
                        position: "absolute",
                        top: parseInt(top) * ration + "px",
                        left: parseInt(left) * ration + "px",
                        display: "flex",
                        alignItems: "center",
                        gap: parseInt(heightOrGap) * ration + "px",
                        whiteSpace: "nowrap"
                    });

                    const isName = normLabel.includes("name");

                    const labelSpan = document.createElement("span");
                    labelSpan.textContent = isName ? "" : `${field?.label || label}:`;
                    Object.assign(labelSpan.style, {
                        fontFamily: "Arial",
                        fontSize: parseInt(widthOrFontSize) * ration + "px",
                        fontWeight: "bold",
                        display: isName ? "none" : "inline",
                        whiteSpace: "nowrap"
                    });

                    const valueSpan = document.createElement("span");
                    valueSpan.textContent = value;
                    valueSpan.dataset.previewId = previewId;
                    Object.assign(valueSpan.style, {
                        fontFamily: "Arial",
                        fontSize: parseInt(widthOrFontSize) * ration + "px",
                        fontWeight: "normal",
                        whiteSpace: "nowrap"
                    });

                    row.appendChild(labelSpan);
                    row.appendChild(valueSpan);
                    headerBox.appendChild(row);
                }

                return {
                    label: field?.label || label,
                    previewId,
                    value,
                    style,
                    isPhoto
                };
            }).filter(Boolean);

            overlay.appendChild(headerBox);

            overlay.style.paddingTop = `${parseInt(container.height) * ration}px`

            // Live updates
            const liveUpdate = () => {
                template.fields.forEach(field => {
                    const el = document.querySelector(`[data-preview-id="${CSS.escape(field.previewId)}"]`);
                    if (el && el.tagName !== "IMG" && el.value !== undefined) {
                        field.value = el.value;
                    }
                });

                document.querySelectorAll(".header-overlay-box [data-preview-id]").forEach(el => {
                    const previewId = el.dataset.previewId;
                    const field = template.fields.find(f => f.previewId === previewId);
                    if (!field) return;

                    if (el.tagName === "IMG") {
                        el.src = field.value?.startsWith("data:image") ? field.value : "./assets/loard1.jpg";
                    } else {
                        const labelSpan = el.previousElementSibling;
                        if (labelSpan && !normalize(field.label).includes("name")) {
                            labelSpan.textContent = `${field.label}:`;
                        }
                        el.textContent = field.value || "";
                    }
                });

                const updatedHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
                if (updatedHeader?.fields) {
                    updatedHeader.fields.forEach(f => {
                        const liveField = template.fields.find(ff => ff.previewId === f.previewId);
                        if (liveField) {
                            f.value = liveField.value;
                        }
                    });
                    saveActiveHeaderForTemplate(template, updatedHeader);
                }
            };

            document.querySelectorAll("[data-preview-id]").forEach(input => {
                const eventType = input.tagName === "SELECT" ? "change" : "input";
                input.addEventListener(eventType, liveUpdate);
            });

            renderFormFields(headerFields);
        });
    });
}


function normalize(str) {
    return (str || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/[^a-z0-9]/gi, "");
}

function updateFieldPreview(field) {
    const previewEls = document.querySelectorAll(`[data-preview-id="${field.previewId}"]`);

    previewEls.forEach(el => {
        const isPhoto = field.label.toLowerCase().includes("photo");

        if (el.tagName === "IMG") {
            el.src = field.value;
        } else if (!isPhoto) {
            el.textContent = field.value || "";
        } else {
            el.textContent = "";
        }

        el.classList.add("highlight-update");
        setTimeout(() => el.classList.remove("highlight-update"), 500);
    });

    updateImagePage();
}

function getTemplateKey(template) {
    if (template?.key) return template.key;
    if (template?.id) return template.id;
    if (template?.imageUrl) {
        return template.imageUrl.split('/').pop().split('.')[0];
    }
    return "default";
}

function loadHeaderForCard(template) {
    const key = getTemplateKey(template);
    const stored = sessionStorage.getItem(`activeHeader_${key}`);
    return stored ? JSON.parse(stored) : null;
}


function saveActiveHeaderForTemplate(template, headerObj) {
    const key = getTemplateKey(template);
    sessionStorage.setItem(`activeHeader_${key}`, JSON.stringify(headerObj));
}

function renderFormFields(headerFields = []) {
    const formFields = document.getElementById("form-fields");
    formFields.innerHTML = "";
    let currentSectionIndex = 0;


    const normalize = str => str.toLowerCase().replace(/\s+/g, "").replace(/\(.*\)/g, "").replace(/[^a-z0-9]/gi, "");
    const skipPreviewIds = [];

    const sectionOrder = ["personalFields", "familyFields", "contactFields"];
    const sectionTitles = {
        personalFields: "Personal Details",
        familyFields: "Family Details",
        contactFields: "Contact Details"
    };


    const dropdownOptions = {
        rashi: ["Mesh (Aries)", "Vrishabh (Taurus)", "Mithun (Gemini)", "Karka (Cancer)", "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrischik (Scorpio)", "Dhanu (Sagittarius)", "Makar (Capricorn)", "Kumbh (Aquarius)", "Meen (Pisces)"],
        nakshatra: ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"],
        complexion: ["Very Fair", "Fair", "Medium", "Wheatish", "Brown", "Dusky", "Dark"],
        height: ["4 feet", "4 feet 6 inches", "5 feet", "5 feet 3 inches", "5 feet 6 inches", "5 feet 9 inches", "6 feet"]
    };

    // Collect section labels
    const sectionLabelMap = {};
    sectionOrder.forEach(section => {
        sectionLabelMap[section] = template.fields
            .filter(field => field.section === section)
            .map(field => field.label);
    });


    function collapseAllSectionsExcept(targetSection) {
        document.querySelectorAll(".section-block").forEach(block => {
            const content = block.querySelector(".collapsible-content");
            const header = block.querySelector(".section-title");
            const sectionId = block.dataset.section;

            // Keep all section blocks always visible
            block.style.display = "block";

            if (sectionId === targetSection) {
                const isOpen = content.classList.contains("open");

                if (isOpen) {
                    content.classList.remove("open");
                    header.classList.remove("open");
                    content.style.display = "none";
                } else {
                    content.classList.add("open");
                    header.classList.add("open");
                    content.style.display = "block";
                }
            } else {
                content.classList.remove("open");
                header.classList.remove("open");
            }
        });
    }


    sectionOrder.forEach((section, sIndex) => {
        const sectionFields = template.fields.filter(f => f.section === section);

        const sectionBlock = document.createElement("div");
        sectionBlock.className = "section-block";
        sectionBlock.dataset.section = section;
        sectionBlock.style.display = sIndex === currentSectionIndex ? "block" : "none";

        const sectionHeader = createSectionHeader(sectionTitles[section]);
        const sectionContent = document.createElement("div");
        sectionContent.className = "collapsible-content";
        sectionContent.style.display = sIndex === currentSectionIndex ? "block" : "none";
        if (sIndex === currentSectionIndex) sectionContent.classList.add("open");

        sectionFields.forEach((field, idx) => {
            if (!field || skipPreviewIds.includes(field.previewId)) return;

            const label = field.label;

            const row = document.createElement("div");
            row.className = "form-row";

            const lowerLabel = normalize(label);
            let inputElement;

            if (lowerLabel.includes("photo")) {
                const uniqueId = field.id || `field-${section}-${idx}`;

                if (field.label?.toLowerCase().includes("photo")) {
                    const wrapper = document.createElement("div");
                    wrapper.classList.add("input-value")

                    const uploadBtn = document.createElement("button");
                    uploadBtn.textContent = "Upload Photo";
                    uploadBtn.type = "button";
                    uploadBtn.className = "upload-photo-btn";

                    const fileInput = document.createElement("input");
                    fileInput.type = "file";
                    fileInput.accept = "image/*";
                    fileInput.style.display = "none";
                    fileInput.className = "photo-input";
                    fileInput.id = uniqueId;
                    fileInput.name = uniqueId;

                    uploadBtn.addEventListener("click", () => {
                        fileInput.click();
                    });

                    fileInput.addEventListener("change", e => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = ev => {
                            const imageUrl = ev.target.result;
                            field.imageValue = imageUrl;

                            const img = document.querySelector(`.ready-made-header-box img[data-image-id="${field.previewId}"]`);
                            if (img) img.src = imageUrl;

                            try {
                                const storedHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
                                if (storedHeader?.fields) {
                                    const match = storedHeader.fields.find(f => f.previewId === field.previewId);
                                    if (match) {
                                        match.imageValue = imageUrl;
                                        match.isPhoto = true;
                                        match.style ??= ["0px", "0px", "100px", "100px", "4px"];
                                        saveActiveHeaderForTemplate(template, storedHeader);
                                    }
                                }
                            } catch (err) {
                                console.warn("Image save failed:", err);
                            }
                        };

                        reader.readAsDataURL(file);
                    });

                    wrapper.appendChild(uploadBtn);
                    wrapper.appendChild(fileInput);
                    inputElement = wrapper;
                } else {
                    inputElement = document.createElement("input");
                    inputElement.type = "text";
                    inputElement.className = "input-value";
                    inputElement.value = field.value;
                    inputElement.setAttribute("data-value", idx);
                    inputElement.id = uniqueId;
                    inputElement.name = uniqueId;
                }

            }
            else if (lowerLabel.includes("date")) {
                inputElement = document.createElement("input");
                inputElement.type = "date";
                inputElement.className = "input-value";
                inputElement.value = field.value;
                inputElement.setAttribute("data-value", idx);
            }
            else if (lowerLabel.includes("time")) {
                inputElement = document.createElement("input");
                inputElement.type = "time";
                inputElement.className = "input-value";
                inputElement.value = field.value;
                inputElement.setAttribute("data-value", idx);
            }
            else if (dropdownOptions[lowerLabel]) {
                const selectHTML = createDropdownHTML(dropdownOptions[lowerLabel], field.value, idx, `Select ${label}`);
                const tempWrapper = document.createElement("div");
                tempWrapper.innerHTML = selectHTML.trim();
                inputElement = tempWrapper.firstChild;
            }
            else {
                inputElement = document.createElement("input");
                inputElement.type = "text";
                inputElement.className = "input-value";
                inputElement.value = field.value;
                inputElement.setAttribute("data-value", idx);
            }
            const toggle = document.createElement("label");
            toggle.className = "switch";
            toggle.innerHTML = `
                    <input type="checkbox" ${field.hidden ? "" : "checked"} data-toggle="${idx}">
                    <span class="slider"></span>
                `;
            toggle.querySelector("input").addEventListener("change", (e) => {
                const isChecked = e.target.checked;
                field.hidden = !isChecked;
                const activeHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
                if (activeHeader) {
                    const storedField = activeHeader.fields.find(f => f.id === field.id);
                    if (storedField) {
                        storedField.hidden = field.hidden;
                    }
                    sessionStorage.setItem("activeHeader", JSON.stringify(activeHeader));
                }
                const previewElement = document.querySelector(`[data-preview-id="${field.previewId}"]`);
                if (previewElement) {
                    const parentRow = previewElement.closest("div");
                    if (parentRow) {
                        parentRow.style.display = field.hidden ? "none" : "flex";
                    }
                }

            });


            const labelWrapper = document.createElement("div");
            labelWrapper.className = "input-icon-wrapper";
            labelWrapper.innerHTML = `
            <input type="text" class="input-label" value="${label}" data-label="${idx}" disabled>
            <button class="edit-btn"><svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.0955 5.15866L12.1278 2.0171C12.0291 1.9126 11.912 1.82971 11.783 1.77316C11.6541 1.71661 11.5159 1.6875 11.3764 1.6875C11.2368 1.6875 11.0987 1.71661 10.9697 1.77316C10.8408 1.82971 10.7237 1.9126 10.625 2.0171L2.43645 10.6873C2.33736 10.7914 2.2588 10.9153 2.20533 11.0518C2.15186 11.1884 2.12456 11.3348 2.12501 11.4826V14.6248C2.12501 14.9232 2.23695 15.2093 2.4362 15.4203C2.63546 15.6313 2.90571 15.7498 3.18751 15.7498H14.3438C14.4847 15.7498 14.6198 15.6906 14.7194 15.5851C14.819 15.4796 14.875 15.3365 14.875 15.1873C14.875 15.0381 14.819 14.8951 14.7194 14.7896C14.6198 14.6841 14.4847 14.6248 14.3438 14.6248H7.65797L15.0955 6.74983C15.1942 6.64536 15.2724 6.52133 15.3259 6.38482C15.3793 6.24831 15.4068 6.102 15.4068 5.95424C15.4068 5.80649 15.3793 5.66017 15.3259 5.52367C15.2724 5.38716 15.1942 5.26313 15.0955 5.15866ZM6.1552 14.6248H3.18751V11.4826L9.03126 5.29506L11.999 8.43733L6.1552 14.6248ZM12.75 7.6421L9.78297 4.49983L11.3767 2.81233L14.3438 5.9546L12.75 7.6421Z" fill="#4E9459"/>
            </svg>
            </button>`;

            const colonSpan = document.createElement("span");
            colonSpan.textContent = ":";

            row.appendChild(toggle);
            row.appendChild(labelWrapper);
            row.appendChild(colonSpan);
            row.appendChild(inputElement);

            attachFieldListeners(row, field, idx);
            sectionContent.appendChild(row);
        });




        // Add + Next button row
        const buttonWrapper = document.createElement("div");
        buttonWrapper.className = "section-buttons-wrapper";
        buttonWrapper.style.cssText = `
                display: flex;
                justify-content: flex-end;
                align-items: flex-end;
                background: #FFFFFF;
                backdrop-filter: blur(18.1px);
                gap: 12px;
                padding: 5px;
            `;

        const addBtn = document.createElement("button");
        addBtn.className = "btn-add";
        addBtn.dataset.section = section;
        addBtn.innerText = "+ Add Field";
        addBtn.addEventListener("click", () => {
            const newField = {
                label: "New Field",
                value: "",
                section,
                hidden: false,
                id: `new-${Date.now()}`,
                labelStyle: { ...template.style },
                valueStyle: { ...template.style }
            };

            template.fields.push(newField);

            const activeHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
            if (activeHeader) {
                activeHeader.fields = template.fields;
                sessionStorage.setItem("activeHeader", JSON.stringify(activeHeader));
            }

            renderTemplate()
        });



        const nextBtn = document.createElement("button");
        nextBtn.id = "next-section-btn";
        const isLast = section === sectionOrder[sectionOrder.length - 1];
        nextBtn.textContent = isLast ? "Submit" : "Next";
        nextBtn.addEventListener("click", (e) => {
            e.preventDefault();

            const filled = template.fields.filter(f => f.section === section && f.value?.trim()).length;
            if (filled < 2) {
                alert("Please fill at least 2 fields.");
                return;
            }

            if (!isLast) {


                const existingSVG = sectionHeader.querySelector(".completion-icon");
                if (!existingSVG) {
                    const svgString = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="completion-icon">
                            <circle cx="18" cy="18" r="18" fill="#4E9459"/>
                            <path d="M25.0454 13.7642L15.5454 23.2642C15.4903 23.3194 15.4248 23.3632 15.3527 23.393C15.2806 23.4229 15.2034 23.4383 15.1253 23.4383C15.0473 23.4383 14.97 23.4229 14.898 23.393C14.8259 23.3632 14.7604 23.3194 14.7053 23.2642L10.549 19.1079C10.4376 18.9965 10.375 18.8454 10.375 18.6878C10.375 18.5303 10.4376 18.3792 10.549 18.2678C10.6604 18.1563 10.8115 18.0937 10.9691 18.0937C11.1266 18.0937 11.2778 18.1563 11.3892 18.2678L15.1253 22.0047L24.2053 12.924C24.3167 12.8126 24.4678 12.75 24.6253 12.75C24.7829 12.75 24.934 12.8126 25.0454 12.924C25.1568 13.0354 25.2194 13.1865 25.2194 13.3441C25.2194 13.5016 25.1568 13.6528 25.0454 13.7642Z" fill="white"/>
                            </svg>`;
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
                    const svgElement = svgDoc.documentElement;

                    svgElement.classList.add("completion-icon");
                    sectionHeader.insertBefore(svgElement, sectionHeader.firstChild);
                    sectionHeader.style.marginLeft = "8%";
                }


                const nextSectionId = sectionOrder[sIndex + 1];
                collapseAllSectionsExcept(nextSectionId);

                // Optional scroll to next
                const nextBlock = document.querySelector(`.section-block[data-section="${nextSectionId}"]`);
                nextBlock.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {

                const existingSVG = sectionHeader.querySelector(".completion-icon");
                if (!existingSVG) {
                    const svgString = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="completion-icon">
                            <circle cx="18" cy="18" r="18" fill="#4E9459"/>
                            <path d="M25.0454 13.7642L15.5454 23.2642C15.4903 23.3194 15.4248 23.3632 15.3527 23.393C15.2806 23.4229 15.2034 23.4383 15.1253 23.4383C15.0473 23.4383 14.97 23.4229 14.898 23.393C14.8259 23.3632 14.7604 23.3194 14.7053 23.2642L10.549 19.1079C10.4376 18.9965 10.375 18.8454 10.375 18.6878C10.375 18.5303 10.4376 18.3792 10.549 18.2678C10.6604 18.1563 10.8115 18.0937 10.9691 18.0937C11.1266 18.0937 11.2778 18.1563 11.3892 18.2678L15.1253 22.0047L24.2053 12.924C24.3167 12.8126 24.4678 12.75 24.6253 12.75C24.7829 12.75 24.934 12.8126 25.0454 12.924C25.1568 13.0354 25.2194 13.1865 25.2194 13.3441C25.2194 13.5016 25.1568 13.6528 25.0454 13.7642Z" fill="white"/>
                            </svg>`;
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
                    const svgElement = svgDoc.documentElement;

                    svgElement.classList.add("completion-icon");
                    sectionHeader.insertBefore(svgElement, sectionHeader.firstChild);
                    sectionHeader.style.marginLeft = "8%";
                }
                // ✅ Validate again for safety
                const totalFilled = template.fields.filter(f => f.value?.trim()).length;
                if (totalFilled < 2 * sectionOrder.length) {
                    alert("Please fill at least 2 fields in each section before submitting.");
                    return;
                }

                // ✅ Mark all section headers as complete (inject green icon)
                sectionOrder.forEach(sec => {
                    const header = document.querySelector(`.section-header[data-section="${sec}"]`);
                    if (header && !header.querySelector(".completion-icon")) {
                        const svgString = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="completion-icon">
                    <circle cx="18" cy="18" r="18" fill="#4E9459"/>
                    <path d="M25.0454 13.7642L15.5454 23.2642C15.4903 23.3194 15.4248 23.3632 15.3527 23.393C15.2806 23.4229 15.2034 23.4383 15.1253 23.4383C15.0473 23.4383 14.97 23.4229 14.898 23.393C14.8259 23.3632 14.7604 23.3194 14.7053 23.2642L10.549 19.1079C10.4376 18.9965 10.375 18.8454 10.375 18.6878C10.375 18.5303 10.4376 18.3792 10.549 18.2678C10.6604 18.1563 10.8115 18.0937 10.9691 18.0937C11.1266 18.0937 11.2778 18.1563 11.3892 18.2678L15.1253 22.0047L24.2053 12.924C24.3167 12.8126 24.4678 12.75 24.6253 12.75C24.7829 12.75 24.934 12.8126 25.0454 12.924C25.1568 13.0354 25.2194 13.1865 25.2194 13.3441C25.2194 13.5016 25.1568 13.6528 25.0454 13.7642Z" fill="white"/>
                </svg>`;
                        const parser = new DOMParser();
                        const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
                        const svgElement = svgDoc.documentElement;
                        svgElement.classList.add("completion-icon");
                        header.insertBefore(svgElement, header.firstChild);
                    }
                });

                collapseAllSectionsExcept(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => {
                    alert("Form submitted successfully!");
                    initDownloadModalWithPreviewAndPDF();
                    document.getElementById("downloadBtn")?.click();
                }, 600);
            }

        });




        sectionHeader.addEventListener("click", () => {
            collapseAllSectionsExcept(section);
        });


        buttonWrapper.appendChild(addBtn);
        buttonWrapper.appendChild(nextBtn);
        sectionContent.appendChild(buttonWrapper);
        sectionBlock.appendChild(sectionHeader);
        sectionBlock.appendChild(sectionContent);
        formFields.appendChild(sectionBlock);
    });

    function createDropdownHTML(options, selected, idx, placeholder) {
        return `<select class="input-value" data-value="${idx}" id="field-${idx}" name="field-${idx}">
                <option value="">${placeholder}</option>
                ${options.map(opt => `<option value="${opt}" ${opt === selected ? "selected" : ""}>${opt}</option>`).join("")}
            </select>`;
    }

    function createSectionHeader(title) {
        const header = document.createElement("div");
        header.className = "section-title collapsible-header";
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.gap = "10px";
        header.innerHTML = `
                <span>${title}</span>
                <span class="collapse-arrow">
                <svg width="36" height="36" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="11" stroke="#C4C4C4" stroke-width="1"/>
                    <path d="M10 8L14 12L10 16" stroke="#4E9459" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                </span>`;
        return header;
    }

    function attachFieldListeners(row, field, idx) {
        const normalizeId = field.previewId;

        // Handle text, date, time inputs
        row.querySelector(".input-value")?.addEventListener("input", (e) => {
            if (e.target.type !== "file") {
                field.value = e.target.value;

                if (typeof field.pageIndex === "number" && currentPageIndex !== field.pageIndex) {
                    currentPageIndex = field.pageIndex;
                    updatePageDisplay();
                }


                updateFieldPreview(field);
            }
        });

        // Dropdown change
        row.querySelector("select.input-value")?.addEventListener("change", e => {
            field.value = e.target.value;
            updateFieldPreview(field);
        });

        // Photo upload
        row.querySelector("input.photo-input")?.addEventListener("change", e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = ev => {
                const imageUrl = ev.target.result;
                const headerBox = document.querySelector(".overlay-page .header-overlay-box");
                if (!headerBox) return;

                field.value = imageUrl;

                const storedHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
                if (storedHeader?.fields) {
                    const match = storedHeader.fields.find(f => f.previewId === normalizeId);
                    if (match) {
                        match.value = imageUrl;
                        match.isPhoto = true;
                        match.style = [img.style.top, img.style.left, img.style.width, img.style.height, img.style.borderRadius];
                    }
                    saveActiveHeaderForTemplate(template, storedHeader);
                }



                let img = headerBox.querySelector(`img[data-preview-id="${normalizeId}"]`);
                if (!img) {
                    img = headerBox.querySelector(`img[src*="loard1.jpg"]`);
                    if (img) {
                        img.dataset.previewId = normalizeId;
                    }
                }

                if (img) {
                    img.src = imageUrl;
                    console.log("Updated existing image:", img);
                } else {
                    img = document.createElement("img");
                    img.src = imageUrl;
                    img.dataset.previewId = normalizeId;

                    let styleFromHeader = null;
                    try {
                        const storedHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
                        if (storedHeader?.fields) {
                            const matched = storedHeader.fields.find(f => f.previewId === normalizeId);
                            if (matched?.style) styleFromHeader = matched.style;
                        }
                    } catch (err) {
                        console.warn("Style read failed from sessionStorage:", err);
                    }

                    const fallbackStyle = field.valueStyle || {};
                    Object.assign(img.style, {
                        position: "absolute",
                        top: styleFromHeader?.[0] || fallbackStyle.top || "0px",
                        left: styleFromHeader?.[1] || fallbackStyle.left || "0px",
                        width: styleFromHeader?.[2] || fallbackStyle.width || "100px",
                        height: styleFromHeader?.[3] || fallbackStyle.height || "100px",
                        objectFit: "cover",
                        zIndex: 20,
                        borderRadius: styleFromHeader?.[4] || fallbackStyle.borderRadius || "4px"
                    });

                    headerBox.appendChild(img);
                    console.log("➕ New image added:", img);
                }

                try {
                    const storedHeader = JSON.parse(sessionStorage.getItem("activeHeader") || "null");
                    if (storedHeader?.fields) {
                        const match = storedHeader.fields.find(f => f.previewId === normalizeId);
                        if (match) {
                            match.value = imageUrl;
                            match.isPhoto = true;

                            if (!match.style || match.style.length !== 5) {
                                match.style = [
                                    img.style.top,
                                    img.style.left,
                                    img.style.width,
                                    img.style.height,
                                    img.style.borderRadius
                                ];
                            }

                            saveActiveHeaderForTemplate(template, storedHeader);
                            console.log(" Saved image & style to sessionStorage");
                        }
                    }
                } catch (err) {
                    console.error(" Failed to update sessionStorage.activeHeader:", err);
                }
            };

            reader.readAsDataURL(file);
        });


        if (!normalize(field.label).includes("photo")) {
            row.querySelector(".input-label")?.addEventListener("input", e => {
                const newLabel = e.target.value;
                field.label = newLabel;
                document.querySelectorAll(`[data-preview-id="${normalizeId}"]`).forEach(span => {
                    const labelSpan = span?.previousElementSibling;
                    if (labelSpan && labelSpan.tagName === "SPAN") {
                        labelSpan.textContent = `${newLabel}:`;
                    }
                });
            });
        }
    }

    window.addEventListener("DOMContentLoaded", () => {
        collapseAllSectionsExcept(sectionOrder[0]);
    });

}


function initDownloadModalWithPreviewAndPDF() {
    const modal = document.getElementById("downloadModal");
    const openModalBtn = document.getElementById("downloadBtn");
    const closeBtn = modal?.querySelector(".back-btn");
    const modalImage = modal?.querySelector(".image-wrapper img");
    const downloadBtn = document.getElementById("DownloadPdf");
    const backBtnMain = document.getElementById("backBtnMain");

    if (!modal || !downloadBtn || !modalImage) return;

    openModalBtn?.addEventListener("click", () => {
        const selectedImages = JSON.parse(sessionStorage.getItem("selectedImages") || "[]");
        const cardPreview = document.querySelector(".card-preview");

        if (selectedImages.length > 0 && cardPreview) {
            const images = Array.from(cardPreview.querySelectorAll("img"));
            const fontsLoaded = document.fonts.ready;

            const imagePromises = images.map(img =>
                img.complete ? Promise.resolve() :
                    new Promise(res => {
                        img.onload = res;
                        img.onerror = res;
                    })
            );

            Promise.all([...imagePromises, fontsLoaded]).then(() => {
                html2canvas(cardPreview, {
                    useCORS: true,
                    backgroundColor: null,
                    scale: 2
                }).then(canvas => {
                    modalImage.src = canvas.toDataURL("image/png");
                    modal.classList.remove("hidden");
                }).catch(err => {
                    console.error("Preview error:", err);
                    modalImage.alt = "Error loading preview";
                });
            });
        } else {
            alert("Card preview not found or no images selected.");
        }
    });


    closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));
    window.addEventListener("click", e => {
        if (e.target === modal) modal.classList.add("hidden");
    });

    backBtnMain?.addEventListener("click", () => {
        window.location.href = "../index.html";
    });

    downloadBtn.addEventListener("click", async () => {
        const { jsPDF } = window.jspdf;
        const pages = Array.from(document.querySelectorAll(".overlay-page"));
        const selectedImages = JSON.parse(sessionStorage.getItem("selectedImages") || "[]");

        if (!pages.length) return alert("No pages to export.");

        // Show all pages temporarily
        pages.forEach(p => {
            p.style.display = "flex";
            p.style.visibility = "visible";
        });

        // Initialize A4 PDF
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: "a4"
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const bgUrl = selectedImages[i] || selectedImages[selectedImages.length - 1] || "";

            // Clone and reset layout
            const clone = page.cloneNode(true);
            Object.assign(clone.style, {
                overflow: "visible",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "0",
                margin: "0"
            });

            Array.from(clone.children).forEach(child => {
                child.style.marginTop = "0";
                child.style.paddingTop = "0";
            });

            // Wrapper with background image
            const wrapper = document.createElement("div");
            Object.assign(wrapper.style, {
                position: "absolute",
                right: "0",
                top: "0",
                width: 450 + "px",
                height: 650 + "px",
                backgroundImage: `url(${bgUrl})`,
                backgroundSize: "cover",
                display: "flex",
                backgroundRepeat: "no-repeat"
            });

            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);

            // Wait for images and fonts
            const images = Array.from(clone.querySelectorAll("img"));
            const imagePromises = images.map(img =>
                img.complete
                    ? Promise.resolve()
                    : new Promise(res => {
                        img.onload = res;
                        img.onerror = res;
                    })
            );

            await Promise.all([...imagePromises, document.fonts.ready]);
            await new Promise(res => setTimeout(res, 100)); // buffer render timing

            // Capture to canvas
            const canvas = await html2canvas(wrapper, {
                useCORS: true,
                backgroundColor: null,
                scale: 3,
                scrollY: -window.scrollY
            });

            const imgData = canvas.toDataURL("image/png");
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            // Convert px to pt (1px = 0.75pt approx) and fit to A4
            const ptWidth = canvasWidth * 0.75;
            const ptHeight = canvasHeight * 0.75;

            const scale = Math.min(pdfWidth / ptWidth, pdfHeight / ptHeight);
            const finalWidth = ptWidth * scale;
            const finalHeight = ptHeight * scale;

            const offsetX = (pdfWidth - finalWidth) / 2;
            const offsetY = (pdfHeight - finalHeight) / 2;

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, "PNG", offsetX, offsetY, finalWidth, finalHeight);

            document.body.removeChild(wrapper);
        }

        // Reset original visibility
        pages.forEach((page, index) => {
            page.style.display = index === 0 ? "flex" : "none";
            page.style.visibility = "";
        });

        // Trigger download
        pdf.save("template-preview.pdf");
    });
}


document.addEventListener("DOMContentLoaded", () => {
    initDownloadModalWithPreviewAndPDF();
});



window.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadTemplates();
        renderFormFields();
    } catch (err) {
        console.error("Error loading templates:", err);
    }
});


