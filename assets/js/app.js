const menuButton =
  document.getElementById("menuButton");

const navigation =
  document.getElementById("navigation");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    navigation.classList.toggle("open");
  });
}

document
  .querySelectorAll("#navigation a")
  .forEach((link) => {
    link.addEventListener("click", () => {
      if (navigation) {
        navigation.classList.remove("open");
      }
    });
  });

const yearElement =
  document.getElementById("year");

if (yearElement) {
  yearElement.textContent =
    new Date().getFullYear();
}



// =========================================================
// SRMDC TRUST - PUBLISHED PUBLIC PROFILE
// =========================================================
//
// Static HTML remains the safe fallback.
//
// Only the published public snapshot is requested.
// The browser never reads private draft/admin tables.
// =========================================================

const SRMDC_PUBLIC_PROFILE_ENDPOINT =
  "https://umawsedkfamopecaykwp.supabase.co/functions/v1/public-trust-profile";

function srmdcSetText(selector, value) {
  if (!value) return;

  document
    .querySelectorAll(selector)
    .forEach((element) => {
      element.textContent = value;
    });
}

function srmdcDigits(value) {
  return String(value || "")
    .replace(/\D/g, "");
}

function srmdcIndianPhone(value) {
  const digits = srmdcDigits(value);

  if (digits.length !== 10) {
    return value || "";
  }

  return (
    "+91 " +
    digits.slice(0, 5) +
    " " +
    digits.slice(5)
  );
}

function srmdcSafeAddressHtml(address) {
  if (!address) return "";

  const line1 = [
    address.doorNo
      ? "Door No. " + address.doorNo
      : "",
    address.village || ""
  ]
    .filter(Boolean)
    .join(", ");

  const line2 = [
    address.post || "",
    address.mandal || ""
  ]
    .filter(Boolean)
    .join(", ");

  let line3 = [
    address.district || "",
    address.state || ""
  ]
    .filter(Boolean)
    .join(", ");

  if (address.pinCode) {
    line3 +=
      (line3 ? " \u2013 " : "") +
      address.pinCode;
  }

  return [line1, line2, line3]
    .filter(Boolean)
    .map((line) => {
      const element =
        document.createElement("span");

      element.textContent = line;

      return element.innerHTML;
    })
    .join("<br>");
}

function srmdcApplyPublicProfile(profile) {
  if (!profile) return;

  const officialName =
    profile.officialName || "";

  const displayName =
    profile.displayName || "";

  const address =
    profile.address || {};

  const contact =
    profile.contact || {};

  srmdcSetText(
    '[data-srmdc="official-name"]',
    officialName
  );

  srmdcSetText(
    '[data-srmdc="footer-official-name"]',
    officialName
  );

  srmdcSetText(
    '[data-srmdc="display-name"]',
    displayName
  );

  srmdcSetText(
    '[data-srmdc="contact-heading"]',
    displayName
  );

  srmdcSetText(
    '[data-srmdc="public-description"]',
    profile.publicDescription || ""
  );

  srmdcSetText(
    '[data-srmdc="brand-location"]',
    address.village || ""
  );

  const addressHtml =
    srmdcSafeAddressHtml(address);

  if (addressHtml) {
    document
      .querySelectorAll(
        '[data-srmdc="about-address"],' +
        '[data-srmdc="contact-address"]'
      )
      .forEach((element) => {
        element.innerHTML =
          addressHtml;
      });
  }

  const primary =
    contact.primaryPhone || "";

  const alternate =
    contact.alternatePhone || "";

  srmdcSetText(
    '[data-srmdc="phone-pair"]',
    [primary, alternate]
      .filter(Boolean)
      .join(" / ")
  );

  srmdcSetText(
    '[data-srmdc="primary-phone-formatted"]',
    srmdcIndianPhone(primary)
  );

  srmdcSetText(
    '[data-srmdc="alternate-phone-formatted"]',
    srmdcIndianPhone(alternate)
  );

  srmdcSetText(
    '[data-srmdc="email-text"]',
    contact.officialEmail || ""
  );

  srmdcSetText(
    '[data-srmdc="email-link-text"]',
    contact.officialEmail || ""
  );

  if (primary) {
    document
      .querySelectorAll(
        '[data-srmdc-link="primary-phone"]'
      )
      .forEach((element) => {
        element.href =
          "tel:+91" +
          srmdcDigits(primary);
      });

    document
      .querySelectorAll(
        '[data-srmdc-link="whatsapp"]'
      )
      .forEach((element) => {
        element.href =
          "https://wa.me/91" +
          srmdcDigits(primary);
      });
  }

  if (alternate) {
    document
      .querySelectorAll(
        '[data-srmdc-link="alternate-phone"]'
      )
      .forEach((element) => {
        element.href =
          "tel:+91" +
          srmdcDigits(alternate);
      });
  }

  if (contact.officialEmail) {
    document
      .querySelectorAll(
        '[data-srmdc-link="email"]'
      )
      .forEach((element) => {
        element.href =
          "mailto:" +
          contact.officialEmail;
      });
  }

  const footerLocation =
    [address.village, address.state]
      .filter(Boolean)
      .join(", ");

  const footerParts = [
    footerLocation,
    srmdcIndianPhone(primary),
    contact.officialEmail || ""
  ].filter(Boolean);

  srmdcSetText(
    '[data-srmdc="footer-contact"]',
    footerParts.join(" \u2022 ")
  );

  if (officialName) {
    document.title = officialName;

    const meta =
      document.querySelector(
        'meta[name="description"]'
      );

    if (meta) {
      const location =
        [address.village, address.state]
          .filter(Boolean)
          .join(", ");

      meta.content =
        "Official website of " +
        officialName +
        (location
          ? ", " + location + "."
          : ".");
    }
  }
}

async function srmdcLoadPublicProfile() {
  const controller =
    new AbortController();

  const timeout =
    window.setTimeout(
      () => controller.abort(),
      6000
    );

  try {
    const response =
      await fetch(
        SRMDC_PUBLIC_PROFILE_ENDPOINT,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          cache: "no-store",
          signal: controller.signal
        }
      );

    if (!response.ok) return;

    const payload =
      await response.json();

    if (
      !payload ||
      payload.ok !== true ||
      !payload.profile
    ) {
      return;
    }

    srmdcApplyPublicProfile(
      payload.profile
    );
  } catch (_) {
    // Keep static HTML fallback.
  } finally {
    window.clearTimeout(timeout);
  }
}

srmdcLoadPublicProfile();
// =========================================================
// SRMDC TRUST
// PUBLIC RECEIPT VERIFICATION - PHASE 1D-B
// =========================================================
//
// SECURITY PRINCIPLE:
//
// This public page never receives or displays:
// - PAN / Aadhaar / donor ID
// - donor mobile number
// - donor address
// - UTR / bank reference
// - internal accounting information
//
// Phase 1D-A prepares the public verification interface.
//
// Authoritative VALID / CANCELLED / NOT VERIFIED results
// will be returned only after the secure SRMDC
// verification service is connected.
// =========================================================

const SRMDC_VERIFICATION_ENDPOINT =
  "https://umawsedkfamopecaykwp.supabase.co/functions/v1/verify-receipt";

const verifyButton =
  document.getElementById("verifyButton");

const receiptInput =
  document.getElementById("receiptNumber");

const verificationInput =
  document.getElementById("verificationId");

const verificationMessage =
  document.getElementById(
    "verificationMessage"
  );

const verificationResult =
  document.getElementById(
    "verificationResult"
  );

const verificationStatusIcon =
  document.getElementById(
    "verificationStatusIcon"
  );

const verificationStatusLabel =
  document.getElementById(
    "verificationStatusLabel"
  );

const verificationStatusTitle =
  document.getElementById(
    "verificationStatusTitle"
  );

const verificationResultDetails =
  document.getElementById(
    "verificationResultDetails"
  );


function normalizeReceipt(value) {
  return (value || "").trim();
}


function normalizeVerificationId(value) {
  return (value || "")
    .trim()
    .toUpperCase();
}


function isValidReceiptFormat(receipt) {
  return /^SRMDC\/\d{4}-\d{2}\/\d{6}$/.test(
    receipt
  );
}


function isValidVerificationId(value) {
  return /^[A-F0-9]{20}$/.test(value);
}


function hideVerificationResult() {
  if (verificationResult) {
    verificationResult.hidden = true;
    verificationResult.className =
      "verification-result";
  }
}


function showMessage(message, type = "info") {
  if (!verificationMessage) {
    return;
  }

  verificationMessage.textContent = message;
  verificationMessage.style.display = "block";

  verificationMessage.className =
    `verification-message ${type}`;
}


function showPendingResult(
  receipt,
  verificationId
) {
  if (
    !verificationResult ||
    !verificationStatusIcon ||
    !verificationStatusLabel ||
    !verificationStatusTitle ||
    !verificationResultDetails
  ) {
    return;
  }

  verificationResult.hidden = false;

  verificationResult.className =
    "verification-result pending";

  verificationStatusIcon.textContent = "…";

  verificationStatusLabel.textContent =
    "Verification Service";

  verificationStatusTitle.textContent =
    "Receipt reference received";

  verificationResultDetails.innerHTML = "";

  const receiptRow =
    createResultRow(
      "Receipt Number",
      receipt
    );

  const idRow =
    createResultRow(
      "Verification ID",
      verificationId
    );

  verificationResultDetails.append(
    receiptRow,
    idRow
  );
}


function createResultRow(label, value) {
  const row =
    document.createElement("div");

  row.className =
    "verification-result-row";

  const labelElement =
    document.createElement("span");

  labelElement.className =
    "verification-result-key";

  labelElement.textContent = label;

  const valueElement =
    document.createElement("strong");

  valueElement.className =
    "verification-result-value";

  valueElement.textContent = value;

  row.append(
    labelElement,
    valueElement
  );

  return row;
}


// ---------------------------------------------------------
// FUTURE BACKEND RESULT RENDERER
//
// This is deliberately ready for Phase 1D-B.
// It is NOT currently called with locally fabricated data.
// ---------------------------------------------------------

function formatVerificationAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(amount);
}



function formatVerificationDate(value) {
  const text = String(value || "").trim();

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  if (!match) {
    return value;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}



function formatVerificationStatus(value) {
  const status =
    String(value || "")
      .trim()
      .toLowerCase();

  if (status === "valid") {
    return "Valid";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  if (status === "invalid") {
    return "Not Verified";
  }

  return value;
}


function renderVerificationResult(result) {
  if (
    !verificationResult ||
    !verificationStatusIcon ||
    !verificationStatusLabel ||
    !verificationStatusTitle ||
    !verificationResultDetails
  ) {
    return;
  }

  const status =
    String(result.status || "")
      .toUpperCase();

  verificationResult.hidden = false;
  verificationResultDetails.innerHTML = "";

  if (status === "VALID") {
    verificationResult.className =
      "verification-result valid";

    verificationStatusIcon.textContent = "✓";
    verificationStatusLabel.textContent =
      "Official SRMDC Trust Receipt";
    verificationStatusTitle.textContent =
      "VALID RECEIPT";
  } else if (status === "CANCELLED") {
    verificationResult.className =
      "verification-result cancelled";

    verificationStatusIcon.textContent = "!";
    verificationStatusLabel.textContent =
      "Official SRMDC Trust Receipt";
    verificationStatusTitle.textContent =
      "CANCELLED RECEIPT";
  } else {
    verificationResult.className =
      "verification-result invalid";

    verificationStatusIcon.textContent = "×";
    verificationStatusLabel.textContent =
      "Verification Result";
    verificationStatusTitle.textContent =
      "RECEIPT NOT VERIFIED";
  }

  const safeFields = [
    ["Receipt Number", result.receiptNumber],
    ["Date", formatVerificationDate(result.date)],
    ["Amount", formatVerificationAmount(result.amount)],
    ["Purpose / Fund", result.fund],
    ["Donor Name", result.donorName],
    ["Status", formatVerificationStatus(result.status)]
  ];

  safeFields.forEach(([label, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      verificationResultDetails.appendChild(
        createResultRow(
          label,
          String(value)
        )
      );
    }
  });
}


async function verifyReceipt() {
  const receipt =
    normalizeReceipt(
      receiptInput
        ? receiptInput.value
        : ""
    );

  const verificationId =
    normalizeVerificationId(
      verificationInput
        ? verificationInput.value
        : ""
    );

  hideVerificationResult();

  if (!receipt || !verificationId) {
    showMessage(
      "Enter both the receipt number and verification ID.",
      "error"
    );

    return;
  }

  if (!isValidReceiptFormat(receipt)) {
    showMessage(
      "The receipt number format is not valid. " +
      "Expected format: SRMDC/2026-27/000003.",
      "error"
    );

    return;
  }

  if (!isValidVerificationId(verificationId)) {
    showMessage(
      "The verification ID format is not valid.",
      "error"
    );

    return;
  }

  showPendingResult(
    receipt,
    verificationId
  );
  showMessage(
    "Checking this receipt securely with SRMDC Trust...",
    "pending"
  );

  if (verifyButton) {
    verifyButton.disabled = true;
  }

  try {
    const response = await fetch(
      SRMDC_VERIFICATION_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          receiptNumber: receipt,
          verificationId: verificationId
        })
      }
    );

    let result = null;

    try {
      result = await response.json();
    } catch (_) {
      throw new Error(
        "Invalid verification-service response."
      );
    }

    if (!response.ok) {
      throw new Error(
        result && result.message
          ? result.message
          : "Verification service unavailable."
      );
    }

    if (
      result &&
      result.verified === true &&
      (
        result.status === "valid" ||
        result.status === "cancelled"
      )
    ) {
      renderVerificationResult(result);

      if (result.status === "valid") {
        showMessage(
          "This receipt has been verified against the official SRMDC Trust record.",
          "success"
        );
      } else {
        showMessage(
          "This receipt was issued by SRMDC Trust but has subsequently been cancelled.",
          "error"
        );
      }

      return;
    }

    renderVerificationResult({
      status: "invalid"
    });

    showMessage(
      "Receipt not verified. Please check the receipt number and verification ID.",
      "error"
    );
  } catch (error) {
    console.error(
      "SRMDC receipt verification error:",
      error
    );

    hideVerificationResult();

    showMessage(
      "The SRMDC receipt verification service is temporarily unavailable. Please try again later.",
      "error"
    );
  } finally {
    if (verifyButton) {
      verifyButton.disabled = false;
    }
  }
}


if (verifyButton) {
  verifyButton.addEventListener(
    "click",
    verifyReceipt
  );
}


if (receiptInput) {
  receiptInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        verifyReceipt();
      }
    }
  );
}


if (verificationInput) {
  verificationInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        verifyReceipt();
      }
    }
  );
}


// =========================================================
// QR / DIRECT VERIFICATION URL
//
// Example:
//
// https://srmdctrust.org/
// ?receipt=SRMDC%2F2026-27%2F000003
// &id=5F5BBD288EE5D4A0B7B3
// #verify
//
// Values are references only.
// They do NOT themselves prove that a receipt is valid.
// =========================================================

const srmdcQuery =
  new URLSearchParams(
    window.location.search
  );

const receiptFromUrl =
  srmdcQuery.get("receipt");

const verificationFromUrl =
  srmdcQuery.get("id");


if (receiptFromUrl && receiptInput) {
  receiptInput.value =
    normalizeReceipt(receiptFromUrl);
}


if (
  verificationFromUrl &&
  verificationInput
) {
  verificationInput.value =
    normalizeVerificationId(
      verificationFromUrl
    );
}


// QR scan:
// automatically process the supplied reference.
// This currently shows the safe "service pending"
// state. Phase 1D-B will make the same flow perform
// authoritative server verification.

if (
  receiptFromUrl &&
  verificationFromUrl
) {
  window.setTimeout(() => {
    verifyReceipt();
  }, 150);
}


// ---------------------------------------------------------
// MOBILE NAVIGATION
// ---------------------------------------------------------

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      navigation
    ) {
      navigation.classList.remove("open");
    }
  }
);

// =========================================================
// SRMDC DONATION COPY BUTTONS
// =========================================================

document
  .querySelectorAll("[data-copy-value]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      async () => {

        const value =
          button.dataset.copyValue || "";

        const label =
          button.dataset.copyLabel || "Value";

        const message =
          document.getElementById(
            "donationCopyMessage"
          );

        if (!value) {
          return;
        }

        try {

          await navigator.clipboard.writeText(
            value
          );

          if (message) {
            message.textContent =
              `${label} copied.`;
          }

        } catch (error) {

          if (message) {
            message.textContent =
              `Unable to copy ${label}. Please copy it manually.`;
          }

        }

      }
    );

  });
