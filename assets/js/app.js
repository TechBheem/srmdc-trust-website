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


/* ============================================================
 * SRMDC_PUBLIC_TRUST_SETTINGS_RUNTIME_V1
 * ============================================================
 *
 * Authoritative source:
 * public.get_srmdc_public_trust_settings()
 *
 * Security:
 * - public RPC returns only approved public Trust fields
 * - no service-role key
 * - no private donor information
 *
 * Fallback:
 * - existing published profile
 * - static HTML
 * - window.SRMDC_TRUST_CONFIG for receipt
 *
 * Receipt:
 * - only current Trust contact/header information is refreshed
 * - historical donor/donation/payment data is untouched
 * ============================================================ */

// SRMDC_PUBLIC_TRUST_SETTINGS_RUNTIME_KEY_V1_2
async function srmdcLoadPublicTrustSettings() {

  const browserConfig =
    window.SRMDC_SUPABASE_CONFIG || {};

  const supabaseLibrary =
    window.supabase;


  if (
    !supabaseLibrary ||
    typeof supabaseLibrary.createClient !== "function" ||
    !browserConfig.url ||
    !browserConfig.publishableKey
  ) {
    return;
  }


  try {

    /*
     * Separate lightweight public client.
     *
     * Auth persistence is deliberately disabled so this
     * public settings read does not interfere with My SRMDC
     * or Admin authentication sessions.
     */
    const settingsClient =
      supabaseLibrary.createClient(
        browserConfig.url,
        browserConfig.publishableKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );


    const {
      data,
      error
    } =
      await settingsClient.rpc(
        "get_srmdc_public_trust_settings"
      );


    if (error) {
      return;
    }


    const settings =
      Array.isArray(data)
        ? data[0]
        : data;


    if (!settings) {
      return;
    }


    const trustName =
      String(
        settings.trust_name || ""
      ).trim();

    const addressLine1 =
      String(
        settings.address_line_1 || ""
      ).trim();

    const addressLine2 =
      String(
        settings.address_line_2 || ""
      ).trim();

    const addressLine3 =
      String(
        settings.address_line_3 || ""
      ).trim();

    const primaryPhone =
      srmdcDigits(
        settings.primary_phone
      );

    const secondaryPhone =
      srmdcDigits(
        settings.secondary_phone
      );

    const email =
      String(
        settings.email || ""
      ).trim();

    const website =
      String(
        settings.website || ""
      ).trim();

    const websiteUrl =
      String(
        settings.website_url || ""
      ).trim();


    /*
     * --------------------------------------------------------
     * WEBSITE TEXT
     * --------------------------------------------------------
     */

    srmdcSetText(
      '[data-srmdc="official-name"]',
      trustName
    );

    srmdcSetText(
      '[data-srmdc="footer-official-name"]',
      trustName
    );


    const addressHtml =
      [addressLine1, addressLine2, addressLine3]
        .filter(Boolean)
        .map((line) => {

          const element =
            document.createElement("span");

          element.textContent = line;

          return element.innerHTML;
        })
        .join("<br>");


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


    srmdcSetText(
      '[data-srmdc="phone-pair"]',
      [
        primaryPhone,
        secondaryPhone
      ]
        .filter(Boolean)
        .join(" / ")
    );


    srmdcSetText(
      '[data-srmdc="primary-phone-formatted"]',
      srmdcIndianPhone(primaryPhone)
    );


    srmdcSetText(
      '[data-srmdc="alternate-phone-formatted"]',
      srmdcIndianPhone(secondaryPhone)
    );


    srmdcSetText(
      '[data-srmdc="email-text"]',
      email
    );


    srmdcSetText(
      '[data-srmdc="email-link-text"]',
      email
    );


    /*
     * --------------------------------------------------------
     * WEBSITE LINKS
     * --------------------------------------------------------
     */

    if (primaryPhone) {

      document
        .querySelectorAll(
          '[data-srmdc-link="primary-phone"]'
        )
        .forEach((element) => {

          element.href =
            "tel:+91" +
            primaryPhone;
        });


      document
        .querySelectorAll(
          '[data-srmdc-link="whatsapp"]'
        )
        .forEach((element) => {

          element.href =
            "https://wa.me/91" +
            primaryPhone;
        });
    }


    if (secondaryPhone) {

      document
        .querySelectorAll(
          '[data-srmdc-link="alternate-phone"]'
        )
        .forEach((element) => {

          element.href =
            "tel:+91" +
            secondaryPhone;
        });
    }


    if (email) {

      document
        .querySelectorAll(
          '[data-srmdc-link="email"]'
        )
        .forEach((element) => {

          element.href =
            "mailto:" +
            email;
        });
    }


    /*
     * Footer keeps primary contact concise.
     */
    const footerLocation =
      addressLine1
        .replace(/,+$/, "")
        .trim();

    const footerParts =
      [
        footerLocation,
        srmdcIndianPhone(primaryPhone),
        email
      ].filter(Boolean);


    srmdcSetText(
      '[data-srmdc="footer-contact"]',
      footerParts.join(" • ")
    );


    /*
     * --------------------------------------------------------
     * RECEIPT RUNTIME CONFIG
     * --------------------------------------------------------
     *
     * my-srmdc-receipt.js reads this object when a receipt
     * is opened. We therefore do not need to modify the
     * frozen receipt renderer.
     */

    const fallback =
      window.SRMDC_TRUST_CONFIG || {};


    const runtimeConfig =
      Object.freeze({

        ...fallback,

        name:
          trustName ||
          fallback.name ||
          "",

        addressLines:
          [
            addressLine1,
            addressLine2,
            addressLine3
          ].filter(Boolean),

        primaryPhone:
          primaryPhone ||
          fallback.primaryPhone ||
          "",

        secondaryPhone:
          secondaryPhone ||
          "",

        primaryPhoneDisplay:
          primaryPhone
            ? srmdcIndianPhone(
                primaryPhone
              )
            : (
                fallback.primaryPhoneDisplay ||
                ""
              ),

        secondaryPhoneDisplay:
          secondaryPhone
            ? srmdcIndianPhone(
                secondaryPhone
              )
            : "",

        email:
          email ||
          fallback.email ||
          "",

        website:
          website ||
          fallback.website ||
          "",

        websiteUrl:
          websiteUrl ||
          fallback.websiteUrl ||
          ""

      });


    window.SRMDC_TRUST_CONFIG =
      runtimeConfig;


    /*
     * Optional diagnostic signal.
     * Contains no private data.
     */
    window.dispatchEvent(
      new CustomEvent(
        "srmdc:trust-settings-ready",
        {
          detail: {
            source: "supabase",
            updatedAt:
              settings.updated_at ||
              null
          }
        }
      )
    );

  } catch (_) {

    /*
     * Intentionally silent.
     *
     * Existing public profile/static HTML and receipt fallback
     * remain available if this public settings read fails.
     */
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

// SRMDC_PUBLIC_TRUST_SETTINGS_RUNTIME_CALL_V1_1
srmdcLoadPublicProfile()
  .then(() => srmdcLoadPublicTrustSettings())
  .catch(() => {
    // Preserve static/config fallback if startup fails.
  });
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

// =========================================================
// SRMDC GUIDED DONATION WORKFLOW
// CONSOLIDATED FLOW
//
// 1. Donor Details
// 2. Review + Payment Options
// 3. Payment Details
// 4. Submission Reference / Verification Pending
//
// IMPORTANT:
// The backend submission is created only when payment
// details are submitted. The donor therefore receives the
// submission reference AFTER reporting the payment.
// =========================================================

(() => {
  const CREATE_DONATION_URL =
    "https://umawsedkfamopecaykwp.supabase.co/functions/v1/create-donation";

  const SUBMIT_PAYMENT_URL =
    "https://umawsedkfamopecaykwp.supabase.co/functions/v1/submit-donation-payment";

  const detailsForm =
    document.getElementById("srmdcDonationDetailsForm");

  const paymentForm =
    document.getElementById("srmdcDonationPaymentForm");

  if (!detailsForm || !paymentForm) {
    return;
  }

  const step1 =
    document.getElementById("srmdcDonationStep1");

  const step2 =
    document.getElementById("srmdcDonationStep2");

  const step3 =
    document.getElementById("srmdcDonationStep3");

  const successPanel =
    document.getElementById("srmdcDonationSuccess");

  const editButton =
    document.getElementById("donationEditDetails");

  const oldConfirmButton =
    document.getElementById("donationConfirmCreate");

  const preCreateActions =
    document.getElementById("donationPreCreateActions");

  const paymentArea =
    document.getElementById("donationPaymentArea");

  const referenceCard =
    document.getElementById("donationReferenceCard");

  const paidButton =
    document.getElementById("donationIHavePaid");

  const reviewCreatedDetails =
    document.getElementById("donationReviewCreatedDetails");

  const backToPaymentButton =
    document.getElementById("donationBackToPayment");

  const step1Message =
    document.getElementById("donationStep1Message");

  const createMessage =
    document.getElementById("donationCreateMessage");

  const paymentMessage =
    document.getElementById("donationPaymentMessage");

  const state = {
    draft: null,
    submissionNumber: "",
    trackingToken: "",
    submissionCreated: false,
    paymentSubmitted: false,
  };

  const moneyFormatter =
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });

  function setMessage(element, message, success = false) {
    if (!element) {
      return;
    }

    element.textContent = message || "";

    element.classList.toggle(
      "success",
      Boolean(success)
    );
  }

  function scrollToDonation() {
    const donationSection =
      document.getElementById("donate");

    if (!donationSection) {
      return;
    }

    window.setTimeout(() => {
      donationSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
  }

  function setStep(number) {
    [step1, step2, step3, successPanel]
      .forEach((panel) => {
        if (panel) {
          panel.hidden = true;
        }
      });

    if (number === 1 && step1) {
      step1.hidden = false;
    }

    if (number === 2 && step2) {
      step2.hidden = false;
    }

    if (number === 3 && step3) {
      step3.hidden = false;
    }

    if (number === 4 && successPanel) {
      successPanel.hidden = false;
    }

    document
      .querySelectorAll("[data-donation-step-indicator]")
      .forEach((indicator) => {
        const indicatorNumber =
          Number(
            indicator.dataset.donationStepIndicator
          );

        indicator.classList.toggle(
          "active",
          indicatorNumber === number
        );

        indicator.classList.toggle(
          "complete",
          indicatorNumber < number
        );
      });

    if (number !== 1) {
      scrollToDonation();
    }
  }

  function normalizePan(value) {
    return String(value || "")
      .replace(/\s+/g, "")
      .toUpperCase();
  }

  function getDraft() {
    return {
      donorName:
        document
          .getElementById("donationDonorName")
          .value
          .trim(),

      mobile:
        document
          .getElementById("donationMobile")
          .value
          .trim(),

      email:
        document
          .getElementById("donationEmail")
          .value
          .trim(),

      address:
        document
          .getElementById("donationAddress")
          .value
          .trim(),

      pan:
        normalizePan(
          document
            .getElementById("donationPan")
            .value
        ),

      fundName:
        document
          .getElementById("donationFund")
          .value,

      donationPurpose:
        document
          .getElementById("donationPurpose")
          .value
          .trim(),

      declaredAmount:
        Number(
          document
            .getElementById("donationAmount")
            .value
        ),
    };
  }

  function validateDraft(draft) {
    if (draft.donorName.length < 2) {
      return "Please enter the donor name.";
    }

    const mobileDigits =
      draft.mobile.replace(/\D/g, "");

    if (
      mobileDigits.length < 10 ||
      mobileDigits.length > 15
    ) {
      return "Please enter a valid mobile number.";
    }

    if (
      draft.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(draft.email)
    ) {
      return "Please enter a valid email address or leave it blank.";
    }

    if (
      draft.pan &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/
        .test(draft.pan)
    ) {
      return "Please enter a valid PAN or leave the PAN field blank.";
    }

    if (!draft.fundName) {
      return "Please select a donation category.";
    }

    if (draft.donationPurpose.length < 2) {
      return "Please enter the donation purpose.";
    }

    if (
      !Number.isFinite(draft.declaredAmount) ||
      draft.declaredAmount <= 0
    ) {
      return "Please enter a valid donation amount.";
    }

    return "";
  }

  function populateConfirmation(draft) {
    document.getElementById(
      "donationConfirmName"
    ).textContent =
      draft.donorName;

    document.getElementById(
      "donationConfirmFund"
    ).textContent =
      draft.fundName;

    document.getElementById(
      "donationConfirmPurpose"
    ).textContent =
      draft.donationPurpose;

    document.getElementById(
      "donationConfirmAmount"
    ).textContent =
      moneyFormatter.format(
        draft.declaredAmount
      );

    const paymentName =
      document.getElementById(
        "donationPaymentForName"
      );

    const paymentAmount =
      document.getElementById(
        "donationPaymentForAmount"
      );

    if (paymentName) {
      paymentName.textContent =
        draft.donorName;
    }

    if (paymentAmount) {
      paymentAmount.textContent =
        moneyFormatter.format(
          draft.declaredAmount
        );
    }
  }

  function prepareStep2() {
    /*
     * Reference must NOT be shown before payment submission.
     */
    if (referenceCard) {
      referenceCard.hidden = true;
      referenceCard.style.setProperty(
        "display",
        "none",
        "important"
      );
    }

    /*
     * QR / Bank details are available immediately on Step 2.
     */
    if (paymentArea) {
      paymentArea.hidden = false;
      paymentArea.style.removeProperty("display");
    }

    /*
     * Keep only Back to Donor Details from the old
     * pre-create action row.
     */
    if (preCreateActions) {
      preCreateActions.hidden = false;
      preCreateActions.style.removeProperty("display");
    }

    /*
     * The old "Confirm Donation & Show Payment Options"
     * action is no longer part of the flow.
     */
    if (oldConfirmButton) {
      oldConfirmButton.hidden = true;
      oldConfirmButton.style.setProperty(
        "display",
        "none",
        "important"
      );
    }

    /*
     * The old post-reference review button is unnecessary.
     * Donor can edit freely until payment details are submitted.
     */
    if (reviewCreatedDetails) {
      reviewCreatedDetails.hidden = true;
      reviewCreatedDetails.style.setProperty(
        "display",
        "none",
        "important"
      );
    }

    if (paidButton) {
      paidButton.hidden = false;
      paidButton.style.removeProperty("display");
      paidButton.textContent =
        "I Have Made the Payment \u2192";
    }

    setMessage(
      createMessage,
      "Please review the donation details and pay using the official Trust QR or bank account below. After payment, click \u201cI Have Made the Payment\u201d.",
      false
    );
  }

  detailsForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      /*
       * Once payment has been submitted, this workflow
       * cannot be edited in the same session.
       */
      if (state.paymentSubmitted) {
        return;
      }

      setMessage(step1Message, "");

      const draft = getDraft();
      const validationError =
        validateDraft(draft);

      if (validationError) {
        setMessage(
          step1Message,
          validationError
        );

        return;
      }

      state.draft = draft;

      populateConfirmation(draft);
      prepareStep2();
      setStep(2);
    }
  );

  if (editButton) {
    editButton.addEventListener(
      "click",
      () => {
        if (state.paymentSubmitted) {
          return;
        }

        /*
         * No backend submission exists yet in the normal flow,
         * so donor may safely correct Step 1.
         */
        setStep(1);
      }
    );
  }

  if (paidButton) {
    paidButton.addEventListener(
      "click",
      () => {
        if (!state.draft) {
          setMessage(
            createMessage,
            "Please review your donation details first."
          );

          return;
        }

        document.getElementById(
          "donationPaymentReference"
        ).textContent =
          "Will be generated after submission";

        document.getElementById(
          "donationPaymentDonor"
        ).textContent =
          state.draft.donorName;

        document.getElementById(
          "donationPaymentAmount"
        ).textContent =
          moneyFormatter.format(
            state.draft.declaredAmount
          );

        document.getElementById(
          "donationPaidAmount"
        ).value =
          state.draft.declaredAmount;

        const dateInput =
          document.getElementById(
            "donationPaymentDate"
          );

        const today = new Date();

        const localDate = [
          today.getFullYear(),
          String(
            today.getMonth() + 1
          ).padStart(2, "0"),
          String(
            today.getDate()
          ).padStart(2, "0"),
        ].join("-");

        if (dateInput && !dateInput.value) {
          dateInput.value = localDate;
        }

        if (dateInput) {
          dateInput.max = localDate;
        }

        setMessage(paymentMessage, "");

        setStep(3);
      }
    );
  }

  if (backToPaymentButton) {
    backToPaymentButton.addEventListener(
      "click",
      () => {
        if (state.paymentSubmitted) {
          return;
        }

        prepareStep2();
        setStep(2);
      }
    );
  }

  async function createSubmissionIfNeeded() {
    if (
      state.submissionCreated &&
      state.submissionNumber &&
      state.trackingToken
    ) {
      return;
    }

    if (!state.draft) {
      throw new Error(
        "Donation details are missing. Please restart the donation process."
      );
    }

    const response =
      await fetch(
        CREATE_DONATION_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              state.draft
            ),
        }
      );

    let result = null;

    try {
      result =
        await response.json();
    }
    catch (_) {
      result = null;
    }

    if (
      !response.ok ||
      !result ||
      result.ok !== true
    ) {
      throw new Error(
        result?.message ||
        "Unable to prepare the donation submission."
      );
    }

    if (
      result.status !==
      "awaiting_payment"
    ) {
      throw new Error(
        "Unexpected donation status returned."
      );
    }

    if (
      !result.submissionNumber ||
      !result.trackingToken
    ) {
      throw new Error(
        "Donation submission reference was not returned."
      );
    }

    state.submissionNumber =
      result.submissionNumber;

    state.trackingToken =
      result.trackingToken;

    state.submissionCreated = true;
  }

  paymentForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (state.paymentSubmitted) {
        return;
      }

      setMessage(paymentMessage, "");

      if (!state.draft) {
        setMessage(
          paymentMessage,
          "Donation details are missing. Please restart the donation process."
        );

        return;
      }

      const paymentMode =
        document
          .getElementById(
            "donationPaymentMode"
          )
          .value;

      const transactionReference =
        document
          .getElementById(
            "donationTransactionReference"
          )
          .value
          .trim();

      const paymentDate =
        document
          .getElementById(
            "donationPaymentDate"
          )
          .value;

      const paidAmount =
        Number(
          document
            .getElementById(
              "donationPaidAmount"
            )
            .value
        );

      if (!paymentMode) {
        setMessage(
          paymentMessage,
          "Please select the payment mode."
        );

        return;
      }

      if (
        transactionReference.length < 4
      ) {
        setMessage(
          paymentMessage,
          "Please enter the UTR / Transaction ID."
        );

        return;
      }

      if (!paymentDate) {
        setMessage(
          paymentMessage,
          "Please select the payment date."
        );

        return;
      }

      if (
        !Number.isFinite(paidAmount) ||
        paidAmount !==
          state.draft.declaredAmount
      ) {
        setMessage(
          paymentMessage,
          "The paid amount must match the donation amount."
        );

        return;
      }

      const submitButton =
        document.getElementById(
          "donationSubmitPayment"
        );

      if (!submitButton) {
        return;
      }

      submitButton.disabled = true;

      const originalText =
        submitButton.textContent;

      submitButton.textContent =
        "Submitting for Verification...";

      try {
        /*
         * STEP A
         *
         * Create the private backend submission immediately
         * before payment reporting.
         *
         * The donor has not been shown a reference yet.
         */
        await createSubmissionIfNeeded();

        /*
         * STEP B
         *
         * Attach donor-reported payment information to the
         * same private submission.
         */
        const response =
          await fetch(
            SUBMIT_PAYMENT_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  submissionNumber:
                    state.submissionNumber,

                  trackingToken:
                    state.trackingToken,

                  paymentMode,

                  transactionReference,

                  paymentDate,

                  paidAmount,
                }),
            }
          );

        let result = null;

        try {
          result =
            await response.json();
        }
        catch (_) {
          result = null;
        }

        if (
          !response.ok ||
          !result ||
          result.ok !== true
        ) {
          throw new Error(
            result?.message ||
            "Unable to submit the payment details."
          );
        }

        if (
          result.status !==
          "pending_verification"
        ) {
          throw new Error(
            "Unexpected payment status returned."
          );
        }

        state.paymentSubmitted = true;

        /*
         * NOW reveal the submission reference.
         */
        const successReference =
          document.getElementById(
            "donationSuccessReference"
          );

        if (successReference) {
          successReference.textContent =
            state.submissionNumber;
        }

        setStep(4);
      }
      catch (error) {
        setMessage(
          paymentMessage,
          error.message ||
          "Unable to submit the payment details."
        );

        submitButton.disabled = false;
      }
      finally {
        submitButton.textContent =
          originalText;
      }
    }
  );

  /*
   * Initial clean state.
   */
  if (referenceCard) {
    referenceCard.hidden = true;
    referenceCard.style.setProperty(
      "display",
      "none",
      "important"
    );
  }

  if (paymentArea) {
    paymentArea.hidden = true;
  }

  if (oldConfirmButton) {
    oldConfirmButton.hidden = true;
    oldConfirmButton.style.setProperty(
      "display",
      "none",
      "important"
    );
  }
})();
