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

  /* ==========================================================
     SRMDC_RECEIPT_DESIGN_V2_ATTEMPT2

     Visual-only V2 certificate layer.
     Existing receipt workflow / QR / data logic preserved.
     ========================================================== */

  .receipt {
    padding: 22px 32px 27px;

    background:
      linear-gradient(
        180deg,
        #fff9e9 0%,
        #fffdf6 42%,
        #fff8e8 100%
      );

    border:
      7px double #a76f16;

    color:
      #302419;
  }

  .receipt::before {
    inset: 8px;

    border:
      2px solid #7b171d;
  }

  .receipt::after {
    content: "";

    position: absolute;

    inset: 15px;

    z-index: 0;

    border:
      1px solid rgba(
        190,
        143,
        43,
        0.72
      );

    pointer-events: none;
  }


  /* ----------------------------------------------------------
     TOP ART PANEL
     ---------------------------------------------------------- */

  .srmdc-v2-art-panel {
    position: relative;

    height: 190px;

    margin:
      -7px
      -14px
      7px;

    overflow: hidden;

    border-bottom:
      3px double #a97820;

    background:
      #f8e9bd;
  }

  .srmdc-v2-header-art {
    position: absolute;

    inset: 0;

    width: 100%;
    height: 100%;

    object-fit: cover;

    object-position:
      center center;

    z-index: 0;
  }

  .srmdc-v2-art-overlay {
    position: absolute;

    inset: 0;

    z-index: 1;

    background:
      linear-gradient(
        90deg,
        rgba(255, 248, 221, 0.15),
        rgba(255, 251, 232, 0.08),
        rgba(255, 248, 221, 0.12)
      );

    pointer-events: none;
  }


  /* Bodabanda emblem - upper left */

  .srmdc-v2-top-emblem {
    position: absolute;

    left: 15px;
    top: 17px;

    width: 105px;
    height: 105px;

    object-fit: contain;

    z-index: 4;

    filter:
      drop-shadow(
        0 3px 4px
        rgba(65, 31, 7, 0.28)
      );
  }


  /* Ganesh - centre */

  .srmdc-v2-ganesh {
    position: absolute;

    left: 50%;
    top: 45px;

    transform:
      translateX(-50%);

    width: 76px;
    height: 76px;

    object-fit: contain;

    z-index: 4;

    filter:
      drop-shadow(
        0 3px 4px
        rgba(82, 42, 11, 0.24)
      );
  }


  /* Sita Rama family - upper right */

  .srmdc-v2-family {
    position: absolute;

    right: 6px;
    bottom: -4px;

    width: 206px;
    height: 180px;

    object-fit: contain;

    object-position:
      center bottom;

    z-index: 4;

    filter:
      drop-shadow(
        0 4px 5px
        rgba(69, 34, 8, 0.25)
      );
  }


  /* Devotional wording */

  .srmdc-v2-jai {
    position: absolute;

    left: 50%;
    top: 10px;

    transform:
      translateX(-50%);

    width: 430px;

    z-index: 5;

    text-align: center;

    color:
      #79171d;

    font-family:
      Georgia,
      "Times New Roman",
      serif;

    font-size:
      19px;

    font-weight:
      700;

    letter-spacing:
      0.4px;

    text-shadow:
      0 1px 1px
      rgba(255,255,255,0.95);
  }


  /* ----------------------------------------------------------
     OLD DEVOTIONAL HEADER
     Hide only visually.
     Existing underlying structure is not reconstructed.
     ---------------------------------------------------------- */

  .devotional-header {
    display: none;
  }


  /* ----------------------------------------------------------
     Existing watermark becomes much softer.
     ---------------------------------------------------------- */

  .receipt-watermark {
    left: 13%;

    top: 42%;

    width: 74%;
    height: 38%;

    opacity: 0.055;

    object-fit: contain;
  }


  /* ----------------------------------------------------------
     TRUST HEADER
     Existing HTML and dynamic contact values remain unchanged.
     ---------------------------------------------------------- */

  .trust-name {
    margin:
      5px auto
      2px;

    color:
      #79171d;

    font-size:
      24px;

    line-height:
      1.12;

    letter-spacing:
      0.25px;

    text-shadow:
      0 1px 0
      #ffffff;
  }

  .trust-address {
    margin:
      5px auto
      0;

    max-width:
      760px;

    color:
      #263e61;

    font-size:
      11.5px;

    line-height:
      1.38;

    font-weight:
      600;
  }


  .divider {
    height:
      4px;

    margin:
      9px 0
      8px;

    border-top:
      2px solid
      #8a2025;

    border-bottom:
      1px solid
      #c79531;
  }


  /* ----------------------------------------------------------
     RECEIPT TITLE
     ---------------------------------------------------------- */

  .receipt-title {
    margin:
      0 auto
      10px;

    padding:
      7px 18px
      8px;

    color:
      #fff8df;

    background:
      linear-gradient(
        180deg,
        #9b1721,
        #72131a
      );

    border:
      2px solid
      #c99832;

    outline:
      1px solid
      rgba(
        139,
        94,
        18,
        0.65
      );

    font-size:
      25px;

    line-height:
      1;

    letter-spacing:
      2px;

    text-shadow:
      0 1px 1px
      rgba(0,0,0,0.25);
  }


  /* ----------------------------------------------------------
     DONOR DETAILS
     ---------------------------------------------------------- */

  .receipt-meta {
    gap:
      5px
      22px;

    margin-bottom:
      9px;

    padding:
      8px
      14px
      5px;

    border:
      1px solid
      #c79b45;

    background:
      rgba(
        255,
        253,
        245,
        0.80
      );
  }

  .field {
    min-height:
      45px;

    padding:
      5px 0;

    border-bottom:
      1px solid
      rgba(
        194,
        151,
        67,
        0.50
      );
  }

  .field span {
    margin-bottom:
      2px;

    color:
      #8a5c20;

    font-size:
      9px;

    font-weight:
      700;

    letter-spacing:
      0.7px;
  }

  .field strong {
    color:
      #17355c;

    font-size:
      15px;

    line-height:
      1.18;
  }


  /* ----------------------------------------------------------
     DONATION AMOUNT
     ---------------------------------------------------------- */

  .amount-box {
    margin:
      9px 0;

    padding:
      9px
      16px;

    text-align:
      center;

    border:
      2px solid
      #bd8b2b;

    background:
      linear-gradient(
        90deg,
        rgba(255,239,190,0.76),
        rgba(255,253,242,0.95),
        rgba(255,239,190,0.76)
      );
  }

  .amount-number {
    color:
      #8b1520;

    font-size:
      30px;

    line-height:
      1.05;
  }

  .amount-words {
    margin-top:
      3px;

    color:
      #263e61;

    font-size:
      12px;

    line-height:
      1.3;
  }


  /* ----------------------------------------------------------
     VERIFICATION
     ---------------------------------------------------------- */

  .verification {
    grid-template-columns:
      1fr
      158px;

    gap:
      16px;

    margin-top:
      9px;

    padding:
      9px
      12px;

    align-items:
      center;

    border:
      1px solid
      #c6973c;

    background:
      rgba(
        255,
        253,
        246,
        0.83
      );
  }

  .verification h3 {
    margin:
      0 0
      3px;

    color:
      #8b1821;

    font-size:
      17px;
  }

  .verification p {
    margin:
      2px 0;

    color:
      #263e61;

    font-size:
      10.5px;

    line-height:
      1.28;

    overflow-wrap:
      anywhere;
  }

  .qr {
    width:
      158px;

    height:
      158px;

    padding:
      1px;

    border:
      2px solid
      #b98221;

    background:
      #ffffff;
  }


  /* ----------------------------------------------------------
     SIGNATURE / BODABANDA
     ---------------------------------------------------------- */

  .signature {
    min-height:
      100px;

    margin-top:
      8px;

    padding-top:
      5px;

    border-top:
      1px solid
      rgba(
        192,
        144,
        51,
        0.55
      );
  }

  .signature-space {
    height:
      37px;
  }

  .signature strong {
    color:
      #79171d;

    font-size:
      12px;
  }

  .srmdc-receipt-bodabanda {
    left:
      12px;

    bottom:
      0;

    width:
      84px;

    height:
      84px;

    transform:
      rotate(-5deg);
  }


  /* ----------------------------------------------------------
     FOOTER
     ---------------------------------------------------------- */

  .footer {
    margin-top:
      5px;

    padding-top:
      5px;

    color:
      #665237;

    font-size:
      8.7px;

    line-height:
      1.25;

    border-top:
      1px solid
      #c39740;
  }


  /* ----------------------------------------------------------
     PRINT OVERRIDES FOR V2 ART ONLY.
     Existing fixed-canvas A4 architecture remains unchanged.
     ---------------------------------------------------------- */

  @media print {

    .srmdc-v2-header-art,
    .srmdc-v2-top-emblem,
    .srmdc-v2-ganesh,
    .srmdc-v2-family {

      -webkit-print-color-adjust:
        exact !important;

      print-color-adjust:
        exact !important;
    }

    .receipt-watermark {

      left:
        13% !important;

      top:
        42% !important;

      width:
        74% !important;

      height:
        38% !important;

      opacity:
        0.055 !important;
    }

    .ganesh-icon {
      width:
        52px !important;

      height:
        52px !important;
    }
  }


  /* ==========================================================
     SRMDC_RECEIPT_DESIGN_V2_1

     Final header composition:
     - V3 panoramic devotional artwork
     - ONE Ganesh only (inside V3 artwork)
     - ONE Sita-Rama family only (inside V3 artwork)
     - No top Bodabanda emblem
     - Jai Sri Ram text remains live HTML
     - Larger bottom Bodabanda emblem
     ========================================================== */

  .srmdc-v2-art-panel {
    height: 232px;

    margin:
      -7px
      -14px
      8px;

    overflow: hidden;

    background:
      #f6df9f;

    border-bottom:
      3px double #a97820;
  }

  .srmdc-v2-header-art {
    position: absolute;

    left: 0;
    top: 0;

    width: 100%;
    height: 100%;

    object-fit: fill;

    object-position:
      center center;

    z-index: 0;
  }

  /*
    Keep the actual artwork bright.
    Only a very light top veil is used so the devotional
    wording stays readable.
  */
  .srmdc-v2-art-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(255, 249, 225, 0.32) 0%,
        rgba(255, 249, 225, 0.08) 25%,
        rgba(255, 249, 225, 0.00) 55%
      );

    z-index: 1;
  }

  /*
    These Attempt-2 overlays are intentionally disabled.
    V3 already contains the devotional figures.
  */
  .srmdc-v2-top-emblem,
  .srmdc-v2-ganesh,
  .srmdc-v2-family {
    display: none !important;
  }

  /*
    Live HTML devotional wording.
    Always above the V3 image.
  */
  .srmdc-v2-jai {
    top: 8px;

    width: 520px;

    z-index: 5;

    color: #79171d;

    font-size: 20px;

    line-height: 1.15;

    font-weight: 700;

    letter-spacing: 0.6px;

    text-shadow:
      0 1px 0 #fff7dd,
      0 0 5px rgba(255, 248, 220, 0.95);
  }

  /*
    The original V1 devotional strip remains hidden.
    This prevents a second Ganesh from appearing.
  */
  .devotional-header {
    display: none !important;
  }

  /*
    Bottom Bodabanda emblem becomes the single receipt emblem.
  */
  .srmdc-receipt-bodabanda {
    left: 8px;

    bottom: -3px;

    width: 118px;

    height: 118px;

    transform: rotate(-3deg);

    filter:
      drop-shadow(
        0 2px 3px
        rgba(83, 45, 10, 0.20)
      );
  }

  /*
    Give the larger emblem enough space without disturbing
    the authorized-signatory block.
  */
  .signature {
    min-height: 126px;

    padding-left: 145px;
  }

  .signature-space {
    height: 45px;
  }

  /*
    Softer body watermark.
    It must never compete with donor data or QR.
  */
  .receipt-watermark {
    left: 17%;

    top: 44%;

    width: 66%;
    height: 34%;

    opacity: 0.035;
  }

  @media print {

    .srmdc-v2-art-panel,
    .srmdc-v2-header-art,
    .srmdc-v2-jai,
    .srmdc-receipt-bodabanda {

      -webkit-print-color-adjust:
        exact !important;

      print-color-adjust:
        exact !important;
    }

    .srmdc-receipt-bodabanda {
      width: 118px !important;
      height: 118px !important;
    }

    .receipt-watermark {
      left: 17% !important;
      top: 44% !important;

      width: 66% !important;
      height: 34% !important;

      opacity: 0.035 !important;
    }
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

  <!-- SRMDC_RECEIPT_DESIGN_V2_ATTEMPT2 -->

  <section class="srmdc-v2-art-panel">

    <img
      class="srmdc-v2-header-art"
      src="${window.location.origin}/assets/images/srmdc_receipt_header_v3.png"
      alt=""
    >

    <div
      class="srmdc-v2-art-overlay"
    ></div>

    <img
      class="srmdc-v2-top-emblem"
      src="${window.location.origin}/assets/images/srmdc_bodabanda_stamp.png"
      alt="Sri Rama Mandiram Bodabanda"
    >

    <div class="srmdc-v2-jai">
      Jai Sri Ram! &nbsp;&nbsp; Jai Jai Sriram!!
    </div>

    <img
      class="srmdc-v2-ganesh"
      src="${window.location.origin}/assets/images/ganesh.png"
      alt="Sri Ganesh"
    >

    <img
      class="srmdc-v2-family"
      src="${window.location.origin}/assets/images/srmdc_sita_rama_family_v2.png"
      alt="Sri Sita Rama Lakshmana and Hanuman"
    >

  </section>
    <!-- SRMDC_DEVOTIONAL_RECEIPT_V1 -->

  <img
    class="receipt-watermark"
    src="${window.location.origin}/assets/images/sita_rama_kalyanam.png"
    alt=""
  >

  <div class="devotional-header">

    <span class="devotional-word">
      Jai Sri Ram!
    </span>

    <img
      class="ganesh-icon"
      src="${window.location.origin}/assets/images/ganesh.png"
      alt="Sri Ganesh"
    >

    <span class="devotional-word">
      Jai Jai Sriram!!
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