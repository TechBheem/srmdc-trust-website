(() => {
  "use strict";

  const MODULE = "SRMDC_OFFLINE_RECEIPTS_PHASE3B2";

  const state = {
    rows: [],
    printRows: [],
    loadedVillageId: null,

    // PHASE3D1_19D3B_WORKING_BOOK_STATE
    // Existing receipt book selected in the browser.
    workingBookId: null,

    // PHASE3D1_17D2B_CONFIRM_EXPORTED_UI
    // Client-side pending context only.
    pendingOriginalExport: null,

    // PHASE3D1_17E3A_REPRINT_STATE
    // Preview-only client context. No DB write occurs here.
    pendingReprint: null
  };

  function el(id) {
    return document.getElementById(id);
  }

  function client() {
    return window.srmdcSupabase || null;
  }

  function currentVillage() {
    return (
      window.SRMDCVillageAdmin &&
      typeof window.SRMDCVillageAdmin.getCurrentVillage === "function"
        ? window.SRMDCVillageAdmin.getCurrentVillage()
        : null
    );
  }

  function safe(value) {
    return value == null ? "" : String(value);
  }

  function money(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return "-";
    }

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  function date(value) {
    if (!value) return "-";

    const parts = String(value).slice(0, 10).split("-");

    if (parts.length !== 3) {
      return safe(value);
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function text(id, value) {
    const node = el(id);
    if (node) node.textContent = value;
  }

  function setStatus(message) {
    text("offlineReceiptStatus", message || "");
  }

  function statusValue(row) {
    return safe(row.status).trim().toUpperCase();
  }

  function renderSummary(rows) {
    const counts = {
      RESERVED: 0,
      ISSUED: 0,
      VOID: 0
    };

    rows.forEach((row) => {
      const key = statusValue(row);

      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] += 1;
      }
    });

    text("offlineReceiptTotal", String(rows.length));
    text("offlineReceiptReserved", String(counts.RESERVED));
    text("offlineReceiptIssued", String(counts.ISSUED));
    text("offlineReceiptVoid", String(counts.VOID));
  }

  // ==========================================================
  // PHASE3D1_19D3B_WORKING_BOOK_HELPERS
  // Only books represented by actual receipt rows are selectable.
  // Preview-only future books never appear here.
  // ==========================================================

  function receiptBookKey(row) {
    return safe(row?.book_id).trim();
  }

  function existingReceiptBooks() {
    const books = new Map();

    state.rows.forEach((row) => {
      const bookId = receiptBookKey(row);
      const serial = Number(row.serial_number);

      if (!bookId) return;

      if (!books.has(bookId)) {
        books.set(bookId, {
          bookId,
          bookNumber: safe(
            row.book_number ||
            row.receipt_book_number ||
            ""
          ).trim(),
          minSerial: Number.isInteger(serial) ? serial : null,
          maxSerial: Number.isInteger(serial) ? serial : null
        });
        return;
      }

      if (Number.isInteger(serial)) {
        const book = books.get(bookId);
        book.minSerial =
          book.minSerial == null
            ? serial
            : Math.min(book.minSerial, serial);
        book.maxSerial =
          book.maxSerial == null
            ? serial
            : Math.max(book.maxSerial, serial);
      }
    });

    return [...books.values()].sort((a, b) => {
      const aSerial =
        Number.isInteger(a.minSerial)
          ? a.minSerial
          : Number.MAX_SAFE_INTEGER;
      const bSerial =
        Number.isInteger(b.minSerial)
          ? b.minSerial
          : Number.MAX_SAFE_INTEGER;
      return aSerial - bSerial;
    });
  }

  function workingRows() {
    const books = existingReceiptBooks();

    if (!state.rows.length) return [];
    if (!books.length) return [...state.rows];

    if (
      !books.some(
        (book) => book.bookId === state.workingBookId
      )
    ) {
      state.workingBookId = books[0].bookId;
    }

    return state.rows.filter(
      (row) => receiptBookKey(row) === state.workingBookId
    );
  }

  function renderWorkingBookSelector() {
    const selector = el("offlineReceiptWorkingBook");
    if (!selector) return;

    const books = existingReceiptBooks();

    if (!books.length) {
      state.workingBookId = null;
      selector.innerHTML =
        '<option value="">No receipt book loaded</option>';
      selector.disabled = true;
      return;
    }

    if (
      !books.some(
        (book) => book.bookId === state.workingBookId
      )
    ) {
      state.workingBookId = books[0].bookId;
    }

    selector.innerHTML = books
      .map((book) => {
        const number =
          safe(book.bookNumber).padStart(3, "0");
        const range =
          Number.isInteger(book.minSerial) &&
          Number.isInteger(book.maxSerial)
            ? ` - Serials ${book.minSerial}-${book.maxSerial}`
            : "";

        return (
          `<option value="${book.bookId}">` +
          `Book ${number}${range}` +
          "</option>"
        );
      })
      .join("");

    selector.value = state.workingBookId;
    selector.disabled = books.length < 2;
  }

  function refreshWorkingBookView() {
    const rows = workingRows();

    inferBook(rows);
    renderSummary(rows);
    renderPrintSummary(rows);
    renderTable();
    refreshOriginalRangeControls();

    const serials = rows
      .map((row) => Number(row.serial_number))
      .filter((serial) => Number.isInteger(serial));

    if (serials.length) {
      const minSerial = Math.min(...serials);
      const maxSerial = Math.max(...serials);
      const reprintFrom = el("offlineReceiptReprintFrom");
      const reprintTo = el("offlineReceiptReprintTo");

      if (reprintFrom) {
        reprintFrom.min = String(minSerial);
        reprintFrom.max = String(maxSerial);
        reprintFrom.value = String(minSerial);
      }

      if (reprintTo) {
        reprintTo.min = String(minSerial);
        reprintTo.max = String(maxSerial);
        reprintTo.value = String(minSerial);
      }
    }

    clearPendingOriginalExport();
    clearPendingReprint();
  }

  function installWorkingBookSelector() {
    const selector = el("offlineReceiptWorkingBook");
    if (!selector) return;

    selector.addEventListener("change", () => {
      state.workingBookId =
        safe(selector.value).trim() || null;

      refreshWorkingBookView();

      const rows = workingRows();
      const first = rows[0];
      const number = safe(
        first?.book_number ||
        first?.receipt_book_number ||
        ""
      ).padStart(3, "0");

      setStatus(
        rows.length
          ? `Working receipt book changed to Book ${number}. ${rows.length} receipt numbers loaded for this book.`
          : "No receipt rows found for the selected working book."
      );
    });
  }

  function filteredRows() {
    const query =
      safe(el("offlineReceiptSearch")?.value)
        .trim()
        .toLowerCase();

    const status =
      safe(el("offlineReceiptStatusFilter")?.value)
        .trim()
        .toUpperCase();

    return workingRows().filter((row) => {
      if (status && statusValue(row) !== status) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        row.receipt_number,
        row.honorific,
        row.donor_name,
        row.mobile_number,
        row.pan_number,
        row.received_by_name,
        row.payment_mode
      ]
        .map(safe)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  function renderTable() {
    const body = el("offlineReceiptTableBody");

    if (!body) return;

    const rows = filteredRows();

    if (!rows.length) {
      body.innerHTML = `
        <tr>
          <td colspan="10">
            No matching offline receipts found.
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML = rows
      .map((row) => {
        const sequence =
          row.serial_number ??
          row.receipt_sequence ??
          "-";

        const donor =
          [
            safe(row.donor_title),
            safe(row.donor_name)
          ]
            .filter(Boolean)
            .join(" ") || "-";

        const verification =
          row.verification_id
            ? "Available"
            : "-";

        // PHASE3D1_17C1_SERIAL_PRINT_STATUS
        const physicalPrint = printInfo(row);

        const printStatusLabel =
          physicalPrint.state === "NOT_PRINTED"
            ? "NOT PRINTED"
            : physicalPrint.state;

        return `
          <tr>
            <td>${sequence}</td>

            <td>
              <strong>${safe(row.receipt_number)}</strong>
            </td>

            <td>
              <span
                class="offline-receipt-status-badge"
                data-status="${physicalPrint.state}"
                title="${
                  physicalPrint.count > 0
                    ? `Print count: ${physicalPrint.count}`
                    : "Not yet exported"
                }"
              >
                ${printStatusLabel}
              </span>
            </td>

            <td>
              <span
                class="offline-receipt-status-badge"
                data-status="${statusValue(row)}"
              >
                ${statusValue(row) || "-"}
              </span>
            </td>

            <td>${donor}</td>

            <td>${date(row.receipt_date)}</td>

            <td>
              ${row.amount == null ? "-" : money(row.amount)}
            </td>

            <td>${safe(row.payment_mode) || "-"}</td>

            <td>${safe(row.received_by_name) || "-"}</td>

            <td>${verification}</td>
          </tr>
        `;
      })
      .join("");
  }

  function inferBook(rows) {
    const first = rows[0];

    if (!first) {
      text("offlineReceiptBookLabel", "No reserved book found");
      text("offlineReceiptFinancialYear", "-");
      return;
    }

    text(
      "offlineReceiptBookLabel",
      safe(
        first.book_number ||
        first.receipt_book_number ||
        "Book 001"
      )
    );

    text(
      "offlineReceiptFinancialYear",
      safe(
        first.financial_year ||
        first.fiscal_year ||
        "2026-27"
      )
    );
  }


  // PHASE3D1_17C_PRINT_TRACKING_UI
  // Read-only physical receipt print/export tracking.
  // RESERVED / ISSUED / VOID lifecycle remains independent.

  async function loadPrintRegister(db, villageId) {
    const result = await db
      .from("offline_receipt_print_register")
      .select("*")
      .eq("village_id", villageId)
      .order("serial_number", { ascending: true });

    if (result.error) {
      console.error(
        `${MODULE}: print register load failed`,
        result.error
      );

      state.printRows = [];
      return;
    }

    state.printRows = result.data || [];
  }

  function printInfo(row) {
    const receiptId = safe(row.id);

    const item = state.printRows.find(
      (printRow) =>
        safe(printRow.offline_receipt_id) === receiptId
    );

    if (!item) {
      return {
        state: "NOT_PRINTED",
        count: 0,
        lastPrintedAt: ""
      };
    }

    return {
      state: safe(item.print_state || "NOT_PRINTED")
        .trim()
        .toUpperCase(),

      count: Number(item.print_count || 0),

      lastPrintedAt:
        safe(item.last_printed_at)
    };
  }

  function renderPrintSummary(rows) {
    let printed = 0;
    let reprinted = 0;

    rows.forEach((row) => {
      const info = printInfo(row);

      if (
        info.state === "PRINTED" ||
        info.state === "REPRINTED"
      ) {
        printed += 1;
      }

      if (info.state === "REPRINTED") {
        reprinted += 1;
      }
    });

    const notPrinted =
      Math.max(0, rows.length - printed);

    text(
      "offlineReceiptPrinted",
      String(printed)
    );

    text(
      "offlineReceiptNotPrinted",
      String(notPrinted)
    );

    text(
      "offlineReceiptReprinted",
      String(reprinted)
    );
  }
  async function load() {
    const db = client();
    const village = currentVillage();

    if (!db || !village?.id) {
      return;
    }

    setStatus("Loading reserved receipt register...");

    /*
      READ ONLY.

      This module deliberately performs SELECT only.
      No receipt is issued, verified, voided or posted
      to an accounting ledger in Phase 3B2.
    */

    const result = await db
      .from("offline_receipt_register")
      .select("*")
      .eq("village_id", village.id)
      .order("serial_number", { ascending: true });

    if (result.error) {
      console.error(
        `${MODULE}: receipt register load failed`,
        result.error
      );

      state.rows = [];

      
      state.printRows = [];

      renderSummary([]);
      renderPrintSummary([]);
      renderTable();

      setStatus(
        "Unable to load offline receipt register: " +
        result.error.message
      );

      return;
    }

    state.rows = result.data || [];
    state.loadedVillageId = village.id;

    
    await loadPrintRegister(
      db,
      village.id
    );

    // PHASE3D1_19D3B_WORKING_BOOK_LOAD
    const books = existingReceiptBooks();

    if (
      !books.some(
        (book) => book.bookId === state.workingBookId
      )
    ) {
      state.workingBookId = books[0]?.bookId || null;
    }

    renderWorkingBookSelector();
    refreshWorkingBookView();

    setStatus(
      `${state.rows.length} offline receipt numbers loaded. ` +
      "Register is read-only in Phase 3B2."
    );
  }

  function installFilters() {
    el("offlineReceiptSearch")
      ?.addEventListener("input", renderTable);

    el("offlineReceiptStatusFilter")
      ?.addEventListener("change", renderTable);
  }

  function watchVillageSelection() {
    const selector =
      document.getElementById("villageAdminSelector");

    selector?.addEventListener("change", () => {
      setTimeout(load, 0);
    });
  }

  function watchReceiptTab() {
    document
      .querySelector('[data-village-tab="receipts"]')
      ?.addEventListener("click", () => {
        setTimeout(load, 0);
      });
  }

  // ==========================================================
  // PHASE3D1_19D2_NEXT_BOOK_PREVIEW_JS
  // Authenticated READ-ONLY preview.
  // No receipt book is created here.
  // ==========================================================

  function clearNextBookPreview() {
    const panel =
      el("offlineReceiptNextBookPreview");

    if (panel) {
      panel.hidden = true;

    // PHASE3D1_19D3A_HIDE_CREATE_ON_CLEAR
    hideNextBookCreateAction();
    }

    [
      "offlineReceiptNextBookNumber",
      "offlineReceiptNextBookFinancialYear",
      "offlineReceiptNextBookSerialRange",
      "offlineReceiptNextBookQuantity"
    ].forEach((id) => {
      const target = el(id);

      if (target) {
        target.textContent = "-";
      }
    });
  }

  async function previewNextReceiptBook() {
    const db = client();

    if (!db) {
      alert("Supabase client is unavailable.");
      return;
    }

    const village =
      currentVillage();

    if (
      !village ||
      !village.id ||
      !state.loadedVillageId ||
      safe(village.id) !==
        safe(state.loadedVillageId)
    ) {
      alert(
        "Receipt register is not ready for the selected village."
      );
      return;
    }

    const rows =
      Array.isArray(state.rows)
        ? state.rows
        : [];

    if (!rows.length) {
      alert(
        "Load the current receipt book before previewing the next book."
      );
      return;
    }

    const financialYear =
      safe(
        rows[0]?.financial_year ||
        "2026-27"
      ).trim();

    if (!financialYear) {
      alert(
        "Current receipt book financial year is unavailable."
      );
      return;
    }

    const button =
      el(
        "offlineReceiptPreviewNextBookButton"
      );

    clearNextBookPreview();

    if (button) {
      button.disabled = true;
      button.textContent = "Checking...";
    }

    try {
      const result =
        await db.rpc(
          "preview_next_offline_receipt_book",
          {
            p_village_id:
              state.loadedVillageId,

            p_financial_year:
              financialYear
          }
        );

      if (result.error) {
        throw result.error;
      }

      const data =
        result.data;

      if (
        !Array.isArray(data) ||
        data.length !== 1
      ) {
        throw new Error(
          "Expected exactly one next-book preview row."
        );
      }

      const preview =
        data[0];

      const bookNumber =
        Number(preview.book_number);

      const startSerial =
        Number(preview.start_serial);

      const endSerial =
        Number(preview.end_serial);

      const quantity =
        Number(preview.quantity);

      const returnedFinancialYear =
        safe(
          preview.financial_year
        ).trim();

      if (
        !Number.isInteger(bookNumber) ||
        !Number.isInteger(startSerial) ||
        !Number.isInteger(endSerial) ||
        !Number.isInteger(quantity) ||
        bookNumber < 1 ||
        startSerial < 1 ||
        endSerial < startSerial ||
        quantity !==
          endSerial - startSerial + 1 ||
        returnedFinancialYear !==
          financialYear
      ) {
        throw new Error(
          "Server returned an invalid next-book preview."
        );
      }

      const bookElement =
        el(
          "offlineReceiptNextBookNumber"
        );

      const fyElement =
        el(
          "offlineReceiptNextBookFinancialYear"
        );

      const rangeElement =
        el(
          "offlineReceiptNextBookSerialRange"
        );

      const quantityElement =
        el(
          "offlineReceiptNextBookQuantity"
        );

      const panel =
        el(
          "offlineReceiptNextBookPreview"
        );

      if (bookElement) {
        bookElement.textContent =
          String(bookNumber).padStart(
            3,
            "0"
          );
      }

      if (fyElement) {
        fyElement.textContent =
          returnedFinancialYear;
      }

      if (rangeElement) {
        rangeElement.textContent =
          `${startSerial}-${endSerial}`;
      }

      if (quantityElement) {
        quantityElement.textContent =
          String(quantity);
      }

      if (panel) {
        panel.hidden = false;

      // PHASE3D1_19D3A_SHOW_CREATE_AFTER_PREVIEW
      showNextBookCreateAction();
      }

      console.info(
        `${MODULE}: next receipt book preview`,
        preview
      );
    } catch (error) {
      console.error(
        `${MODULE}: next receipt book preview failed`,
        error
      );

      clearNextBookPreview();

      alert(
        "Unable to preview the next receipt book: " +
        safe(
          error?.message ||
          error
        )
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent =
          "Preview Next Book";
      }
    }
  }

  function installNextBookPreview() {
    const button =
      el(
        "offlineReceiptPreviewNextBookButton"
      );

    if (!button) {
      return;
    }

    button.addEventListener(
      "click",
      previewNextReceiptBook
    );
  }
  // ==========================================================
  // PHASE3D1_19D3A_CONTROLLED_CREATE_JS
  // PHASE3D1_19D3C_ARMED_CREATE_RPC
  //
  // Creation remains protected by the frozen two-confirmation
  // flow and the server-side village-admin authorization.
  // ==========================================================

  function hideNextBookCreateAction() {
    const actions =
      el("offlineReceiptNextBookCreateActions");

    if (actions) {
      actions.hidden = true;
    }
  }

  function showNextBookCreateAction() {
    const actions =
      el("offlineReceiptNextBookCreateActions");

    if (actions) {
      actions.hidden = false;
    }
  }

  function nextBookPreviewSnapshot() {
    const book =
      safe(
        el("offlineReceiptNextBookNumber")
          ?.textContent
      ).trim();

    const financialYear =
      safe(
        el("offlineReceiptNextBookFinancialYear")
          ?.textContent
      ).trim();

    const serialRange =
      safe(
        el("offlineReceiptNextBookSerialRange")
          ?.textContent
      ).trim();

    const quantity =
      safe(
        el("offlineReceiptNextBookQuantity")
          ?.textContent
      ).trim();

    if (
      !book ||
      book === "-" ||
      !financialYear ||
      financialYear === "-" ||
      !serialRange ||
      serialRange === "-" ||
      !quantity ||
      quantity === "-"
    ) {
      return null;
    }

    return {
      book,
      financialYear,
      serialRange,
      quantity
    };
  }

  async function requestCreateNextReceiptBook() {
    const preview =
      nextBookPreviewSnapshot();

    if (!preview) {
      alert(
        "Preview the next receipt book before requesting creation."
      );
      return;
    }

    const firstConfirmation =
      confirm(
        "Create Receipt Book " +
        preview.book +
        "?\n\n" +
        "Financial Year: " +
        preview.financialYear +
        "\n" +
        "Serial Range: " +
        preview.serialRange +
        "\n" +
        "Quantity: " +
        preview.quantity +
        "\n\n" +
        "This action will permanently reserve " +
        preview.quantity +
        " new receipt numbers.\n\n" +
        "Continue to final confirmation?"
      );

    if (!firstConfirmation) {
      return;
    }

    const finalConfirmation =
      confirm(
        "FINAL CONFIRMATION\n\n" +
        "Receipt Book: " +
        preview.book +
        "\n" +
        "Financial Year: " +
        preview.financialYear +
        "\n" +
        "Serial Range: " +
        preview.serialRange +
        "\n" +
        "Quantity: " +
        preview.quantity +
        "\n\n" +
        "Book numbers and receipt numbers must never be " +
        "renumbered or reused after creation.\n\n" +
        "Confirm Create Receipt Book " +
        preview.book +
        "?"
      );

    if (!finalConfirmation) {
      return;
    }

    // PHASE3D1_19D3C_CREATE_RPC_CALL
    const db = client();

    if (!db) {
      alert("Supabase client is unavailable.");
      return;
    }

    const village = currentVillage();

    if (
      !village ||
      !village.id ||
      !state.loadedVillageId ||
      safe(village.id) !== safe(state.loadedVillageId)
    ) {
      alert(
        "Receipt register is not ready for the selected village."
      );
      return;
    }

    const button =
      el("offlineReceiptCreateNextBookButton");

    if (button) {
      button.disabled = true;
      button.textContent = "Creating...";
    }

    try {
      const result =
        await db.rpc(
          "create_next_offline_receipt_book",
          {
            p_village_id:
              state.loadedVillageId,

            p_financial_year:
              preview.financialYear,

            p_description:
              "Created from SRMDC Trust Administration"
          }
        );

      if (result.error) {
        throw result.error;
      }

      const data = result.data;

      if (
        !Array.isArray(data) ||
        data.length !== 1
      ) {
        throw new Error(
          "Expected exactly one created receipt-book row."
        );
      }

      const created = data[0];

      const createdBook =
        Number(created.book_number);

      const createdStart =
        Number(created.start_serial);

      const createdEnd =
        Number(created.end_serial);

      const createdQuantity =
        Number(created.quantity);

      const previewBook =
        Number(preview.book);

      const previewRange =
        safe(preview.serialRange)
          .split("-")
          .map((value) => Number(value.trim()));

      const previewStart =
        previewRange[0];

      const previewEnd =
        previewRange[1];

      const previewQuantity =
        Number(preview.quantity);

      if (
        !Number.isInteger(createdBook) ||
        !Number.isInteger(createdStart) ||
        !Number.isInteger(createdEnd) ||
        !Number.isInteger(createdQuantity) ||
        createdBook !== previewBook ||
        createdStart !== previewStart ||
        createdEnd !== previewEnd ||
        createdQuantity !== previewQuantity ||
        safe(created.financial_year) !==
          safe(preview.financialYear)
      ) {
        throw new Error(
          "Created receipt book does not match the confirmed preview."
        );
      }

      // Select the newly created book after the authoritative
      // register reload. load() will retain this ID because the
      // new receipt rows now actually exist.
      state.workingBookId =
        safe(created.book_id).trim() || null;

      clearNextBookPreview();

      await load();

      alert(
        "Receipt Book " +
        String(createdBook).padStart(3, "0") +
        " created successfully.\n\n" +
        "Financial Year: " +
        safe(created.financial_year) +
        "\n" +
        "Serial Range: " +
        createdStart +
        "-" +
        createdEnd +
        "\n" +
        "Quantity: " +
        createdQuantity +
        "\n\n" +
        "The new book is now the Working Receipt Book."
      );
    } catch (error) {
      console.error(
        `${MODULE}: create next receipt book failed`,
        error
      );

      alert(
        "Unable to create the next receipt book: " +
        safe(
          error?.message ||
          error
        )
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent =
          "Create Next Receipt Book";
      }
    }
  }

  function installControlledCreateNextBook() {
    const button =
      el("offlineReceiptCreateNextBookButton");

    if (!button) {
      return;
    }

    button.addEventListener(
      "click",
      requestCreateNextReceiptBook
    );
  }

  function init() {
    installFilters();

    // PHASE3D1_19D3B_WORKING_BOOK_INSTALL
    installWorkingBookSelector();
    watchVillageSelection();
    watchReceiptTab();

    // PHASE3D1_19D2_NEXT_BOOK_PREVIEW_INSTALL
    installNextBookPreview();

    // PHASE3D1_19D3A_CONTROLLED_CREATE_INSTALL
    installControlledCreateNextBook();

    window.SRMDCOfflineReceipts = Object.freeze({
      refresh: load,
      getRows: () => [...state.rows]
    });

    console.info(
      `${MODULE}: read-only receipt register installed`
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

  // ==========================================================
  // PHASE3B3B_PREVIEW_ONLY
  // No INSERT / UPDATE / DELETE / RPC.
  // ==========================================================

  const previewState = {
    receipt: null,
    form: null
  };

  function showEntryMessage(message) {
    const node = el("offlineReceiptFormMessage");

    if (!node) return;

    node.textContent = message || "";
    node.hidden = !message;
  }

  function openOfflineReceiptEntry() {
    const modal = el("offlineReceiptEntryModal");
    const select = el("offlineReceiptNumber");

    if (!modal || !select) return;

    const reserved = state.rows.filter(
      (row) => statusValue(row) === "RESERVED"
    );

    select.innerHTML =
      '<option value="">Select reserved receipt</option>' +
      reserved
        .map(
          (row) =>
            `<option value="${safe(row.id)}">` +
            `${safe(row.receipt_number)}` +
            `</option>`
        )
        .join("");

    const form = el("offlineReceiptEntryForm");

    form?.reset();

    showEntryMessage("");

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeOfflineReceiptEntry() {
    const modal = el("offlineReceiptEntryModal");

    if (modal) {
      modal.hidden = true;
    }

    showEntryMessage("");

    if (el("offlineReceiptPreviewModal")?.hidden !== false) {
      document.body.style.overflow = "";
    }
  }

  function closeOfflineReceiptPreview() {
    const modal = el("offlineReceiptPreviewModal");

    if (modal) {
      modal.hidden = true;
    }

    document.body.style.overflow = "";
  }

  function field(id) {
    return safe(el(id)?.value).trim();
  }

  function collectPreviewForm() {
    const receiptId = field("offlineReceiptNumber");

    const receipt = state.rows.find(
      (row) => safe(row.id) === receiptId
    );

    if (!receipt) {
      throw new Error(
        "Please select a RESERVED receipt number."
      );
    }

    if (statusValue(receipt) !== "RESERVED") {
      throw new Error(
        "Selected receipt is no longer RESERVED."
      );
    }

    const donorName =
      field("offlineReceiptDonorName");

    const receiptDate =
      field("offlineReceiptDate");

    const fundType =
      field("offlineReceiptFundType");

    const purpose =
      field("offlineReceiptPurpose");

    const amount =
      Number(field("offlineReceiptAmount"));

    const receivedBy =
      field("offlineReceiptReceivedBy");

    if (!donorName) {
      throw new Error("Donor Name is required.");
    }

    if (!receiptDate) {
      throw new Error("Receipt Date is required.");
    }

    if (!fundType) {
      throw new Error("Fund is required.");
    }

    if (!purpose) {
      throw new Error("Purpose is required.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(
        "Amount must be greater than zero."
      );
    }

    if (!receivedBy) {
      throw new Error(
        "Received By - Name is required."
      );
    }

    return {
      receipt,
      honorific:
        field("offlineReceiptHonorific"),

      donorName,

      pan:
        field("offlineReceiptPan").toUpperCase(),

      address:
        field("offlineReceiptAddress"),

      mobile:
        field("offlineReceiptMobile"),

      receiptDate,

      paymentMode:
        field("offlineReceiptPaymentMode"),

      fundType,
      purpose,
      amount,

      amountWords:
        field("offlineReceiptAmountWords"),

      reference:
        field("offlineReceiptReference"),

      remarks:
        field("offlineReceiptRemarks"),

      receivedBy,

      signatory:
        field("offlineReceiptSignatory")
    };
  }

  function previewValue(value) {
    const text = safe(value);

    return text || "-";
  }

  function previewField(
    label,
    value,
    full = false
  ) {
    return `
      <div class="
        offline-receipt-preview-field
        ${full ? "offline-receipt-preview-full" : ""}
      ">
        <span>${label}</span>
        <strong>${previewValue(value)}</strong>
      </div>
    `;
  }

  // ==========================================================
  // PHASE3B3B1_LIVE_RECEIPT_BRIDGE
  //
  // Reuses the frozen SRMDC V2.1 official receipt renderer.
  // PREVIEW ONLY.
  // No RPC / INSERT / UPDATE / DELETE.
  // ==========================================================

  function buildOfflineVerificationUrl(receipt) {

    const receiptNumber =
      safe(receipt?.receipt_number).trim();

    const verificationId =
      safe(receipt?.verification_id).trim();

    return (
      "https://srmdctrust.org/" +
      "?receipt=" +
      encodeURIComponent(receiptNumber) +
      "&id=" +
      encodeURIComponent(verificationId) +
      "#verify"
    );
  }


  function offlineReceiptSubmission(data) {

    const donor =
      [
        data.honorific,
        data.donorName
      ]
        .map((value) => safe(value).trim())
        .filter(Boolean)
        .join(" ");

    return {

      donor_name:
        donor,

      mobile:
        data.mobile,

      pan_number:
        data.pan,

      address:
        data.address,

      fund_name:
        data.fundType,

      // PHASE3B3B2A_LIVE_MAPPING

      donation_purpose:
        data.purpose,

      // Frozen V2.1 renderer reads payment_mode.
      payment_mode:
        data.paymentMode,

      // Frozen V2.1 renderer reads declared_amount
      // when result.amount is not present.
      declared_amount:
        Number(data.amount),

      // Retain offline-specific values for the
      // additional-details block in the next phase.
      amount:
        Number(data.amount),

      amount_in_words:
        data.amountWords,

      reference_number:
        data.reference,

      remarks:
        data.remarks,

      received_by_name:
        data.receivedBy,

      authorized_signatory_name:
        data.signatory,

      offline_receipt:
        true,

      offline_book_number:
        data.receipt.book_number || 1,

      offline_serial_number:
        data.receipt.serial_number
    };
  }


  function showOfflineReceiptPreview(data) {

    // PHASE3B3B2B_FORCE_V21_PREVIEW
    //
    // The original Phase 3B3B internal preview modal remains
    // in the HTML only as a rollback safety net.
    // It must never be shown during the V2.1 preview flow.
    const legacyPreview =
      el("offlineReceiptPreviewModal");

    if (legacyPreview) {
      legacyPreview.hidden = true;
    }

    previewState.receipt =
      data.receipt;

    previewState.form =
      data;


    if (
      !window.SRMDC_RECEIPTS ||
      typeof window.SRMDC_RECEIPTS.openExisting !==
        "function"
    ) {

      throw new Error(
        "Official SRMDC receipt renderer is not available."
      );
    }


    const verificationUrl =
      buildOfflineVerificationUrl(
        data.receipt
      );


    const result = {

      receipt_number:
        data.receipt.receipt_number,

      verification_token:
        data.receipt.verification_id,

      receipt_date:
        data.receiptDate,

      amount:
        Number(data.amount),

      receipt_status:
        "PREVIEW"
    };


    const submission =
      offlineReceiptSubmission(data);


    /*
     * IMPORTANT:
     *
     * openExisting() only opens the already-existing
     * frozen official receipt renderer.
     *
     * It does NOT issue this offline receipt.
     */

    const entryModal =
      el("offlineReceiptEntryModal");

    if (entryModal) {
      entryModal.hidden = true;
    }

    window.SRMDC_RECEIPTS.openExisting(
      result,
      verificationUrl,
      submission
    );
  }

  function editOfflineReceiptPreview() {
    const preview =
      el("offlineReceiptPreviewModal");

    const entry =
      el("offlineReceiptEntryModal");

    if (preview) preview.hidden = true;
    if (entry) entry.hidden = false;

    document.body.style.overflow = "hidden";
  }

  // ==========================================================
  // PHASE3D1_BLANK_BILLBOOK_GENERATOR
  //
  // READ ONLY.
  // Uses existing RESERVED identities already loaded into
  // state.rows from offline_receipt_register.
  //
  // No INSERT / UPDATE / DELETE / RPC.
  // Printing does NOT issue a receipt.
  // ==========================================================

  function escapePrintHtml(value) {
    return safe(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function assetUrl(path) {
    return new URL(
      path,
      window.location.origin + "/"
    ).href;
  }


  async function assetDataUrl(path) {

    const response =
      await fetch(
        assetUrl(path),
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "Unable to load receipt artwork: " + path
      );
    }

    const blob = await response.blob();

    return await new Promise(
      (resolve, reject) => {

        const reader = new FileReader();

        reader.onload =
          () => resolve(reader.result);

        reader.onerror =
          () => reject(
            new Error(
              "Unable to prepare receipt artwork."
            )
          );

        reader.readAsDataURL(blob);
      }
    );
  }


  function blankVerificationUrl(row) {

    return (
      "https://srmdctrust.org/" +
      "?receipt=" +
      encodeURIComponent(
        safe(row.receipt_number)
      ) +
      "&id=" +
      encodeURIComponent(
        safe(row.verification_id)
      ) +
      "#verify"
    );
  }


  function blankLine(label, options = {}) {

    const full =
      options.full === true;

    const extra =
      options.extra || "";

    return `
      <div class="
        blank-field
        ${full ? "blank-field-full" : ""}
      ">
        <span>${label}</span>

        <div class="write-line">
          ${extra}
        </div>
      </div>
    `;
  }


  function blankReceiptHtml(
    row,
    headerData,
    stampData,
    index
  ) {

    const serial =
      String(
        row.serial_number || ""
      ).padStart(6, "0");

    const book =
      String(
        row.book_number || 1
      ).padStart(3, "0");

    const financialYear =
      safe(
        row.financial_year ||
        "2026-27"
      );

    const receiptNumber =
      escapePrintHtml(
        row.receipt_number
      );

    const verificationId =
      escapePrintHtml(
        row.verification_id
      );

    return `
      <section class="bill-receipt">

        <!-- PHASE3D1_10_DATE_NOTE_SPACING -->
        <div class="receipt-top-date">
          DATE: __________________
        </div>

        <!-- PHASE3D1_11_COMPACT_HEADER_CONTROL -->
        <div class="receipt-art">

          <div class="header-side header-side-left">
            <img
              class="header-stamp"
              src="${stampData}"
              alt="Sri Rama Mandiram Bodabanda"
            >
          </div>

          <img
            class="header-devotional-art"
            src="${headerData}"
            alt=""
          >

          <div class="header-side header-side-right">
            <div class="header-control-note">
              CONTROLLED OFFLINE RECEIPT
              <br>
              Book ${book}
              &nbsp; | &nbsp;
              Serial ${serial}
            </div>
          </div>

          <div class="jai">
            Jai Sri Ram! &nbsp;&nbsp;
            Jai Jai Sriram!!
          </div>
        </div>

        <div class="trust-title">
          SRI RAMA MANDIRA DEVASTHANA
          CHARITABLE TRUST
        </div>

        <div class="trust-address">
          Door No. 001, Bodabanda Village,
          Pullayapalli Post, Udayagiri Mandal,
          SPSR Nellore, Andhra Pradesh - 524226
          <br>
          <!-- PHASE3D1_13A1_CONTACT_DISPLAY_COMPLETE -->
          <strong class="receipt-contact">Contact: ${receiptContactText}</strong>
          &nbsp; | &nbsp;
          srmdctrustbodabanda@gmail.com
          <br>
          srmdctrust.org
        </div>

        <div class="receipt-heading">
          OFFLINE DONATION RECEIPT
        </div>

        <div class="identity-grid">

          <div>
            <span>Receipt Number</span>
            <strong>${receiptNumber}</strong>
          </div>

          <div>
            <span>Book No.</span>
            <strong>${book}</strong>
          </div>

          <div>
            <span>Financial Year</span>
            <strong>${escapePrintHtml(financialYear)}</strong>
          </div>

          <div>
            <span>Serial No.</span>
            <strong>${serial}</strong>
          </div>

        </div>

        <div class="blank-grid">

          ${blankLine(
            "Sri / Srimathi",
            { full: true }
          )}

          ${blankLine("Receipt Date")}

          ${blankLine("Mobile")}

          ${blankLine("PAN (Optional)")}

          ${blankLine(
            "Address",
            { full: true }
          )}

          ${blankLine(
            "Fund / Purpose",
            { full: true }
          )}

          <div class="blank-field blank-field-full">
            <span>Payment Mode</span>

            <div class="mode-options">
              Cash &nbsp; / &nbsp;
              UPI &nbsp; / &nbsp;
              Bank Transfer &nbsp; / &nbsp;
              Cheque &nbsp; / &nbsp;
              Other
            </div>
          </div>

          ${blankLine("Amount Rs.")}

          ${blankLine(
            "Amount in Words"
          )}


        </div>

        <div class="verification-row">

          <div class="verification-text">

            <strong>
              RESERVED RECEIPT IDENTITY
            </strong>

            <div>
              Verification ID:
              <b>${verificationId}</b>
            </div>

            <div class="verification-note">
              This QR identifies this reserved
              receipt number. Printing this receipt
              does not confirm payment or issuance.
            </div>

          </div>

          <div
            class="blank-qr"
            id="offlineBookQr${index}"
          ></div>

        </div>

        <div class="signature-grid">

          <div>
            Donor Signature
          </div>

          <div>
            Received By - Name &amp; Signature
          </div>

          <div>
            Treasurer / Authorized Signatory
          </div>

        </div>

        <div class="donor-payment-note">
          <strong>NOTE:</strong>
          Please share the payment / transaction details for this receipt
          with the Trust contact number for quick verification and updating
          of your receipt.
        </div>



        <!-- PHASE3D1_3_OFFICE_RECORD -->
        <section class="office-record">

          <div class="office-record-title">
            OFFICE RECORD - FOR TRUST USE ONLY
          </div>

          <!-- PHASE3D1_16_OFFICE_IDENTITY -->
          <div class="identity-grid office-identity-grid">

            <div>
              <span>Receipt Number</span>
              <strong>${receiptNumber}</strong>
            </div>

            <div>
              <span>Book No.</span>
              <strong>${book}</strong>
            </div>

            <div>
              <span>Financial Year</span>
              <strong>${escapePrintHtml(financialYear)}</strong>
            </div>

            <div>
              <span>Serial No.</span>
              <strong>${serial}</strong>
            </div>

          </div>

          <!-- PHASE3D1_7_QUICK_OFFICE_RECORD -->
          <!-- PHASE3D1_9_REMOVE_REFERENCE_REMARKS -->
          <div class="quick-office-record">

            <div class="quick-office-field quick-office-wide">
              <span>SRI / SRIMATHI</span>
              <div></div>
            </div>

            <div class="quick-office-three">

              <div class="quick-office-field">
                <span>RECEIPT DATE</span>
                <div></div>
              </div>

              <div class="quick-office-field">
                <span>MOBILE</span>
                <div></div>
              </div>

              <div class="quick-office-field">
                <span>PAN (OPTIONAL)</span>
                <div></div>
              </div>

            </div>

            <div class="quick-office-field quick-office-wide">
              <span>ADDRESS</span>
              <div></div>
            </div>

            <div class="quick-office-field quick-office-wide">
              <span>FUND / PURPOSE</span>
              <div></div>
            </div>

            <div class="quick-office-field quick-office-wide">
              <span>PAYMENT MODE</span>
              <div class="quick-office-options">
                Cash &nbsp; / &nbsp;
                UPI &nbsp; / &nbsp;
                Bank Transfer &nbsp; / &nbsp;
                Cheque &nbsp; / &nbsp;
                Other
              </div>
            </div>

            <div class="quick-office-two">

              <div class="quick-office-field">
                <span>AMOUNT RS.</span>
                <div></div>
              </div>

              <div class="quick-office-field">
                <span>AMOUNT IN WORDS</span>
                <div></div>
              </div>

            </div>


          </div>

          <div class="office-signatures">

            <div>Entered By</div>

            <div>Verified By</div>

            <div>Treasurer / Authorized Signatory</div>

          </div>

        </section>


      </section>
    `;
  }


  function blankBookDocument(
    rows,
    headerData,
    stampData
  ) {

    const receipts =
      rows
        .map(
          (row, index) =>
            blankReceiptHtml(
              row,
              headerData,
              stampData,
              index
            )
        )
        .join("");

    return `
<!doctype html>

<html>

<head>

<meta charset="utf-8">

<title>
SRMDC Offline Receipt Book Proof
</title>

<style>

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
  }

  body {
    background: #eee8d9;
    color: #17355c;
    font-family:
      Georgia,
      "Times New Roman",
      serif;
  }

  .print-toolbar {
    position: sticky;
    top: 0;
    z-index: 100;

    display: flex;
    justify-content: center;
    gap: 10px;

    padding: 10px;

    background: #3b3934;
  }

  .print-toolbar button {
    padding: 7px 14px;

    border: 1px solid #c79b45;
    border-radius: 5px;

    background: #fffaf0;
    color: #6f1019;

    font-weight: 700;
    cursor: pointer;
  }

  .book-pages {
    width: 210mm;
    margin: 12px auto;

    background: white;
  }

  .bill-receipt {
    position: relative;

    width: 210mm;
    /* PHASE3D1_2_A4_SINGLE_RECEIPT */
    height: 297mm;

    padding:
      5mm
      7mm
      4mm;

    overflow: hidden;

    background:
      linear-gradient(
        180deg,
        #fffdf6 0%,
        #fff9e9 100%
      );
    /* PHASE3D1_12_OUTER_BORDER_REMOVED */
    border: none;

    break-inside: avoid;
    page-break-inside: avoid;
  }

  .bill-receipt + .bill-receipt {
    margin-top: 8mm;
  }

  /* PHASE3D1_10_DATE_NOTE_SPACING_CSS */

  .receipt-top-date {
    height: 5mm;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding-right: 1mm;

    font-family: Arial, sans-serif;
    font-size: 6.5pt;
    font-weight: 800;
    color: #17355c;
  }

  .donor-payment-note {
    position: absolute;
    left: 7mm;
    right: 7mm;
    top: 174mm;

    padding: 1.2mm 2mm;

    border: 0.25mm solid #d2a34b;
    background: #fffaf0;

    font-family: Arial, sans-serif;
    font-size: 5.6pt;
    line-height: 1.25;
    color: #17355c;
  }

  .donor-payment-note strong {
    color: #8c151d;
  }

  /* PHASE3D1_11_COMPACT_HEADER_CONTROL_CSS */

  .header-side {
    position: absolute;
    top: 0;
    height: 31mm;
    display: flex;
    align-items: center;
    z-index: 3;
  }

  .header-side-left {
    left: 1mm;
    width: 25mm;
    justify-content: flex-start;
  }

  .header-side-right {
    right: 1mm;
    width: 42mm;
    justify-content: flex-end;
    text-align: right;
  }

  .header-stamp {
    width: 17mm;
    height: 17mm;
    object-fit: contain;
  }

  .header-control-note {
    color: #8c151d;
    font-family: Arial, sans-serif;
    font-size: 5.8pt;
    line-height: 1.35;
    font-weight: 800;
  }

  .header-devotional-art {
    position: relative;
    z-index: 1;
  }
  .receipt-art {
    position: relative;

    height: 31mm;

    overflow: hidden;
    /* PHASE3D1_8_HEADER_CLEANUP - outer artwork box removed */
    border: none;
  }

  .receipt-art img {
    display: block;

    width: 100%;
    max-width: 100%;
    height: 100%;

    margin: 0 auto;

    /* Keep complete devotional artwork visible */
    object-fit: contain;
    object-position: center;
  }

  .jai {
    position: absolute;
    top: 1.3mm;
    left: 0;
    right: 0;

    text-align: center;

    color: #8c151d;

    font-size: 11pt;
    font-weight: 800;

    text-shadow:
      0 1px 0 #fff4c9;
  }

  .trust-title {
    margin-top: 1.2mm;

    text-align: center;

    color: #8c151d;

    font-size: 10.5pt;
    font-weight: 800;
  }

  .trust-address {
    margin-top: 0.5mm;

    text-align: center;

    color: #17355c;

    font-size: 5.7pt;
    line-height: 1.2;
  }

  /* PHASE3D1_13A_COMPACT_RECEIPT_CONTACTS_CSS */
  .trust-address {
    font-weight: 700;
    color: #102b4e;
  }

  .receipt-contact {
    font-weight: 800;
    color: #102b4e;
    white-space: nowrap;
  }
  .receipt-heading {
    margin-top: 1.2mm;
    padding: 1.1mm;

    background: #8c151d;
    color: #fff9dc;

    border:
      0.35mm solid #c78a24;

    text-align: center;

    font-size: 10pt;
    font-weight: 800;
    letter-spacing: 0.6px;
  }

  .identity-grid {
    display: grid;

    grid-template-columns:
      1.5fr
      0.65fr
      0.7fr
      0.65fr;

    gap: 2mm;

    margin-top: 1.5mm;
    padding: 1.5mm 2mm;

    border:
      0.3mm solid #d2a34b;
  }

  .identity-grid span,
  .blank-field span {
    display: block;

    margin-bottom: 0.3mm;

    color: #8c151d;

    font-family:
      Arial,
      sans-serif;

    font-size: 5.5pt;
    font-weight: 800;

    text-transform: uppercase;
  }

  .identity-grid strong {
    font-size: 7.2pt;
  }

  .blank-grid {
    display: grid;

    grid-template-columns:
      1fr
      1fr
      1fr;

    gap:
      1.2mm
      3mm;

    margin-top: 1.5mm;

    padding:
      1.5mm
      2mm;

    border:
      0.3mm solid #d2a34b;
  }

  .blank-field-full {
    grid-column:
      1 / -1;
  }

  .write-line {
    height: 6mm;

    border-bottom:
      0.25mm dotted #4b5d6e;
  }

  .mode-options {
    height: 4mm;

    padding-top: 0.6mm;

    border-bottom:
      0.25mm dotted #4b5d6e;

    font-size: 6.5pt;
    font-weight: 700;
  }

  .verification-row {
    display: grid;

    grid-template-columns:
      1fr
      23mm;

    gap: 3mm;

    align-items: center;

    margin-top: 1.5mm;
    padding: 1.3mm 2mm;

    border:
      0.3mm solid #d2a34b;
  }

  .verification-text {
    font-family:
      Arial,
      sans-serif;

    font-size: 5.7pt;
    line-height: 1.35;
  }

  .verification-text > strong {
    display: block;

    margin-bottom: 0.6mm;

    color: #8c151d;

    font-size: 6.5pt;
  }

  .verification-note {
    margin-top: 0.7mm;
  }

  .blank-qr {
    width: 21mm;
    height: 21mm;

    display: flex;
    align-items: center;
    justify-content: center;
  }

  .blank-qr img,
  .blank-qr canvas {
    width: 21mm !important;
    height: 21mm !important;
  }

  .signature-grid {
    /* PHASE3D1_7_QUICK_OFFICE */
    position: absolute;

    left: 7mm;
    right: 7mm;
    top: 166mm;

    display: grid;

    grid-template-columns:
      repeat(3, minmax(0, 1fr));

    gap: 5mm;

    margin-top: 0;
    padding-top: 0;

    text-align: center;

    font-family:
      Arial,
      sans-serif;

    font-size: 5.7pt;
    font-weight: 700;
  }

  .signature-grid > div {
    padding-top: 1mm;

    border-top:
      0.25mm solid #465768;
  }

  /* PHASE3D1_3_OFFICE_RECORD_CSS */

  .office-record {
    /* PHASE3D1_3B_OFFICE_POSITION */
    position: absolute;
    left: 7mm;
    right: 7mm;
    /* PHASE3D1_4_OFFICE_SPACING */
    /* PHASE3D1_5_FINAL_VISUAL */
    /* PHASE3D1_5A_TWO_LINE_GAP */
    top: 185mm;

    margin-top: 0;
    padding-top: 2.5mm;

    border-top:
      0.35mm dashed #b07b28;

    font-family:
      Arial,
      sans-serif;
  }

  .office-record-title {
    margin-bottom: 4mm;
    padding: 1.8mm 2mm;

    border:
      0.3mm solid #b07b28;

    background: #fffaf0;

    text-align: center;

    color: #8c151d;

    font-size: 7pt;
    font-weight: 800;
    letter-spacing: 0.35px;
  }

  .office-record-grid {
    display: grid;

    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    column-gap: 7mm;
    row-gap: 2.4mm;
  }

  .office-record-field {
    display: grid;

    grid-template-columns:
      auto 1fr;

    align-items: end;
    gap: 2mm;

    min-height: 7mm;

    font-size: 6.2pt;
    font-weight: 700;
  }

  .office-record-field > div {
    height: 5mm;

    border-bottom:
      0.25mm dotted #4b5d6e;
  }

  .office-record-wide {
    grid-column:
      1 / -1;
  }

  /* PHASE3D1_7_QUICK_OFFICE_CSS */

  .quick-office-record {
    display: grid;
    gap: 2mm;
  }

  .quick-office-field {
    min-width: 0;

    font-family:
      Arial,
      sans-serif;

    font-size: 5.8pt;
    font-weight: 800;

    color: #8c151d;
  }

  .quick-office-field > div:not(.quick-office-options) {
    height: 5mm;

    border-bottom:
      0.25mm dotted #465768;
  }

  .quick-office-three {
    display: grid;

    grid-template-columns:
      repeat(3, minmax(0, 1fr));

    gap: 6mm;
  }

  .quick-office-two {
    display: grid;

    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap: 6mm;
  }

  .quick-office-wide {
    width: 100%;
  }

  .quick-office-options {
    margin-top: 1mm;
    padding-bottom: 1mm;

    border-bottom:
      0.25mm dotted #465768;

    color: #18364f;

    font-family:
      Georgia,
      serif;

    font-size: 6pt;
    font-weight: 700;
  }
  .office-signatures {
    display: grid;

    grid-template-columns:
      repeat(3, minmax(0, 1fr));

    gap: 6mm;

    margin-top: 5mm;
    padding-top: 3mm;

    text-align: center;

    font-size: 5.7pt;
    font-weight: 700;
  }

  .office-signatures > div {
    padding-top: 1mm;

    border-top:
      0.25mm solid #465768;
  }
.stamp {
    width: 15mm;
    height: 15mm;

    object-fit: contain;
  }

  .control-note {
    color: #8c151d;

    font-family:
      Arial,
      sans-serif;

    font-size: 5.2pt;
    font-weight: 700;

    text-align: right;
  }

  @media print {

    /* PHASE3D1_13B_PRINT_FONT_LOCK
       Keep browser proof and printed PDF typography consistent.
       No dimensions, positions or page-break rules changed. */

    .bill-receipt {
      font-family: Arial, Helvetica, sans-serif !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      text-rendering: geometricPrecision;
    }

    .bill-receipt *,
    .bill-receipt *::before,
    .bill-receipt *::after {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .trust-address {
      font-family: Arial, Helvetica, sans-serif !important;
      font-weight: 700 !important;
      color: #102b4e !important;
    }

    .receipt-contact {
      font-family: Arial, Helvetica, sans-serif !important;
      font-weight: 800 !important;
      color: #102b4e !important;
    }

    .receipt-top-date,
    .header-control-note,
    .receipt-heading,
    .identity-grid,
    .blank-grid,
    .verification-text,
    .signature-grid,
    .donor-payment-note,
    .office-record,
    .office-record-grid,
    .quick-office-field,
    .office-signatures,
    .control-note {
      font-family: Arial, Helvetica, sans-serif !important;
    }

    .receipt-heading,
    .header-control-note,
    .identity-grid label,
    .office-record-title,
    .quick-office-field > span {
      font-weight: 800 !important;
    }
    /* PHASE3D1_13B1_PRINT_EMPHASIS
       Strengthen only the elements that Edge prints too lightly. */

    .receipt-heading {
      background: #981019 !important;
      color: #ffffff !important;
      font-weight: 800 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .verification-text {
      color: #102b4e !important;
      font-weight: 600 !important;
    }

    .verification-text strong,
    .verification-title {
      color: #981019 !important;
      font-weight: 800 !important;
    }

    .donor-payment-note {
      color: #102b4e !important;
      font-weight: 600 !important;
    }

    .donor-payment-note strong {
      color: #981019 !important;
      font-weight: 800 !important;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    body {
      background: white;
    }

    .print-toolbar {
      display: none !important;
    }

    .book-pages {
      width: 210mm;
      margin: 0;
    }

    /* PHASE3D1_12_PRINT_PAGE_GAP */
    .bill-receipt + .bill-receipt {
      margin-top: 0;
    }

    .bill-receipt {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .bill-receipt {
      page-break-after: always;
      break-after: page;
    }

    .bill-receipt:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }

</style>

</head>

<body>

<div class="print-toolbar">

  <button
    type="button"
    onclick="window.print()"
  >
    Print / Save PDF
  </button>

  <button
    type="button"
    onclick="window.close()"
  >
    Close
  </button>

</div>

<main class="book-pages">

  ${receipts}

</main>

</body>

</html>
    `;
  }


    // PHASE3D1_13A3B_CONTACT_SCOPE_FIX
  /* PHASE3D1_14A_TRUST_SETTINGS_RECEIPT_CONTACTS */
let receiptContactText = "8123386813 | 6362486813";

async function loadReceiptContactTextFromTrustSettings() {
  try {
    const receiptSettingsClient = client();

    if (!receiptSettingsClient) {
      console.warn(
        "Receipt contact settings fallback used: shared Admin client unavailable."
      );
      return receiptContactText;
    }

    const { data, error } = await receiptSettingsClient.rpc(
      "get_srmdc_public_trust_settings"
    );

    if (error) {
      console.warn(
        "Receipt contact settings fallback used:",
        error.message || error
      );
      return receiptContactText;
    }

    const settings = Array.isArray(data)
      ? data[0]
      : data;

    if (!settings) {
      return receiptContactText;
    }

    const contacts = [
      settings.primary_phone,
      settings.secondary_phone
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (contacts.length) {
      receiptContactText = contacts.join(" | ");
    }

    return receiptContactText;
  }
  catch (error) {
    console.warn(
      "Receipt contact settings fallback used:",
      error
    );

    return receiptContactText;
  }
}

  function clearPendingOriginalExport(message = "") {
    state.pendingOriginalExport = null;

    const button =
      el("offlineReceiptConfirmExported");

    if (button) {
      button.disabled = true;
      button.title =
        "Generate a valid preview before confirming export";
    }

    const status =
      el("offlineReceiptExportPendingStatus");

    if (status) {
      status.textContent =
        message ||
        "No ORIGINAL export is awaiting confirmation.";
    }
  }

  function setPendingOriginalExport(context) {
    state.pendingOriginalExport = context;

    const button =
      el("offlineReceiptConfirmExported");

    if (button) {
      button.disabled = false;
      button.title =
        "Confirm only after the preview was actually printed or saved";
    }

    const status =
      el("offlineReceiptExportPendingStatus");

    if (status) {
      status.textContent =
        "Previewed ORIGINAL: Book " +
        context.bookNumber +
        ", serials " +
        context.from +
        "-" +
        context.to +
        " (" +
        context.count +
        " receipts). Not yet confirmed exported.";
    }
  }

  async function confirmPendingOriginalExport() {
    const pending =
      state.pendingOriginalExport;

    if (!pending) {
      alert(
        "No previewed ORIGINAL range is awaiting confirmation."
      );
      return;
    }

    const db = client();

    if (!db) {
      alert("Supabase client is unavailable.");
      return;
    }

    const village = currentVillage();

    if (
      !village ||
      safe(village.id) !== safe(pending.villageId)
    ) {
      clearPendingOriginalExport(
        "Village changed. Generate the preview again."
      );

      alert(
        "The selected village no longer matches the previewed range."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Confirm ORIGINAL Export?\n\n" +
        "Book: " + pending.bookNumber + "\n" +
        "Serials: " +
        pending.from + "-" + pending.to + "\n" +
        "Quantity: " + pending.count + "\n\n" +
        "Continue only if you actually printed these receipts " +
        "or saved the PDF.\n\n" +
        "This marks physical stock as PRINTED only. " +
        "It does not issue receipts or change payment status."
      );

    if (!confirmed) {
      return;
    }

    const button =
      el("offlineReceiptConfirmExported");

    if (button) {
      button.disabled = true;
      button.textContent = "Confirming...";
    }

    try {
      const result =
        await db.rpc(
          "confirm_offline_receipt_export",
          {
            p_village_id: pending.villageId,
            p_book_id: pending.bookId,
            p_from_serial: pending.from,
            p_to_serial: pending.to
          }
        );

      if (result.error) {
        throw result.error;
      }

      clearPendingOriginalExport(
        "ORIGINAL export confirmed: Book " +
        pending.bookNumber +
        ", serials " +
        pending.from +
        "-" +
        pending.to +
        "."
      );

      await load();

      alert(
        "ORIGINAL export confirmed.\n\n" +
        "Book: " + pending.bookNumber + "\n" +
        "Serials: " +
        pending.from + "-" + pending.to + "\n" +
        "Quantity: " + pending.count + "\n\n" +
        "Physical status: PRINTED\n" +
        "Receipt/payment status: unchanged"
      );
    }
    catch (error) {
      console.error(
        `${MODULE}: ORIGINAL export confirmation failed`,
        error
      );

      if (button) {
        button.disabled = false;
      }

      alert(
        "Unable to confirm ORIGINAL export.\n\n" +
        (error?.message || error)
      );
    }
    finally {
      if (button) {
        button.textContent =
          "Confirm Exported";
      }
    }
  }
  // PHASE3D1_17E3C_CONFIRM_REPRINTED
  // Writes REPRINT audit history only after explicit Admin confirmation.
  // PHASE3D1_17E3C1_FINAL_IN_PAGE_CONFIRM
  // Reliable Admin-page confirmation before permanent REPRINT audit write.
  function confirmFinalReprintInPage(context) {
    return new Promise((resolve) => {
      const existing =
        document.getElementById(
          "offlineReceiptFinalReprintConfirmOverlay"
        );

      if (existing) {
        existing.remove();
      }

      const overlay =
        document.createElement("div");

      overlay.id =
        "offlineReceiptFinalReprintConfirmOverlay";

      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "2147483647";
      overlay.style.background =
        "rgba(0, 0, 0, 0.52)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.padding = "20px";

      const panel =
        document.createElement("div");

      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");

      panel.setAttribute(
        "aria-labelledby",
        "offlineReceiptFinalReprintConfirmTitle"
      );

      panel.style.width = "min(540px, 100%)";
      panel.style.maxHeight = "calc(100vh - 40px)";
      panel.style.overflow = "auto";
      panel.style.background = "#fffaf0";
      panel.style.color = "#222";
      panel.style.border = "2px solid #8b1d12";
      panel.style.borderRadius = "12px";
      panel.style.boxShadow =
        "0 18px 55px rgba(0, 0, 0, 0.32)";
      panel.style.padding = "22px";

      const title =
        document.createElement("h3");

      title.id =
        "offlineReceiptFinalReprintConfirmTitle";

      title.textContent =
        "Confirm controlled REPRINT?";

      title.style.margin = "0 0 12px";
      title.style.color = "#7b160d";

      const warning =
        document.createElement("p");

      warning.textContent =
        "Continue ONLY if this REPRINT preview was actually printed or saved.";

      warning.style.margin = "0 0 16px";
      warning.style.fontWeight = "700";

      const details =
        document.createElement("div");

      details.style.lineHeight = "1.65";

      const detailRows = [
        ["Book", context.bookNumber],
        ["Serials", context.from + "-" + context.to],
        ["Quantity", String(context.count)],
        ["Reason", context.reason]
      ];

      detailRows.forEach(([label, value]) => {
        const row =
          document.createElement("div");

        const strong =
          document.createElement("strong");

        strong.textContent = label + ": ";

        row.appendChild(strong);

        row.appendChild(
          document.createTextNode(value)
        );

        details.appendChild(row);
      });

      const auditNote =
        document.createElement("p");

      auditNote.textContent =
        "This will create permanent REPRINT audit history. " +
        "It will NOT change receipt or payment status.";

      auditNote.style.margin = "18px 0 0";
      auditNote.style.fontWeight = "700";

      const actions =
        document.createElement("div");

      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";
      actions.style.gap = "10px";
      actions.style.marginTop = "22px";

      const cancel =
        document.createElement("button");

      cancel.type = "button";
      cancel.textContent = "Cancel";

      const proceed =
        document.createElement("button");

      proceed.type = "button";
      proceed.textContent =
        "Confirm Reprinted";

      proceed.style.fontWeight = "700";

      let finished = false;

      function finish(value) {
        if (finished) {
          return;
        }

        finished = true;

        document.removeEventListener(
          "keydown",
          onKeyDown,
          true
        );

        overlay.remove();
        resolve(value);
      }

      function onKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
        }
      }

      cancel.addEventListener(
        "click",
        () => finish(false)
      );

      proceed.addEventListener(
        "click",
        () => finish(true)
      );

      overlay.addEventListener(
        "click",
        (event) => {
          if (event.target === overlay) {
            finish(false);
          }
        }
      );

      document.addEventListener(
        "keydown",
        onKeyDown,
        true
      );

      actions.appendChild(cancel);
      actions.appendChild(proceed);

      panel.appendChild(title);
      panel.appendChild(warning);
      panel.appendChild(details);
      panel.appendChild(auditNote);
      panel.appendChild(actions);

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      cancel.focus();
    });
  }

  async function confirmPendingReprint() {
    const pending =
      state.pendingReprint;

    if (!pending) {
      alert(
        "No previewed REPRINT range is awaiting confirmation."
      );
      return;
    }

    const db = client();

    if (!db) {
      alert("Supabase client is unavailable.");
      return;
    }

    const village = currentVillage();

    if (
      !village ||
      safe(village.id) !== safe(pending.villageId)
    ) {
      clearPendingReprint(
        "Village context changed. Preview the REPRINT again before confirming."
      );

      alert(
        "Village context changed. Preview the REPRINT again before confirming."
      );
      return;
    }

    const reason =
      safe(pending.reason).trim();

    if (reason.length < 3 || reason.length > 500) {
      clearPendingReprint(
        "Stored REPRINT reason is invalid. Preview again before confirming."
      );

      alert(
        "Stored REPRINT reason is invalid. Preview again before confirming."
      );
      return;
    }

    const confirmed =
      await confirmFinalReprintInPage({
        bookNumber: pending.bookNumber,
        from: pending.from,
        to: pending.to,
        count: pending.count,
        reason
      });

    if (!confirmed) {
      return;
    }

    const button =
      el("offlineReceiptConfirmReprinted");

    if (button) {
      button.disabled = true;
      button.textContent = "Confirming...";
    }

    try {
      const result =
        await db.rpc(
          "confirm_offline_receipt_reprint",
          {
            p_village_id: pending.villageId,
            p_book_id: pending.bookId,
            p_from_serial: pending.from,
            p_to_serial: pending.to,
            p_reason: reason
          }
        );

      if (result.error) {
        throw result.error;
      }

      clearPendingReprint(
        "REPRINT confirmed: Book " +
        pending.bookNumber +
        ", serials " +
        pending.from +
        "-" +
        pending.to +
        ". Audit history recorded."
      );

      await load();

      alert(
        "REPRINT confirmed.\n\n" +
        "Book: " +
        pending.bookNumber +
        "\nSerials: " +
        pending.from +
        "-" +
        pending.to +
        "\nQuantity: " +
        pending.count +
        "\nReason: " +
        reason +
        "\n\n" +
        "Physical print history: REPRINT recorded\n" +
        "Receipt/payment status: unchanged"
      );
    }
    catch (error) {
      console.error(
        `${MODULE}: REPRINT confirmation failed`,
        error
      );

      if (button) {
        button.disabled = false;
      }

      alert(
        "Unable to confirm REPRINT.\n\n" +
        (error?.message || error)
      );
    }
    finally {
      if (button) {
        button.textContent =
          "Confirm Reprinted";
      }
    }
  }
  // PHASE3D1_17E3B_REPRINT_PREVIEW
  // Preview only. No database print history is written here.

  function clearPendingReprint(message = "") {
    state.pendingReprint = null;

    const button =
      el("offlineReceiptConfirmReprinted");

    if (button) {
      button.disabled = true;
      button.title =
        "Preview and actually print/save before confirming reprint";
    }

    const status =
      el("offlineReceiptReprintPendingStatus");

    if (status) {
      status.textContent =
        message ||
        "No REPRINT is awaiting confirmation.";
    }
  }

  function setPendingReprint(context) {
    state.pendingReprint = context;

    const button =
      el("offlineReceiptConfirmReprinted");

    if (button) {
      button.disabled = false;
      button.title =
        "Confirm only after this preview was actually printed or saved";
    }

    const status =
      el("offlineReceiptReprintPendingStatus");

    if (status) {
      status.textContent =
        "Previewed REPRINT: Book " +
        context.bookNumber +
        ", serials " +
        context.from +
        "-" +
        context.to +
        " (" +
        context.count +
        " receipt(s)). Reason: " +
        context.reason +
        ". Not yet confirmed reprinted.";
    }
  }

  // PHASE3D1_17E3B2_IN_PAGE_CONFIRM
  // Reliable Admin-page confirmation for REPRINT preview.
  // Avoids browser suppression of the native confirmation dialog.
  function confirmReprintPreviewInPage(context) {
    return new Promise((resolve) => {
      const existing =
        document.getElementById(
          "offlineReceiptReprintPreviewConfirmOverlay"
        );

      if (existing) {
        existing.remove();
      }

      const overlay =
        document.createElement("div");

      overlay.id =
        "offlineReceiptReprintPreviewConfirmOverlay";

      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "2147483647";
      overlay.style.background =
        "rgba(0, 0, 0, 0.48)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.padding = "20px";

      const panel =
        document.createElement("div");

      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute(
        "aria-labelledby",
        "offlineReceiptReprintPreviewConfirmTitle"
      );

      panel.style.width = "min(520px, 100%)";
      panel.style.maxHeight = "calc(100vh - 40px)";
      panel.style.overflow = "auto";
      panel.style.background = "#fffaf0";
      panel.style.color = "#222";
      panel.style.border = "1px solid #d7bd83";
      panel.style.borderRadius = "12px";
      panel.style.boxShadow =
        "0 18px 50px rgba(0, 0, 0, 0.28)";
      panel.style.padding = "22px";

      const title =
        document.createElement("h3");

      title.id =
        "offlineReceiptReprintPreviewConfirmTitle";

      title.textContent =
        "Prepare controlled REPRINT preview?";

      title.style.margin = "0 0 16px";
      title.style.color = "#6f160c";

      const details =
        document.createElement("div");

      details.style.lineHeight = "1.65";

      const detailRows = [
        ["Book", context.bookNumber],
        ["Serials", context.from + "-" + context.to],
        ["Quantity", String(context.count)],
        ["Reason", context.reason]
      ];

      detailRows.forEach(([label, value]) => {
        const row =
          document.createElement("div");

        const strong =
          document.createElement("strong");

        strong.textContent = label + ": ";

        row.appendChild(strong);
        row.appendChild(
          document.createTextNode(value)
        );

        details.appendChild(row);
      });

      const note =
        document.createElement("p");

      note.textContent =
        "This only opens the preview. " +
        "It does NOT create REPRINT history.";

      note.style.margin = "18px 0 0";
      note.style.fontWeight = "600";

      const actions =
        document.createElement("div");

      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";
      actions.style.gap = "10px";
      actions.style.marginTop = "22px";

      const cancel =
        document.createElement("button");

      cancel.type = "button";
      cancel.textContent = "Cancel";

      const proceed =
        document.createElement("button");

      proceed.type = "button";
      proceed.textContent =
        "Continue to Preview";

      proceed.style.fontWeight = "700";

      let finished = false;

      function finish(value) {
        if (finished) {
          return;
        }

        finished = true;

        document.removeEventListener(
          "keydown",
          onKeyDown,
          true
        );

        overlay.remove();
        resolve(value);
      }

      function onKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
        }
      }

      cancel.addEventListener(
        "click",
        () => finish(false)
      );

      proceed.addEventListener(
        "click",
        () => finish(true)
      );

      overlay.addEventListener(
        "click",
        (event) => {
          if (event.target === overlay) {
            finish(false);
          }
        }
      );

      document.addEventListener(
        "keydown",
        onKeyDown,
        true
      );

      actions.appendChild(cancel);
      actions.appendChild(proceed);

      panel.appendChild(title);
      panel.appendChild(details);
      panel.appendChild(note);
      panel.appendChild(actions);

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      proceed.focus();
    });
  }

  async function previewOfflineReceiptReprint() {
    const printWindow =
      window.open("", "_blank");

    if (!printWindow) {
      alert(
        "Unable to open the REPRINT preview window. " +
        "Please allow pop-ups for this site and try again."
      );
      return;
    }

    // PHASE3D1_17E3B1_DIALOG_FOCUS_FIX
    // Keep synchronous popup creation for popup-blocker safety,
    // but return focus to Admin before async validation/confirmation.
    try {
      window.focus();
    } catch (focusError) {
      console.warn(
        "Unable to restore Admin focus before REPRINT confirmation",
        focusError
      );
    }

    try {
      await loadReceiptContactTextFromTrustSettings();

      clearPendingReprint();

      const from =
        Number(
          el("offlineReceiptReprintFrom")?.value
        );

      const to =
        Number(
          el("offlineReceiptReprintTo")?.value
        );

      const reason =
        safe(
          el("offlineReceiptReprintReason")?.value
        ).trim();

      if (
        !Number.isInteger(from) ||
        !Number.isInteger(to) ||
        from < 1 ||
        to < from
      ) {
        throw new Error(
          "Enter a valid REPRINT serial range."
        );
      }

      const count =
        to - from + 1;

      // PHASE3D1_18B_DYNAMIC_BOOK_RANGE_REPRINT
      // Capacity comes from the actual receipt rows loaded for this book.
      // Existing REPRINT eligibility checks remain authoritative.
      const loadedSerials =
        workingRows()
          .map((row) => Number(row.serial_number))
          .filter((serial) => Number.isInteger(serial));

      if (!loadedSerials.length) {
        throw new Error(
          "No receipt serials are loaded for the selected book."
        );
      }

      const bookMinSerial =
        Math.min(...loadedSerials);

      const bookMaxSerial =
        Math.max(...loadedSerials);

      if (
        from < bookMinSerial ||
        to > bookMaxSerial
      ) {
        throw new Error(
          "Requested REPRINT range must stay within loaded book serials " +
          bookMinSerial +
          " to " +
          bookMaxSerial +
          "."
        );
      }

      if (!reason) {
        throw new Error(
          "Reprint reason is mandatory."
        );
      }

      if (reason.length > 500) {
        throw new Error(
          "Reprint reason must be 500 characters or fewer."
        );
      }

      const rows =
        workingRows()
          .filter((row) => {
            const serial =
              Number(row.serial_number);

            return (
              serial >= from &&
              serial <= to
            );
          })
          .sort(
            (a, b) =>
              Number(a.serial_number) -
              Number(b.serial_number)
          );

      if (rows.length !== count) {
        throw new Error(
          "Not every serial number in this REPRINT range exists in the loaded register."
        );
      }

      const checks =
        rows.map((row) => ({
          row,
          info: printInfo(row)
        }));

      const blocked =
        checks.filter(
          (item) =>
            (
              item.info.state !== "PRINTED" &&
              item.info.state !== "REPRINTED"
            ) ||
            Number(item.info.count || 0) < 1
        );

      if (blocked.length) {
        const serials =
          blocked
            .map((item) =>
              Number(item.row.serial_number)
            )
            .filter(Number.isFinite)
            .join(", ");

        throw new Error(
          "REPRINT blocked. The following serials have no prior print history: " +
          serials +
          ". Use ORIGINAL export for NOT PRINTED receipts."
        );
      }

      const bookIds =
        [
          ...new Set(
            rows
              .map((row) =>
                safe(row.book_id).trim()
              )
              .filter(Boolean)
          )
        ];

      if (bookIds.length !== 1) {
        throw new Error(
          "Selected REPRINT range must belong to one receipt book."
        );
      }

      if (!state.loadedVillageId) {
        throw new Error(
          "Village context is not loaded."
        );
      }

      const confirmed =
        await confirmReprintPreviewInPage({
          bookNumber:
            safe(
              rows[0]?.book_number || "001"
            ).trim(),
          from,
          to,
          count,
          reason
        });

      if (!confirmed) {
        clearPendingReprint(
          "REPRINT preview cancelled. No database history created."
        );

        if (!printWindow.closed) {
          printWindow.close();
        }

        return;
      }

      // Confirmation completed on Admin; now activate the preview.
      try {
        if (!printWindow.closed) {
          printWindow.focus();
        }
      } catch (focusError) {
        console.warn(
          "Unable to focus REPRINT preview window",
          focusError
        );
      }

      const [
        headerData,
        stampData
      ] =
        await Promise.all([
          assetDataUrl(
            "assets/images/srmdc_receipt_header_v3.png"
          ),
          assetDataUrl(
            "assets/images/srmdc_bodabanda_stamp.png"
          )
        ]);

      const html =
        blankBookDocument(
          rows,
          headerData,
          stampData
        );

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      rows.forEach(
        (row, index) => {
          const target =
            printWindow.document
              .getElementById(
                `offlineBookQr${index}`
              );

          if (
            !target ||
            typeof QRCode === "undefined"
          ) {
            return;
          }

          target.innerHTML = "";

          new QRCode(
            target,
            {
              text:
                blankVerificationUrl(row),
              width: 156,
              height: 156
            }
          );
        }
      );

      setPendingReprint({
        villageId:
          state.loadedVillageId,

        bookId:
          bookIds[0],

        bookNumber:
          safe(
            rows[0]?.book_number || "001"
          ).trim(),

        from,
        to,
        count,
        reason
      });

      setStatus(
        `REPRINT preview ready for serials ${from} to ${to}. ` +
        "No database history has been created."
      );
    } catch (error) {
      console.error(
        "SRMDC controlled reprint preview failed",
        error
      );

      clearPendingReprint(
        error?.message ||
        "Unable to prepare REPRINT preview."
      );

      try {
        if (
          printWindow &&
          !printWindow.closed
        ) {
          printWindow.close();
        }
      } catch (closeError) {
        console.warn(
          "Unable to close failed REPRINT preview window",
          closeError
        );
      }

      alert(
        error?.message ||
        "Unable to prepare REPRINT preview."
      );
    }
  }
  async function generateBlankOfflineReceiptBook() {
    // Phase 3D1.14A:
    // Refresh receipt contact numbers from existing Trust Settings.
    await loadReceiptContactTextFromTrustSettings();
    // PHASE3D1_14B_DYNAMIC_RECEIPT_CONTACT_FIX
    // receiptContactText has already been refreshed from Trust Settings.
    // If Trust Settings cannot be loaded, the existing fallback above remains.
    // PHASE3D1_1_POPUP_TIMING_FIX
    // Open synchronously while the Generate PDF click still
    // has direct browser user-activation permission.
    const printWindow =
      window.open(
        "",
        "_blank"
      );

    if (!printWindow) {

      alert(
        "Unable to open the receipt preview window. " +
        "Please allow pop-ups for this site and try again."
      );

      return;
    }

    try {

      const from =
        Number(
          el("offlineReceiptPdfFrom")?.value
        );

      const to =
        Number(
          el("offlineReceiptPdfTo")?.value
        );

      if (
        !Number.isInteger(from) ||
        !Number.isInteger(to) ||
        from < 1 ||
        to < from
      ) {
        throw new Error(
          "Enter a valid receipt serial range."
        );
      }

      const count =
        to - from + 1;

      // PHASE3D1_18B_DYNAMIC_BOOK_RANGE_ORIGINAL
      // Capacity comes from the actual receipt rows loaded for this book.
      // Existing ORIGINAL duplicate-print protection remains authoritative.
      const loadedSerials =
        workingRows()
          .map((row) => Number(row.serial_number))
          .filter((serial) => Number.isInteger(serial));

      if (!loadedSerials.length) {
        throw new Error(
          "No receipt serials are loaded for the selected book."
        );
      }

      const bookMinSerial =
        Math.min(...loadedSerials);

      const bookMaxSerial =
        Math.max(...loadedSerials);

      if (
        from < bookMinSerial ||
        to > bookMaxSerial
      ) {
        throw new Error(
          "Requested ORIGINAL range must stay within loaded book serials " +
          bookMinSerial +
          " to " +
          bookMaxSerial +
          "."
        );
      }

      const rows =
        workingRows()
          .filter((row) => {

            const serial =
              Number(row.serial_number);

            return (
              serial >= from &&
              serial <= to
            );
          })
          .sort(
            (a, b) =>
              Number(a.serial_number) -
              Number(b.serial_number)
          );

      if (rows.length !== count) {
        throw new Error(
          "Not every serial number in this range exists in the loaded register."
        );
      }

      
      // PHASE3D1_17D1_ORIGINAL_PREFLIGHT
      // Physical print/export state is independent from receipt lifecycle.
      // Previewing this range does NOT mark any receipt as printed.
      const printChecks =
        rows.map((row) => ({
          row,
          info: printInfo(row)
        }));

      const alreadyPrinted =
        printChecks.filter(
          (item) =>
            item.info.state === "PRINTED" ||
            item.info.state === "REPRINTED" ||
            Number(item.info.count || 0) > 0
        );

      if (alreadyPrinted.length) {
        const blockedSerials =
          alreadyPrinted
            .map((item) =>
              Number(item.row.serial_number)
            )
            .filter(Number.isFinite)
            .join(", ");

        throw new Error(
          "ORIGINAL export blocked. " +
          "The following serials were already exported: " +
          blockedSerials +
          ". Use the controlled Reprint workflow instead."
        );
      }

      const notPrintedCount =
        printChecks.filter(
          (item) =>
            item.info.state === "NOT_PRINTED" &&
            Number(item.info.count || 0) === 0
        ).length;

      if (notPrintedCount !== rows.length) {
        throw new Error(
          "Print preflight could not confirm every selected receipt " +
          "as NOT PRINTED. Preview cancelled."
        );
      }
const nonReserved =
        rows.filter(
          (row) =>
            statusValue(row) !== "RESERVED"
        );

      if (nonReserved.length) {
        throw new Error(
          "This proof generator accepts RESERVED receipts only."
        );
      }

      const missingIdentity =
        rows.find(
          (row) =>
            !safe(row.receipt_number).trim() ||
            !safe(row.verification_id).trim()
        );

      if (missingIdentity) {
        throw new Error(
          "A selected receipt is missing its controlled identity."
        );
      }

      const button =
        el("offlineReceiptPdfButton");

      if (button) {
        button.disabled = true;
        button.textContent =
          "Preparing...";
      }

      setStatus(
        `Preparing blank receipts ${from} to ${to}...`
      );

      const [
        headerData,
        stampData
      ] =
        await Promise.all([
          assetDataUrl(
            "assets/images/srmdc_receipt_header_v3.png"
          ),
          assetDataUrl(
            "assets/images/srmdc_bodabanda_stamp.png"
          )
        ]);

      const html =
        blankBookDocument(
          rows,
          headerData,
          stampData
        );

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      // PHASE3D1_17D2B_PENDING_ORIGINAL
      // Preview exists. This stores client-side context only.
      // No database write occurs here.
      const pendingBookId =
        safe(rows[0]?.book_id).trim();

      if (!pendingBookId) {
        throw new Error(
          "Unable to identify the selected receipt book."
        );
      }

      setPendingOriginalExport({
        villageId: state.loadedVillageId,
        bookId: pendingBookId,
        bookNumber:
          safe(rows[0]?.book_number || "001").trim(),
        from,
        to,
        count
      });

      rows.forEach(
        (row, index) => {

          const target =
            printWindow.document
              .getElementById(
                `offlineBookQr${index}`
              );

          if (
            !target ||
            typeof QRCode === "undefined"
          ) {
            return;
          }

          target.innerHTML = "";

          new QRCode(
            target,
            {
              text:
                blankVerificationUrl(row),

              width: 156,
              height: 156,

              correctLevel:
                QRCode.CorrectLevel.M
            }
          );
        }
      );

      setStatus(
        `Blank receipt proof ${from}-${to} opened. ` +
        "No receipt status was changed."
      );
    }
    catch (error) {

      // PHASE3D1_17D3A_CLOSE_FAILED_PREVIEW
      // Preserve synchronous popup opening, but close the
      // unused preview whenever validation/preflight fails.
      try {
        if (printWindow && !printWindow.closed) {
          printWindow.close();
        }
      }
      catch (closeError) {
        console.warn(
          "Unable to close failed receipt preview window:",
          closeError
        );
      }

      console.error(
        "SRMDC blank receipt generator failed",
        error
      );

      setStatus(
        error?.message ||
        "Unable to generate blank receipt proof."
      );

      alert(
        error?.message ||
        "Unable to generate blank receipt proof."
      );
    }
    finally {

      const button =
        el("offlineReceiptPdfButton");

      if (button) {
        button.disabled = false;
        button.textContent =
          "Generate PDF";
      }
    }
  }


  // PHASE3D1_18C_C_V2_POST_LOAD_REFRESH
  function refreshOriginalRangeControls() {
    const from = el("offlineReceiptPdfFrom");
    const to = el("offlineReceiptPdfTo");
    const quantity = el("offlineReceiptPdfQuantity");
    const summary = el("offlineReceiptOriginalRangeSummary");

    if (
      !from ||
      !to ||
      !quantity ||
      !summary ||
      !workingRows().length
    ) {
      return;
    }

    const serials = workingRows()
      .map((row) => Number(row.serial_number))
      .filter((serial) => Number.isInteger(serial));

    if (!serials.length) {
      return;
    }

    const bookMin = Math.min(...serials);
    const bookMax = Math.max(...serials);

    from.min = String(bookMin);
    from.max = String(bookMax);
    to.min = String(bookMin);
    to.max = String(bookMax);

    from.value = String(bookMin);
    quantity.value = "50";
    to.value = String(
      Math.min(
        bookMin + 49,
        bookMax
      )
    );

    const fromValue = Number(from.value);
    const toValue = Number(to.value);

    const selectedRows = workingRows().filter((row) => {
      const serial = Number(row.serial_number);

      return (
        serial >= fromValue &&
        serial <= toValue
      );
    });

    const alreadyPrintedCount =
      selectedRows.filter((row) => {
        const info = printInfo(row);

        return (
          info.state === "PRINTED" ||
          info.state === "REPRINTED" ||
          Number(info.count || 0) > 0
        );
      }).length;

    const eligibleCount =
      selectedRows.length -
      alreadyPrintedCount;

    summary.textContent =
      "Selected: " +
      selectedRows.length +
      " receipt" +
      (selectedRows.length === 1 ? "" : "s") +
      " | Serials " +
      fromValue +
      "-" +
      toValue +
      " | ORIGINAL eligible: " +
      eligibleCount +
      " | Already printed: " +
      alreadyPrintedCount;

    clearPendingOriginalExport();
  }

  function installOfflineReceiptPdfGenerator() {

    const button =
      el("offlineReceiptPdfButton");

    if (!button) {
      return;
    }

    // HTML currently keeps this disabled as a placeholder.
    // Phase 3D1 activates it at runtime.
    button.disabled = false;

    button.addEventListener(
      "click",
      generateBlankOfflineReceiptBook
    );

    el("offlineReceiptConfirmExported")
      ?.addEventListener(
        "click",
        confirmPendingOriginalExport
      );

    // PHASE3D1_17E3B_REPRINT_WIRING
    el("offlineReceiptReprintButton")
      ?.addEventListener(
        "click",
        previewOfflineReceiptReprint
      );

    el("offlineReceiptConfirmReprinted")
      ?.addEventListener(
        "click",
        confirmPendingReprint
      );

    clearPendingReprint();

    const reprintFrom =
      el("offlineReceiptReprintFrom");

    const reprintTo =
      el("offlineReceiptReprintTo");

    const reprintReason =
      el("offlineReceiptReprintReason");

    const invalidatePendingReprint =
      () => {
        if (state.pendingReprint) {
          clearPendingReprint(
            "Reprint range or reason changed. Preview again before confirming."
          );
        }
      };

    reprintFrom?.addEventListener(
      "input",
      invalidatePendingReprint
    );

    reprintTo?.addEventListener(
      "input",
      invalidatePendingReprint
    );

    reprintReason?.addEventListener(
      "input",
      invalidatePendingReprint
    );
    clearPendingOriginalExport();

    // PHASE3D1_18C_FRIENDLY_ORIGINAL_RANGE
    const from =
      el("offlineReceiptPdfFrom");

    const to =
      el("offlineReceiptPdfTo");

    const quantity =
      el("offlineReceiptPdfQuantity");

    const summary =
      el("offlineReceiptOriginalRangeSummary");

    const loadedOriginalSerials =
      workingRows()
        .map((row) => Number(row.serial_number))
        .filter((serial) => Number.isInteger(serial));

    const originalBookMin =
      loadedOriginalSerials.length
        ? Math.min(...loadedOriginalSerials)
        : 1;

    const originalBookMax =
      loadedOriginalSerials.length
        ? Math.max(...loadedOriginalSerials)
        : 1;

    const invalidatePendingOriginal =
      () => {
        if (state.pendingOriginalExport) {
          clearPendingOriginalExport(
            "Range changed. Generate a new preview before confirming export."
          );
        }
      };

    const updateOriginalRangeSummary =
      () => {

        if (!from || !to || !summary) {
          return;
        }

        const fromValue =
          Number(from.value);

        const toValue =
          Number(to.value);
        // PHASE3D1_18C_D3C_SUMMARY_DYNAMIC_RANGE
        const currentSummarySerials =
          workingRows()
            .map((row) => Number(row.serial_number))
            .filter((serial) => Number.isInteger(serial));

        const currentSummaryBookMin =
          currentSummarySerials.length
            ? Math.min(...currentSummarySerials)
            : 1;

        const currentSummaryBookMax =
          currentSummarySerials.length
            ? Math.max(...currentSummarySerials)
            : 1;

        if (
          !Number.isInteger(fromValue) ||
          !Number.isInteger(toValue) ||
          fromValue < currentSummaryBookMin ||
          toValue < fromValue ||
          toValue > currentSummaryBookMax
        ) {
          summary.textContent =
            "Enter a range within loaded book serials " +
            currentSummaryBookMin +
            " to " +
            currentSummaryBookMax +
            ".";

          return;
        }

        const selectedCount =
          toValue - fromValue + 1;

        const selectedRows =
          workingRows().filter((row) => {
            const serial =
              Number(row.serial_number);

            return (
              serial >= fromValue &&
              serial <= toValue
            );
          });

        const alreadyPrintedCount =
          selectedRows.filter((row) => {

            const info =
              printInfo(row);

            return (
              info.state === "PRINTED" ||
              info.state === "REPRINTED" ||
              Number(info.count || 0) > 0
            );
          }).length;

        const eligibleCount =
          selectedRows.length -
          alreadyPrintedCount;

        summary.textContent =
          "Selected: " +
          selectedCount +
          " receipt" +
          (selectedCount === 1 ? "" : "s") +
          " | Serials " +
          fromValue +
          "-" +
          toValue +
          " | ORIGINAL eligible: " +
          eligibleCount +
          " | Already printed: " +
          alreadyPrintedCount;
      };

    const applyOriginalQuantityPreset =
      () => {

        if (!from || !to || !quantity) {
          return;
        }

        if (quantity.value === "custom") {
          updateOriginalRangeSummary();
          return;
        }

        const selectedQuantity =
          Number(quantity.value);

        const fromValue =
          Number(from.value);

        if (
          !Number.isInteger(selectedQuantity) ||
          selectedQuantity < 1 ||
          !Number.isInteger(fromValue)
        ) {
          updateOriginalRangeSummary();
          return;
        }

        const calculatedTo =
          fromValue +
          selectedQuantity -
          1;


        // PHASE3D1_18C_D2_QUANTITY_DYNAMIC_MAX
        const currentLoadedSerials =
          workingRows()
            .map((row) => Number(row.serial_number))
            .filter((serial) => Number.isInteger(serial));

        const currentOriginalBookMax =
          currentLoadedSerials.length
            ? Math.max(...currentLoadedSerials)
            : 1;

        to.value =
          String(
            Math.min(
              calculatedTo,
              currentOriginalBookMax
            )
          );

        invalidatePendingOriginal();
        updateOriginalRangeSummary();
      };

    if (from) {

      from.min =
        String(originalBookMin);

      from.max =
        String(originalBookMax);

      from.value =
        String(originalBookMin);

      from.addEventListener(
        "input",
        () => {

          invalidatePendingOriginal();

          if (
            quantity &&
            quantity.value !== "custom"
          ) {
            applyOriginalQuantityPreset();
          }
          else {
            updateOriginalRangeSummary();
          }
        }
      );
    }

    if (to) {

      to.min =
        String(originalBookMin);

      to.max =
        String(originalBookMax);

      to.addEventListener(
        "input",
        () => {

          invalidatePendingOriginal();

          if (quantity) {
            quantity.value = "custom";
          }

          updateOriginalRangeSummary();
        }
      );
    }

    if (quantity) {

      quantity.addEventListener(
        "change",
        () => {

          invalidatePendingOriginal();
          applyOriginalQuantityPreset();
        }
      );
    }

    if (
      from &&
      to &&
      quantity
    ) {
      quantity.value = "50";
      applyOriginalQuantityPreset();
    }
    else {
      updateOriginalRangeSummary();
    }
  }

  function installOfflineReceiptPreview() {

    installOfflineReceiptPdfGenerator();

    el("offlineReceiptEntryButton")
      ?.addEventListener(
        "click",
        openOfflineReceiptEntry
      );

    document
      .querySelectorAll(
        "[data-offline-receipt-close]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          closeOfflineReceiptEntry
        );
      });

    document
      .querySelectorAll(
        "[data-offline-preview-close]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          closeOfflineReceiptPreview
        );
      });

    el("offlineReceiptEntryForm")
      ?.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();

          try {
            showEntryMessage("");

            const data =
              collectPreviewForm();

            showOfflineReceiptPreview(data);
          }
          catch (error) {
            showEntryMessage(
              error?.message ||
              "Unable to preview receipt."
            );
          }
        }
      );

    el("offlineReceiptPreviewEdit")
      ?.addEventListener(
        "click",
        editOfflineReceiptPreview
      );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      installOfflineReceiptPreview,
      { once: true }
    );
  } else {
    installOfflineReceiptPreview();
  }

})();
