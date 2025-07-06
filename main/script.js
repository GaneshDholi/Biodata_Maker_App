let currentTemplate = 0;
let templates = [];

const formFields = document.getElementById("form-fields");
const cardImage = document.getElementById("card-image");
const prevBtn = document.getElementById("prev-template");
const pageNumber = document.getElementById("page_number");
const nextBtn = document.getElementById("next-template");
const addBtn = document.getElementById("add-field");
const textOverlay = document.getElementById("text-overlay");
const backPageBtn = document.getElementById("back-page");
const nextPageBtn = document.getElementById("next-page");
const checkSvg = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="18" cy="18" r="18" fill="#4E9459"/>
  <path d="M12 18.5L16 22.5L24 14.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

let templateJsonData = null;

async function loadTemplates() {
  const [templateJson, designJson] = await Promise.all([
    fetch("template.json").then((res) => res.json()),
    fetch("design.json").then((res) => res.json()),
  ]);

  templateJsonData = templateJson;

  templates = designJson.templates.map((design, index) => {
    const base = templateJson.templates[index] || {};
    const fields = [];

    const [labelColor, valueColor] = design.style.fontColor;
    const [labelFont, valueFont] = design.style.fontFamily;
    const [labelWeight, valueWeight] = design.style.fontWeight;

    const sections = ["personalFields", "familyFields", "contactFields"];
    sections.forEach((section) => {
      (base.Movable_fields?.[section] || []).forEach((label) => {
        const isDuplicate = Object.keys(
          base.UnMovable_fields?.fields || {}
        ).some(
          (key) => key.toLowerCase() === label.toLowerCase().replace(/\s/g, "")
        );
        if (!isDuplicate) {
          fields.push({
            label,
            value: "",
            section,
            hidden: false,
            id: `${section}-${label.replace(/\s/g, "")}-${index}`,
            labelStyle: {
              color: labelColor,
              fontFamily: labelFont,
              fontWeight: labelWeight,
            },
            valueStyle: {
              color: valueColor,
              fontFamily: valueFont,
              fontWeight: valueWeight,
            },
          });
        }
      });
    });

    return {
      imageUrl: design.imageUrl,
      container: design.container,
      style: design.style,
      fields,
    };
  });

  renderTemplate(currentTemplate);
  setupNavigation();
}

let sectionOrder = ["personalFields", "familyFields", "contactFields"];
let visibleSections = [sectionOrder[0]];
let currentSectionIndex = 0;

function renderTemplate(index) {
  const template = templates[index];
  const designMeta = templateJsonData.templates[index];

  let pages = [];
  let currentPageIndex = 0;

  const selectedImage = sessionStorage.getItem("selectedImage");
  cardImage.src = selectedImage ? selectedImage : template.imageUrl;

  formFields.innerHTML = "";
  textOverlay.innerHTML = "";
  document.getElementById("pagination-buttons").style.display = "none";

  const container = template.container;
  Object.assign(textOverlay.style, {
    position: "absolute",
    top: container.top,
    left: container.left,
    width: container.width,
    height:
      window.innerWidth >= 1550
        ? "540px"
        : window.innerWidth <= 900
          ? "365px"
          : container.height,
  });

  const sections = ["personalFields", "familyFields", "contactFields"];
  const sectionTitles = {
    personalFields: "Personal Details",
    familyFields: "Family Details",
    contactFields: "Contact Details",
  };

  function createNewPage() {
    const page = createOverlayPage();
    page.style.display = "flex";
    page.style.flexDirection = "column";
    page.style.alignItems = "flex-start";
    pages.push(page);
    textOverlay.appendChild(page);
    return page;
  }

  let currentPage = createNewPage();

  let maxHeight = textOverlay.getBoundingClientRect().height;
  let usedHeight = 0;

  let previewIndex = 0;

  sections.forEach((section) => {
    const titleDiv = document.createElement("div");
    titleDiv.textContent = sectionTitles[section];
    titleDiv.style.cssText =
      designMeta.sectionHead?.[0] || "font-weight: bold; font-size: 18px;";

    currentPage.appendChild(titleDiv);
    const titleHeight = titleDiv.getBoundingClientRect().height;
    usedHeight += titleHeight;

    template.fields
      .filter((f) => f.section === section && !f.hidden)
      .forEach((field) => {
        const line = document.createElement("div");
        line.style.display = "flex";
        line.style.gap = container.gap || "10px";
        line.style.alignItems = "center";
        line.style.height = "18px";
        line.style.justifyContent = "flex-start";

        const labelSpan = document.createElement("span");
        labelSpan.textContent = `${field.label}: `;
        labelSpan.style.textWrap = "nowrap";
        Object.assign(labelSpan.style, field.labelStyle);

        const valueSpan = document.createElement("span");
        const previewId = `preview-value-${index}-${previewIndex}`;
        valueSpan.id = previewId;
        field.previewId = previewId;
        valueSpan.textContent = field.value || "";

        valueSpan.style.whiteSpace = "nowrap";
        valueSpan.style.wordBreak = "break-word";
        valueSpan.style.overflowWrap = "break-word";
        valueSpan.style.maxWidth = "100%";
        valueSpan.style.display = "block";
        Object.assign(valueSpan.style, field.valueStyle);

        line.appendChild(labelSpan);
        line.appendChild(valueSpan);

        document.body.appendChild(line);
        const lineHeight = line.getBoundingClientRect().height;
        document.body.removeChild(line);

        const overlay_text_height = lineHeight + usedHeight + 30;
        if (overlay_text_height > maxHeight) {
          currentPage = createNewPage();
          usedHeight = 0;
        } else {
          usedHeight += lineHeight;
        }
        currentPage.appendChild(line);
        usedHeight += lineHeight;
        previewIndex++;
      });
  });

  pages.forEach((page, i) => {
    page.style.display = i === 0 ? "flex" : "none";
  });

  const unmovable = designMeta.UnMovable_fields?.fields || {};
  Object.entries(unmovable).forEach(([label, [top, left]]) => {
    const field = template.fields.find(
      (f) =>
        f.label.toLowerCase().replace(/\s/g, "") ===
        label.toLowerCase().replace(/\s/g, "")
    );

    if (field && !field.hidden) {
      const fixedDiv = document.createElement("div");
      fixedDiv.style.position = "absolute";
      fixedDiv.style.top = top;
      fixedDiv.style.left = left;
      fixedDiv.style.display = "flex";
      fixedDiv.style.gap = container.gap || "10px";

      const labelSpan = document.createElement("span");
      labelSpan.textContent = `${label}: `;
      Object.assign(labelSpan.style, field.labelStyle);

      const valueSpan = document.createElement("span");
      valueSpan.textContent = field.value;
      Object.assign(valueSpan.style, field.valueStyle);

      fixedDiv.appendChild(labelSpan);
      fixedDiv.appendChild(valueSpan);
      textOverlay.appendChild(fixedDiv);
    }
  });

  const pagination = document.getElementById("pagination-buttons");
  pagination.style.display = "flex";

  nextPageBtn.onclick = () => {
    if (currentPageIndex < pages.length - 1) {
      pages[currentPageIndex].style.display = "none";
      currentPageIndex++;
      pages[currentPageIndex].style.display = "flex";
      pageNumber.textContent = `Page ${currentPageIndex + 1}`;
    }
  };

  backPageBtn.onclick = () => {
    if (currentPageIndex > 0) {
      pages[currentPageIndex].style.display = "none";
      currentPageIndex--;
      pages[currentPageIndex].style.display = "flex";
      pageNumber.textContent = `Page ${currentPageIndex + 1}`;
    }
  };

  //form js
  let formIndex = 0;

  sections.forEach((section) => {
    const sectionBlock = document.createElement("div");
    sectionBlock.className = "section-block";
    sectionBlock.dataset.section = section;
    sectionBlock.style.display =
      section === sectionOrder[currentSectionIndex] ? "block" : "none";

    if (sectionOrder[currentSectionIndex]) {
      const initialSection = document.querySelector(
        `.section-block[data-section="${sectionOrder[currentSectionIndex]}"]`
      );
      if (initialSection) initialSection.style.display = "block";
    }

    const sectionHeader = document.createElement("div");
    sectionHeader.className = "section-title collapsible-header";
    sectionHeader.style.display = "flex";
    sectionHeader.style.alignItems = "center";
    sectionHeader.style.gap = "10px";

    const filledCount = template.fields.filter(
      (f) => f.section === section && f.value?.trim()
    ).length;

    if (filledCount >= 2) {
      const iconWrapper = document.createElement("div");
      iconWrapper.style.display = "flex";
      iconWrapper.style.alignItems = "center";
      iconWrapper.style.justifyContent = "center";
      iconWrapper.style.position = "absolute";
      iconWrapper.style.width = "36px";
      iconWrapper.style.height = "36px";
      sectionHeader.appendChild(iconWrapper);
    }

    const titleText = document.createElement("span");
    titleText.textContent = sectionTitles[section];
    sectionHeader.appendChild(titleText);

    const collapseToggle = document.createElement("span");
    collapseToggle.innerHTML = `
    <svg width="36" height="36" viewBox="0 0 23 23" style="margin-top: 6px;" fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" stroke="#C4C4C4" stroke-width="1"/>
      <path d="M8 10L12 14L16 10"
        stroke="#4E9459" stroke-width="1.3"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    collapseToggle.className = "collapse-arrow";
    sectionHeader.appendChild(collapseToggle);

    const sectionContent = document.createElement("div");
    sectionContent.className = "collapsible-content";
    collapseToggle.innerHTML = `<svg width="36" height="36" style="margin-top: 6px;" viewBox="0 0 23 23" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="11" stroke="#C4C4C4" stroke-width="1"/>
        <path d="M10 8L14 12L10 16"
          stroke="#4E9459" stroke-width="1.3"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    sectionHeader.addEventListener("click", () => {
      const isOpen = sectionContent.classList.toggle("open");

      collapseToggle.innerHTML = isOpen
        ? `<svg width="36" height="36" viewBox="0 0 23 23" style="margin-top: 6px;" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="11" stroke="#C4C4C4" stroke-width="1"/>
        <path d="M8 10L12 14L16 10"
          stroke="#4E9459" stroke-width="1.3"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
        : `<svg width="36" height="36" viewBox="0 0 23 23" style="margin-top: 6px;" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="11" stroke="#C4C4C4" stroke-width="1"/>
        <path d="M10 8L14 12L10 16"
          stroke="#4E9459" stroke-width="1.3"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

      const filledCount = template.fields.filter(
        (f) => f.section === section && f.value?.trim()
      ).length;

      sectionHeader
        .querySelectorAll(".check-icon")
        .forEach((el) => el.remove());

      if (filledCount >= 2) {
        sectionHeader.insertBefore(sectionHeader.firstChild);
      } else {
        console.log("need to feel 2 fields");
      }

      const checkIcon = sectionHeader.querySelector(".check-icon");
      console.log(checkIcon);
      if (checkIcon) {
        checkIcon.style.display = isOpen ? "none" : "flex";
        sectionHeader.style.marginLeft = isOpen ? "0" : "50px";
      }
    });

    template.fields
      .filter((f) => f.section === section)
      .forEach((field) => {
        const row = document.createElement("div");
        row.className = "form-row";

        const rashiArray = [
          "Mesh (Aries)",
          "Vrishabh (Taurus)",
          "Mithun (Gemini)",
          "Karka (Cancer)",
          "Simha (Leo)",
          "Kanya (Virgo)",
          "Tula (Libra)",
          "Vrischik (Scorpio)",
          "Dhanu (Sagittarius)",
          "Makar (Capricorn)",
          "Kumbh (Aquarius)",
          "Meen (Pisces)"
        ];

        const nakshatraArray = [
          "Ashwini",
          "Bharani",
          "Krittika",
          "Rohini",
          "Mrigashira",
          "Ardra",
          "Punarvasu",
          "Pushya",
          "Ashlesha",
          "Magha",
          "Purva Phalguni",
          "Uttara Phalguni",
          "Hasta",
          "Chitra",
          "Swati",
          "Vishakha",
          "Anuradha",
          "Jyeshtha",
          "Mula",
          "Purva Ashadha",
          "Uttara Ashadha",
          "Shravana",
          "Dhanishta",
          "Shatabhisha",
          "Purva Bhadrapada",
          "Uttara Bhadrapada",
          "Revati"
        ];

        const complexionArray = [
          "Very Fair",
          "Fair",
          "Medium",
          "Wheatish",
          "Brown",
          "Dusky",
          "Dark"
        ];

        const heightArray = [
          "3 feet 5 inches",
          "3 feet 6 inches",
          "3 feet 7 inches",
          "3 feet 8 inches",
          "3 feet 9 inches",
          "3 feet 10 inches",
          "3 feet 11 inches",
          "4 feet",
          "4 feet 1 inch",
          "4 feet 2 inches",
          "4 feet 3 inches",
          "4 feet 4 inches",
          "4 feet 5 inches",
          "4 feet 6 inches",
          "4 feet 7 inches",
          "4 feet 8 inches",
          "4 feet 9 inches",
          "4 feet 10 inches",
          "4 feet 11 inches",
          "5 feet",
          "5 feet 1 inch",
          "5 feet 2 inches",
          "5 feet 3 inches",
          "5 feet 4 inches",
          "5 feet 5 inches",
          "5 feet 6 inches",
          "5 feet 7 inches",
          "5 feet 8 inches",
          "5 feet 9 inches",
          "5 feet 10 inches",
          "5 feet 11 inches",
          "6 feet",
          "6 feet 1 inch",
          "6 feet 2 inches",
          "6 feet 3 inches",
          "6 feet 4 inches",
          "6 feet 5 inches",
          "6 feet 6 inches",
          "6 feet 7 inches",
          "6 feet 8 inches",
          "6 feet 9 inches",
          "6 feet 10 inches",
          "6 feet 11 inches",
          "7 feet",
          "7 feet 1 inch",
          "7 feet 2 inches",
          "7 feet 3 inches",
          "7 feet 4 inches",
          "7 feet 5 inches",
          "7 feet 6 inches",
          "7 feet 7 inches",
          "7 feet 8 inches",
          "7 feet 9 inches",
          "7 feet 10 inches",
          "7 feet 11 inches",
          "8 feet"
        ];

        let inputType = "text";
        let isRashiDropdown = false;
        let isNakshatraDropdown = false;
        let isComplexionDropdown = false;
        let isHeightDropdown = false;

        //fild dropdown
        if (formIndex === 1) {
          inputType = "date";
        } else if (formIndex === 2) {
          inputType = "time";
        } else if (formIndex === 4) {
          isRashiDropdown = true;
        } else if (formIndex === 5) {
          isNakshatraDropdown = true;
        } else if (formIndex === 6) {
          isComplexionDropdown = true;
        } else if (formIndex === 7) {
          isHeightDropdown = true;
        }

        // Label-based fallback
        if (field.label.toLowerCase().includes("rashi")) {
          isRashiDropdown = true;
        } else if (field.label.toLowerCase().includes("nakshatra")) {
          isNakshatraDropdown = true;
        } else if (field.label.toLowerCase().includes("complexion")) {
          isComplexionDropdown = true;
        } else if (field.label.toLowerCase().includes("height")) {
          isHeightDropdown = true;
        } else if (field.label.toLowerCase().includes("date")) {
          inputType = "date";
        }

        //dropdown
        let inputFieldHtml = "";
        if (isRashiDropdown) {
          inputFieldHtml = `
        <select class="input-value" data-value="${formIndex}">
          <option value="">Select Rashi</option>
          ${rashiArray.map(rashi => `
          <option value="${rashi}" ${field.value === rashi ? "selected" : ""}>${rashi}</option>
          `).join("")}
        </select>
        `;
        } else if (isNakshatraDropdown) {
          inputFieldHtml = `
        <select class="input-value" data-value="${formIndex}">
          <option value="">Select Nakshatra</option>
          ${nakshatraArray.map(nakshatra => `
          <option value="${nakshatra}" ${field.value === nakshatra ? "selected" : ""}>${nakshatra}</option>
          `).join("")}
        </select>
        `;
        } else if (isComplexionDropdown) {
          inputFieldHtml = `
        <select class="input-value" data-value="${formIndex}">
          <option value="">Select Complexion</option>
          ${complexionArray.map(complexion => `
          <option value="${complexion}" ${field.value === complexion ? "selected" : ""}>${complexion}</option>
          `).join("")}
        </select>
        `;
        } else if (isHeightDropdown) {
          inputFieldHtml = `
        <select class="input-value" data-value="${formIndex}">
          <option value="">Select Height</option>
          ${heightArray.map(height => `
          <option value="${height}" ${field.value === height ? "selected" : ""}>${height}</option>
          `).join("")}
        </select>
        `;
        } else {
          inputFieldHtml = `
        <input type="${inputType}" class="input-value" value="${field.value}" data-value="${formIndex}">
        `;
        }

        row.innerHTML = `
        <label class="switch">
        <input type="checkbox" ${field.hidden ? "" : "checked"} data-toggle="${formIndex}">
        <span class="slider"></span>
        </label>
        <div class="input-icon-wrapper">
        <input type="text" class="input-label" value="${field.label}" data-label="${formIndex}" disabled>
        <button class="edit-btn">
          <svg class="label-icon" width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.0955 5.15866L12.1278 2.0171C12.0291 1.9126 11.912 1.82971 11.783 1.77316C11.6541 1.71661 11.5159 1.6875 11.3764 1.6875C11.2368 1.6875 11.0987 1.71661 10.9697 1.77316C10.8408 1.82971 10.7237 1.9126 10.625 2.0171L2.43645 10.6873C2.33736 10.7914 2.2588 10.9153 2.20533 11.0518C2.15186 11.1884 2.12456 11.3348 2.12501 11.4826V14.6248C2.12501 14.9232 2.23695 15.2093 2.4362 15.4203C2.63546 15.6313 2.90571 15.7498 3.18751 15.7498H14.3438C14.4847 15.7498 14.6198 15.6906 14.7194 15.5851C14.819 15.4796 14.875 15.3365 14.875 15.1873C14.875 15.0381 14.819 14.8951 14.7194 14.7896C14.6198 14.6841 14.4847 14.6248 14.3438 14.6248H7.65797L15.0955 6.74983C15.1942 6.64536 15.2724 6.52133 15.3259 6.38482C15.3793 6.24831 15.4068 6.102 15.4068 5.95424C15.4068 5.80649 15.3793 5.66017 15.3259 5.52367C15.2724 5.38716 15.1942 5.26313 15.0955 5.15866ZM6.1552 14.6248H3.18751V11.4826L9.03126 5.29506L11.999 8.43733L6.1552 14.6248ZM12.75 7.6421L9.78297 4.49983L11.3767 2.81233L14.3438 5.9546L12.75 7.6421Z" fill="#4E9459"/>
          </svg>
        </button>
        </div>
        <span>:</span>
        ${inputFieldHtml}
      `;

        row.querySelector("[data-value]").addEventListener("input", (e) => {
          const updatedValue = e.target.value;
          field.value = updatedValue;

          const span = document.getElementById(field.previewId);
          if (span) span.textContent = updatedValue;

          if (field.section === sectionOrder[currentSectionIndex]) {
            const currentSection = sectionOrder[currentSectionIndex];
            const filledCount = templates[currentTemplate].fields.filter(
              (f) => f.section === currentSection && f.value.trim()
            ).length;

            const nextBtn = document.getElementById("next-section-btn");
            if (nextBtn) {
              nextBtn.disabled = filledCount < 2;
              nextBtn.style.opacity = filledCount < 2 ? "0.6" : "1";
              nextBtn.style.cursor =
                filledCount < 2 ? "not-allowed" : "pointer";
            }
          }
        });

        row.querySelector("[data-label]").addEventListener("input", (e) => {
          field.label = e.target.value;
        });

        row.querySelector("[data-toggle]").addEventListener("change", (e) => {
          field.hidden = !e.target.checked;

          const previewSpan = document.getElementById(field.previewId);
          if (previewSpan) {
            const previewLine = previewSpan.closest("div");
            if (previewLine) {
              previewLine.style.display = field.hidden ? "none" : "flex";
            }
          }
        });

        sectionContent.appendChild(row);
        formIndex++;
      });

    const sectionAddBtn = document.createElement("button");
    sectionAddBtn.className = "btn-add";
    sectionAddBtn.dataset.section = section;

    sectionBlock.appendChild(sectionHeader);
    sectionBlock.appendChild(sectionContent);

    // Buttons wrapper
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
      height: 102px;
      margin-top: -22px;`;

    // Add Field button
    sectionAddBtn.className = "btn-add";
    sectionAddBtn.innerHTML = `Add Field
    <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.5 2.15625C9.65198 2.15625 7.84547 2.70425 6.30889 3.73096C4.77232 4.75766 3.57471 6.21695 2.8675 7.9243C2.1603 9.63165 1.97526 11.5104 2.33579 13.3229C2.69632 15.1354 3.58623 16.8003 4.89298 18.107C6.19972 19.4138 7.86462 20.3037 9.67713 20.6642C11.4896 21.0247 13.3684 20.8397 15.0757 20.1325C16.783 19.4253 18.2423 18.2277 19.269 16.6911C20.2958 15.1545 20.8438 13.348 20.8438 11.5C20.8411 9.02269 19.8559 6.64759 18.1041 4.89586C16.3524 3.14413 13.9773 2.15887 11.5 2.15625ZM11.5 19.4062C9.9363 19.4062 8.4077 18.9426 7.10753 18.0738C5.80735 17.2051 4.79399 15.9703 4.19558 14.5256C3.59718 13.0809 3.44061 11.4912 3.74567 9.95757C4.05073 8.4239 4.80373 7.01515 5.90944 5.90944C7.01515 4.80373 8.42391 4.05073 9.95757 3.74567C11.4912 3.4406 13.0809 3.59717 14.5256 4.19558C15.9703 4.79398 17.2051 5.80735 18.0738 7.10752C18.9426 8.4077 19.4063 9.93629 19.4063 11.5C19.4039 13.5961 18.5701 15.6057 17.0879 17.0879C15.6057 18.5701 13.5961 19.4039 11.5 19.4062ZM15.8125 11.5C15.8125 11.6906 15.7368 11.8734 15.602 12.0082C15.4672 12.143 15.2844 12.2188 15.0938 12.2188H12.2188V15.0938C12.2188 15.2844 12.143 15.4672 12.0082 15.602C11.8734 15.7368 11.6906 15.8125 11.5 15.8125C11.3094 15.8125 11.1266 15.7368 10.9918 15.602C10.857 15.4672 10.7813 15.2844 10.7813 15.0938V12.2188H7.90625C7.71563 12.2188 7.53281 12.143 7.39802 12.0082C7.26323 11.8734 7.1875 11.6906 7.1875 11.5C7.1875 11.3094 7.26323 11.1266 7.39802 10.9918C7.53281 10.857 7.71563 10.7812 7.90625 10.7812H10.7813V7.90625C10.7813 7.71563 10.857 7.53281 10.9918 7.39802C11.1266 7.26323 11.3094 7.1875 11.5 7.1875C11.6906 7.1875 11.8734 7.26323 12.0082 7.39802C12.143 7.53281 12.2188 7.71563 12.2188 7.90625V10.7812H15.0938C15.2844 10.7812 15.4672 10.857 15.602 10.9918C15.7368 11.1266 15.8125 11.3094 15.8125 11.5Z" fill="#979797"/>
    </svg>`;
    sectionAddBtn.dataset.section = section;

    sectionAddBtn.addEventListener("click", () => {
      const template = templates[currentTemplate];
      const section = sectionAddBtn.dataset.section;

      const pages = document.querySelectorAll(".overlay-page");
      let currentPreviewIndex = 0;
      pages.forEach((page, i) => {
        if (page.style.display !== "none") {
          currentPreviewIndex = i;
        }
      });
      template.fields.push({
        label: "New Field",
        value: "",
        section: section,
        hidden: false,
        id: `new-${Date.now()}`,
        labelStyle: {
          color: template.style.fontColor[0],
          fontFamily: template.style.fontFamily[0],
          fontWeight: template.style.fontWeight[0],
        },
        valueStyle: {
          color: template.style.fontColor[1],
          fontFamily: template.style.fontFamily[1],
          fontWeight: template.style.fontWeight[1],
        },
      });

      const openSections = Array.from(
        document.querySelectorAll(".collapsible-content.open")
      ).map((el) => el.closest(".section-block")?.dataset.section);

      renderTemplate(currentTemplate);
      openSections?.forEach((section) => {
        const sectionBlock = document.querySelector(
          `.section-block[data-section="${section}"]`
        );
        const content = sectionBlock?.querySelector(".collapsible-content");
        const toggle = sectionBlock?.querySelector(".collapse-arrow");

        if (content && toggle) {
          content.classList.add("open");
        }
      });

      const overlayPages = document.querySelectorAll(".overlay-page");
      overlayPages.forEach((page, i) => {
        page.style.display = i === currentPreviewIndex ? "flex" : "none";
      });

      pageNumber.textContent = `Page ${currentPreviewIndex + 1}`;
    });

    const nextBtnOutside = document.createElement("button");
    nextBtnOutside.id = "next-section-btn";
    const isLastSection = section === sectionOrder[sectionOrder.length - 1];
    nextBtnOutside.innerHTML = isLastSection
      ? `Submit <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.34375 0C7.49573 0 5.68922 0.548001 4.15264 1.57471C2.61607 2.60141 1.41846 4.0607 0.711255 5.76805C0.0040485 7.4754 -0.180989 9.35412 0.179542 11.1666C0.540072 12.9791 1.42998 14.644 2.73673 15.9508C4.04347 17.2575 5.70837 18.1474 7.52088 18.508C9.33339 18.8685 11.2121 18.6835 12.9195 17.9762C14.6268 17.269 16.0861 16.0714 17.1128 14.5349C18.1395 12.9983 18.6875 11.1918 18.6875 9.34375C18.6849 6.86644 17.6996 4.49134 15.9479 2.73961C14.1962 0.987884 11.8211 0.00261609 9.34375 0ZM9.34375 17.25C7.78005 17.25 6.25145 16.7863 4.95128 15.9176C3.6511 15.0488 2.63774 13.814 2.03933 12.3693C1.44093 10.9247 1.28436 9.33498 1.58942 7.80132C1.89448 6.26765 2.64748 4.8589 3.75319 3.75319C4.8589 2.64748 6.26766 1.89448 7.80132 1.58942C9.33498 1.28435 10.9247 1.44092 12.3693 2.03933C13.814 2.63773 15.0488 3.6511 15.9176 4.95127C16.7863 6.25145 17.25 7.78004 17.25 9.34375C17.2476 11.4399 16.4139 13.4495 14.9317 14.9317C13.4495 16.4139 11.4399 17.2476 9.34375 17.25ZM13.446 8.83523C13.5128 8.90199 13.5659 8.98126 13.602 9.06851C13.6382 9.15577 13.6568 9.2493 13.6568 9.34375C13.6568 9.4382 13.6382 9.53173 13.602 9.61899C13.5659 9.70624 13.5128 9.78551 13.446 9.85227L10.571 12.7273C10.4362 12.8621 10.2532 12.9379 10.0625 12.9379C9.87177 12.9379 9.68886 12.8621 9.55399 12.7273C9.41912 12.5924 9.34335 12.4095 9.34335 12.2188C9.34335 12.028 9.41912 11.8451 9.55399 11.7102L11.2026 10.0625H5.75C5.55938 10.0625 5.37656 9.98678 5.24177 9.85198C5.10698 9.71719 5.03125 9.53437 5.03125 9.34375C5.03125 9.15313 5.10698 8.97031 5.24177 8.83552C5.37656 8.70073 5.55938 8.625 5.75 8.625H11.2026L9.55399 6.97727C9.41912 6.8424 9.34335 6.65948 9.34335 6.46875C9.34335 6.27802 9.41912 6.0951 9.55399 5.96023C9.68886 5.82537 9.87177 5.7496 10.0625 5.7496C10.2532 5.7496 10.4362 5.82537 10.571 5.96023L13.446 8.83523Z" fill="white"/>
</svg>`
      : `Next <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.34375 0C7.49573 0 5.68922 0.548001 4.15264 1.57471C2.61607 2.60141 1.41846 4.0607 0.711255 5.76805C0.0040485 7.4754 -0.180989 9.35412 0.179542 11.1666C0.540072 12.9791 1.42998 14.644 2.73673 15.9508C4.04347 17.2575 5.70837 18.1474 7.52088 18.508C9.33339 18.8685 11.2121 18.6835 12.9195 17.9762C14.6268 17.269 16.0861 16.0714 17.1128 14.5349C18.1395 12.9983 18.6875 11.1918 18.6875 9.34375C18.6849 6.86644 17.6996 4.49134 15.9479 2.73961C14.1962 0.987884 11.8211 0.00261609 9.34375 0ZM9.34375 17.25C7.78005 17.25 6.25145 16.7863 4.95128 15.9176C3.6511 15.0488 2.63774 13.814 2.03933 12.3693C1.44093 10.9247 1.28436 9.33498 1.58942 7.80132C1.89448 6.26765 2.64748 4.8589 3.75319 3.75319C4.8589 2.64748 6.26766 1.89448 7.80132 1.58942C9.33498 1.28435 10.9247 1.44092 12.3693 2.03933C13.814 2.63773 15.0488 3.6511 15.9176 4.95127C16.7863 6.25145 17.25 7.78004 17.25 9.34375C17.2476 11.4399 16.4139 13.4495 14.9317 14.9317C13.4495 16.4139 11.4399 17.2476 9.34375 17.25ZM13.446 8.83523C13.5128 8.90199 13.5659 8.98126 13.602 9.06851C13.6382 9.15577 13.6568 9.2493 13.6568 9.34375C13.6568 9.4382 13.6382 9.53173 13.602 9.61899C13.5659 9.70624 13.5128 9.78551 13.446 9.85227L10.571 12.7273C10.4362 12.8621 10.2532 12.9379 10.0625 12.9379C9.87177 12.9379 9.68886 12.8621 9.55399 12.7273C9.41912 12.5924 9.34335 12.4095 9.34335 12.2188C9.34335 12.028 9.41912 11.8451 9.55399 11.7102L11.2026 10.0625H5.75C5.55938 10.0625 5.37656 9.98678 5.24177 9.85198C5.10698 9.71719 5.03125 9.53437 5.03125 9.34375C5.03125 9.15313 5.10698 8.97031 5.24177 8.83552C5.37656 8.70073 5.55938 8.625 5.75 8.625H11.2026L9.55399 6.97727C9.41912 6.8424 9.34335 6.65948 9.34335 6.46875C9.34335 6.27802 9.41912 6.0951 9.55399 5.96023C9.68886 5.82537 9.87177 5.7496 10.0625 5.7496C10.2532 5.7496 10.4362 5.82537 10.571 5.96023L13.446 8.83523Z" fill="white"/>
</svg>`;

    nextBtnOutside.onclick = () => {
      const currentSection = sectionOrder[currentSectionIndex];
      const filledCount = templates[currentTemplate].fields.filter(
        (f) => f.section === currentSection && f.value.trim()
      ).length;

      if (filledCount < 2) {
        alert(
          "Please fill at least 2 fields in this section before proceeding."
        );
        return;
      }

      // Hide current section
      const currentSectionElem = document.querySelector(
        `.section-block[data-section="${currentSection}"]`
      );
      if (currentSectionElem) {
        currentSectionElem.style.display = "none";
      }

      if (currentSectionIndex < sectionOrder.length - 1) {
        currentSectionIndex++;
        const nextSection = sectionOrder[currentSectionIndex];
        if (!visibleSections.includes(nextSection)) {
          visibleSections.push(nextSection);
        }

        // Show next section
        const nextSectionElem = document.querySelector(
          `.section-block[data-section="${nextSection}"]`
        );
        if (nextSectionElem) {
          nextSectionElem.style.display = "block";
        }
      } else {
        currentSectionIndex = 0;
        const firstSection = sectionOrder[currentSectionIndex];
        if (!visibleSections.includes(firstSection)) {
          visibleSections.push(firstSection);
        }

        const firstSectionElem = document.querySelector(
          `.section-block[data-section="${firstSection}"]`
        );
        if (firstSectionElem) {
          firstSectionElem.style.display = "block";
        }
      }
    };

    buttonWrapper.appendChild(sectionAddBtn);
    buttonWrapper.appendChild(nextBtnOutside);

    sectionBlock.appendChild(buttonWrapper);
    formFields.appendChild(sectionBlock);
  });
}

function createOverlayPage() {
  const page = document.createElement("div");
  page.className = "overlay-page";
  page.style.width = "100%";
  page.style.display = "flex";
  page.style.flexDirection = "column";
  page.style.overflow = "hidden";
  page.style.gap = "12px";
  page.style.height = "100%";
  return page;
}

function setupNavigation() {
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentTemplate > 0) {
        currentTemplate--;
        renderTemplate(currentTemplate);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentTemplate < templates.length - 1) {
        currentTemplate++;
        renderTemplate(currentTemplate);
      }
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const template = templates[currentTemplate];
      template.fields.push({
        label: "New Field",
        value: "",
        section: "personalFields",
        hidden: false,
        labelStyle: {
          color: template.style.fontColor[0],
          fontFamily: template.style.fontFamily[0],
          fontWeight: template.style.fontWeight[0],
        },
        valueStyle: {
          color: template.style.fontColor[1],
          fontFamily: template.style.fontFamily[1],
          fontWeight: template.style.fontWeight[1],
        },
      });
      renderTemplate(currentTemplate);
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  loadTemplates();
});

//edit modal
let currentEditingLabelInput = null;
let currentEditingValueInput = null;

document.addEventListener("click", function (event) {
  const icon = event.target.closest(".label-icon");
  if (icon) {
    const wrapper = icon.closest(".input-icon-wrapper");
    const labelInput = wrapper?.querySelector(".input-label");
    const row = wrapper.closest(".form-row");
    const valueInput = row?.querySelector(".input-value");

    openEditModal(labelInput, valueInput);
  }
});

function openEditModal(labelInput, valueInput) {
  currentEditingLabelInput = labelInput;
  currentEditingValueInput = valueInput;

  document.getElementById("editModal").style.display = "flex";
  document.getElementById("modalLabelInput").value = labelInput.value;
  document.getElementById("modalValueInput").value = valueInput.value;
}

function saveChanges() {
  const updatedLabel = document.getElementById("modalLabelInput").value;
  const updatedValue = document.getElementById("modalValueInput").value;

  if (currentEditingLabelInput && currentEditingValueInput) {
    currentEditingLabelInput.value = updatedLabel;
    currentEditingValueInput.value = updatedValue;

    const formIndex = currentEditingLabelInput.dataset.label;
    const field = templates[currentTemplate].fields[formIndex];

    field.label = updatedLabel;
    field.value = updatedValue;

    const span = document.getElementById(field.previewId);
    if (span) span.textContent = updatedValue;

    renderTemplate(currentTemplate);
  }
  closeModal();
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

const textarea = document.getElementById("modalValueInput");

function formatText(startTag, endTag) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  textarea.value = before + startTag + selectedText + endTag + after;

  textarea.setSelectionRange(start + startTag.length, end + startTag.length);
  textarea.focus();
}

document.querySelectorAll(".toolbar button").forEach((btn, index) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();

    if (index === 0) formatText("<b>", "</b>");
    else if (index === 1) formatText("<i>", "</i>");
    else if (index === 2) formatText("<u>", "</u>");
  });
});

// downloadButton modal
document.addEventListener("DOMContentLoaded", () => {
  const openModalBtn = document.getElementById("downloadBtn");
  const modal = document.getElementById("downloadModal");
  const closeBtn = modal.querySelector(".back-btn");
  const modalImage = modal.querySelector(".image-wrapper img");

  openModalBtn?.addEventListener("click", () => {
    const cardPreview = document.querySelector(".card-preview");

    if (!cardPreview) {
      alert("Card preview element not found.");
      return;
    }

    html2canvas(cardPreview)
      .then((canvas) => {
        const dataURL = canvas.toDataURL("image/png");
        modalImage.src = dataURL;
        modal.classList.remove("hidden");
      })
      .catch((error) => {
        console.error("Error generating preview image:", error);
        modalImage.alt = "Unable to generate preview.";
      });
  });

  closeBtn?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });
});

document.getElementById("backBtnMain").addEventListener("click", () => {
  window.location.href = "../index.html";
})

//download sample pdf
document.getElementById("DownloadPdf").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;

  const template = {
    imageUrl: "assets/Bio Data.jpg",
    container: {
      top: "12%",
      left: "18%",
      width: "64%",
      height: "405px",
      gap: "10px"
    },
    style: {
      fontColor: ["#660000", "#000000"],
      fontFamily: ["Georgia, serif", "Poppins, sans-serif"],
      fontWeight: ["bold", "normal"]
    }
  };

  const pages = Array.from(document.querySelectorAll(".overlay-page"));
  if (pages.length === 0) {
    alert("No pages found!");
    return;
  }

  pages.forEach(p => p.style.display = "block");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [595, 842],
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    const bgImg = document.createElement("img");
    bgImg.src = template.imageUrl;
    Object.assign(bgImg.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      zIndex: "1",
      pointerEvents: "none"
    });
    bgImg.className = "dynamic-bg";
    page.style.position = "relative";
    page.insertBefore(bgImg, page.firstChild);

    const textContainer = document.createElement("div");
    Object.assign(textContainer.style, {
      position: "absolute",
      top: template.container.top,
      left: template.container.left,
      width: template.container.width,
      height: template.container.height,
      display: "flex",
      flexDirection: "column",
      gap: template.container.gap,
      zIndex: "2",
      fontFamily: template.style.fontFamily[0],
      color: template.style.fontColor[0],
      fontWeight: template.style.fontWeight[0],
      fontSize: "14px"
    });

    const sampleData = [
      { label: "Name", value: "Ganesh Dholi" },
      { label: "Date of Birth", value: "01 Jan 2000" },
      { label: "Occupation", value: "Cybersecurity Analyst" },
      { label: "Location", value: "Rajasthan, India" }
    ];

    sampleData.forEach(item => {
      const field = document.createElement("div");
      field.textContent = `${item.label}: ${item.value}`;
      textContainer.appendChild(field);
    });

    page.appendChild(textContainer);

    if (!bgImg.complete) {
      await new Promise(res => {
        bgImg.onload = res;
        bgImg.onerror = res;
      });
    }

    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      backgroundColor: null
    });

    const imgData = canvas.toDataURL("image/png");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = 595;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    const addedBG = page.querySelector(".dynamic-bg");
    if (addedBG) page.removeChild(addedBG);
    page.removeChild(textContainer);
  }

  pages.forEach((p, i) => {
    p.style.display = i === 0 ? "flex" : "none";
  });

  pdf.save("template-preview.pdf");
});