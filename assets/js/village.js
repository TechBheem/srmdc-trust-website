(() => {
  "use strict";

  /*
   * MANA BODABANDA V1
   *
   * IMPORTANT:
   * This client-side PIN is only a temporary visibility gate.
   * Sensitive village records must later be protected using
   * server-side / Supabase authorization policies.
   */

  const CONFIG = {
    portalName: "మన బోడబండ",

    /*
     * TEMPORARY LOCALHOST PIN.
     *
     * Change this before any public deployment.
     * Phase 1B will move access control into a safer design.
     */
    temporaryPin: "524226"
  };

  const gate =
    document.getElementById("villageGate");

  const portal =
    document.getElementById("villagePortal");

  const form =
    document.getElementById("villagePinForm");

  const pin =
    document.getElementById("villagePin");

  const message =
    document.getElementById("pinMessage");

  const logout =
    document.getElementById("villageLogout");

  function showPortal() {
    gate.classList.add("hidden");
    portal.classList.remove("hidden");

    sessionStorage.setItem(
      "mana-bodabanda-access",
      "yes"
    );
  }

  function showGate() {
    portal.classList.add("hidden");
    gate.classList.remove("hidden");

    sessionStorage.removeItem(
      "mana-bodabanda-access"
    );

    pin.value = "";
    pin.focus();
  }

  function openSection(sectionId) {
    document
      .querySelectorAll(".portal-section")
      .forEach((section) => {
        section.classList.toggle(
          "active",
          section.id === sectionId
        );
      });

    document
      .querySelectorAll(".nav-link")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.section === sectionId
        );
      });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (pin.value.trim() === CONFIG.temporaryPin) {
      message.textContent = "";
      showPortal();
      return;
    }

    message.textContent =
      "PIN సరైనది కాదు. మళ్లీ ప్రయత్నించండి.";

    pin.select();
  });

  logout.addEventListener("click", showGate);

  document
    .querySelectorAll(".nav-link")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openSection(button.dataset.section);
      });
    });

  document
    .querySelectorAll("[data-open]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openSection(button.dataset.open);
      });
    });

  if (
    sessionStorage.getItem(
      "mana-bodabanda-access"
    ) === "yes"
  ) {
    showPortal();
  }

  /* ---------------------------------------------------------
     PUBLIC VILLAGE DONATIONS
     --------------------------------------------------------- */

  function villagePublicElement(id) {
    return document.getElementById(id);
  }

  function formatVillagePublicMoney(value) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }
    ).format(Number(value || 0));
  }

  function escapeVillagePublicHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatVillagePublicDate(value) {
    if (!value) {
      return "-";
    }

    const parts =
      String(value).split("-");

    if (parts.length !== 3) {
      return "-";
    }

    return [
      parts[2],
      parts[1],
      parts[0]
    ].join("/");
  }

  function publicDonationStatus(
    committed,
    received
  ) {
    if (received <= 0) {
      return {
        text:
          "\u0C05\u0C02\u0C26\u0C35\u0C32\u0C38\u0C3F \u0C09\u0C02\u0C26\u0C3F",
        className:
          "public-donation-status-pending"
      };
    }

    if (received < committed) {
      return {
        text:
          "\u0C2A\u0C3E\u0C15\u0C4D\u0C37\u0C3F\u0C15\u0C02\u0C17\u0C3E \u0C05\u0C02\u0C26\u0C3F\u0C02\u0C26\u0C3F",
        className:
          "public-donation-status-partial"
      };
    }

    return {
      text:
        "\u0C2A\u0C42\u0C30\u0C4D\u0C24\u0C3F\u0C17\u0C3E \u0C05\u0C02\u0C26\u0C3F\u0C02\u0C26\u0C3F",
      className:
        "public-donation-status-complete"
    };
  }

  function setPublicDonationSummary(
    committed,
    received
  ) {
    const pending =
      Math.max(
        committed - received,
        0
      );

    [
      ["summaryCommitted", committed],
      ["summaryReceived", received],
      ["donationCommitted", committed],
      ["donationReceived", received],
      ["donationPending", pending]
    ].forEach(([id, amount]) => {
      const element =
        villagePublicElement(id);

      if (element) {
        element.textContent =
          formatVillagePublicMoney(amount);
      }
    });
  }

  let publicVillageDonationRows = [];

  function publicDonationCsvCell(value) {
    const text = String(value ?? "");

    return '"' +
      text.replace(/"/g, '""') +
      '"';
  }

  function publicDonationPlainMoney(value) {
    return Number(value || 0).toFixed(2);
  }

  function publicDonationReportRows() {
    return publicVillageDonationRows.map(
      (row, index) => {
        const status =
          publicDonationStatus(
            row.committed,
            row.received
          );

        return {
          serial: index + 1,
          donor: row.donor_name || "",
          residence: row.residence || "",
          committed: Number(
            row.committed || 0
          ),
          received: Number(
            row.received || 0
          ),
          pending: Number(
            row.pending || 0
          ),
          status: status.text,
          commitmentDate:
            formatVillagePublicDate(
              row.commitment_date
            ),
          paymentDate:
            formatVillagePublicDate(
              row.lastPaymentDate
            )
        };
      }
    );
  }

  function exportPublicVillageDonations() {
    const rows =
      publicDonationReportRows();

    if (!rows.length) {
      window.alert("No donation records are available to export.");
      return;
    }

    const headers = [
      "S.No",
      "Donor Name",
      "Residence",
      "Committed Amount",
      "Received Amount",
      "Pending Amount",
      "Status",
      "Commitment Date",
      "Last Payment Date"
    ];

    const lines = [
      headers
        .map(publicDonationCsvCell)
        .join(",")
    ];

    rows.forEach((row) => {
      lines.push(
        [
          row.serial,
          row.donor,
          row.residence,
          publicDonationPlainMoney(
            row.committed
          ),
          publicDonationPlainMoney(
            row.received
          ),
          publicDonationPlainMoney(
            row.pending
          ),
          row.status,
          row.commitmentDate,
          row.paymentDate
        ]
          .map(publicDonationCsvCell)
          .join(",")
      );
    });

    const csv =
      "\uFEFF" +
      lines.join("\r\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const now =
      new Date();

    const datePart = [
      now.getFullYear(),
      String(
        now.getMonth() + 1
      ).padStart(2, "0"),
      String(
        now.getDate()
      ).padStart(2, "0")
    ].join("-");

    link.href = url;
    link.download =
      `bodabanda-donations-${datePart}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  // SRMDC_REAL_URL_PRINT_PREVIEW
  const VILLAGE_PRINT_REPORT_KEY =
    "srmdc-village-print-report";

  // SRMDC_REPORT_URL_CONTEXT
  function openVillagePrintReport(
    reportHtml,
    fallbackMessage,
    reportType
  ) {
    const mobilePdfRequested =
      window.matchMedia(
        "(max-width: 700px)"
      ).matches ||
      /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );

    try {
      window.sessionStorage.setItem(
        VILLAGE_PRINT_REPORT_KEY,
        reportHtml
      );

    } catch (error) {
      console.error(
        "Unable to prepare report preview.",
        error
      );

      window.alert(
        "Unable to prepare the report preview."
      );
      return null;
    }

    const reportUrl =
      new URL(
        "./report.html",
        window.location.href
      );

    reportUrl.searchParams.set(
      "mobile",
      mobilePdfRequested
        ? "1"
        : "0"
    );

    reportUrl.searchParams.set(
      "type",
      reportType
    );

    const reportUrlHref =
      reportUrl.href;

    const reportWindow =
      window.open(
        reportUrlHref,
        "_blank"
      );

    if (!reportWindow) {
      window.sessionStorage.removeItem(
        VILLAGE_PRINT_REPORT_KEY
      );


      window.alert(fallbackMessage);
      return null;
    }

    // SRMDC_CHILD_WINDOW_REPORT_CONTEXT
    try {
      reportWindow.srmdcReportContext = {
        mobilePdfRequested,
        reportType
      };
    } catch (error) {
      console.warn(
        "Unable to pass report context directly.",
        error
      );
    }

    return reportWindow;
  }

  function printPublicVillageDonations() {
    const rows =
      publicDonationReportRows();

    if (!rows.length) {
      window.alert(
        "No donation records are available to print."
      );
      return;
    }

    const totalCommitted =
      rows.reduce(
        (sum, row) =>
          sum + row.committed,
        0
      );

    const totalReceived =
      rows.reduce(
        (sum, row) =>
          sum + row.received,
        0
      );

    const totalPending =
      rows.reduce(
        (sum, row) =>
          sum + row.pending,
        0
      );

    const generated =
      new Intl.DateTimeFormat(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short"
        }
      ).format(new Date());

    const logoUrl =
      new URL(
        "../assets/images/village/sita_rama_family.png",
        window.location.href
      ).href;

    const reportRows =
      rows
        .map((row) => `
          <tr>
            <td class="serial">
              ${row.serial}
            </td>

            <td class="donor">
              ${escapeVillagePublicHtml(
                row.donor
              )}
            </td>

            <td>
              ${escapeVillagePublicHtml(
                row.residence || "-"
              )}
            </td>

            <td class="amount">
              ${formatVillagePublicMoney(
                row.committed
              )}
            </td>

            <td class="amount received">
              ${formatVillagePublicMoney(
                row.received
              )}
            </td>

            <td class="amount pending">
              ${formatVillagePublicMoney(
                row.pending
              )}
            </td>

            <td class="status">
              ${escapeVillagePublicHtml(
                row.status
              )}
            </td>

            <td class="date">
              ${escapeVillagePublicHtml(
                row.commitmentDate
              )}
            </td>

            <td class="date">
              ${escapeVillagePublicHtml(
                row.paymentDate
              )}
            </td>
          </tr>
        `)
        .join("");

    const reportHtml = `
      <!doctype html>

      <html lang="te">
      <head>
        <meta charset="utf-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >

        <title>
          Mana Bodabanda - Donations Register
        </title>

        <style>
          @page {
            size: A4 landscape;
            margin: 9mm 8mm 10mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
          }

          body {
            color: #172033;
            background: #ffffff;
            font-family:
              "Nirmala UI",
              "Noto Sans Telugu",
              "Segoe UI",
              Arial,
              sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .report {
            width: 100%;
          }

          .brand-header {
            position: relative;
            display: grid;
            grid-template-columns:
              105px minmax(0, 1fr) 105px;
            align-items: center;
            min-height: 104px;
            padding: 8px 18px 10px;
            overflow: hidden;
            border: 1px solid #e6c88b;
            border-radius: 12px;
            background:
              linear-gradient(
                135deg,
                #fff7dc 0%,
                #fffdf4 48%,
                #fff4cc 100%
              );
          }

          .brand-header::after {
            content: "";
            position: absolute;
            left: 16%;
            right: 16%;
            bottom: 0;
            height: 2px;
            background:
              linear-gradient(
                90deg,
                transparent,
                #c7923e,
                transparent
              );
          }

          .brand-logo {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .brand-logo img {
            display: block;
            width: 92px;
            max-height: 94px;
            object-fit: contain;
          }

          .brand-copy {
            position: relative;
            z-index: 1;
            text-align: center;
          }

          .brand-name {
            margin: 0;
            color: #a52a1b;
            font-size: 30px;
            line-height: 1.05;
            font-weight: 800;
          }

          .brand-subtitle {
            margin-top: 4px;
            color: #8a2c20;
            font-size: 15px;
            font-weight: 700;
          }

          .brand-tagline {
            display: inline-block;
            margin-top: 7px;
            padding-top: 5px;
            border-top: 1px solid #d8b46a;
            color: #286b48;
            font-size: 11px;
            font-weight: 700;
          }

          .report-title {
            margin: 9px 0 7px;
            text-align: center;
          }

          .report-title h2 {
            margin: 0;
            color: #173b64;
            font-size: 17px;
            line-height: 1.25;
          }

          .report-title .english {
            margin-top: 2px;
            color: #6b7280;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.2px;
          }

          .report-meta {
            margin-top: 3px;
            color: #6b7280;
            font-size: 8.5px;
          }

          .summary {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 7px;
            margin: 0 0 8px;
          }

          .summary-card {
            padding: 6px 9px;
            border: 1px solid #e3d0a6;
            border-radius: 7px;
            text-align: center;
            background: #fffaf0;
          }

          .summary-card span {
            display: block;
            color: #6b7280;
            font-size: 8px;
            font-weight: 700;
          }

          .summary-card strong {
            display: block;
            margin-top: 2px;
            font-size: 13px;
            line-height: 1.1;
          }

          .summary-card.commitment strong {
            color: #8d2419;
          }

          .summary-card.received strong {
            color: #17603b;
          }

          .summary-card.pending strong {
            color: #9a291c;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 7.8px;
          }

          thead {
            display: table-header-group;
          }

          th {
            padding: 5px 3px;
            border: 1px solid #d8bf88;
            color: #31563e;
            background: #fff2bd;
            text-align: center;
            line-height: 1.2;
            font-weight: 800;
          }

          td {
            padding: 4px 3px;
            border: 1px solid #ddd7c9;
            vertical-align: middle;
            line-height: 1.25;
            overflow-wrap: anywhere;
          }

          tbody tr:nth-child(even) {
            background: #fffaf0;
          }

          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .serial {
            width: 4%;
            text-align: center;
          }

          .donor {
            width: 22%;
            font-weight: 600;
          }

          .residence {
            width: 9%;
          }

          .money {
            width: 11%;
          }

          .status-col {
            width: 11%;
          }

          .date-col {
            width: 10%;
          }

          td.amount {
            text-align: right;
            white-space: nowrap;
            font-variant-numeric:
              tabular-nums;
          }

          td.received {
            color: #17603b;
          }

          td.pending {
            color: #8d2419;
          }

          td.status {
            text-align: center;
          }

          td.date {
            text-align: center;
            white-space: nowrap;
          }

          .report-footer {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 7px;
            padding-top: 5px;
            border-top: 1px solid #dedede;
            color: #777;
            font-size: 7.5px;
          }
		.preview-actions {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #e4d3aa;
  background: rgba(255, 250, 240, 0.96);
}

.preview-actions button {
  padding: 8px 15px;
  border: 1px solid #9d321f;
  border-radius: 7px;
  background: #9d321f;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.preview-actions .close-button {
  border-color: #c9b98f;
  background: #ffffff;
  color: #55462f;
}

@media print {
  .preview-actions {
    display: none !important;
  }
}
          @media print {
            .brand-header,
            .summary-card,
            th {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>

      <body>
        <!-- SRMDC_DONATIONS_MANUAL_PRINT_PREVIEW -->
        <main class="report">

          <header class="brand-header">

            <div class="brand-logo">
              <img
                src="${logoUrl}"
                alt="Sri Sita Rama"
              >
            </div>

            <div class="brand-copy">

              <h1 class="brand-name">
                &#3118;&#3112;
                &#3116;&#3147;&#3105;&#3116;&#3074;&#3105;
              </h1>

              <div class="brand-subtitle">
                &#3095;&#3149;&#3120;&#3134;&#3118;
                &#3128;&#3118;&#3134;&#3098;&#3134;&#3120;
                &#3125;&#3143;&#3110;&#3135;&#3093;
              </div>

              <div class="brand-tagline">
                &#3118;&#3112; &#3095;&#3149;&#3120;&#3134;&#3118;&#3074;
                &bull;
                &#3118;&#3112; &#3128;&#3118;&#3134;&#3098;&#3134;&#3120;&#3074;
                &bull;
                &#3118;&#3112; &#3116;&#3134;&#3111;&#3149;&#3119;&#3108;
              </div>

            </div>

            <div></div>

          </header>

          <section class="report-title">

            <h2>
              &#3125;&#3135;&#3120;&#3134;&#3123;&#3134;&#3122;
              &#3112;&#3135;&#3125;&#3143;&#3110;&#3135;&#3093;
            </h2>

            <div class="english">
              Donations Register
            </div>

            <div class="report-meta">
              Generated:
              ${escapeVillagePublicHtml(
                generated
              )}
            </div>

          </section>

          <section class="summary">

            <div class="summary-card commitment">
              <span>
                Total Commitment
              </span>

              <strong>
                ${formatVillagePublicMoney(
                  totalCommitted
                )}
              </strong>
            </div>

            <div class="summary-card received">
              <span>
                Total Received
              </span>

              <strong>
                ${formatVillagePublicMoney(
                  totalReceived
                )}
              </strong>
            </div>

            <div class="summary-card pending">
              <span>
                Total Pending
              </span>

              <strong>
                ${formatVillagePublicMoney(
                  totalPending
                )}
              </strong>
            </div>

          </section>

          <table>

            <colgroup>
              <col class="serial">
              <col class="donor">
              <col class="residence">
              <col class="money">
              <col class="money">
              <col class="money">
              <col class="status-col">
              <col class="date-col">
              <col class="date-col">
            </colgroup>

            <thead>
              <tr>
                <th>
                  S.No
                </th>

                <th>
                  Donor Name
                </th>

                <th>
                  Residence
                </th>

                <th>
                  Committed
                </th>

                <th>
                  Received
                </th>

                <th>
                  Pending
                </th>

                <th>
                  Status
                </th>

                <th>
                  Commitment Date
                </th>

                <th>
                  Last Payment
                </th>
              </tr>
            </thead>

            <tbody>
              ${reportRows}
            </tbody>

          </table>

          <footer class="report-footer">

            <span>
              Mana Bodabanda Village Information Portal
            </span>

            <span>
              Sri Rama Mandira Devasthana Charitable Trust
            </span>

          </footer>

        </main>

        <div class="preview-actions">
          <button
            type="button"
            onclick="window.print()"
          >
            Print / Save PDF
          </button>

          <button
            type="button"
            class="close-button"
            onclick="window.close()"
          >
            Close Preview
          </button>
        </div>

      </body>
      </html>
    `;

    openVillagePrintReport(
      reportHtml,
      "Unable to open the print preview.",
      "donations"
    );
  }
    // SRMDC_VILLAGE_MOBILE_USER_FREEZE
  const PUBLIC_DONATION_FREEZE_KEY =
    "srmdc-public-donation-freeze";

  function publicDonationMobileView() {
    return window.matchMedia(
      "(max-width: 650px)"
    ).matches;
  }

  function savedPublicDonationFreezePreference() {
    const value =
      window.localStorage.getItem(
        PUBLIC_DONATION_FREEZE_KEY
      );

    if (value === "freeze") {
      return true;
    }

    if (value === "unfreeze") {
      return false;
    }

    // Existing desktop/tablet behaviour remains frozen.
    // Mobile defaults to unfrozen.
    return !publicDonationMobileView();
  }

  function applyPublicDonationFreezePreference(
    shouldFreeze
  ) {
    document.body.classList.toggle(
      "public-table-freeze-enabled",
      shouldFreeze
    );

    const button =
      villagePublicElement(
        "publicDonationFreezeButton"
      );

    if (!button) {
      return;
    }

    button.setAttribute(
      "aria-pressed",
      shouldFreeze ? "true" : "false"
    );

    button.textContent =
      shouldFreeze
        ? "Unfreeze Name"
        : "Freeze Name";
  }

  function bindPublicDonationFreezePreference() {
    const button =
      villagePublicElement(
        "publicDonationFreezeButton"
      );

    if (!button) {
      return;
    }

    applyPublicDonationFreezePreference(
      savedPublicDonationFreezePreference()
    );

    if (!button.dataset.bound) {
      button.dataset.bound = "true";

      button.addEventListener(
        "click",
        () => {
          const currentlyFrozen =
            document.body.classList.contains(
              "public-table-freeze-enabled"
            );

          const shouldFreeze =
            !currentlyFrozen;

          window.localStorage.setItem(
            PUBLIC_DONATION_FREEZE_KEY,
            shouldFreeze
              ? "freeze"
              : "unfreeze"
          );

          applyPublicDonationFreezePreference(
            shouldFreeze
          );
        }
      );
    }
  }
function bindPublicDonationReportActions() {
    bindPublicDonationFreezePreference();
    const exportButton =
      villagePublicElement(
        "publicDonationExportButton"
      );

    const printButton =
      villagePublicElement(
        "publicDonationPrintButton"
      );

    if (
      exportButton &&
      !exportButton.dataset.bound
    ) {
      exportButton.dataset.bound = "true";

      exportButton.addEventListener(
        "click",
        exportPublicVillageDonations
      );
    }

    if (
      printButton &&
      !printButton.dataset.bound
    ) {
      printButton.dataset.bound = "true";

      printButton.addEventListener(
        "click",
        printPublicVillageDonations
      );
    }
  }

  function renderPublicVillageDonations(rows) {
    publicVillageDonationRows =
      Array.isArray(rows)
        ? rows.map((row) => ({ ...row }))
        : [];

    const body =
      villagePublicElement(
        "donationsTable"
      );

    if (!body) {
      return;
    }

    if (!rows.length) {
      body.innerHTML = `
        <tr>
          <td
            colspan="9"
            class="empty-state"
          >
            \u0C07\u0C02\u0C15\u0C3E
            \u0C35\u0C3F\u0C30\u0C3E\u0C33\u0C3E\u0C32
            \u0C35\u0C3F\u0C35\u0C30\u0C3E\u0C32\u0C41
            \u0C32\u0C47\u0C35\u0C41.
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML =
      rows
        .map((row, index) => {
          const status =
            publicDonationStatus(
              row.committed,
              row.received
            );

          return `
            <tr>
              <td>${index + 1}</td>

              <td class="public-donor-name">
                ${escapeVillagePublicHtml(
                  row.donor_name
                )}
              </td>

              <td class="public-donor-residence">
                ${
                  row.residence
                    ? escapeVillagePublicHtml(
                        row.residence
                      )
                    : "-"
                }
              </td>

              <td class="amount-cell">
                ${formatVillagePublicMoney(
                  row.committed
                )}
              </td>

              <td class="amount-cell public-received-amount">
                ${formatVillagePublicMoney(
                  row.received
                )}
              </td>

              <td class="amount-cell">
                ${formatVillagePublicMoney(
                  row.pending
                )}
              </td>

              <td>
                <span
                  class="public-donation-status ${status.className}"
                >
                  ${status.text}
                </span>
              </td>

              <td>
                ${formatVillagePublicDate(
                  row.commitment_date
                )}
              </td>

              <td>
                ${formatVillagePublicDate(
                  row.lastPaymentDate
                )}
              </td>
              <td class="village-payment-action-cell">
                ${
                  row.pending > 0
                    ? `
                      <button
                        type="button"
                        class="village-public-pay-button village-public-donation-pay"
                        data-village-donation-pay
                        data-person="${escapeVillagePublicHtml(
                          row.donor_name
                        )}"
                        data-committed="${row.committed}"
                        data-received="${row.received}"
                        data-pending="${row.pending}"
                      >
                        &#x0C35;&#x0C3F;&#x0C30;&#x0C3E;&#x0C33;&#x0C02;
                        &#x0C38;&#x0C2E;&#x0C30;&#x0C4D;&#x0C2A;&#x0C3F;&#x0C02;&#x0C1A;&#x0C02;&#x0C21;&#x0C3F;
                      </button>
                    `
                    : `
                      <span class="village-payment-complete">
                        &#x2713;
                      </span>
                    `
                }
              </td>
            </tr>
          `;
        })
        .join("");
  }

  async function loadPublicVillageDonations() {
    const body =
      villagePublicElement(
        "donationsTable"
      );

    const config =
      window.SRMDC_SUPABASE_CONFIG;

    if (
      !window.supabase ||
      !config?.url ||
      !config?.publishableKey
    ) {
      console.error(
        "Public village Supabase configuration is unavailable."
      );

      if (body) {
        body.innerHTML = `
          <tr>
            <td
              colspan="9"
              class="empty-state"
            >
              \u0C35\u0C3F\u0C30\u0C3E\u0C33\u0C3E\u0C32
              \u0C35\u0C3F\u0C35\u0C30\u0C3E\u0C32\u0C41
              \u0C32\u0C4B\u0C21\u0C4D
              \u0C15\u0C3E\u0C32\u0C47\u0C26\u0C41.
            </td>
          </tr>
        `;
      }

      return;
    }

    const client =
      window.supabase.createClient(
        config.url,
        config.publishableKey
      );

    const villageResult =
      await client
        .from("villages")
        .select(
          "id,slug,name,name_telugu,is_active"
        )
        .eq("slug", "bodabanda")
        .eq("is_active", true)
        .maybeSingle();

    if (
      villageResult.error ||
      !villageResult.data?.id
    ) {
      console.error(
        "Unable to load public village:",
        villageResult.error
      );

      if (body) {
        body.innerHTML = `
          <tr>
            <td
              colspan="9"
              class="empty-state"
            >
              \u0C17\u0C4D\u0C30\u0C3E\u0C2E
              \u0C35\u0C3F\u0C35\u0C30\u0C3E\u0C32\u0C41
              \u0C32\u0C4B\u0C21\u0C4D
              \u0C15\u0C3E\u0C32\u0C47\u0C26\u0C41.
            </td>
          </tr>
        `;
      }

      return;
    }

    const villageId =
      villageResult.data.id;

    const results =
      await Promise.all([
        client
          .from("village_commitments")
          .select(
            "id,donor_name,residence,commitment_date,committed_amount,is_cancelled,created_at"
          )
          .eq(
            "village_id",
            villageId
          )
          .eq(
            "is_cancelled",
            false
          ),

        client
          .from(
            "village_commitment_payments"
          )
          .select(
            "id,commitment_id,payment_date,amount"
          )
          .eq(
            "village_id",
            villageId
          )
          .order(
            "payment_date",
            {
              ascending: true
            }
          )
      ]);

    const commitmentResult =
      results[0];

    const paymentResult =
      results[1];

    if (commitmentResult.error) {
      console.error(
        "Unable to load public village commitments:",
        commitmentResult.error
      );

      return;
    }

    if (paymentResult.error) {
      console.error(
        "Unable to load public village payments:",
        paymentResult.error
      );

      return;
    }

    const paymentsByCommitment =
      new Map();

    (paymentResult.data || [])
      .forEach((payment) => {
        const list =
          paymentsByCommitment.get(
            payment.commitment_id
          ) || [];

        list.push(payment);

        paymentsByCommitment.set(
          payment.commitment_id,
          list
        );
      });

    const rows =
      (commitmentResult.data || [])
        .map((commitment) => {
          const payments =
            paymentsByCommitment.get(
              commitment.id
            ) || [];

          const committed =
            Number(
              commitment.committed_amount ||
              0
            );

          const received =
            payments.reduce(
              (sum, payment) =>
                sum +
                Number(
                  payment.amount || 0
                ),
              0
            );

          const pending =
            Math.max(
              committed - received,
              0
            );

          const lastPayment =
            payments.length
              ? payments[
                  payments.length - 1
                ]
              : null;

          return {
            id: commitment.id,
            donor_name:
              commitment.donor_name,
            residence:
              commitment.residence || "",
            commitment_date:
              commitment.commitment_date,
            committed,
            received,
            pending,
            lastPaymentDate:
              lastPayment?.payment_date ||
              null,
            created_at:
              commitment.created_at || ""
          };
        });

    /*
     * Villager-facing rule only:
     * highest committed amount -> lowest.
     *
     * Admin ordering is intentionally untouched.
     */
    rows.sort((a, b) => {
      const amountDifference =
        b.committed - a.committed;

      if (amountDifference !== 0) {
        return amountDifference;
      }

      return String(a.created_at)
        .localeCompare(
          String(b.created_at)
        );
    });

    const totalCommitted =
      rows.reduce(
        (sum, row) =>
          sum + row.committed,
        0
      );

    const totalReceived =
      rows.reduce(
        (sum, row) =>
          sum + row.received,
        0
      );

    setPublicDonationSummary(
      totalCommitted,
      totalReceived
    );

    renderPublicVillageDonations(rows);
  }

  function setupPublicDonationTableScroll() {
    const topScroll =
      document.getElementById(
        "donationTopScroll"
      );

    const tableScroll =
      document.getElementById(
        "donationTableScroll"
      );

    if (!topScroll || !tableScroll) {
      return;
    }

    const topInner =
      topScroll.querySelector(
        ".public-donation-top-scroll-inner"
      );

    const table =
      tableScroll.querySelector("table");

    if (!topInner || !table) {
      return;
    }

    const syncWidth = () => {
      topInner.style.width =
        `${table.scrollWidth}px`;
    };

    let syncing = false;

    topScroll.addEventListener(
      "scroll",
      () => {
        if (syncing) {
          return;
        }

        syncing = true;

        tableScroll.scrollLeft =
          topScroll.scrollLeft;

        requestAnimationFrame(() => {
          syncing = false;
        });
      }
    );

    tableScroll.addEventListener(
      "scroll",
      () => {
        if (syncing) {
          return;
        }

        syncing = true;

        topScroll.scrollLeft =
          tableScroll.scrollLeft;

        requestAnimationFrame(() => {
          syncing = false;
        });
      }
    );

    syncWidth();

    window.addEventListener(
      "resize",
      syncWidth
    );

    if ("ResizeObserver" in window) {
      const observer =
        new ResizeObserver(syncWidth);

      observer.observe(table);
    }
  }

  // ---------------------------------------------------------
  // PUBLIC TEMPLE FUND - PHASE 1E-3B.4
  // ---------------------------------------------------------

  function publicTempleNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function publicTempleDate(value) {
    if (!value) return null;

    const parts =
      String(value)
        .slice(0, 10)
        .split("-")
        .map(Number);

    if (
      parts.length !== 3 ||
      !parts[0] ||
      !parts[1] ||
      !parts[2]
    ) {
      return null;
    }

    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      12,
      0,
      0,
      0
    );
  }

  function publicTempleToday() {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12,
      0,
      0,
      0
    );
  }

  function publicTempleAddMonths(date, months) {
    const sourceDay = date.getDate();

    const target =
      new Date(
        date.getFullYear(),
        date.getMonth() + months,
        1,
        12
      );

    const lastDay =
      new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0,
        12
      ).getDate();

    target.setDate(
      Math.min(sourceDay, lastDay)
    );

    return target;
  }

  function publicTempleDays(start, end) {
    const startUtc =
      Date.UTC(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );

    const endUtc =
      Date.UTC(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
      );

    return Math.max(
      0,
      (endUtc - startUtc) /
        (24 * 60 * 60 * 1000)
    );
  }

  function publicTempleElapsedMonths(
    startValue,
    endValue
  ) {
    const start =
      publicTempleDate(startValue);

    const end =
      endValue instanceof Date
        ? endValue
        : publicTempleDate(endValue);

    if (
      !start ||
      !end ||
      end <= start
    ) {
      return 0;
    }

    let months =
      (end.getFullYear() -
        start.getFullYear()) * 12 +
      (end.getMonth() -
        start.getMonth());

    let anchor =
      publicTempleAddMonths(
        start,
        months
      );

    if (anchor > end) {
      months -= 1;

      anchor =
        publicTempleAddMonths(
          start,
          months
        );
    }

    months =
      Math.max(months, 0);

    const next =
      publicTempleAddMonths(
        start,
        months + 1
      );

    const periodDays =
      publicTempleDays(
        anchor,
        next
      );

    const remainingDays =
      publicTempleDays(
        anchor,
        end
      );

    return (
      months +
      (
        periodDays > 0
          ? Math.min(
              remainingDays / periodDays,
              1
            )
          : 0
      )
    );
  }

  function publicTempleInterest(
    principal,
    rate,
    takenDate,
    endDate
  ) {
    const amount =
      publicTempleNumber(principal);

    const monthlyRate =
      publicTempleNumber(rate);

    if (
      amount <= 0 ||
      !takenDate ||
      !endDate
    ) {
      return 0;
    }

    return Math.max(
      0,
      amount *
        (monthlyRate / 100) *
        publicTempleElapsedMonths(
          takenDate,
          endDate
        )
    );
  }

  function publicTempleMoney(value) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
      }
    ).format(
      publicTempleNumber(value)
    );
  }

  function publicTempleStatus(row) {
    if (row.isFinalSettled) {
      return "\u0C24\u0C41\u0C26\u0C3F \u0C38\u0C46\u0C1F\u0C3F\u0C32\u0C4D\u0C2E\u0C46\u0C02\u0C1F\u0C4D";
    }

    if (row.totalPaid > 0) {
      return "\u0C15\u0C4A\u0C02\u0C24 \u0C1A\u0C46\u0C32\u0C4D\u0C32\u0C3F\u0C02\u0C1A\u0C3E\u0C30\u0C41";
    }

    return "\u0C2A\u0C46\u0C02\u0C21\u0C3F\u0C02\u0C17\u0C4D";
  }

  // SRMDC_TEMPLE_FUND_USER_FREEZE
  const TEMPLE_FUND_FREEZE_KEY =
    "srmdc-temple-fund-freeze";

  function templeFundMobileView() {
    return window.matchMedia(
      "(max-width: 650px)"
    ).matches;
  }

  function savedTempleFundFreezePreference() {
    const value =
      window.localStorage.getItem(
        TEMPLE_FUND_FREEZE_KEY
      );

    if (value === "freeze") {
      return true;
    }

    if (value === "unfreeze") {
      return false;
    }

    // Existing desktop/tablet behaviour remains frozen.
    // Mobile defaults to unfrozen.
    return !templeFundMobileView();
  }

  function applyTempleFundFreezePreference(
    shouldFreeze
  ) {
    document.body.classList.toggle(
      "temple-table-freeze-enabled",
      shouldFreeze
    );

    const button =
      villagePublicElement(
        "templeFundFreezeButton"
      );

    if (!button) {
      return;
    }

    button.setAttribute(
      "aria-pressed",
      shouldFreeze ? "true" : "false"
    );

    button.textContent =
      shouldFreeze
        ? "Unfreeze Name"
        : "Freeze Name";
  }

  function bindTempleFundFreezePreference() {
    const button =
      villagePublicElement(
        "templeFundFreezeButton"
      );

    if (!button) {
      return;
    }

    applyTempleFundFreezePreference(
      savedTempleFundFreezePreference()
    );

    if (!button.dataset.bound) {
      button.dataset.bound = "true";

      button.addEventListener(
        "click",
        () => {
          const currentlyFrozen =
            document.body.classList.contains(
              "temple-table-freeze-enabled"
            );

          const shouldFreeze =
            !currentlyFrozen;

          window.localStorage.setItem(
            TEMPLE_FUND_FREEZE_KEY,
            shouldFreeze
              ? "freeze"
              : "unfreeze"
          );

          applyTempleFundFreezePreference(
            shouldFreeze
          );

          if (
            typeof window.refreshTempleHorizontalScroll ===
            "function"
          ) {
            window.refreshTempleHorizontalScroll();
          }
        }
      );
    }
  }
  // SRMDC_TEMPLE_FUND_PUBLIC_REPORTS
  let publicTempleFundReportRows = [];

  function publicTempleCsvCell(value) {
    const text = String(value ?? "");

    return '"' +
      text.replace(/"/g, '""') +
      '"';
  }

  function publicTemplePlainMoney(value) {
    const number = Number(value || 0);

    return Number.isFinite(number)
      ? number.toFixed(2)
      : "0.00";
  }

  function exportPublicTempleFundCsv() {
    const rows = publicTempleFundReportRows;

    if (!rows.length) {
      window.alert(
        "No Temple Fund records are available to export."
      );
      return;
    }

    const headers = [
      "S.No.",
      "Name",
      "Residence",
      "Taken Date",
      "Principal",
      "Monthly Interest Rate",
      "Calculated Interest",
      "Current Total Due",
      "Paid / Final Settlement",
      "Status",
      "Details / Comments"
    ];

    const lines = [
      headers
        .map(publicTempleCsvCell)
        .join(",")
    ];

    rows.forEach((row, index) => {
      const paid =
        row.isFinalSettled
          ? Number(
              row.finalSettlementReceived ||
              row.final_settlement_amount ||
              row.totalPaid ||
              0
            )
          : Number(row.totalPaid || 0);

      const status =
        row.isFinalSettled
          ? "Closed"
          : "Pending";

      const details =
        row.settlement_notes ||
        row.notes ||
        "";

      lines.push(
        [
          index + 1,
          row.person_name || "",
          row.residence || "",
          row.taken_date || "",
          publicTemplePlainMoney(
            row.principal
          ),
          publicTemplePlainMoney(
            row.monthly_interest_rate
          ) + "%",
          row.isFinalSettled
            ? ""
            : publicTemplePlainMoney(
                row.calculatedInterest
              ),
          publicTemplePlainMoney(
            row.currentCalculatedTotal
          ),
          publicTemplePlainMoney(paid),
          status,
          details
        ]
          .map(publicTempleCsvCell)
          .join(",")
      );
    });

    const csv =
      "\uFEFF" +
      lines.join("\r\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const now =
      new Date();

    const datePart = [
      now.getFullYear(),
      String(
        now.getMonth() + 1
      ).padStart(2, "0"),
      String(
        now.getDate()
      ).padStart(2, "0")
    ].join("-");

    link.href = url;

    link.download =
      `bodabanda-temple-fund-${datePart}.csv`;

    document.body.appendChild(link);

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function printPublicTempleFund() {
    if (!publicTempleFundReportRows.length) {
      window.alert(
        "No Temple Fund records are available to print."
      );
      return;
    }

    const table =
      document.querySelector(
        ".public-temple-table"
      );

    if (!table) {
      window.alert(
        "Temple Fund table is not available."
      );
      return;
    }

    const principalTotal =
      publicTempleFundReportRows.reduce(
        (sum, row) =>
          sum +
          Number(row.principal || 0),
        0
      );

    const interestTotal =
      publicTempleFundReportRows.reduce(
        (sum, row) =>
          sum +
          Number(row.calculatedInterest || 0),
        0
      );

    const dueTotal =
      publicTempleFundReportRows.reduce(
        (sum, row) =>
          sum +
          Number(row.currentCalculatedTotal || 0),
        0
      );

    const generated =
      new Intl.DateTimeFormat(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short"
        }
      ).format(new Date());

    const logoUrl =
      new URL(
        "../assets/images/village/sita_rama_family.png",
        window.location.href
      ).href;

    const reportTable =
      table.cloneNode(true);

    reportTable
      .querySelectorAll(
        "button, .village-public-pay-button"
      )
      .forEach((element) => {
        element.remove();
      });

    const reportHtml = `
      <!doctype html>
      <html lang="te">

        <head>

          <meta charset="utf-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          >

          <title>
            Mana Bodabanda - Temple Fund Report
          </title>

          <style>

            @page {
              size: A4 landscape;
              margin: 9mm 8mm 10mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
            }

            body {
              color: #172033;
              background: #f5f2e9;

              font-family:
                "Noto Sans Telugu",
                "Nirmala UI",
                "Segoe UI",
                Arial,
                sans-serif;
            }

            .preview-toolbar {
              position: sticky;
              top: 0;
              z-index: 50;

              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;

              padding: 12px 18px;

              border-bottom:
                1px solid #d7d1c1;

              background:
                rgba(255, 255, 255, 0.97);

              box-shadow:
                0 3px 14px
                rgba(0, 0, 0, 0.08);
            }

            .preview-toolbar-copy {
              display: grid;
              gap: 2px;
            }

            .preview-toolbar-copy strong {
              color: #7c2d12;
              font-size: 15px;
            }

            .preview-toolbar-copy span {
              color: #64748b;
              font-size: 12px;
            }

            .print-button {
              min-height: 40px;
              padding: 8px 16px;

              border:
                1px solid #7c2d12;

              border-radius: 10px;

              background: #7c2d12;
              color: #ffffff;

              font: inherit;
              font-weight: 700;
              cursor: pointer;
            }

            .report {
              width:
                min(
                  1380px,
                  calc(100% - 28px)
                );

              margin: 20px auto;

              overflow: hidden;

              border:
                1px solid #d8cba7;

              border-radius: 18px;

              background: #ffffff;

              box-shadow:
                0 18px 45px
                rgba(54, 40, 20, 0.12);
            }

            .brand-header {
              position: relative;

              display: grid;

              grid-template-columns:
                110px 1fr 110px;

              align-items: center;

              min-height: 128px;

              padding: 15px 24px;

              overflow: hidden;

              border-bottom:
                1px solid #dfc98e;

              background:
                radial-gradient(
                  circle at 50% -35%,
                  rgba(255, 255, 255, 0.96),
                  rgba(255, 249, 225, 0.86) 42%,
                  rgba(245, 226, 163, 0.78) 100%
                );
            }

            .brand-header::after {
              content: "";

              position: absolute;

              left: 8%;
              right: 8%;
              bottom: 0;

              height: 2px;

              background:
                linear-gradient(
                  90deg,
                  transparent,
                  #c7923e,
                  transparent
                );
            }

            .brand-logo {
              position: relative;
              z-index: 1;

              display: flex;
              align-items: center;
              justify-content: center;
            }

            .brand-logo img {
              display: block;

              width: 92px;
              max-height: 94px;

              object-fit: contain;
            }

            .brand-copy {
              position: relative;
              z-index: 1;
              text-align: center;
            }

            .brand-name {
              margin: 0;

              color: #a52a1b;

              font-size: 30px;
              line-height: 1.05;
              font-weight: 800;
            }

            .brand-subtitle {
              margin-top: 5px;

              color: #12573e;

              font-size: 18px;
              font-weight: 800;
            }

            .brand-tagline {
              margin-top: 6px;

              color: #75582e;

              font-size: 12px;
              font-weight: 700;
            }

            .report-heading {
              padding: 16px 22px 12px;
              text-align: center;
            }

            .report-heading h2 {
              margin: 0;

              color: #17251f;

              font-size: 23px;
              line-height: 1.3;
            }

            .report-heading .english {
              margin-top: 3px;

              color: #7c2d12;

              font-size: 15px;
              font-weight: 800;
            }

            .report-meta {
              margin-top: 5px;

              color: #64748b;
              font-size: 11px;
            }

            .summary {
              display: grid;

              grid-template-columns:
                repeat(
                  3,
                  minmax(0, 1fr)
                );

              gap: 10px;
              padding: 0 18px 16px;
            }

            .summary-card {
              display: grid;
              gap: 5px;

              min-height: 78px;

              padding: 12px 14px;

              border:
                1px solid #ddd6c5;

              border-radius: 12px;

              background: #faf8f2;
            }

            .summary-card span {
              color: #64748b;

              font-size: 11px;
              font-weight: 700;
            }

            .summary-card strong {
              color: #17251f;

              font-size: 18px;
              line-height: 1.2;
            }

            .summary-card.principal {
              border-top:
                3px solid #9a6b2f;
            }

            .summary-card.interest {
              border-top:
                3px solid #315f8a;
            }

            .summary-card.due {
              border-top:
                3px solid #a52a1b;
            }

            .table-wrap {
              padding: 0 14px 16px;
              overflow-x: auto;
            }

            table {
              width: 100%;
              min-width: 1120px;

              border-collapse: collapse;

              background: #ffffff;
              font-size: 10px;
            }

            th,
            td {
              position: static !important;

              left: auto !important;
              z-index: auto !important;

              border:
                1px solid #cfc9ba;

              padding: 6px 7px;

              vertical-align: top;
              text-align: left;

              white-space: normal;

              box-shadow:
                none !important;
            }

            th {
              color: #3c321f;

              background:
                #f4e9bf !important;

              font-weight: 800;
            }

            tbody tr:nth-child(even) td {
              background: #fcfbf7;
            }

            button,
            .village-public-pay-button {
              display: none !important;
            }

            .report-footer {
              display: flex;

              justify-content:
                space-between;

              gap: 16px;

              padding:
                10px 18px 13px;

              border-top:
                1px solid #e1dccf;

              color: #6b7280;
              background: #faf9f5;

              font-size: 10px;
              font-weight: 600;
            }

            @media (max-width: 720px) {

              .preview-toolbar {
                align-items: stretch;
                flex-direction: column;
              }

              .print-button {
                width: 100%;
              }

              .report {
                width:
                  calc(100% - 14px);

                margin: 8px auto;

                border-radius: 12px;
              }

              .brand-header {
                grid-template-columns:
                  76px 1fr 20px;

                padding: 12px 10px;
              }

              .brand-logo img {
                width: 66px;
              }

              .brand-name {
                font-size: 22px;
              }

              .brand-subtitle {
                font-size: 15px;
              }

              .summary {
                grid-template-columns: 1fr;
              }
            }

            @media print {

              body {
                background: #ffffff;
              }

              .preview-toolbar {
                display: none !important;
              }

              .report {
                width: 100%;

                margin: 0;

                border: 0;
                border-radius: 0;

                box-shadow: none;
              }

              .brand-header {
                min-height: 105px;
              }

              .brand-logo img {
                width: 78px;
                max-height: 80px;
              }

              .brand-name {
                font-size: 24px;
              }

              .brand-subtitle {
                font-size: 15px;
              }

              .report-heading {
                padding-top: 10px;
              }

              .summary-card {
                min-height: 60px;
                padding: 8px 10px;
              }

              .summary-card strong {
                font-size: 15px;
              }

              .table-wrap {
                padding: 0;
                overflow: visible;
              }

              table {
                min-width: 0;
                font-size: 7.5px;
              }

              th,
              td {
                padding: 3.5px 4px;
              }

              thead {
                display: table-header-group;
              }

              tr {
                break-inside: avoid;
              }

              .report-footer {
                padding-left: 4px;
                padding-right: 4px;
              }
            }


          /* SRMDC_TEMPLE_PREVIEW_BOTTOM_ACTIONS */
          .temple-preview-actions {
            position: sticky;
            bottom: 0;
            z-index: 100;

            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 10px;

            width: 100%;
            min-height: 64px;
            margin-top: 12px;
            padding: 10px 14px;

            overflow: visible;

            border-top: 1px solid #e1d6b9;
            background: #fffaf0;

            box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.08);
          }

          .temple-preview-actions > button {
            position: static !important;
            display: inline-flex !important;
            align-items: center;
            justify-content: center;

            flex: 0 0 auto;

            min-width: 140px;
            min-height: 42px;

            margin: 0;
            opacity: 1 !important;
            visibility: visible !important;
          }

          .temple-preview-actions .print-button {
            min-height: 40px;
          }

          .temple-preview-close-button {
            min-height: 40px;
            padding: 8px 16px;
            border: 1px solid #c9b77e;
            border-radius: 9px;
            background: #ffffff;
            color: #5b4630;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
          }

          @media (max-width: 760px) {
            .temple-preview-actions {
              flex-direction: column;
              align-items: stretch;
            }

            .temple-preview-actions .print-button,
            .temple-preview-close-button {
              width: 100%;
            }
          }

          /* SRMDC_TEMPLE_ONE_PAGE_PRINT */
          @media print {

            /*
             * Keep each Temple Fund account row together,
             * while making the report compact enough for
             * A4 landscape printing.
             */

            .brand-header {
              min-height: 58px;
              padding: 5px 10px;
            }

            .brand-logo img {
              width: 44px;
              max-height: 48px;
            }

            .brand-name {
              font-size: 17px;
              line-height: 1.05;
            }

            .brand-subtitle {
              font-size: 10px;
              line-height: 1.05;
            }

            .brand-tagline {
              font-size: 7px;
              line-height: 1.05;
            }

            .report-heading {
              padding-top: 4px;
              padding-bottom: 4px;
            }

            .report-heading h2 {
              margin: 0;
              font-size: 15px;
              line-height: 1.05;
            }

            .report-heading .english {
              margin-top: 1px;
              font-size: 9px;
              line-height: 1.05;
            }

            .report-meta {
              margin-top: 1px;
              font-size: 7px;
              line-height: 1.05;
            }

            .summary {
              gap: 5px;
              padding: 0 6px 5px;
            }

            .summary-card {
              min-height: 38px;
              gap: 1px;
              padding: 4px 6px;
              border-radius: 6px;
            }

            .summary-card span {
              font-size: 7px;
              line-height: 1.05;
            }

            .summary-card strong {
              font-size: 10px;
              line-height: 1.05;
            }

            .table-wrap {
              padding: 0;
              overflow: visible;
            }

            table {
              width: 100%;
              min-width: 0;
              font-size: 6.35px;
              line-height: 1.08;
            }

            th,
            td {
              padding: 1.5px 2px;
              line-height: 1.08;
            }

            th {
              font-size: 6.2px;
            }

            thead {
              display: table-header-group;
            }

            tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .report-footer {
              gap: 8px;
              padding: 3px 4px 4px;
              font-size: 6.5px;
              line-height: 1.05;
            }
          }
          /* SRMDC_TEMPLE_PRINT_PAGE_SCALE */
          @media print {
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
            }

            body {
              overflow: visible !important;
            }

            /*
             * Scale the complete printable report as one unit.
             * Width compensation keeps the final scaled width
             * close to the available landscape page width.
             */
            .report {
              width: 95.24% !important;
              max-width: none !important;
              margin: 0 !important;

              transform: scale(1.05);
              transform-origin: top left;

              overflow: visible !important;
            }

            .temple-preview-actions {
              display: none !important;
            }
          }
          @media print {
            .temple-preview-actions {
              display: none !important;
            }
          }
        </style>

        </head>

        <body>

          <div class="preview-toolbar">

            <div class="preview-toolbar-copy">

              <strong>
                Temple Fund Report Preview
              </strong>

              <span>
                Review the report below before printing or saving as PDF.
              </span>

            </div>



          </div>

          <main class="report">

            <header class="brand-header">

              <div class="brand-logo">

                <img
                  src="${logoUrl}"
                  alt="Sri Sita Rama"
                >

              </div>

              <div class="brand-copy">

                <h1 class="brand-name">
                  &#3118;&#3112;
                  &#3116;&#3147;&#3105;&#3116;&#3074;&#3105;
                </h1>

                <div class="brand-subtitle">
                  &#3095;&#3149;&#3120;&#3134;&#3118;
                  &#3128;&#3118;&#3134;&#3098;&#3134;&#3120;
                  &#3125;&#3143;&#3110;&#3135;&#3093;
                </div>

                <div class="brand-tagline">
                  Mana Bodabanda
                  &bull;
                  Village Information Portal
                </div>

              </div>

              <div></div>

            </header>

            <section class="report-heading">

              <h2>
                &#3110;&#3143;&#3125;&#3134;&#3122;&#3119;
                &#3112;&#3135;&#3111;&#3135;
                &#3112;&#3135;&#3125;&#3143;&#3110;&#3135;&#3093;
              </h2>

              <div class="english">
                Temple Fund Report
              </div>

              <div class="report-meta">
                Generated:
                ${generated}
              </div>

            </section>

            <section class="summary">

              <div class="summary-card principal">

                <span>
                  Principal Amount
                </span>

                <strong>
                  ${formatVillagePublicMoney(
                    principalTotal
                  )}
                </strong>

              </div>

              <div class="summary-card interest">

                <span>
                  Calculated Interest
                </span>

                <strong>
                  ${formatVillagePublicMoney(
                    interestTotal
                  )}
                </strong>

              </div>

              <div class="summary-card due">

                <span>
                  Total Due
                </span>

                <strong>
                  ${formatVillagePublicMoney(
                    dueTotal
                  )}
                </strong>

              </div>

            </section>

            <div class="table-wrap">
              ${reportTable.outerHTML}
            </div>

            <footer class="report-footer">

              <span>
                Mana Bodabanda Village Information Portal
              </span>

              <span>
                Sri Rama Mandira Devasthana Charitable Trust
              </span>

            </footer>

          </main>


        <div class="temple-preview-actions">
          <button
            type="button"
            class="print-button"
            onclick="window.print()"
          >
            Print / Save PDF
          </button>

          <button
            type="button"
            class="temple-preview-close-button"
            onclick="window.close()"
          >
            Close Preview
          </button>
        </div>
      </body>

      </html>
    `;

    openVillagePrintReport(
      reportHtml,
      "Please allow pop-ups to open the Temple Fund report.",
      "temple-fund"
    );
  }

  function bindTempleFundReportActions() {
    const exportButton =
      villagePublicElement(
        "templeFundExportButton"
      );

    const printButton =
      villagePublicElement(
        "templeFundPrintButton"
      );

    if (
      exportButton &&
      !exportButton.dataset.reportBound
    ) {
      exportButton.dataset.reportBound =
        "true";

      exportButton.addEventListener(
        "click",
        exportPublicTempleFundCsv
      );
    }

    if (
      printButton &&
      !printButton.dataset.reportBound
    ) {
      printButton.dataset.reportBound =
        "true";

      printButton.addEventListener(
        "click",
        printPublicTempleFund
      );
    }
  }
  async function loadPublicTempleFund() {
    const body =
      villagePublicElement(
        "templeFundTable"
      );

    const config =
      window.SRMDC_SUPABASE_CONFIG;

    if (
      !body ||
      !window.supabase ||
      !config?.url ||
      !config?.publishableKey
    ) {
      return;
    }

    const client =
      window.supabase.createClient(
        config.url,
        config.publishableKey
      );

    const villageResult =
      await client
        .from("villages")
        .select("id")
        .eq("slug", "bodabanda")
        .eq("is_active", true)
        .maybeSingle();

    if (
      villageResult.error ||
      !villageResult.data?.id
    ) {
      console.error(
        "Unable to load public Temple Fund village:",
        villageResult.error
      );
      return;
    }

    const villageId =
      villageResult.data.id;

    const [
      accountsResult,
      transactionsResult
    ] =
      await Promise.all([
        client
          .from("temple_fund_accounts")
          .select(
            "id,person_name,relation_details,residence,taken_date,principal_amount,monthly_interest_rate,status,notes,settlement_notes,interest_calculated_upto,settled_at,calculated_due_at_settlement,final_settlement_amount,interest_calculated_upto,settled_at,calculated_due_at_settlement,final_settlement_amount"
          )
          .eq(
            "village_id",
            villageId
          ),

        client
          .from("temple_fund_transactions")
          .select(
            "account_id,transaction_type,amount"
          )
          .eq(
            "village_id",
            villageId
          )
      ]);

    if (
      accountsResult.error ||
      transactionsResult.error
    ) {
      console.error(
        "Unable to load public Temple Fund:",
        accountsResult.error ||
        transactionsResult.error
      );
      return;
    }

    const transactions =
      transactionsResult.data || [];

    const rows =
      (accountsResult.data || [])
        .map((account) => {
          const accountTransactions =
            transactions.filter(
              (tx) =>
                tx.account_id ===
                account.id
            );

          const principalRepaid =
            accountTransactions
              .filter(
                (tx) =>
                  tx.transaction_type ===
                  "principal_repayment"
              )
              .reduce(
                (sum, tx) =>
                  sum +
                  publicTempleNumber(
                    tx.amount
                  ),
                0
              );

          const interestReceived =
            accountTransactions
              .filter(
                (tx) =>
                  tx.transaction_type ===
                  "interest_received"
              )
              .reduce(
                (sum, tx) =>
                  sum +
                  publicTempleNumber(
                    tx.amount
                  ),
                0
              );

          const finalSettlementReceived =
            accountTransactions
              .filter(
                (tx) =>
                  tx.transaction_type ===
                  "final_settlement"
              )
              .reduce(
                (sum, tx) =>
                  sum +
                  publicTempleNumber(
                    tx.amount
                  ),
                0
              );

          const principal =
            publicTempleNumber(
              account.principal_amount
            );

          const principalOutstanding =
            Math.max(
              principal -
              principalRepaid,
              0
            );

          const isFinalSettled =
            Boolean(
              account.settled_at
            ) ||
            account.status === "closed";

          const calculationDate =
            isFinalSettled
              ? account.interest_calculated_upto
              : publicTempleToday();

          const calculatedInterest =
            isFinalSettled &&
            account.calculated_due_at_settlement !== null
              ? Math.max(
                  0,
                  publicTempleNumber(
                    account.calculated_due_at_settlement
                  ) -
                  principalOutstanding
                )
              : publicTempleInterest(
                  principalOutstanding,
                  account.monthly_interest_rate,
                  account.taken_date,
                  calculationDate
                );

          const totalPaid =
            principalRepaid +
            interestReceived +
            finalSettlementReceived;

          return {
            ...account,
            principal,
            principalOutstanding,
            calculatedInterest,
            totalPaid,
            finalSettlementReceived,
            isFinalSettled,
            currentCalculatedTotal:
              isFinalSettled
                ? 0
                : principalOutstanding +
                  calculatedInterest
          };
        })
        .sort(
          (a, b) =>
            b.currentCalculatedTotal -
              a.currentCalculatedTotal ||
            b.principal -
              a.principal
        );

    publicTempleFundReportRows =
      rows.slice();

    const principalTotal =
      rows.reduce(
        (sum, row) =>
          sum + row.principal,
        0
      );

    const interestTotal =
      rows.reduce(
        (sum, row) =>
          sum +
          (
            row.isFinalSettled
              ? 0
              : row.calculatedInterest
          ),
        0
      );

    const outstandingTotal =
      rows.reduce(
        (sum, row) =>
          sum +
          (
            row.isFinalSettled
              ? 0
              : row.currentCalculatedTotal
          ),
        0
      );

    const additions =
      new Set([
        "opening_balance",
        "deposit",
        "principal_repayment",
        "interest_received",
        "final_settlement"
      ]);

    const deductions =
      new Set([
        "principal_given",
        "expense"
      ]);

    const available =
      transactions.reduce(
        (sum, tx) => {
          const amount =
            publicTempleNumber(
              tx.amount
            );

          if (
            additions.has(
              tx.transaction_type
            )
          ) {
            return sum + amount;
          }

          if (
            deductions.has(
              tx.transaction_type
            )
          ) {
            return sum - amount;
          }

          return sum;
        },
        0
      );

    const setPublicText =
      (id, value) => {
        const node =
          villagePublicElement(id);

        if (node) {
          node.textContent = value;
        }
      };

    setPublicText(
      "templeAvailable",
      publicTempleMoney(available)
    );

    setPublicText(
      "summaryTempleBalance",
      publicTempleMoney(available)
    );

    setPublicText(
      "templePrincipal",
      publicTempleMoney(principalTotal)
    );

    setPublicText(
      "templeInterest",
      publicTempleMoney(interestTotal)
    );

    setPublicText(
      "templeOutstanding",
      publicTempleMoney(outstandingTotal)
    );

    if (!rows.length) {
      body.innerHTML = `
        <tr>
          <td
            colspan="11"
            class="empty-state"
          >
            \u0C06\u0C32\u0C2F
            \u0C28\u0C3F\u0C27\u0C3F
            \u0C35\u0C3F\u0C35\u0C30\u0C3E\u0C32\u0C41
            \u0C32\u0C47\u0C35\u0C41.
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML =
      rows
        .map(
          (row, index) => `
            <tr>
              <td>${index + 1}</td>

              <td class="public-temple-name">
                <span class="public-temple-person-name">
                  ${escapeVillagePublicHtml(
                    row.person_name || "-"
                  )}
                </span>
                ${
                  row.relation_details
                    ? `<span class="public-temple-person-relation">${escapeVillagePublicHtml(
                        row.relation_details
                      )}</span>`
                    : ""
                }
              </td>

              <td>
                ${escapeVillagePublicHtml(
                  row.residence || "-"
                )}
              </td>

              <td>
                ${row.taken_date
                  ? formatVillagePublicDate(
                      row.taken_date
                    )
                  : "-"}
              </td>

              <td class="amount-cell">
                ${publicTempleMoney(
                  row.principal
                )}
              </td>

              <td>
                ${publicTempleNumber(
                  row.monthly_interest_rate
                ).toFixed(2)}%
              </td>

              <td class="public-temple-interest">
                ${
                  row.isFinalSettled
                    ? "-"
                    : publicTempleMoney(
                        row.calculatedInterest
                      )
                }
              </td>
              <td class="public-temple-outstanding">
                ${publicTempleMoney(
                  row.currentCalculatedTotal
                )}
              </td>

              <td class="public-temple-paid">
                ${publicTempleMoney(
                  row.isFinalSettled
                    ? (
                        row.finalSettlementReceived ||
                        row.final_settlement_amount ||
                        0
                      )
                    : row.totalPaid
                )}
              </td>

              <td>
                <span class="${
                  row.isFinalSettled
                    ? "public-temple-status public-temple-status-settled"
                    : "public-temple-status"
                }">
                  ${publicTempleStatus(row)}
                </span>
              </td>
              <td class="public-temple-comments">
                ${escapeVillagePublicHtml(
                  row.settlement_notes ||
                  row.notes ||
                  "-"
                )}
              </td>
              <td class="village-payment-action-cell">
                ${
                  !row.isFinalSettled &&
                  row.currentCalculatedTotal > 0
                    ? `
                      <button
                        type="button"
                        class="village-public-pay-button"
                        data-village-temple-pay
                        data-person="${escapeVillagePublicHtml(
                          row.person_name
                        )}"
                        data-principal="${row.principalOutstanding}"
                        data-interest="${row.calculatedInterest}"
                        data-outstanding="${row.currentCalculatedTotal}"
                      >
                        &#x0C1A;&#x0C46;&#x0C32;&#x0C4D;&#x0C32;&#x0C3F;&#x0C02;&#x0C1A;&#x0C02;&#x0C21;&#x0C3F;
                      </button>
                    `
                    : `
                      <span class="village-payment-complete">
                        &#x2713;
                      </span>
                    `
                }
              </td>
            </tr>
          `
        )
        .join("");
  }
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupPublicDonationTableScroll();
      setupVillagePublicPaymentRequests();

      bindPublicDonationReportActions();
  loadPublicVillageDonations()
        .catch((error) => {
          console.error(
            "Public village donation loading failed:",
            error
          );
        });

      bindTempleFundFreezePreference();
      bindTempleFundReportActions();
      loadPublicTempleFund()
        .then(() => {
          if (
            typeof window.refreshTempleHorizontalScroll ===
            "function"
          ) {
            window.refreshTempleHorizontalScroll();
          }
        })
        .catch((error) => {
          console.error(
            "Public Temple Fund loading failed:",
            error
          );
        });
    }
  );




  const VILLAGE_TRUST_WHATSAPP = "918123386813";

  const villagePublicPaymentState = {
    type: "",
    person: ""
  };

  function villagePaymentMoney(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function closeVillagePublicPaymentRequest() {
    const modal =
      document.getElementById("villagePaymentRequestModal");

    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("village-payment-open");
  }

  function openVillagePublicPaymentRequest(data) {
    const modal =
      document.getElementById("villagePaymentRequestModal");

    if (!modal) return;

    const isDonation = data.type === "donation";

    villagePublicPaymentState.type = data.type || "";
    villagePublicPaymentState.person = data.person || "";

    const title =
      document.getElementById("villagePaymentTitle");

    const eyebrow =
      document.getElementById("villagePaymentEyebrow");

    const intro =
      document.getElementById("villagePaymentIntro");

    const person =
      document.getElementById("villagePaymentPerson");

    const summary =
      document.getElementById("villagePaymentSummary");

    const amountLabel =
      document.getElementById("villagePaymentAmountLabel");

    const amountInput =
      document.getElementById("villagePaymentAmount");

    const proof =
      document.getElementById("villagePaymentProofText");

    if (title) {
      title.textContent =
        isDonation
          ? "\u0C35\u0C3F\u0C30\u0C3E\u0C33\u0C02 \u0C38\u0C2E\u0C30\u0C4D\u0C2A\u0C3F\u0C02\u0C1A\u0C02\u0C21\u0C3F"
          : "\u0C06\u0C32\u0C2F \u0C28\u0C3F\u0C27\u0C3F \u0C1A\u0C46\u0C32\u0C4D\u0C32\u0C3F\u0C02\u0C2A\u0C41";
    }

    if (eyebrow) {
      eyebrow.textContent =
        isDonation
          ? "\u0C36\u0C4D\u0C30\u0C40 \u0C15\u0C4B\u0C26\u0C02\u0C21 \u0C30\u0C3E\u0C2E\u0C38\u0C4D\u0C35\u0C3E\u0C2E\u0C3F \u0C06\u0C32\u0C2F \u0C28\u0C3F\u0C30\u0C4D\u0C2E\u0C3E\u0C23\u0C02"
          : "\u0C06\u0C32\u0C2F \u0C28\u0C3F\u0C27\u0C3F";
    }

    if (intro) {
      intro.textContent =
        isDonation
          ? "\u0C06\u0C32\u0C2F \u0C28\u0C3F\u0C30\u0C4D\u0C2E\u0C3E\u0C23 \u0C2E\u0C39\u0C24\u0C4D\u0C15\u0C3E\u0C30\u0C4D\u0C2F\u0C02\u0C32\u0C4B \u0C2D\u0C3E\u0C17\u0C38\u0C4D\u0C35\u0C3E\u0C2E\u0C41\u0C32\u0C35\u0C41\u0C24\u0C42 \u0C2E\u0C40 \u0C38\u0C39\u0C15\u0C3E\u0C30\u0C3E\u0C28\u0C4D\u0C28\u0C3F \u0C2D\u0C15\u0C4D\u0C24\u0C3F\u0C2A\u0C42\u0C30\u0C4D\u0C35\u0C15\u0C02\u0C17\u0C3E \u0C38\u0C2E\u0C30\u0C4D\u0C2A\u0C3F\u0C02\u0C1A\u0C35\u0C1A\u0C4D\u0C1A\u0C41."
          : "\u0C15\u0C4D\u0C30\u0C3F\u0C02\u0C26 \u0C09\u0C28\u0C4D\u0C28 \u0C05\u0C27\u0C3F\u0C15\u0C3E\u0C30\u0C3F\u0C15 \u0C1F\u0C4D\u0C30\u0C38\u0C4D\u0C1F\u0C4D QR \u0C15\u0C4B\u0C21\u0C4D\u0C28\u0C41 \u0C38\u0C4D\u0C15\u0C3E\u0C28\u0C4D \u0C1A\u0C47\u0C38\u0C3F \u0C1A\u0C46\u0C32\u0C4D\u0C32\u0C3F\u0C02\u0C1A\u0C35\u0C1A\u0C4D\u0C1A\u0C41.";
    }

    if (person) {
      person.textContent = data.person || "-";
    }

    if (summary) {
      summary.innerHTML =
        isDonation
          ? `
            <div>
              <span>\u0C39\u0C3E\u0C2E\u0C40 \u0C2E\u0C4A\u0C24\u0C4D\u0C24\u0C02</span>
              <strong>${villagePaymentMoney(data.committed)}</strong>
            </div>
            <div>
              <span>\u0C05\u0C02\u0C26\u0C3F\u0C28 \u0C2E\u0C4A\u0C24\u0C4D\u0C24\u0C02</span>
              <strong>${villagePaymentMoney(data.received)}</strong>
            </div>
            <div>
              <span>\u0C05\u0C02\u0C26\u0C35\u0C32\u0C38\u0C3F\u0C28\u0C26\u0C3F</span>
              <strong>${villagePaymentMoney(data.pending)}</strong>
            </div>
          `
          : `
            <div>
              <span>\u0C2E\u0C3F\u0C17\u0C3F\u0C32\u0C3F\u0C28 \u0C05\u0C38\u0C32\u0C41</span>
              <strong>${villagePaymentMoney(data.principal)}</strong>
            </div>
            <div>
              <span>\u0C32\u0C46\u0C15\u0C4D\u0C15\u0C3F\u0C02\u0C1A\u0C3F\u0C28 \u0C35\u0C21\u0C4D\u0C21\u0C40</span>
              <strong>${villagePaymentMoney(data.interest)}</strong>
            </div>
            <div>
              <span>\u0C2E\u0C4A\u0C24\u0C4D\u0C24\u0C02 \u0C2C\u0C3E\u0C15\u0C40</span>
              <strong>${villagePaymentMoney(data.outstanding)}</strong>
            </div>
          `;
    }

    if (amountLabel) {
      amountLabel.textContent =
        isDonation
          ? "\u0C35\u0C3F\u0C30\u0C3E\u0C33\u0C02 \u0C2E\u0C4A\u0C24\u0C4D\u0C24\u0C02"
          : "\u0C1A\u0C46\u0C32\u0C4D\u0C32\u0C3F\u0C02\u0C1A\u0C47 \u0C2E\u0C4A\u0C24\u0C4D\u0C24\u0C02";
    }

    if (amountInput) {
      const suggested =
        Number(
          isDonation
            ? data.pending
            : data.outstanding
        );

      amountInput.value =
        suggested > 0
          ? (
              isDonation
                ? suggested.toFixed(0)
                : suggested.toFixed(2)
            )
          : "";
    }

    if (proof) {
      proof.textContent =
        "\u0C26\u0C2F\u0C1A\u0C47\u0C38\u0C3F Payment Screenshot / Transaction Reference \u0C28\u0C41 WhatsApp \u0C26\u0C4D\u0C35\u0C3E\u0C30\u0C3E \u0C1F\u0C4D\u0C30\u0C38\u0C4D\u0C1F\u0C4D \u0C28\u0C3F\u0C30\u0C4D\u0C35\u0C3E\u0C39\u0C15\u0C41\u0C32\u0C15\u0C41 \u0C2A\u0C02\u0C2A\u0C02\u0C21\u0C3F.";
    }

    modal.hidden = false;
    document.body.classList.add("village-payment-open");

    if (amountInput) {
      amountInput.focus();
      amountInput.select();
    }
  }

  function openVillagePaymentWhatsApp() {
    const amountInput =
      document.getElementById("villagePaymentAmount");

    const amount =
      Number(amountInput?.value || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert(
        "\u0C26\u0C2F\u0C1A\u0C47\u0C38\u0C3F \u0C1A\u0C46\u0C32\u0C4D\u0C32\u0C3F\u0C02\u0C1A\u0C3F\u0C28 \u0C2E\u0C4A\u0C24\u0C4D\u0C24\u0C3E\u0C28\u0C4D\u0C28\u0C3F \u0C28\u0C2E\u0C4B\u0C26\u0C41 \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F."
      );
      return;
    }

    const isDonation =
      villagePublicPaymentState.type === "donation";

    const purpose =
      isDonation
        ? "\u0C36\u0C4D\u0C30\u0C40 \u0C15\u0C4B\u0C26\u0C02\u0C21 \u0C30\u0C3E\u0C2E\u0C38\u0C4D\u0C35\u0C3E\u0C2E\u0C3F \u0C06\u0C32\u0C2F \u0C28\u0C3F\u0C30\u0C4D\u0C2E\u0C3E\u0C23 \u0C35\u0C3F\u0C30\u0C3E\u0C33\u0C02"
        : "\u0C06\u0C32\u0C2F \u0C28\u0C3F\u0C27\u0C3F \u0C1A\u0C46\u0C32\u0C4D\u0C32\u0C3F\u0C02\u0C2A\u0C41";

    const message = [
      "\u0C28\u0C2E\u0C38\u0C4D\u0C15\u0C3E\u0C30\u0C02",
      "",
      purpose + " \u0C1A\u0C47\u0C36\u0C3E\u0C28\u0C41.",
      "",
      "\u0C2A\u0C47\u0C30\u0C41: " +
        villagePublicPaymentState.person,
      "\u0C1A\u0C46\u0C32\u0C4D\u0C32\u0C3F\u0C02\u0C1A\u0C3F\u0C28 \u0C2E\u0C4A\u0C24\u0C4D\u0C24\u0C02: " +
        villagePaymentMoney(amount),
      "",
      "Payment Screenshot / Transaction Reference \u0C35\u0C3F\u0C35\u0C30\u0C3E\u0C32\u0C41 \u0C2A\u0C02\u0C2A\u0C41\u0C24\u0C41\u0C28\u0C4D\u0C28\u0C3E\u0C28\u0C41.",
      "",
      "\u0C27\u0C28\u0C4D\u0C2F\u0C35\u0C3E\u0C26\u0C3E\u0C32\u0C41."
    ].join("\n");

    const url =
      "https://wa.me/" +
      VILLAGE_TRUST_WHATSAPP +
      "?text=" +
      encodeURIComponent(message);

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function setupVillagePublicPaymentRequests() {
    document.addEventListener("click", (event) => {
      const close =
        event.target.closest("[data-village-payment-close]");

      if (close) {
        closeVillagePublicPaymentRequest();
        return;
      }

      const donationButton =
        event.target.closest("[data-village-donation-pay]");

      if (donationButton) {
        openVillagePublicPaymentRequest({
          type: "donation",
          person: donationButton.dataset.person,
          committed: Number(donationButton.dataset.committed || 0),
          received: Number(donationButton.dataset.received || 0),
          pending: Number(donationButton.dataset.pending || 0)
        });
        return;
      }

      const templeButton =
        event.target.closest("[data-village-temple-pay]");

      if (templeButton) {
        openVillagePublicPaymentRequest({
          type: "temple",
          person: templeButton.dataset.person,
          principal: Number(templeButton.dataset.principal || 0),
          interest: Number(templeButton.dataset.interest || 0),
          outstanding: Number(templeButton.dataset.outstanding || 0)
        });
      }
    });

    document
      .querySelectorAll("[data-village-bank-copy]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            const value =
              button.dataset.villageBankCopy || "";

            const label =
              button.dataset.villageBankCopyLabel || "Value";

            const message =
              document.getElementById(
                "villagePaymentCopyMessage"
              );

            if (!value) return;

            try {
              await navigator.clipboard.writeText(value);

              if (message) {
                message.textContent =
                  label + " copied.";
              }
            } catch (error) {
              if (message) {
                message.textContent =
                  "Unable to copy. Please copy the value manually.";
              }
            }
          }
        );
      });
    const whatsapp =
      document.getElementById("villagePaymentWhatsApp");

    if (whatsapp) {
      whatsapp.addEventListener(
        "click",
        openVillagePaymentWhatsApp
      );
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeVillagePublicPaymentRequest();
      }
    });
  }

  function setupTempleHorizontalScrollSync(
    topSelector,
    bottomSelector,
    spacerSelector
  ) {
    const top = document.querySelector(topSelector);
    const bottom = document.querySelector(bottomSelector);
    const spacer = document.querySelector(spacerSelector);

    if (!top || !bottom || !spacer) {
      return;
    }

    const thumb = top.querySelector(
      ".temple-custom-scroll-thumb"
    );

    if (!thumb) {
      return;
    }

    let dragging = false;
    let dragStartX = 0;
    let dragStartLeft = 0;

    const geometry = () => {
      const trackPadding = 6;
      const trackWidth = Math.max(
        0,
        top.clientWidth - trackPadding
      );

      const visibleWidth = bottom.clientWidth;
      const contentWidth = bottom.scrollWidth;

      const ratio =
        contentWidth > 0
          ? Math.min(1, visibleWidth / contentWidth)
          : 1;

      const thumbWidth = Math.max(
        48,
        Math.round(trackWidth * ratio)
      );

      const maxThumbLeft = Math.max(
        0,
        trackWidth - thumbWidth
      );

      const maxTableScroll = Math.max(
        0,
        contentWidth - visibleWidth
      );

      return {
        trackWidth,
        thumbWidth,
        maxThumbLeft,
        maxTableScroll
      };
    };

    const renderThumb = () => {
      const g = geometry();

      thumb.style.width = `${g.thumbWidth}px`;

      const ratio =
        g.maxTableScroll > 0
          ? bottom.scrollLeft / g.maxTableScroll
          : 0;

      const left =
        3 + Math.round(
          Math.max(
            0,
            Math.min(1, ratio)
          ) * g.maxThumbLeft
        );

      thumb.style.left = `${left}px`;

      const ariaValue =
        g.maxTableScroll > 0
          ? Math.round(
              (bottom.scrollLeft / g.maxTableScroll) * 100
            )
          : 0;

      thumb.setAttribute(
        "aria-valuenow",
        String(
          Math.max(
            0,
            Math.min(100, ariaValue)
          )
        )
      );
    };

    const scrollTableFromThumbLeft = (thumbLeft) => {
      const g = geometry();

      const boundedLeft = Math.max(
        0,
        Math.min(
          g.maxThumbLeft,
          thumbLeft
        )
      );

      const ratio =
        g.maxThumbLeft > 0
          ? boundedLeft / g.maxThumbLeft
          : 0;

      bottom.scrollLeft =
        ratio * g.maxTableScroll;

      renderThumb();
    };

    const beginDrag = (event) => {
      dragging = true;
      dragStartX = event.clientX;

      const g = geometry();
      const currentRatio =
        g.maxTableScroll > 0
          ? bottom.scrollLeft / g.maxTableScroll
          : 0;

      dragStartLeft =
        currentRatio * g.maxThumbLeft;

      thumb.classList.add("is-dragging");

      if (thumb.setPointerCapture) {
        try {
          thumb.setPointerCapture(event.pointerId);
        } catch (_) {
          // Safe fallback for browsers without capture support.
        }
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const moveDrag = (event) => {
      if (!dragging) {
        return;
      }

      const deltaX =
        event.clientX - dragStartX;

      scrollTableFromThumbLeft(
        dragStartLeft + deltaX
      );

      event.preventDefault();
    };

    const endDrag = (event) => {
      if (!dragging) {
        return;
      }

      dragging = false;
      thumb.classList.remove("is-dragging");

      if (
        thumb.releasePointerCapture &&
        thumb.hasPointerCapture &&
        thumb.hasPointerCapture(event.pointerId)
      ) {
        try {
          thumb.releasePointerCapture(
            event.pointerId
          );
        } catch (_) {
          // Safe fallback.
        }
      }
    };

    thumb.addEventListener(
      "pointerdown",
      beginDrag
    );

    thumb.addEventListener(
      "pointermove",
      moveDrag
    );

    thumb.addEventListener(
      "pointerup",
      endDrag
    );

    thumb.addEventListener(
      "pointercancel",
      endDrag
    );

    top.addEventListener("pointerdown", (event) => {
      if (event.target === thumb) {
        return;
      }

      const rect =
        top.getBoundingClientRect();

      const g = geometry();

      const clickX =
        event.clientX -
        rect.left -
        3;

      scrollTableFromThumbLeft(
        clickX - g.thumbWidth / 2
      );
    });

    thumb.addEventListener("keydown", (event) => {
      const g = geometry();

      if (g.maxTableScroll <= 0) {
        return;
      }

      const step = Math.max(
        60,
        bottom.clientWidth * 0.15
      );

      if (event.key === "ArrowLeft") {
        bottom.scrollLeft -= step;
        event.preventDefault();
      } else if (event.key === "ArrowRight") {
        bottom.scrollLeft += step;
        event.preventDefault();
      } else if (event.key === "Home") {
        bottom.scrollLeft = 0;
        event.preventDefault();
      } else if (event.key === "End") {
        bottom.scrollLeft =
          g.maxTableScroll;
        event.preventDefault();
      }

      renderThumb();
    });

    bottom.addEventListener(
      "scroll",
      renderThumb,
      { passive: true }
    );

    window.addEventListener(
      "resize",
      renderThumb
    );

    window.refreshTempleHorizontalScroll = () => {
      renderThumb();

      requestAnimationFrame(() => {
        renderThumb();
        requestAnimationFrame(renderThumb);
      });
    };

    renderThumb();
  }

  setupTempleHorizontalScrollSync(
    ".temple-top-scroll",
    ".public-temple-table-scroll",
    ".temple-top-scroll-spacer"
  );
})();
