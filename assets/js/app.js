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
// SRMDC TRUST
// PUBLIC RECEIPT VERIFICATION - PHASE 1D-A
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
    ["Date", result.date],
    ["Amount", result.amount],
    ["Purpose / Fund", result.fund],
    ["Donor", result.maskedDonorName],
    ["Status", result.status]
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
    "The receipt reference was received successfully. " +
    "Live validation will become available when the " +
    "secure SRMDC verification service is connected.",
    "pending"
  );

  // -------------------------------------------------------
  // PHASE 1D-B
  //
  // The secure verification API call will be added here.
  //
  // IMPORTANT:
  // Never replace this with a public donation JSON file.
  // Never embed donor/payment records in this JavaScript.
  // -------------------------------------------------------
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
