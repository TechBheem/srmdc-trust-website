(() => {
  "use strict";

  // SRMDC_MY_RECEIPT_UI_V1_2
  // Authenticated My SRMDC official receipt renderer.

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusLabel(value) {
    return String(value ?? "")
      .trim()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    ).format(date);
  }

  function money(value) {
    const amount = Number(value ?? 0);

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ).format(
      Number.isFinite(amount) ? amount : 0
    );
  }

  function numberToIndianWords(value) {
    const amount =
      Math.round(Number(value ?? 0));

    if (!Number.isFinite(amount) || amount < 0) {
      return "";
    }

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen"
    ];

    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety"
    ];

    function belowHundred(number) {
      if (number < 20) {
        return ones[number];
      }

      return [
        tens[Math.floor(number / 10)],
        ones[number % 10]
      ]
        .filter(Boolean)
        .join(" ");
    }

    function belowThousand(number) {
      if (number < 100) {
        return belowHundred(number);
      }

      return [
        ones[Math.floor(number / 100)],
        "Hundred",
        belowHundred(number % 100)
      ]
        .filter(Boolean)
        .join(" ");
    }

    if (amount === 0) {
      return "Zero Rupees Only";
    }

    let remaining = amount;
    const parts = [];

    const crore =
      Math.floor(remaining / 10000000);

    if (crore) {
      parts.push(
        belowThousand(crore),
        "Crore"
      );

      remaining %= 10000000;
    }

    const lakh =
      Math.floor(remaining / 100000);

    if (lakh) {
      parts.push(
        belowThousand(lakh),
        "Lakh"
      );

      remaining %= 100000;
    }

    const thousand =
      Math.floor(remaining / 1000);

    if (thousand) {
      parts.push(
        belowThousand(thousand),
        "Thousand"
      );

      remaining %= 1000;
    }

    if (remaining) {
      parts.push(
        belowThousand(remaining)
      );
    }

    return `${parts.join(" ")} Rupees Only`;
  }

    function openOfficialReceipt(
      result,
      verificationUrl,
      submission
    ) {
  // SRMDC_TRUST_CONTACT_CONFIG_V1
  const trustConfig =
    window.SRMDC_TRUST_CONFIG || {};

  const trustAddressLines =
    Array.isArray(trustConfig.addressLines)
      ? trustConfig.addressLines
      : [];

  const trustAddressHtml =
    trustAddressLines
      .map((line) => escapeHtml(line))
      .join(" ");

  const trustPrimaryPhone =
    escapeHtml(
      trustConfig.primaryPhone ||
      "8123386813"
    );

  const trustSecondaryPhone =
    escapeHtml(
      trustConfig.secondaryPhone ||
      "6362486813"
    );

  const trustEmail =
    escapeHtml(
      trustConfig.email ||
      "srmdchtrustbodabanda@gmail.com"
    );

  const trustWebsite =
    escapeHtml(
      trustConfig.website ||
      "srmdctrust.org"
    );


      if (
        !result ||
        !result.receipt_number ||
        !result.verification_token
      ) {
        window.alert(
          "Official receipt details are not available."
        );

        return;
      }


      if (!submission) {
        window.alert(
          "Donation details are not available for this receipt."
        );

        return;
      }


      // Open a writable same-origin blank window first.
      //
      // Do NOT pass "noopener,noreferrer" here.
      // Some browsers (including Edge) can open the tab but
      // return null when noopener is requested, preventing us
      // from writing the official receipt document.
      const receiptWindow =
        window.open(
          "",
          "_blank"
        );

      if (!receiptWindow) {
        window.alert(
          "Please allow pop-ups to view the official receipt."
        );

        return;
      }


      const receiptDate =
        result.receipt_date ||
        submission.bank_credit_date ||
        submission.donor_payment_date ||
        new Date().toISOString();


      const amount =
        Number(
          result.amount ??
          submission.declared_amount
        );


      const paymentMode =
        statusLabel(
          submission.payment_mode ||
          "bank_transfer"
        );


      const safeVerificationUrl =
        escapeHtml(
          verificationUrl
        );


      const qrContainerId =
        "srmdcReceiptQr";


      const documentHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>
<title>
  ${escapeHtml(result.receipt_number)}
</title>

<style>

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 28px;
    background: #eee9dc;
    color: #102b45;
    font-family:
      Georgia,
      "Times New Roman",
      serif;
  }

  .toolbar {
    max-width: 900px;
    margin: 0 auto 16px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    font-family: Arial, sans-serif;
  }

  .toolbar button {
    border: 1px solid #c8a85b;
    border-radius: 8px;
    background: #fffaf0;
    color: #082f54;
    padding: 10px 18px;
    font-weight: 700;
    cursor: pointer;
  }

  .receipt {
    position: relative;
    max-width: 900px;
    min-height: 1080px;
    margin: auto;
    padding: 34px 42px;
    background:
      linear-gradient(
        rgba(255, 252, 240, 0.97),
        rgba(255, 250, 233, 0.97)
      );
    border: 8px double #b6923c;
    box-shadow:
      0 14px 40px rgba(0, 0, 0, 0.13);
  }

  .receipt::before {
    content: "";
    position: absolute;
    inset: 10px;
    border: 1px solid rgba(139, 32, 32, 0.35);
    pointer-events: none;
  }

  .trust-image {
    display: block;
    width: 150px;
    max-height: 130px;
    object-fit: contain;
    margin: 0 auto 10px;
  }

  .trust-name {
    margin: 0;
    text-align: center;
    color: #7d1818;
    font-size: 27px;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .trust-address {
    margin: 8px auto 0;
    max-width: 720px;
    text-align: center;
    font-size: 14px;
    line-height: 1.55;
  }

  .divider {
    height: 3px;
    margin: 20px 0;
    border-top: 1px solid #b6923c;
    border-bottom: 1px solid #b6923c;
  }

  .receipt-title {
    margin: 0 0 18px;
    text-align: center;
    color: #082f54;
    font-size: 24px;
    letter-spacing: 2px;
  }

  .receipt-meta {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(0, 1fr);
    gap: 14px 28px;
    margin-bottom: 24px;
  }

  .field {
    border-bottom:
      1px dotted rgba(16, 43, 69, 0.5);
    padding: 8px 0;
  }

  .field span {
    display: block;
    margin-bottom: 4px;
    color: #775f31;
    font-family: Arial, sans-serif;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .field strong {
    font-size: 17px;
  }

  .amount-box {
    margin: 22px 0;
    padding: 18px;
    border: 1px solid #c8a85b;
    background: rgba(255, 248, 222, 0.7);
  }

  .amount-number {
    color: #7d1818;
    font-size: 28px;
    font-weight: 700;
  }

  .amount-words {
    margin-top: 5px;
    line-height: 1.5;
  }

  .verification {
    display: grid;
    grid-template-columns: 1fr 180px;
    gap: 24px;
    align-items: center;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #c8a85b;
  }

  .verification h3 {
    margin: 0 0 5px;
    color: #7d1818;
  }

  .verification p {
    margin: 5px 0;
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .qr {
    width: 170px;
    height: 170px;
    padding: 6px;
    border: 1px solid #c8a85b;
    background: #fff;
  }

  .signature {
    margin-top: 55px;
    text-align: right;
  }

  .signature-space {
    height: 55px;
  }

  .signature strong {
    display: block;
    color: #7d1818;
  }

  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #c8a85b;
    text-align: center;
    color: #685b43;
    font-family: Arial, sans-serif;
    font-size: 11px;
    line-height: 1.5;
  }

  @media (max-width: 700px) {

    body {
      padding: 8px;
    }

    .receipt {
      padding: 24px 20px;
    }

    .receipt-meta,
    .verification {
      grid-template-columns: 1fr;
    }

    .verification {
      text-align: center;
    }

    .qr {
      margin: auto;
    }
  }

  



  /* SRMDC_A4_FINAL_ONE_PAGE */
  


  /* ==========================================================
     SRMDC_DEVOTIONAL_RECEIPT_V1
     ========================================================== */

  .receipt {
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  /*
    Real IMG watermark instead of CSS background-image.
    This is more reliable when printing / saving as PDF.
  */
  .receipt-watermark {
    position: absolute;
    z-index: 0;

    left: 4%;
    top: 17%;

    width: 92%;
    height: 66%;

    object-fit: contain;

    opacity: 0.16;

    pointer-events: none;
    user-select: none;
  }

  /*
    All actual receipt content remains above watermark.
  */
  .receipt > *:not(.receipt-watermark) {
    position: relative;
    z-index: 1;
  }

  .devotional-header {
    display: flex;
    align-items: center;
    justify-content: center;

    gap: 18px;

    margin: 0 auto 4px;

    min-height: 54px;

    color: #8b1e24;

    font-family:
      Georgia,
      "Times New Roman",
      serif;

    font-weight: 700;
  }

  .devotional-word {
    min-width: 110px;

    font-size: 17px;
    line-height: 1;

    text-align: center;

    letter-spacing: 0.2px;
  }

  .ganesh-icon {
    display: block;

    width: 52px;
    height: 52px;

    object-fit: contain;

    mix-blend-mode: multiply;
  }


  /* ==========================================================
     PRINT â€” EXPLICIT SINGLE A4 PAGE
     ========================================================== */

  


  /* ==========================================================
     SRMDC_PRINT_FLOW_FIX_V1

     Keep A4 one-page sizing, but restore natural vertical flow.
     ========================================================== */

  


  /* ==========================================================
     SRMDC_PRINT_COLOR_FIDELITY_V1

     Preserve the approved screen receipt styling when printing.
     No receipt-data or workflow changes.
     ========================================================== */

  /* ==========================================================
     SRMDC_FIXED_CANVAS_PRINT_V1

     IMPORTANT:
     Screen receipt is the master design.

     Do not resize individual:
       - text
       - Ganesh image
       - Sita-Rama watermark
       - QR
       - signature
       - footer

     The complete receipt is scaled uniformly for A4.
     ========================================================== */

  @media print {

    @page {
      size: A4 portrait;
      margin: 5mm;
    }

    html,
    body {
      width: 210mm !important;
      height: 297mm !important;

      margin: 0 !important;
      padding: 0 !important;

      background: #ffffff !important;

      overflow: hidden !important;

      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .toolbar {
      display: none !important;
    }

    /*
      Preserve the exact screen receipt canvas.
      Edge must not rebuild the internal layout.
    */
    .receipt {
      box-sizing: border-box !important;

      width: 900px !important;
      max-width: none !important;

      min-height: 1080px !important;

      margin: 0 !important;

      /*
        900px receipt -> approx. 190mm printable visual width.
        Uniform scale preserves all proportions.
      */
      zoom: 0.90;
      /* Edge print uses layout-aware zoom. */

      /*
        Center the scaled canvas on A4.
      */
      position: absolute !important;

      left: 10mm !important;
      top: 7mm !important;

      box-shadow: none !important;

      overflow: hidden !important;

      break-inside: avoid !important;
      page-break-inside: avoid !important;

      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /*
      Critical:
      Preserve every child exactly as designed on screen.
    */
    .receipt,
    .receipt *,
    .receipt::before,
    .receipt::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /*
      Preserve original devotional watermark geometry.
    */
    .receipt-watermark {
      left: 4% !important;
      top: 17% !important;

      width: 92% !important;
      height: 66% !important;

      object-fit: contain !important;

      opacity: 0.16 !important;

      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /*
      Preserve Ganesh icon exactly as screen.
    */
    .ganesh-icon {
      width: 52px !important;
      height: 52px !important;

      object-fit: contain !important;

      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /*
      QR must remain sharp and printable.
    */
    .qr,
    .qr img,
    .qr canvas {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /*
      Prevent Edge from splitting these sections.
    */
    .receipt-meta,
    .amount-box,
    .verification,
    .signature,
    .footer {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  }

  /* ==========================================================
     SRMDC_RECEIPT_BODABANDA_V1
     Bottom-left Bodabanda identity emblem.
     Decorative Trust branding only.
     ========================================================== */

  .signature {
    position: relative;
  }

  .srmdc-receipt-bodabanda {
    position: absolute;
    left: 14px;
    bottom: 2px;

    width: 104px;
    height: 104px;

    object-fit: contain;

    transform: rotate(-8deg);
    transform-origin: center center;

    z-index: 2;
    pointer-events: none;
  }
</style>
</head>

<body>

<div class="toolbar">
  <button onclick="window.print()">
    Print / Save PDF
  </button>

  <button onclick="window.close()">
    Close
  </button>
</div>


<main class="receipt">

    <!-- SRMDC_DEVOTIONAL_RECEIPT_V1 -->

  <img
    class="receipt-watermark"
    src="${window.location.origin}/assets/images/sita_rama_kalyanam.png"
    alt=""
  >

  <div class="devotional-header">

    <span class="devotional-word">
      Srirasthu
    </span>

    <img
      class="ganesh-icon"
      src="${window.location.origin}/assets/images/ganesh.png"
      alt="Sri Ganesh"
    >

    <span class="devotional-word">
      Subhamasthu
    </span>

  </div>

  <h1 class="trust-name">
    Sri Rama Mandira Devasthana Charitable Trust
  </h1>

  <div class="trust-address">
    ${trustAddressHtml}
    <br>
    Phone: ${trustPrimaryPhone} / ${trustSecondaryPhone}
    &nbsp; | &nbsp;
    ${trustEmail}
    <br>
    ${trustWebsite}
  </div>

  <div class="divider"></div>

  <h2 class="receipt-title">
    OFFICIAL DONATION RECEIPT
  </h2>


  <section class="receipt-meta">

    <div class="field">
      <span>Receipt Number</span>
      <strong>
        ${escapeHtml(result.receipt_number)}
      </strong>
    </div>

    <div class="field">
      <span>Receipt Date</span>
      <strong>
        ${escapeHtml(formatDate(receiptDate))}
      </strong>
    </div>

    <div class="field">
      <span>Received From</span>
      <strong>
        ${escapeHtml(submission.donor_name)}
      </strong>
    </div>

    <div class="field">
      <span>Fund</span>
      <strong>
        ${escapeHtml(submission.fund_name)}
      </strong>
    </div>

    <div class="field">
      <span>Purpose</span>
      <strong>
        ${escapeHtml(submission.donation_purpose)}
      </strong>
    </div>

    <div class="field">
      <span>Payment Mode</span>
      <strong>
        ${escapeHtml(paymentMode)}
      </strong>
    </div>

  </section>


  <section class="amount-box">

    <div class="amount-number">
      ${escapeHtml(money(amount))}
    </div>

    <div class="amount-words">
      <strong>Amount in words:</strong>
      ${escapeHtml(numberToIndianWords(amount))}
    </div>

  </section>


  <section class="verification">

    <div>

      <h3>Verify this Receipt</h3>

      <p>
        Scan the QR code or visit the official
        SRMDC Trust website to verify this receipt.
      </p>

      <p>
        <strong>Verification ID:</strong><br>
        ${escapeHtml(result.verification_token)}
      </p>

      <p>
        <strong>Verification URL:</strong><br>
        ${safeVerificationUrl}
      </p>

    </div>

    <div
      id="${qrContainerId}"
      class="qr"
      role="img"
      aria-label="Receipt verification QR code"
    ></div>

  </section>


  <section class="signature">

    
    <!-- SRMDC_RECEIPT_BODABANDA_V1 -->
    <img
      class="srmdc-receipt-bodabanda"
      src="${window.location.origin}/assets/images/srmdc_bodabanda_stamp.png"
      alt="Sri Rama Mandiram Bodabanda"
    >

    <div class="signature-space"></div>

    <strong>
      For SRI RAMA MANDIRA DEVASTHANA
      CHARITABLE TRUST
    </strong>

    <div>
      Treasurer / Authorized Signatory
    </div>

  </section>


  <div class="footer">

    This is an official donation receipt generated
    from the SRMDC Trust administration system.

    <br>

    Tax eligibility, where applicable, is subject to
    separate statutory review and compliance.
    This receipt by itself does not constitute a
    tax-exemption certificate.

  </div>

</main>

</body>
</html>
      `;


      receiptWindow.document.open();
      receiptWindow.document.write(
        documentHtml
      );
      receiptWindow.document.close();

      // The receipt is now fully written. Detach the opener
      // afterwards without losing our writable window reference.
      try {
        receiptWindow.opener = null;
      }
      catch (error) {
        console.warn(
          "Unable to detach receipt window opener.",
          error
        );
      }


      const renderLocalQr = () => {

        const qrElement =
          receiptWindow.document
            .getElementById(
              qrContainerId
            );

        if (
          !qrElement ||
          typeof QRCode === "undefined"
        ) {
          return;
        }

        qrElement.innerHTML = "";

        new QRCode(
          qrElement,
          {
            text: verificationUrl,
            width: 156,
            height: 156,
            correctLevel:
              QRCode.CorrectLevel.M
          }
        );
      };


      if (
        typeof QRCode !== "undefined"
      ) {
        renderLocalQr();
      }
    }

  window.SRMDC_MY_RECEIPTS =
    Object.freeze({
      openExisting(
        result,
        verificationUrl,
        submission
      ) {
        return openOfficialReceipt(
          result,
          verificationUrl,
          submission
        );
      }
    });

})();