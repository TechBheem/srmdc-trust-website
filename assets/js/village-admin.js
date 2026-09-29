(() => {
  "use strict";

  const state = {
    villages: [],
    currentVillage: null,
    donorRows: [],
    editingCommitmentId: null
  };

  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  function el(id) {
    return document.getElementById(id);
  }

  function getClient() {
    return window.srmdcSupabase || null;
  }
  function setText(id, value) {
    const node = el(id);
    if (node) node.textContent = value ?? "—";
  }

  function showMessage(text) {
    const node = el("villageAdminMessage");
    if (!node) return;

    node.textContent = text || "";
    node.classList.toggle("hidden", !text);
  }

  function openTab(name) {
    document.querySelectorAll(".village-admin-tab").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.villageTab === name
      );
    });

    document.querySelectorAll(".village-admin-panel").forEach((panel) => {
      panel.classList.toggle(
        "active",
        panel.dataset.villagePanel === name
      );
    });
  }

  function showDashboard() {
    const villageView = el("villageAdminView");
    const dashboard = el("dashboardView");

    if (villageView) villageView.classList.add("hidden");
    if (dashboard) dashboard.classList.remove("hidden");
  }

  function hideOtherViews() {
    const villageView = el("villageAdminView");
    const dashboard = el("dashboardView");

    if (dashboard) dashboard.classList.add("hidden");

    document.querySelectorAll(".admin-view").forEach((view) => {
      if (view !== villageView) view.classList.add("hidden");
    });
  }

  async function openVillageView() {
    const moduleMessage = el("moduleMessage");

    if (moduleMessage) {
      moduleMessage.classList.add("hidden");
    }
    const view = el("villageAdminView");

    if (!view) {
      console.error("Village Admin view is not installed.");
      return;
    }

    hideOtherViews();
    view.classList.remove("hidden");

    if (!state.villages.length) {
      await loadVillages();
    }
  }


  async function loadVillages() {
    const client = getClient();

    if (!client) {
      showMessage("Supabase client is unavailable. Refresh Admin.");
      return;
    }

    showMessage("Loading village access...");

    const { data, error } = await client
      .from("villages")
      .select(
        "id,slug,name,name_telugu,portal_title,portal_subtitle,is_active"
      )
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Village load failed:", error);
      showMessage("Unable to load villages: " + error.message);
      return;
    }

    state.villages = data || [];

    const selector = el("villageAdminSelector");

    if (!selector) {
      return;
    }

    selector.innerHTML = "";

    if (!state.villages.length) {
      const option = document.createElement("option");

      option.value = "";
      option.textContent = "No villages assigned";

      selector.appendChild(option);

      showMessage(
        "No active village is available for this administrator."
      );

      return;
    }

    state.villages.forEach((village) => {
      const option = document.createElement("option");

      option.value = village.id;
      option.textContent =
        village.portal_title ||
        village.name_telugu ||
        village.name;

      selector.appendChild(option);
    });

    showMessage("");

    await selectVillage(state.villages[0].id);
  }

  async function selectVillage(villageId) {
    const village = state.villages.find(
      (item) => item.id === villageId
    );

    if (!village) {
      return;
    }

    state.currentVillage = village;

    setText(
      "villageAdminTitle",
      village.portal_title ||
        village.name_telugu ||
        village.name
    );

    setText(
      "villageAdminSubtitle",
      village.portal_subtitle || village.name
    );

    setText(
      "vaVillageName",
      village.name_telugu || village.name
    );

    setText(
      "vaPortalTitle",
      village.portal_title || village.name
    );

    setText(
      "vaVillageStatus",
      village.is_active ? "Active" : "Inactive"
    );

    await Promise.all([
      loadSettings(),
      loadOverview(),
      loadDonors()
    ]);
  }

  async function loadSettings() {
    const client = getClient();
    const village = state.currentVillage;

    if (!client || !village) {
      return;
    }

    const { data, error } = await client
      .from("village_settings")
      .select("interest_rate_monthly")
      .eq("village_id", village.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Village settings load failed:",
        error
      );

      setText("vaInterestRate", "-");
      return;
    }

    const rate = Number(
      data?.interest_rate_monthly || 0
    );

    setText(
      "vaInterestRate",
      `${rate}% / month`
    );
  }

  async function loadOverview() {
    const client = getClient();
    const village = state.currentVillage;

    if (!client || !village) {
      return;
    }

    const villageId = village.id;

    const results = await Promise.all([
      client
        .from("village_commitments")
        .select("committed_amount")
        .eq("village_id", villageId)
        .eq("is_cancelled", false),

      client
        .from("village_commitment_payments")
        .select("amount")
        .eq("village_id", villageId),

      client
        .from("village_expenses")
        .select("amount_paid,status")
        .eq("village_id", villageId)
        .neq("status", "cancelled"),

      client
        .from("temple_fund_transactions")
        .select("transaction_type,amount")
        .eq("village_id", villageId)
    ]);

    const commitments = results[0];
    const payments = results[1];
    const expenseRows = results[2];
    const temple = results[3];

    results.forEach((result) => {
      if (result.error) {
        console.error(
          "Village overview query failed:",
          result.error
        );
      }
    });

    const committed =
      (commitments.data || []).reduce(
        (sum, row) =>
          sum + Number(row.committed_amount || 0),
        0
      );

    const received =
      (payments.data || []).reduce(
        (sum, row) =>
          sum + Number(row.amount || 0),
        0
      );

    const expenses =
      (expenseRows.data || []).reduce(
        (sum, row) =>
          sum + Number(row.amount_paid || 0),
        0
      );

    let templeBalance = 0;

    (temple.data || []).forEach((row) => {
      const amount = Number(row.amount || 0);

      if (
        [
          "opening_balance",
          "deposit",
          "principal_repayment",
          "interest_received"
        ].includes(row.transaction_type)
      ) {
        templeBalance += amount;
      }

      if (
        [
          "principal_given",
          "expense"
        ].includes(row.transaction_type)
      ) {
        templeBalance -= amount;
      }
    });

    setText(
      "vaCommitted",
      money.format(committed)
    );

    setText(
      "vaReceived",
      money.format(received)
    );

    setText(
      "vaExpenses",
      money.format(expenses)
    );

    setText(
      "vaTempleFund",
      money.format(templeBalance)
    );
  }

  function formatVillageDate(value) {
    if (!value) return "-";

    const parts = String(value).split("-");

    if (parts.length !== 3) {
      return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function donorStatus(commitment, received) {
    if (commitment.is_cancelled) {
      return "Cancelled";
    }

    const committed = Number(
      commitment.committed_amount || 0
    );

    if (received <= 0) {
      return "Pending";
    }

    if (received < committed) {
      return "Part Payment";
    }

    return "Received";
  }

  function donorStatusClass(status) {
    return String(status)
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  function escapeVillageHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setDonorStatus(text) {
    const node = el("villageDonorStatus");

    if (node) {
      node.textContent = text || "";
    }
  }

  function renderDonors(rows) {
    const body = el("villageDonorTableBody");

    if (!body) {
      return;
    }

    const search =
      (el("villageDonorSearch")?.value || "")
        .trim()
        .toLowerCase();

    const filtered = rows.filter((row) => {
      if (!search) return true;

      return [
        row.donor_name,
        row.residence
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search)
      );
    });

    if (!filtered.length) {
      body.innerHTML = `
        <tr>
          <td
            colspan="12"
            class="village-donor-empty"
          >
            ${
              rows.length
                ? "No matching donor commitments."
                : "\u0C35\u0C3F\u0C30\u0C3E\u0C33 \u0C39\u0C3E\u0C2E\u0C40\u0C32\u0C41 \u0C05\u0C02\u0C26\u0C41\u0C2C\u0C3E\u0C1F\u0C41\u0C32\u0C4B \u0C32\u0C47\u0C35\u0C41."
            }
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML = filtered
      .map((row, index) => {
        const statusClass =
          donorStatusClass(row.calculated_status);

        return `
          <tr>
            <td>${index + 1}</td>

            <td>
              <strong>
                ${escapeVillageHtml(row.donor_name)}
              </strong>
            </td>

            <td>
              ${escapeVillageHtml(row.residence || "-")}
            </td>

            <td>
              ${formatVillageDate(row.commitment_date)}
            </td>

            <td class="amount-column">
              ${money.format(row.committed)}
            </td>

            <td class="amount-column">
              ${money.format(row.received)}
            </td>

            <td class="amount-column">
              ${money.format(row.pending)}
            </td>

            <td>
              <span
                class="village-donor-status-badge ${statusClass}"
              >
                ${escapeVillageHtml(row.calculated_status)}
              </span>
            </td>

            <td>
              ${formatVillageDate(row.last_payment_date)}
            </td>

            <td>
              <div class="village-donor-row-actions">
                <button
                  type="button"
                  class="secondary-button"
                  data-donor-history="${escapeVillageHtml(row.id)}"
                  title="View payment history"
                >
                  History
                </button>

                <button
                  type="button"
                  class="secondary-button"
                  data-donor-edit="${escapeVillageHtml(row.id)}"
                  title="Edit commitment"
                >
                  Edit
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadDonors() {
    const client = getClient();
    const village = state.currentVillage;

    if (!client || !village) {
      return;
    }

    setDonorStatus("Loading donor commitments...");

    const results = await Promise.all([
      client
        .from("village_commitments")
        .select(
          "id,village_id,activity_id,donor_name,residence,commitment_date,committed_amount,expected_payment_date,notes,is_cancelled"
        )
        .eq("village_id", village.id)
        .order("commitment_date", {
          ascending: true,
          nullsFirst: false
        })
        .order("created_at", {
          ascending: true
        }),

      client
        .from("village_commitment_payments")
        .select(
          "id,village_id,commitment_id,payment_date,amount,payment_mode,reference_number,receipt_number,notes"
        )
        .eq("village_id", village.id)
        .order("payment_date", {
          ascending: true
        })
    ]);

    const commitmentResult = results[0];
    const paymentResult = results[1];

    if (commitmentResult.error) {
      console.error(
        "Unable to load village commitments:",
        commitmentResult.error
      );

      setDonorStatus(
        `Unable to load commitments: ${commitmentResult.error.message}`
      );

      return;
    }

    if (paymentResult.error) {
      console.error(
        "Unable to load commitment payments:",
        paymentResult.error
      );

      setDonorStatus(
        `Unable to load payments: ${paymentResult.error.message}`
      );

      return;
    }

    const paymentsByCommitment = new Map();

    (paymentResult.data || []).forEach((payment) => {
      const existing =
        paymentsByCommitment.get(
          payment.commitment_id
        ) || [];

      existing.push(payment);

      paymentsByCommitment.set(
        payment.commitment_id,
        existing
      );
    });

    const rows = (commitmentResult.data || [])
      .map((commitment) => {
        const payments =
          paymentsByCommitment.get(
            commitment.id
          ) || [];

        const received = payments.reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        );

        const committed = Number(
          commitment.committed_amount || 0
        );

        const pending = Math.max(
          committed - received,
          0
        );

        const lastPayment =
          payments.length
            ? payments[payments.length - 1]
            : null;

        return {
          ...commitment,
          committed,
          received,
          pending,
          calculated_status:
            donorStatus(commitment, received),
          last_payment_date:
            lastPayment?.payment_date || null
        };
      });

    state.donorRows = rows;

    const activeRows = rows.filter(
      (row) => !row.is_cancelled
    );

    const committedTotal =
      activeRows.reduce(
        (sum, row) =>
          sum + row.committed,
        0
      );

    const receivedTotal =
      activeRows.reduce(
        (sum, row) =>
          sum + row.received,
        0
      );

    const pendingTotal =
      activeRows.reduce(
        (sum, row) =>
          sum + row.pending,
        0
      );

    const partPayments =
      activeRows.filter(
        (row) =>
          row.received > 0 &&
          row.received < row.committed
      ).length;

    setText(
      "villageDonorCommitted",
      money.format(committedTotal)
    );

    setText(
      "villageDonorReceived",
      money.format(receivedTotal)
    );

    setText(
      "villageDonorPending",
      money.format(pendingTotal)
    );

    setText(
      "villageDonorPartPayments",
      String(partPayments)
    );

    setText(
      "villageDonorTableCommitted",
      money.format(committedTotal)
    );

    setText(
      "villageDonorTableReceived",
      money.format(receivedTotal)
    );

    setText(
      "villageDonorTablePending",
      money.format(pendingTotal)
    );

    renderDonors(rows);

    setDonorStatus(
      rows.length
        ? `${rows.length} \u0C35\u0C3F\u0C30\u0C3E\u0C33 \u0C39\u0C3E\u0C2E\u0C40 \u0C35\u0C3F\u0C35\u0C30\u0C3E\u0C32\u0C41 \u0C32\u0C4B\u0C21\u0C4D \u0C05\u0C2F\u0C4D\u0C2F\u0C3E\u0C2F\u0C3F.`
        : "\u0C07\u0C02\u0C15\u0C3E \u0C35\u0C3F\u0C30\u0C3E\u0C33 \u0C39\u0C3E\u0C2E\u0C40\u0C32\u0C41 \u0C28\u0C2E\u0C4B\u0C26\u0C41 \u0C15\u0C3E\u0C32\u0C47\u0C26\u0C41."
    );
  }
  // PHASE 1D-1C1B - DONATION SAVE
  function setDonationSaveState(isSaving) {
    const button = el("villageDonationSaveButton");

    if (!button) {
      return;
    }

    button.disabled = Boolean(isSaving);

    button.textContent = isSaving
      ? "\u0C38\u0C47\u0C35\u0C4D \u0C1A\u0C47\u0C38\u0C4D\u0C24\u0C41\u0C28\u0C4D\u0C28\u0C3E\u0C02..."
      : "\u0C35\u0C3F\u0C30\u0C3E\u0C33\u0C3E\u0C28\u0C4D\u0C28\u0C3F \u0C38\u0C47\u0C35\u0C4D \u0C1A\u0C47\u0C2F\u0C3F";
  }

  function resetDonationForm() {
    state.editingCommitmentId = null;

    const form = el("villageDonationForm");

    if (form) {
      form.reset();
    }

    const amount = el("villageDonationCommittedAmount");

    if (amount) {
      amount.value = "10000";
    }

    const receivedPreview =
      el("villageDonationReceivedPreview");

    if (receivedPreview) {
      receivedPreview.textContent =
        money.format(0);
    }

    const saveButton =
      el("villageDonationSaveButton");

    if (saveButton) {
      saveButton.textContent =
        "\u0C35\u0C3F\u0C30\u0C3E\u0C33\u0C3E\u0C28\u0C4D\u0C28\u0C3F \u0C38\u0C47\u0C35\u0C4D \u0C1A\u0C47\u0C2F\u0C3F";
    }
  }

  function validateDonationCommitment() {
    const donorName =
      (el("villageDonationDonorName")?.value || "")
        .trim();

    const commitmentDate =
      el("villageDonationCommitmentDate")?.value || "";

    const committedAmount =
      Number(
        el("villageDonationCommittedAmount")?.value || 0
      );

    if (!donorName) {
      return {
        valid: false,
        message:
          "\u0C26\u0C3E\u0C24 \u0C2A\u0C47\u0C30\u0C41 \u0C24\u0C2A\u0C4D\u0C2A\u0C28\u0C3F\u0C38\u0C30\u0C3F\u0C17\u0C3E \u0C28\u0C2E\u0C4B\u0C26\u0C41 \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F."
      };
    }

    if (!commitmentDate) {
      return {
        valid: false,
        message:
          "\u0C35\u0C3F\u0C30\u0C3E\u0C33 \u0C39\u0C3E\u0C2E\u0C40 \u0C24\u0C47\u0C26\u0C40\u0C28\u0C3F \u0C0E\u0C02\u0C1A\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F."
      };
    }

    if (
      !Number.isFinite(committedAmount) ||
      committedAmount <= 0
    ) {
      return {
        valid: false,
        message:
          "\u0C39\u0C3E\u0C2E\u0C40 \u0C2E\u0C4A\u0C24\u0C4D\u0C24\u0C02 \u0C38\u0C41\u0C28\u0C4D\u0C28\u0C3E \u0C15\u0C02\u0C1F\u0C47 \u0C0E\u0C15\u0C4D\u0C15\u0C41\u0C35\u0C17\u0C3E \u0C09\u0C02\u0C21\u0C3E\u0C32\u0C3F."
      };
    }

    return {
      valid: true,
      donorName,
      commitmentDate,
      committedAmount
    };
  }

  function getDonorRowById(commitmentId) {
    return (state.donorRows || []).find(
      (row) =>
        String(row.id) ===
        String(commitmentId)
    ) || null;
  }

  function openDonationEdit(commitmentId) {
    const row =
      getDonorRowById(commitmentId);

    if (!row) {
      setDonorStatus(
        "Unable to find the selected donor commitment."
      );
      return;
    }

    state.editingCommitmentId = row.id;

    const panel =
      el("villageDonationFormPanel");

    if (panel) {
      panel.classList.remove("hidden");
    }

    const donorName =
      el("villageDonationDonorName");

    const residence =
      el("villageDonationResidence");

    const commitmentDate =
      el("villageDonationCommitmentDate");

    const committedAmount =
      el("villageDonationCommittedAmount");

    const expectedDate =
      el("villageDonationExpectedDate");

    const notes =
      el("villageDonationNotes");

    const receivedPreview =
      el("villageDonationReceivedPreview");

    if (donorName) {
      donorName.value =
        row.donor_name || "";
    }

    if (residence) {
      residence.value =
        row.residence || "";
    }

    if (commitmentDate) {
      commitmentDate.value =
        row.commitment_date || "";
    }

    if (committedAmount) {
      committedAmount.value =
        String(row.committed || 0);
    }

    if (expectedDate) {
      expectedDate.value =
        row.expected_payment_date || "";
    }

    if (notes) {
      notes.value =
        row.notes || "";
    }

    if (receivedPreview) {
      receivedPreview.textContent =
        money.format(row.received || 0);
    }

    const saveButton =
      el("villageDonationSaveButton");

    if (saveButton) {
      saveButton.textContent =
        "\u0C2E\u0C3E\u0C30\u0C4D\u0C2A\u0C41\u0C32\u0C28\u0C41 \u0C38\u0C47\u0C35\u0C4D \u0C1A\u0C47\u0C2F\u0C3F";
    }

    setDonorStatus(
      "Editing existing donor commitment."
    );

    panel?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function closeDonorHistory() {
    const panel =
      el("villageDonorHistoryPanel");

    if (panel) {
      panel.classList.add("hidden");
    }
  }

  async function openDonorHistory(commitmentId) {
    const row =
      getDonorRowById(commitmentId);

    const client =
      getClient();

    if (!row || !client) {
      setDonorStatus(
        "Unable to load donor history."
      );
      return;
    }

    const panel =
      el("villageDonorHistoryPanel");

    if (panel) {
      panel.classList.remove("hidden");
    }

    setText(
      "villageDonorHistoryName",
      row.donor_name || "Payment History"
    );

    setText(
      "villageDonorHistoryResidence",
      row.residence || ""
    );

    setText(
      "villageDonorHistoryCommitted",
      money.format(row.committed || 0)
    );

    setText(
      "villageDonorHistoryReceived",
      money.format(row.received || 0)
    );

    setText(
      "villageDonorHistoryPending",
      money.format(row.pending || 0)
    );

    const body =
      el("villageDonorHistoryBody");

    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="7">
            Loading payment history...
          </td>
        </tr>
      `;
    }

    const { data, error } =
      await client
        .from("village_commitment_payments")
        .select(
          "id,payment_date,amount,payment_mode,reference_number,receipt_number,notes"
        )
        .eq(
          "commitment_id",
          row.id
        )
        .order(
          "payment_date",
          { ascending: true }
        )
        .order(
          "created_at",
          { ascending: true }
        );

    if (error) {
      console.error(
        "Unable to load donor payment history:",
        error
      );

      if (body) {
        body.innerHTML = `
          <tr>
            <td colspan="7">
              Unable to load payment history.
            </td>
          </tr>
        `;
      }

      return;
    }

    const payments =
      data || [];

    if (!payments.length) {
      if (body) {
        body.innerHTML = `
          <tr>
            <td colspan="7">
              No payments recorded yet.
            </td>
          </tr>
        `;
      }

      return;
    }

    if (body) {
      body.innerHTML =
        payments
          .map(
            (payment, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>
                  ${formatVillageDate(
                    payment.payment_date
                  )}
                </td>
                <td class="amount-column village-positive-amount">
                  ${money.format(
                    Number(payment.amount || 0)
                  )}
                </td>
                <td>
                  ${escapeVillageHtml(
                    payment.payment_mode || "-"
                  )}
                </td>
                <td>
                  ${escapeVillageHtml(
                    payment.reference_number || "-"
                  )}
                </td>
                <td>
                  ${escapeVillageHtml(
                    payment.receipt_number || "-"
                  )}
                </td>
                <td>
                  ${escapeVillageHtml(
                    payment.notes || "-"
                  )}
                </td>
              </tr>
            `
          )
          .join("");
    }

    panel?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
  async function saveDonationCommitment() {
    const client = getClient();
    const village = state.currentVillage;

    if (!client) {
      setDonorStatus(
        "\u0C21\u0C47\u0C1F\u0C3E\u0C2C\u0C47\u0C38\u0C4D \u0C15\u0C28\u0C46\u0C15\u0C4D\u0C37\u0C28\u0C4D \u0C05\u0C02\u0C26\u0C41\u0C2C\u0C3E\u0C1F\u0C41\u0C32\u0C4B \u0C32\u0C47\u0C26\u0C41."
      );

      return;
    }

    if (!village?.id) {
      setDonorStatus(
        "\u0C17\u0C4D\u0C30\u0C3E\u0C2E\u0C3E\u0C28\u0C4D\u0C28\u0C3F \u0C0E\u0C02\u0C1A\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F."
      );

      return;
    }

    const validation =
      validateDonationCommitment();

    if (!validation.valid) {
      setDonorStatus(validation.message);
      return;
    }

    const residence =
      (el("villageDonationResidence")?.value || "")
        .trim();

    const expectedDate =
      el("villageDonationExpectedDate")?.value || "";

    const notes =
      (el("villageDonationNotes")?.value || "")
        .trim();

    const editingRow =
      state.editingCommitmentId
        ? getDonorRowById(
            state.editingCommitmentId
          )
        : null;

    if (
      editingRow &&
      validation.committedAmount <
        Number(editingRow.received || 0)
    ) {
      setDonorStatus(
        "Committed amount cannot be less than the amount already received (" +
          money.format(
            editingRow.received || 0
          ) +
          ")."
      );

      return;
    }
    const payload = {
      village_id: village.id,
      donor_name: validation.donorName,
      residence: residence || null,
      commitment_date:
        validation.commitmentDate,
      committed_amount:
        validation.committedAmount,
      expected_payment_date:
        expectedDate || null,
      notes: notes || null,
      is_cancelled: false
    };

    setDonationSaveState(true);

    setDonorStatus(
      "\u0C35\u0C3F\u0C30\u0C3E\u0C33 \u0C39\u0C3E\u0C2E\u0C40\u0C28\u0C3F \u0C38\u0C47\u0C35\u0C4D \u0C1A\u0C47\u0C38\u0C4D\u0C24\u0C41\u0C28\u0C4D\u0C28\u0C3E\u0C02..."
    );

    try {
      let saveQuery =
        client
          .from("village_commitments");

      const { error } =
        state.editingCommitmentId
          ? await saveQuery
              .update(payload)
              .eq(
                "id",
                state.editingCommitmentId
              )
              .eq(
                "village_id",
                village.id
              )
          : await saveQuery
              .insert(payload);

      if (error) {
        console.error(
          "Unable to save village commitment:",
          error
        );

        setDonorStatus(
          "\u0C35\u0C3F\u0C30\u0C3E\u0C33 \u0C39\u0C3E\u0C2E\u0C40\u0C28\u0C3F \u0C38\u0C47\u0C35\u0C4D \u0C1A\u0C47\u0C2F\u0C32\u0C47\u0C15\u0C2A\u0C4B\u0C2F\u0C3E\u0C02: " +
            error.message
        );

        return;
      }

      const wasEditing =
        Boolean(state.editingCommitmentId);

      resetDonationForm();

      const panel =
        el("villageDonationFormPanel");

      if (panel) {
        panel.classList.add("hidden");
      }

      await loadDonors();

      setDonorStatus(
        wasEditing
          ? "\u0C35\u0C3F\u0C30\u0C3E\u0C33\u0C3E\u0C32\u0C41 \u0C35\u0C3F\u0C1C\u0C2F\u0C35\u0C02\u0C24\u0C02\u0C17\u0C3E \u0C2E\u0C3E\u0C30\u0C4D\u0C1A\u0C2C\u0C21\u0C4D\u0C21\u0C3E\u0C2F\u0C3F."
          : "\u0C35\u0C3F\u0C30\u0C3E\u0C33 \u0C39\u0C3E\u0C2E\u0C40 \u0C35\u0C3F\u0C1C\u0C2F\u0C35\u0C02\u0C24\u0C02\u0C17\u0C3E \u0C28\u0C2E\u0C4B\u0C26\u0C48\u0C02\u0C26\u0C3F."
      );
    } catch (error) {
      console.error(
        "Unexpected village commitment save error:",
        error
      );

      setDonorStatus(
        "\u0C35\u0C3F\u0C30\u0C3E\u0C33 \u0C39\u0C3E\u0C2E\u0C40\u0C28\u0C3F \u0C38\u0C47\u0C35\u0C4D \u0C1A\u0C47\u0C38\u0C47\u0C1F\u0C2A\u0C4D\u0C2A\u0C41\u0C21\u0C41 \u0C32\u0C4B\u0C2A\u0C02 \u0C35\u0C1A\u0C4D\u0C1A\u0C3F\u0C02\u0C26\u0C3F."
      );
    } finally {
      setDonationSaveState(false);
    }
  }
  function setPaymentMessage(message) {
    const node = el("villagePaymentFormMessage");

    if (node) {
      node.textContent = message || "";
    }
  }

  function getActivePayableCommitments() {
    return (state.donorRows || []).filter(
      (row) =>
        !row.is_cancelled &&
        Number(row.pending || 0) > 0
    );
  }

  function populatePaymentCommitments() {
    const select = el("villagePaymentCommitment");

    if (!select) {
      return;
    }

    const rows = getActivePayableCommitments();

    select.innerHTML =
      '<option value="">Select donor commitment</option>' +
      rows
        .map(
          (row) =>
            `<option
              value="${escapeVillageHtml(row.id)}"
              data-committed="${Number(row.committed || 0)}"
              data-received="${Number(row.received || 0)}"
              data-pending="${Number(row.pending || 0)}"
            >${escapeVillageHtml(
              row.donor_name
            )} - ${escapeVillageHtml(
              money.format(row.pending)
            )} pending</option>`
        )
        .join("");
  }

  function getSelectedPaymentCommitment() {
    const id =
      el("villagePaymentCommitment")?.value || "";

    return (state.donorRows || []).find(
      (row) => String(row.id || "") === String(id)
    ) || null;
  }

  function updatePaymentSummary() {
    const select =
      el("villagePaymentCommitment");

    const option =
      select?.selectedOptions?.[0] || null;

    const hasSelection =
      Boolean(select?.value);

    const committed =
      hasSelection
        ? Number(option?.dataset?.committed || 0)
        : 0;

    const received =
      hasSelection
        ? Number(option?.dataset?.received || 0)
        : 0;

    const pending =
      hasSelection
        ? Number(option?.dataset?.pending || 0)
        : 0;

    const committedField =
      el("villagePaymentCommitted");

    const receivedField =
      el("villagePaymentAlreadyReceived");

    const pendingField =
      el("villagePaymentPending");

    if (committedField) {
      committedField.value =
        money.format(committed);
    }

    if (receivedField) {
      receivedField.value =
        money.format(received);
    }

    if (pendingField) {
      pendingField.value =
        money.format(pending);
    }

    const amount =
      el("villagePaymentAmount");

    if (amount) {
      amount.value = "";

      if (hasSelection) {
        amount.max =
          String(pending);
      } else {
        amount.removeAttribute("max");
      }
    }
  }

  function resetPaymentForm() {
    const form = el("villagePaymentForm");

    if (form) {
      form.reset();
    }

    setPaymentMessage("");

    populatePaymentCommitments();
    updatePaymentSummary();
  }

  function closePaymentForm() {
    el("villagePaymentFormPanel")
      ?.classList.add("hidden");

    resetPaymentForm();
  }

  function resetAutomaticReceiptField() {
    const receiptField =
      el("villagePaymentReceipt");

    if (receiptField) {
      receiptField.value =
        "Auto-generated on save";
    }
  }
  function openPaymentForm() {
    resetAutomaticReceiptField();
    const panel = el("villagePaymentFormPanel");

    if (!panel) {
      return;
    }

    const rows = getActivePayableCommitments();

    if (!rows.length) {
      setDonorStatus(
        "No donor commitments with a pending amount are available. Add a commitment first."
      );

      panel.classList.add("hidden");
      return;
    }

    el("villageDonationFormPanel")
      ?.classList.add("hidden");

    resetPaymentForm();

    panel.classList.remove("hidden");

    el("villagePaymentCommitment")?.focus();
  }

  function setPaymentSaveState(isSaving) {
    const button = el("villagePaymentSaveButton");

    if (!button) {
      return;
    }

    button.disabled = Boolean(isSaving);
    button.textContent =
      isSaving
        ? "Saving..."
        : "Save Payment";
  }

  function validatePaymentEntry() {
    const row = getSelectedPaymentCommitment();

    if (!row) {
      return {
        valid: false,
        message: "Select a donor commitment."
      };
    }

    const paymentDate =
      el("villagePaymentDate")?.value || "";

    if (!paymentDate) {
      return {
        valid: false,
        message: "Select the payment date."
      };
    }

    const amount = Number(
      el("villagePaymentAmount")?.value || 0
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        valid: false,
        message: "Enter a payment amount greater than zero."
      };
    }

    const pending = Number(row.pending || 0);

    if (amount > pending) {
      return {
        valid: false,
        message:
          `Payment cannot exceed the pending amount ${money.format(
            pending
          )}.`
      };
    }

    return {
      valid: true,
      row,
      paymentDate,
      amount
    };
  }

  async function saveVillagePayment() {
    const client = getClient();
    const village = state.currentVillage;

    if (!client) {
      setPaymentMessage(
        "Database connection is not available."
      );
      return;
    }

    if (!village?.id) {
      setPaymentMessage(
        "Select a village first."
      );
      return;
    }

    const validation = validatePaymentEntry();

    if (!validation.valid) {
      setPaymentMessage(validation.message);
      return;
    }

    const mode =
      el("villagePaymentMode")?.value.trim() || "";

    const reference =
      el("villagePaymentReference")?.value.trim() || "";


    const notes =
      el("villagePaymentNotes")?.value.trim() || "";

    const payload = {
      village_id: village.id,
      commitment_id: validation.row.id,
      payment_date: validation.paymentDate,
      amount: validation.amount,
      payment_mode: mode || null,
      reference_number: reference || null,
      notes: notes || null
    };

    setPaymentSaveState(true);
    setPaymentMessage("Saving payment...");

    try {
      const receiptField =
        el("villagePaymentReceipt");

      if (receiptField) {
        receiptField.value =
          "Generating receipt...";
      }

      const {
        data: receiptNumber,
        error: receiptError
      } =
        await client.rpc(
          "next_village_donation_receipt",
          {
            p_village_id: village.id,
            p_payment_date:
              validation.paymentDate
          }
        );

      if (receiptError) {
        console.error(
          "Unable to generate village donation receipt:",
          receiptError
        );

        if (receiptField) {
          receiptField.value =
            "Auto-generated on save";
        }

        setPaymentMessage(
          `Unable to generate receipt: ${receiptError.message}`
        );

        return;
      }

      if (
        !receiptNumber ||
        !/^MB-VD-\d{4}-\d{4,}$/.test(
          String(receiptNumber)
        )
      ) {
        console.error(
          "Invalid village donation receipt number:",
          receiptNumber
        );

        if (receiptField) {
          receiptField.value =
            "Auto-generated on save";
        }

        setPaymentMessage(
          "Unable to generate a valid receipt number."
        );

        return;
      }

      payload.receipt_number =
        String(receiptNumber);

      if (receiptField) {
        receiptField.value =
          payload.receipt_number;
      }

      const { error } =
        await client
          .from("village_commitment_payments")
          .insert(payload);

      if (error) {
        console.error(
          "Unable to save village payment:",
          error
        );

        setPaymentMessage(
          `Unable to save payment: ${error.message}`
        );

        return;
      }

      closePaymentForm();

      await loadDonors();

      setDonorStatus(
        `Payment of ${money.format(
          validation.amount
        )} recorded for ${validation.row.donor_name}. Receipt: ${payload.receipt_number}.`
      );
    } catch (error) {
      console.error(
        "Unexpected payment save error:",
        error
      );

      setPaymentMessage(
        "Unexpected error while saving payment."
      );
    } finally {
      setPaymentSaveState(false);
    }
  }
  function bindVillageAdminEvents() {
    const selector = el("villageAdminSelector");

    if (selector) {
      selector.addEventListener("change", async (event) => {
        await selectVillage(event.target.value);
      });
    }

    const backButton = el("villageAdminBack");

    if (backButton) {
      backButton.addEventListener("click", () => {
        showDashboard();
      });
    }

    document
      .querySelectorAll(".village-admin-tab")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const tabName = button.dataset.villageTab;

          openTab(tabName);

          if (tabName === "temple") {
            await loadTempleFund();
          }
          if (tabName === "donations") {
            await loadDonors();
          }
        });
      });
  }


  function parseVillageCommitmentCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    const normalizedText = String(text || "")
      .replace(/^\uFEFF/, "");

    for (let index = 0; index < normalizedText.length; index += 1) {
      const char = normalizedText[index];
      const next = normalizedText[index + 1];

      if (char === '"') {
        if (quoted && next === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }

        continue;
      }

      if (char === "," && !quoted) {
        row.push(field);
        field = "";
        continue;
      }

      if (
        (char === "\n" || char === "\r") &&
        !quoted
      ) {
        if (
          char === "\r" &&
          next === "\n"
        ) {
          index += 1;
        }

        row.push(field);

        if (
          row.some((value) =>
            String(value || "").trim()
          )
        ) {
          rows.push(row);
        }

        row = [];
        field = "";
        continue;
      }

      field += char;
    }

    row.push(field);

    if (
      row.some((value) =>
        String(value || "").trim()
      )
    ) {
      rows.push(row);
    }

    return rows;
  }

  function normalizeVillageCsvHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function normalizeVillageDuplicateValue(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function parseVillageImportDate(value) {
    const raw = String(value || "").trim();

    if (!raw) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const indianDate =
      raw.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      );

    if (!indianDate) {
      return null;
    }

    const day =
      String(indianDate[1]).padStart(2, "0");

    const month =
      String(indianDate[2]).padStart(2, "0");

    const year = indianDate[3];

    const candidate =
      `${year}-${month}-${day}`;

    const parsed =
      new Date(`${candidate}T00:00:00`);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== Number(year) ||
      parsed.getMonth() + 1 !== Number(month) ||
      parsed.getDate() !== Number(day)
    ) {
      return null;
    }

    return candidate;
  }

  function formatVillageImportAmount(value) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
      }
    ).format(Number(value || 0));
  }

  function buildVillageImportKey(
    donorName,
    committedAmount
  ) {
    return [
      normalizeVillageDuplicateValue(donorName),
      Number(committedAmount || 0).toFixed(2)
    ].join("|");
  }

  function validateVillageCommitmentCsv(text) {
    const csvRows =
      parseVillageCommitmentCsv(text);

    if (csvRows.length < 2) {
      return {
        valid: false,
        message:
          "CSV must contain a header row and at least one commitment."
      };
    }

    const headers =
      csvRows[0].map(
        normalizeVillageCsvHeader
      );

    const requiredHeaders = [
      "donor_name",
      "committed_amount"
    ];

    const missingHeaders =
      requiredHeaders.filter(
        (header) =>
          !headers.includes(header)
      );

    if (missingHeaders.length) {
      return {
        valid: false,
        message:
          `Missing required CSV columns: ${missingHeaders.join(", ")}`
      };
    }

    const indexOf = (header) =>
      headers.indexOf(header);

    const donorIndex =
      indexOf("donor_name");

    const residenceIndex =
      indexOf("residence");

    const commitmentDateIndex =
      indexOf("commitment_date");

    const amountIndex =
      indexOf("committed_amount");

    const expectedDateIndex =
      indexOf("expected_payment_date");

    const notesIndex =
      indexOf("notes");

    const importedRows = [];
    const errors = [];
    const seenKeys = new Set();

    csvRows
      .slice(1)
      .forEach((columns, rowOffset) => {
        const rowNumber = rowOffset + 2;

        const valueAt = (index) => {
          if (index < 0) {
            return "";
          }

          return String(
            columns[index] || ""
          ).trim();
        };

        const donorName =
          valueAt(donorIndex);

        const residence =
          valueAt(residenceIndex);

        const commitmentDateRaw =
          valueAt(commitmentDateIndex);

        const amountRaw =
          valueAt(amountIndex)
            .replace(/[â‚¹,\s]/g, "");

        const expectedDateRaw =
          valueAt(expectedDateIndex);

        const notes =
          valueAt(notesIndex);

        if (!donorName) {
          errors.push(
            `Row ${rowNumber}: donor_name is required.`
          );
          return;
        }

        const committedAmount =
          Number(amountRaw);

        if (
          !Number.isFinite(committedAmount) ||
          committedAmount <= 0
        ) {
          errors.push(
            `Row ${rowNumber}: committed_amount must be greater than zero.`
          );
          return;
        }

        let commitmentDate = null;

        if (commitmentDateRaw) {
          commitmentDate =
            parseVillageImportDate(
              commitmentDateRaw
            );

          if (!commitmentDate) {
            errors.push(
              `Row ${rowNumber}: invalid commitment_date. Use DD/MM/YYYY or YYYY-MM-DD.`
            );
            return;
          }
        }

        let expectedPaymentDate = null;

        if (expectedDateRaw) {
          expectedPaymentDate =
            parseVillageImportDate(
              expectedDateRaw
            );

          if (!expectedPaymentDate) {
            errors.push(
              `Row ${rowNumber}: invalid expected_payment_date. Use DD/MM/YYYY or YYYY-MM-DD.`
            );
            return;
          }
        }

        const duplicateKey =
          buildVillageImportKey(
            donorName,
            committedAmount
          );

        if (seenKeys.has(duplicateKey)) {
          errors.push(
            `Row ${rowNumber}: duplicate donor and amount inside CSV (${donorName}).`
          );
          return;
        }

        seenKeys.add(duplicateKey);

        importedRows.push({
          donor_name: donorName,
          residence:
            residence || null,
          commitment_date:
            commitmentDate,
          committed_amount:
            committedAmount,
          expected_payment_date:
            expectedPaymentDate,
          notes:
            notes || null
        });
      });

    if (errors.length) {
      return {
        valid: false,
        message:
          errors.slice(0, 10).join("\n") +
          (
            errors.length > 10
              ? `\n...and ${errors.length - 10} more error(s).`
              : ""
          )
      };
    }

    return {
      valid: true,
      rows: importedRows
    };
  }

  async function importVillageCommitmentCsv(file) {
    const client = getClient();
    const village = state.currentVillage;

    if (!client) {
      alert(
        "Database connection is not available."
      );
      return;
    }

    if (!village?.id) {
      alert(
        "Select a village before importing commitments."
      );
      return;
    }

    if (!file) {
      return;
    }

    if (
      !String(file.name || "")
        .toLowerCase()
        .endsWith(".csv")
    ) {
      alert(
        "Please select a CSV file."
      );
      return;
    }

    let text = "";

    try {
      text = await file.text();
    } catch (error) {
      console.error(
        "Unable to read CSV:",
        error
      );

      alert(
        "Unable to read the selected CSV file."
      );

      return;
    }

    const validation =
      validateVillageCommitmentCsv(text);

    if (!validation.valid) {
      alert(
        `CSV validation failed:\n\n${validation.message}`
      );
      return;
    }

    const rows = validation.rows;

    if (!rows.length) {
      alert(
        "No valid commitments were found in the CSV."
      );
      return;
    }

    const existingResult =
      await client
        .from("village_commitments")
        .select(
          "id,donor_name,committed_amount"
        )
        .eq(
          "village_id",
          village.id
        );

    if (existingResult.error) {
      console.error(
        "Unable to check existing commitments:",
        existingResult.error
      );

      alert(
        `Unable to check existing commitments: ${existingResult.error.message}`
      );

      return;
    }

    const existingKeys =
      new Set(
        (existingResult.data || [])
          .map((row) =>
            buildVillageImportKey(
              row.donor_name,
              row.committed_amount
            )
          )
      );

    const duplicates =
      rows.filter((row) =>
        existingKeys.has(
          buildVillageImportKey(
            row.donor_name,
            row.committed_amount
          )
        )
      );

    if (duplicates.length) {
      const names =
        duplicates
          .slice(0, 10)
          .map(
            (row) =>
              `- ${row.donor_name} (${formatVillageImportAmount(row.committed_amount)})`
          )
          .join("\n");

      alert(
        `Import stopped.\n\n${duplicates.length} matching commitment(s) already exist in this village:\n\n${names}\n\nNo rows were imported.`
      );

      return;
    }

    const total =
      rows.reduce(
        (sum, row) =>
          sum +
          Number(
            row.committed_amount || 0
          ),
        0
      );

    const previewLines =
      rows.map(
        (row, index) =>
          `${index + 1}. ${row.donor_name} - ${formatVillageImportAmount(row.committed_amount)}`
      );

    const preview =
      [
        "VILLAGE DONATION CSV PREVIEW",
        "",
        `Village: ${village.name_telugu || village.name || village.slug || ""}`,
        `Commitments: ${rows.length}`,
        `Total Committed: ${formatVillageImportAmount(total)}`,
        "Received: â‚¹0.00 will be created by this import",
        "",
        "IMPORTANT:",
        "This imports commitments only.",
        "No payment rows and no interest are created.",
        "",
        ...previewLines,
        "",
        "Press OK to CONFIRM IMPORT.",
        "Press Cancel to make no database changes."
      ].join("\n");

    const confirmed =
      window.confirm(preview);

    if (!confirmed) {
      setDonorStatus(
        "CSV import cancelled. No commitments were added."
      );
      return;
    }

    const payload =
      rows.map((row) => ({
        village_id: village.id,
        activity_id: null,
        donor_name: row.donor_name,
        residence: row.residence,
        commitment_date:
          row.commitment_date,
        committed_amount:
          row.committed_amount,
        expected_payment_date:
          row.expected_payment_date,
        notes: row.notes,
        is_cancelled: false
      }));

    const insertResult =
      await client
        .from("village_commitments")
        .insert(payload)
        .select("id");

    if (insertResult.error) {
      console.error(
        "Village commitment CSV import failed:",
        insertResult.error
      );

      alert(
        `Import failed: ${insertResult.error.message}`
      );

      return;
    }

    await loadDonors();

    setDonorStatus(
      `${rows.length} commitments imported successfully. Total committed: ${formatVillageImportAmount(total)}. No payments were created.`
    );

    alert(
      `${rows.length} commitments imported successfully.\n\nTotal committed: ${formatVillageImportAmount(total)}\nPayments created: 0`
    );
  }

  function openVillageCommitmentCsvPicker() {
    const input =
      document.createElement("input");

    input.type = "file";
    input.accept =
      ".csv,text/csv";
    input.style.display = "none";

    input.addEventListener(
      "change",
      async () => {
        const file =
          input.files?.[0] || null;

        try {
          await importVillageCommitmentCsv(
            file
          );
        } finally {
          input.remove();
        }
      }
    );

    document.body.appendChild(input);
    input.click();
  }
  /* =========================================================
     PHASE 1E-1 TEMPLE FUND REGISTER + EXPORT
     Read-only register foundation.
     No accrued-interest calculation in this phase.
     ========================================================= */

  function setTempleStatus(message, isError = false) {
    const node = el("villageTempleStatus");

    if (!node) return;

    node.textContent = message || "";
    node.classList.toggle(
      "village-admin-status-error",
      Boolean(isError)
    );
  }

  function templeNumber(value) {
    const number = Number(value || 0);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  function templeStatusLabel(value) {
    const status =
      String(value || "active")
        .trim()
        .toLowerCase();

    const labels = {
      active: "Active",
      part_paid: "Part Paid",
      closed: "Closed",
      transferred: "Transferred",
      cancelled: "Cancelled"
    };

    return labels[status] || status || "-";
  }

  function calculateTempleAvailableCash(transactions) {
    let balance = 0;

    (transactions || []).forEach((row) => {
      const amount =
        templeNumber(row.amount);

      if (
        [
          "opening_balance",
          "deposit",
          "principal_repayment",
          "interest_received",
          "final_settlement"
        ].includes(row.transaction_type)
      ) {
        balance += amount;
      }

      if (
        [
          "principal_given",
          "expense"
        ].includes(row.transaction_type)
      ) {
        balance -= amount;
      }

      /*
       * Adjustment is intentionally excluded here.
       * Phase 1E settlement will define whether a specific
       * adjustment changes cash or only the account balance.
       */
    });

    return balance;
  }

  function buildTempleAccountRows(
    accounts,
    transactions
  ) {
    const txByAccount = new Map();

    (transactions || []).forEach((tx) => {
      if (!tx.account_id) return;

      if (!txByAccount.has(tx.account_id)) {
        txByAccount.set(
          tx.account_id,
          []
        );
      }

      txByAccount
        .get(tx.account_id)
        .push(tx);
    });

    return (accounts || []).map((account) => {
      const accountTransactions =
        txByAccount.get(account.id) || [];

      const principalRepaid =
        accountTransactions
          .filter(
            (tx) =>
              tx.transaction_type ===
              "principal_repayment"
          )
          .reduce(
            (sum, tx) =>
              sum + templeNumber(tx.amount),
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
              sum + templeNumber(tx.amount),
            0
          );

      const principal =
        templeNumber(
          account.principal_amount
        );

      const principalOutstanding =
        Math.max(
          0,
          principal - principalRepaid
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
              sum + templeNumber(tx.amount),
            0
          );

      const isFinalSettled =
        Boolean(account.settled_at) ||
        account.status === "closed";

      const calculationDate =
        isFinalSettled
          ? account.interest_calculated_upto
          : templeTodayDate();

      const calculatedInterest =
        isFinalSettled &&
        account.calculated_due_at_settlement !== null &&
        account.calculated_due_at_settlement !== undefined
          ? Math.max(
              0,
              templeNumber(
                account.calculated_due_at_settlement
              ) - principalOutstanding
            )
          : calculateTempleAccountInterest(
              account,
              accountTransactions,
              calculationDate
            );

      const liveTotalDue =
        isFinalSettled
          ? 0
          : principalOutstanding +
            calculatedInterest;

      const totalPaid =
        principalRepaid +
        interestReceived +
        finalSettlementReceived;

      const statusLabel =
        isFinalSettled
          ? "Final Settled"
          : (
              principalRepaid > 0 ||
              interestReceived > 0
                ? "Partially Paid"
                : "Pending"
            );

      return {
        ...account,
        principal,
        principalRepaid,
        interestReceived,
        finalSettlementReceived,
        totalPaid,
        principalOutstanding,
        calculatedInterest,
        liveTotalDue,
        isFinalSettled,
        statusLabel,
        transactions:
          accountTransactions
      };
    });
  }

  function renderTempleAccounts(rows) {
    const body =
      el("villageTempleTableBody");

    if (!body) return;

    if (!rows.length) {
      body.innerHTML = `
        <tr>
          <td
            colspan="12"
            class="village-admin-empty-cell"
          >
            No Temple Fund accounts yet.
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML =
      rows
        .map((row, index) => `
          <tr>
            <td>${index + 1}</td>

            <td class="village-temple-person">
              <span class="village-temple-person-name">
                ${escapeVillageHtml(
                  row.person_name || "-"
                )}
              </span>
              ${
                row.relation_details
                  ? `<span class="village-temple-person-relation">${escapeVillageHtml(
                      row.relation_details
                    )}</span>`
                  : ""
              }
            </td>

            <td>
              ${escapeVillageHtml(
                row.residence || "-"
              )}
            </td>

            <td>
              ${
                row.taken_date
                  ? formatVillageDate(row.taken_date)
                  : '<span class="village-temple-date-pending">Date Pending</span>'
              }
            </td>

            <td class="village-temple-money">
              ${money.format(
                row.principal
              )}
            </td>

            <td>
              ${templeNumber(
                row.monthly_interest_rate
              ).toFixed(2)}%
            </td>

            <td class="village-temple-money village-temple-interest-live">
              ${
                row.isFinalSettled
                  ? "-"
                  : money.format(
                      row.calculatedInterest
                    )
              }
            </td>

            <td class="village-temple-money village-temple-positive">
              ${money.format(
                row.totalPaid
              )}
            </td>

            <td class="village-temple-money village-temple-positive">
              ${money.format(
                row.principalRepaid
              )}
            </td>

            <td class="village-temple-money village-temple-outstanding">
              ${money.format(
                row.liveTotalDue
              )}
            </td>

            <td>
              <span class="village-temple-status village-temple-status-${escapeVillageHtml(
                row.status || "active"
              )}">
                ${escapeVillageHtml(
                  row.statusLabel
                )}
              </span>
            </td>

            <td>
              <div class="village-temple-row-actions">
                <button
                  type="button"
                  class="village-admin-small-button"
                  data-temple-edit="${escapeVillageHtml(
                    row.id
                  )}"
                >
                  Edit
                </button>

                <button
                  type="button"
                  class="village-admin-small-button"
                  data-temple-delete="${escapeVillageHtml(
                    row.id
                  )}"
                  title="Delete this Temple Fund account"
                >
                  Delete
                </button>

                <button
                  type="button"
                  class="village-admin-small-button"
                  data-temple-history="${escapeVillageHtml(
                    row.id
                  )}"
                  title="View payment history"
                >
                  History
                </button>
              </div>
            </td>
          </tr>
        `)
        .join("");
  }

  function updateTempleSummary(
    rows,
    transactions
  ) {
    const principalGiven =
      rows.reduce(
        (sum, row) =>
          sum + row.principal,
        0
      );

    const principalRepaid =
      rows.reduce(
        (sum, row) =>
          sum + row.principalRepaid,
        0
      );

    const interestReceived =
      rows.reduce(
        (sum, row) =>
          sum + row.interestReceived,
        0
      );

    const outstanding =
      rows.reduce(
        (sum, row) =>
          sum + row.liveTotalDue,
        0
      );

    const available =
      calculateTempleAvailableCash(
        transactions
      );

    setText(
      "villageTempleAvailable",
      money.format(available)
    );

    setText(
      "villageTemplePrincipalGiven",
      money.format(principalGiven)
    );

    setText(
      "villageTemplePrincipalRepaid",
      money.format(principalRepaid)
    );

    setText(
      "villageTempleInterestReceived",
      money.format(interestReceived)
    );

    setText(
      "villageTemplePrincipalOutstanding",
      money.format(outstanding)
    );

    setText(
      "villageTempleTablePrincipal",
      money.format(principalGiven)
    );

    setText(
      "villageTempleTableRepaid",
      money.format(principalRepaid)
    );

    setText(
      "villageTempleTableOutstanding",
      money.format(outstanding)
    );
  }

  async function loadTempleFund() {
    const client = getClient();
    const village =
      state.currentVillage;

    if (!client || !village?.id) {
      return;
    }

    setTempleStatus(
      "Loading Temple Fund..."
    );

    const [
      accountsResult,
      transactionsResult
    ] =
      await Promise.all([
        client
          .from("temple_fund_accounts")
          .select(
            "id,village_id,person_name,relation_details,residence,taken_date,principal_amount,monthly_interest_rate,status,interest_calculated_upto,settled_at,calculated_due_at_settlement,final_settlement_amount,settlement_notes,notes,created_at,updated_at"
          )
          .eq(
            "village_id",
            village.id
          )
          .order(
            "taken_date",
            { ascending: true }
          )
          .order(
            "created_at",
            { ascending: true }
          ),

        client
          .from("temple_fund_transactions")
          .select(
            "id,village_id,account_id,transaction_date,transaction_type,amount,paid_to_or_from,payment_mode,reference_number,document_url,notes,created_at,updated_at"
          )
          .eq(
            "village_id",
            village.id
          )
          .order(
            "transaction_date",
            { ascending: true }
          )
          .order(
            "created_at",
            { ascending: true }
          )
      ]);

    if (accountsResult.error) {
      console.error(
        "Temple Fund accounts load failed:",
        accountsResult.error
      );

      setTempleStatus(
        `Unable to load Temple Fund accounts: ${accountsResult.error.message}`,
        true
      );

      return;
    }

    if (transactionsResult.error) {
      console.error(
        "Temple Fund transactions load failed:",
        transactionsResult.error
      );

      setTempleStatus(
        `Unable to load Temple Fund transactions: ${transactionsResult.error.message}`,
        true
      );

      return;
    }

    const rows =
      buildTempleAccountRows(
        accountsResult.data || [],
        transactionsResult.data || []
      );

    state.templeAccounts =
      rows;

    state.templeTransactions =
      transactionsResult.data || [];

    renderTempleAccounts(rows);

    updateTempleSummary(
      rows,
      state.templeTransactions
    );

    setTempleStatus(
      rows.length
        ? `${rows.length} Temple Fund account(s) loaded.`
        : "No Temple Fund accounts yet."
    );
  }

  function templeCsvValue(value) {
    const text =
      String(
        value ?? ""
      );

    if (
      /[",\r\n]/.test(text)
    ) {
      return `"${text.replace(
        /"/g,
        '""'
      )}"`;
    }

    return text;
  }

  function exportTempleFundCsv() {
    const village =
      state.currentVillage;

    if (!village?.id) {
      alert(
        "Please select a village first."
      );

      return;
    }

    const rows =
      state.templeAccounts || [];

    const headers = [
      "person_name",
      "relation_details",
      "residence",
      "taken_date",
      "principal_amount",
      "monthly_interest_rate",
      "principal_repaid",
      "principal_outstanding",
      "interest_received",
      "status",
      "notes"
    ];

    const lines = [
      headers.join(",")
    ];

    rows.forEach((row) => {
      lines.push(
        [
          row.person_name || "",
          row.relation_details || "",
          row.residence || "",
          row.taken_date || "",
          row.principal.toFixed(2),
          templeNumber(
            row.monthly_interest_rate
          ).toFixed(4),
          row.principalRepaid.toFixed(2),
          row.principalOutstanding.toFixed(2),
          row.interestReceived.toFixed(2),
          row.status || "",
          row.notes || ""
        ]
          .map(templeCsvValue)
          .join(",")
      );
    });

    /*
     * UTF-8 BOM helps Microsoft Excel recognise
     * Telugu and other Unicode text correctly.
     */
    const csv =
      "\uFEFF" +
      lines.join("\r\n") +
      "\r\n";

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

    const safeSlug =
      String(
        village.slug ||
        village.name ||
        "village"
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9_-]+/g,
          "_"
        );

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    link.href = url;

    link.download =
      `${safeSlug}_temple_fund_${today}.csv`;

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(
      () => {
        URL.revokeObjectURL(url);
      },
      1000
    );

    setTempleStatus(
      rows.length
        ? `Exported ${rows.length} Temple Fund account(s).`
        : "Temple Fund CSV exported with headers. No accounts exist yet."
    );
  }

  /* =========================================================
     PHASE 1E-2 TEMPLE ACCOUNT NEW EDIT IMPORT
     ========================================================= */

  function templeAccountModal() {
    return el("villageTempleAccountModal");
  }

  function closeTempleAccountForm() {
    const modal = templeAccountModal();

    if (modal) {
      modal.hidden = true;
    }

    const form = el("villageTempleAccountForm");

    if (form) {
      form.reset();
    }

    const idInput = el("villageTempleAccountId");

    if (idInput) {
      idInput.value = "";
    }

    const rate = el("villageTempleInterestRate");

    if (rate) {
      rate.value = "1.5";
    }

    setText(
      "villageTempleAccountFormStatus",
      ""
    );
  }

  function setTempleAccountFormStatus(
    message,
    isError = false
  ) {
    const node =
      el("villageTempleAccountFormStatus");

    if (!node) return;

    node.textContent = message || "";

    node.classList.toggle(
      "village-admin-status-error",
      Boolean(isError)
    );
  }

  function templeHistoryTypeLabel(type) {
    const labels = {
      principal_given: "Principal Given",
      principal_repayment: "Principal Repayment",
      interest_received: "Interest Received",
      final_settlement: "Final Settlement",
      opening_balance: "Opening Balance",
      deposit: "Deposit",
      expense: "Expense",
      adjustment: "Adjustment"
    };

    return labels[type] || type || "-";
  }

  function closeTemplePaymentHistory() {
    const modal =
      document.getElementById("villageTempleHistoryModal");

    if (modal) {
      modal.remove();
    }
  }

  function closeTempleHistoryEdit() {
    const modal =
      document.getElementById(
        "villageTempleHistoryEditModal"
      );

    if (modal) {
      modal.remove();
    }
  }

  function templeHistoryInputDate(value) {
    if (!value) return "";

    return String(value)
      .slice(0, 10);
  }

  function openTempleHistoryEdit(
    account,
    transaction
  ) {
    closeTempleHistoryEdit();

    const client = getClient();

    if (!account || !transaction) {
      return;
    }

    if (!client) {
      alert(
        "Database connection is not available. Refresh Admin."
      );
      return;
    }

    /*
     * Principal Given is generated from the account itself.
     * Correct it through the existing Account Edit form so
     * account principal and ledger principal stay together.
     */
    if (
      transaction.transaction_type ===
      "principal_given"
    ) {
      closeTemplePaymentHistory();
      openTempleAccountForm(account);
      return;
    }

    /*
     * Phase 1E-3C.2 intentionally supports Final Settlement.
     * Partial-payment pairs are handled in the next phase.
     */
    if (
      transaction.transaction_type !==
      "final_settlement"
    ) {
      alert(
        "Editing this payment type will be enabled in the next payment-history phase."
      );
      return;
    }

    const modal =
      document.createElement("div");

    modal.id =
      "villageTempleHistoryEditModal";

    modal.className =
      "village-temple-modal";

    const paymentDate =
      templeHistoryInputDate(
        transaction.transaction_date ||
          account.settled_at
      );

    const cutoffDate =
      templeHistoryInputDate(
        account.interest_calculated_upto
      );

    const calculatedDue =
      numberValue(
        account.calculated_due_at_settlement
      );

    const settlementAmount =
      numberValue(
        transaction.amount ??
          account.final_settlement_amount
      );

    modal.innerHTML = `
      <div
        class="village-temple-modal-backdrop"
        data-temple-history-edit-close
      ></div>

      <section
        class="village-temple-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="villageTempleHistoryEditTitle"
      >
        <div class="village-temple-modal-header">
          <div>
            <p class="village-admin-eyebrow">
              Temple Fund
            </p>

            <h3 id="villageTempleHistoryEditTitle">
              Edit Final Settlement
            </h3>

            <p class="village-admin-note">
              ${escapeVillageHtml(
                account.person_name || "-"
              )}
            </p>
          </div>

          <button
            type="button"
            class="village-admin-small-button"
            data-temple-history-edit-close
          >
            Close
          </button>
        </div>

        <p class="village-admin-note">
          This corrects the existing Final Settlement.
          It does not create another payment.
        </p>

        <form
          id="villageTempleHistoryEditForm"
          class="village-admin-form"
        >
          <div class="village-temple-form-grid">

            <label class="village-temple-field">
              <span>Payment Date *</span>

              <input
                id="villageTempleHistoryEditPaymentDate"
                type="date"
                value="${escapeVillageHtml(
                  paymentDate
                )}"
                required
              />
            </label>

            <label class="village-temple-field">
              <span>
                Interest Calculated Up To *
              </span>

              <input
                id="villageTempleHistoryEditCutoffDate"
                type="date"
                value="${escapeVillageHtml(
                  cutoffDate
                )}"
                required
              />
            </label>

            <label class="village-temple-field">
              <span>
                Calculated Due at Cutoff *
              </span>

              <input
                id="villageTempleHistoryEditCalculatedDue"
                type="number"
                min="0"
                step="0.01"
                value="${escapeVillageHtml(
                  calculatedDue
                )}"
                readonly
                aria-readonly="true"
              />
            </label>

            <label class="village-temple-field">
              <span>
                Final Settlement Amount *
              </span>

              <input
                id="villageTempleHistoryEditAmount"
                type="number"
                min="0.01"
                step="0.01"
                value="${escapeVillageHtml(
                  settlementAmount
                )}"
                required
              />
            </label>

            <label class="village-temple-field">
              <span>Payment Mode</span>

              <input
                id="villageTempleHistoryEditMode"
                type="text"
                value="${escapeVillageHtml(
                  transaction.payment_mode || ""
                )}"
              />
            </label>

            <label class="village-temple-field">
              <span>Reference</span>

              <input
                id="villageTempleHistoryEditReference"
                type="text"
                value="${escapeVillageHtml(
                  transaction.reference_number || ""
                )}"
              />
            </label>

            <label
              class="village-temple-field village-temple-field-wide"
            >
              <span>Settlement Notes</span>

              <textarea
                id="villageTempleHistoryEditNotes"
                rows="5"
              >${escapeVillageHtml(
                transaction.notes ||
                  account.settlement_notes ||
                  ""
              )}</textarea>
            </label>

          </div>

          <div class="village-admin-form-actions">
            <button
              type="button"
              class="village-admin-secondary-button"
              data-temple-history-edit-close
            >
              Cancel
            </button>

            <button
              id="villageTempleHistoryEditSave"
              type="submit"
              class="village-admin-primary-button"
            >
              Save Correction
            </button>
          </div>
        </form>
      </section>
    `;

    document.body.appendChild(modal);

    function recalculateTempleHistorySettlementDue() {
      const cutoffInput =
        modal.querySelector(
          "#villageTempleHistoryEditCutoffDate"
        );

      const dueInput =
        modal.querySelector(
          "#villageTempleHistoryEditCalculatedDue"
        );

      if (!cutoffInput || !dueInput) {
        return NaN;
      }

      const cutoff =
        String(cutoffInput.value || "").trim();

      if (!cutoff) {
        dueInput.value = "";
        return NaN;
      }

      /*
       * Exclude Final Settlement cash from the interest engine.
       * Principal repayments remain included so historical
       * interest uses the correct balance for each period.
       */
      const accountTransactions =
        (state.templeTransactions || []).filter(
          (tx) =>
            tx.account_id === account.id &&
            tx.transaction_type !==
              "final_settlement"
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
              sum + numberValue(tx.amount),
            0
          );

      const principalOutstanding =
        Math.max(
          numberValue(account.principal_amount) -
            principalRepaid,
          0
        );

      const calculatedInterest =
        calculateTempleAccountInterest(
          account,
          accountTransactions,
          cutoff
        );

      const calculatedDue =
        principalOutstanding +
        calculatedInterest;

      dueInput.value =
        calculatedDue.toFixed(2);

      return calculatedDue;
    }

    const historyCutoffInput =
      modal.querySelector(
        "#villageTempleHistoryEditCutoffDate"
      );

    if (historyCutoffInput) {
      historyCutoffInput.addEventListener(
        "change",
        recalculateTempleHistorySettlementDue
      );

      historyCutoffInput.addEventListener(
        "input",
        recalculateTempleHistorySettlementDue
      );
    }

    modal
      .querySelectorAll(
        "[data-temple-history-edit-close]"
      )
      .forEach((node) => {
        node.addEventListener(
          "click",
          closeTempleHistoryEdit
        );
      });

    const form =
      modal.querySelector(
        "#villageTempleHistoryEditForm"
      );

    form?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const paymentDateValue =
          modal.querySelector(
            "#villageTempleHistoryEditPaymentDate"
          )?.value || "";

        const cutoffDateValue =
          modal.querySelector(
            "#villageTempleHistoryEditCutoffDate"
          )?.value || "";

        const calculatedDueValue =
          recalculateTempleHistorySettlementDue();

        const settlementAmountValue =
          Number(
            modal.querySelector(
              "#villageTempleHistoryEditAmount"
            )?.value || 0
          );

        const paymentModeValue =
          (
            modal.querySelector(
              "#villageTempleHistoryEditMode"
            )?.value || ""
          ).trim();

        const referenceValue =
          (
            modal.querySelector(
              "#villageTempleHistoryEditReference"
            )?.value || ""
          ).trim();

        const notesValue =
          (
            modal.querySelector(
              "#villageTempleHistoryEditNotes"
            )?.value || ""
          ).trim();

        if (
          !paymentDateValue ||
          !cutoffDateValue
        ) {
          alert(
            "Payment Date and Interest Calculated Up To Date are required."
          );
          return;
        }

        if (
          calculatedDueValue < 0 ||
          !Number.isFinite(
            calculatedDueValue
          )
        ) {
          alert(
            "Calculated Due at Cutoff is invalid."
          );
          return;
        }

        if (
          settlementAmountValue <= 0 ||
          !Number.isFinite(
            settlementAmountValue
          )
        ) {
          alert(
            "Final Settlement Amount must be greater than zero."
          );
          return;
        }

        if (
          account.taken_date &&
          cutoffDateValue <
            account.taken_date
        ) {
          alert(
            "Interest Calculated Up To Date cannot be earlier than Taken Date."
          );
          return;
        }

        if (
          cutoffDateValue >
          paymentDateValue
        ) {
          alert(
            "Interest Calculated Up To Date cannot be later than Payment Date."
          );
          return;
        }

        const confirmed =
          window.confirm(
            `Correct this existing Final Settlement?

Person: ${account.person_name || "-"}
Payment Date: ${formatVillageDate(
              paymentDateValue
            )}
Interest Calculated Up To: ${formatVillageDate(
              cutoffDateValue
            )}
Calculated Due at Cutoff: ${money.format(
              calculatedDueValue
            )}
Final Settlement Amount: ${money.format(
              settlementAmountValue
            )}

This updates the existing transaction.
No new payment will be created.`
          );

        if (!confirmed) {
          return;
        }

        const saveButton =
          modal.querySelector(
            "#villageTempleHistoryEditSave"
          );

        if (saveButton) {
          saveButton.disabled = true;
          saveButton.textContent =
            "Saving...";
        }

        try {
          const { data, error } =
            await client.rpc(
              "update_temple_final_settlement",
              {
                p_village_id:
                  state.currentVillage.id,

                p_account_id:
                  account.id,

                p_transaction_id:
                  transaction.id,

                p_payment_date:
                  paymentDateValue,

                p_interest_calculated_upto:
                  cutoffDateValue,

                p_calculated_due_at_settlement:
                  calculatedDueValue,

                p_final_settlement_amount:
                  settlementAmountValue,

                p_payment_mode:
                  paymentModeValue || null,

                p_reference_number:
                  referenceValue || null,

                p_notes:
                  notesValue || null
              }
            );

          if (error) {
            throw error;
          }

          closeTempleHistoryEdit();
          closeTemplePaymentHistory();

          await loadTempleFund();

          setTempleStatus(
            `Final Settlement corrected successfully for ${
              account.person_name || "Temple Fund account"
            }.`
          );

          alert(
            `Final Settlement corrected successfully.

No new payment was created.

Final Settlement Amount: ${money.format(
              numberValue(
                data?.final_settlement_amount ??
                  settlementAmountValue
              )
            )}`
          );
        }
        catch (error) {
          console.error(
            "Temple Final Settlement correction failed:",
            error
          );

          alert(
            `Unable to save Final Settlement correction: ${
              error?.message || error
            }`
          );

          if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent =
              "Save Correction";
          }
        }
      }
    );
  }
  async function reverseTempleFinalSettlement(
    account,
    transaction
  ) {
    const client = getClient();
    const village = state.currentVillage;

    if (!client || !village || !account || !transaction) {
      alert(
        "Unable to identify the Temple Fund Final Settlement."
      );
      return;
    }

    if (
      transaction.transaction_type !==
      "final_settlement"
    ) {
      alert(
        "Only a Final Settlement can be reversed from Payment History."
      );
      return;
    }

    const personName =
      account.person_name || "Temple Fund account";

    const settlementDate =
      formatVillageDate(
        transaction.transaction_date
      );

    const settlementAmount =
      money.format(
        numberValue(transaction.amount)
      );

    const reason = window.prompt(
      `Reverse Final Settlement?

Person: ${personName}
Settlement Date: ${settlementDate}
Settlement Amount: ${settlementAmount}

This will remove only the Final Settlement transaction and reopen the account.

Original Principal Given and genuine earlier partial payments will remain unchanged.

Enter the reason for reversal:`
    );

    if (reason === null) {
      return;
    }

    const cleanReason =
      String(reason || "").trim();

    if (!cleanReason) {
      alert(
        "A reversal reason is required. Nothing was changed."
      );
      return;
    }

    const confirmed = window.confirm(
      `FINAL CHECK

Reverse the Final Settlement for:
${personName}

Amount: ${settlementAmount}
Date: ${settlementDate}

Reason:
${cleanReason}

After reversal, the account will reopen and interest will resume according to the genuine account history.

Continue?`
    );

    if (!confirmed) {
      return;
    }

    setTempleStatus(
      `Reversing Final Settlement for "${personName}"...`
    );

    try {
      const { data, error } =
        await client.rpc(
          "reverse_temple_final_settlement",
          {
            p_village_id: village.id,
            p_account_id: account.id,
            p_transaction_id: transaction.id,
            p_reason: cleanReason
          }
        );

      if (error) {
        throw error;
      }

      closeTemplePaymentHistory();

      setTempleStatus(
        `Final Settlement reversed for "${personName}". Reloading Temple Fund...`
      );

      await loadTempleFund();

      const reopenedStatus =
        data?.new_status === "part_paid"
          ? "Partially Paid"
          : "Pending";

      setTempleStatus(
        `Final Settlement reversed successfully for "${personName}". Account reopened as ${reopenedStatus}.`
      );

      alert(
        `Final Settlement reversed successfully.

Person: ${personName}
Reopened Status: ${reopenedStatus}

The original Principal Given and genuine earlier payment history were preserved.`
      );
    } catch (error) {
      console.error(
        "Unable to reverse Temple Fund Final Settlement:",
        error
      );

      setTempleStatus(
        error?.message ||
          "Unable to reverse Final Settlement.",
        true
      );

      alert(
        `Reverse failed.

${
          error?.message ||
          "Unable to reverse Final Settlement."
        }

No further action was taken.`
      );
    }
  }
  function openTemplePaymentHistory(accountId) {
    closeTemplePaymentHistory();

    const account =
      findTempleAccount(accountId);

    if (!account) {
      setTempleStatus(
        "Unable to identify the Temple Fund account.",
        true
      );
      return;
    }

    const transactions =
      (state.templeTransactions || [])
        .filter(
          (tx) =>
            tx.account_id === account.id
        )
        .sort((a, b) => {
          const dateCompare =
            String(b.transaction_date || "")
              .localeCompare(
                String(a.transaction_date || "")
              );

          if (dateCompare !== 0) {
            return dateCompare;
          }

          return String(b.created_at || "")
            .localeCompare(
              String(a.created_at || "")
            );
        });

    const modal =
      document.createElement("div");

    modal.id =
      "villageTempleHistoryModal";

    modal.className =
      "village-temple-modal";

    const rowsHtml =
      transactions.length
        ? transactions
            .map(
              (tx) => `
                <tr>
                  <td>
                    ${escapeVillageHtml(
                      formatVillageDate(
                        tx.transaction_date
                      )
                    )}
                  </td>

                  <td>
                    ${escapeVillageHtml(
                      templeHistoryTypeLabel(
                        tx.transaction_type
                      )
                    )}
                  </td>

                  <td class="amount-cell">
                    ${escapeVillageHtml(
                      money.format(
                        tx.amount
                      )
                    )}
                  </td>

                  <td>
                    ${escapeVillageHtml(
                      tx.payment_mode || "-"
                    )}
                  </td>

                  <td>
                    ${escapeVillageHtml(
                      tx.notes || "-"
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      class="village-admin-small-button"
                      data-temple-history-view="${escapeVillageHtml(
                        tx.id
                      )}"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      class="village-admin-small-button"
                      data-temple-history-edit="${escapeVillageHtml(
                        tx.id
                      )}"
                    >
                      Edit
                    </button>

                    ${
                      tx.transaction_type === "final_settlement"
                        ? `
                    <button
                      type="button"
                      class="village-admin-small-button"
                      data-temple-history-reverse="${escapeVillageHtml(
                        tx.id
                      )}"
                      title="Reverse this Final Settlement and reopen the account"
                    >
                      Reverse
                    </button>
                    `
                        : ""
                    }
                  </td>
                </tr>
              `
            )
            .join("")
        : `
            <tr>
              <td colspan="6" class="empty-state">
                No payment history found for this account.
              </td>
            </tr>
          `;

    modal.innerHTML = `
      <div
        class="village-temple-modal-backdrop"
        data-temple-history-close
      ></div>

      <section
        class="village-temple-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="villageTempleHistoryTitle"
      >
        <div class="village-temple-modal-header">
          <div>
            <p class="village-admin-eyebrow">
              Temple Fund
            </p>

            <h3 id="villageTempleHistoryTitle">
              Payment History
            </h3>

            <p class="village-admin-note">
              ${escapeVillageHtml(
                account.person_name || "Temple Fund Account"
              )}
            </p>
          </div>

          <button
            type="button"
            class="village-admin-small-button"
            data-temple-history-close
          >
            Close
          </button>
        </div>

        <div class="table-scroll">
          <table class="village-admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div
          id="villageTempleHistoryDetails"
          class="village-admin-note"
          hidden
        ></div>
      </section>
    `;

    document.body.appendChild(modal);

    modal
      .querySelectorAll(
        "[data-temple-history-close]"
      )
      .forEach((node) => {
        node.addEventListener(
          "click",
          closeTemplePaymentHistory
        );
      });

    modal.addEventListener(
      "click",
      async (event) => {
        const historyReverseButton =
          event.target.closest(
            "[data-temple-history-reverse]"
          );

        if (historyReverseButton) {
          const reverseTransaction =
            transactions.find(
              (tx) =>
                tx.id ===
                historyReverseButton.dataset.templeHistoryReverse
            );

          if (!reverseTransaction) {
            alert(
              "Unable to identify the Final Settlement transaction."
            );
            return;
          }

          if (
            reverseTransaction.transaction_type !==
            "final_settlement"
          ) {
            alert(
              "Only a Final Settlement can be reversed."
            );
            return;
          }

          await reverseTempleFinalSettlement(
            account,
            reverseTransaction
          );

          return;
        }
        const historyEditButton =
          event.target.closest(
            "[data-temple-history-edit]"
          );

        if (historyEditButton) {
          const editTransaction =
            transactions.find(
              (tx) =>
                tx.id ===
                historyEditButton.dataset.templeHistoryEdit
            );

          if (editTransaction) {
            openTempleHistoryEdit(
              account,
              editTransaction
            );
          }

          return;
        }

        const button =
          event.target.closest(
            "[data-temple-history-view]"
          );

        if (!button) {
          return;
        }

        const transaction =
          transactions.find(
            (tx) =>
              tx.id ===
              button.dataset.templeHistoryView
          );

        if (!transaction) {
          return;
        }

        const details =
          modal.querySelector(
            "#villageTempleHistoryDetails"
          );

        if (!details) {
          return;
        }

        const recorded =
          transaction.created_at
            ? new Date(
                transaction.created_at
              ).toLocaleString("en-IN")
            : "-";

        details.hidden = false;

        details.innerHTML = `
          <div class="village-admin-card">
            <strong>Transaction Details</strong>

            <p>
              <strong>Date:</strong>
              ${escapeVillageHtml(
                formatVillageDate(
                  transaction.transaction_date
                )
              )}
            </p>

            <p>
              <strong>Type:</strong>
              ${escapeVillageHtml(
                templeHistoryTypeLabel(
                  transaction.transaction_type
                )
              )}
            </p>

            <p>
              <strong>Amount:</strong>
              ${escapeVillageHtml(
                money.format(
                  transaction.amount
                )
              )}
            </p>

            <p>
              <strong>Payment Mode:</strong>
              ${escapeVillageHtml(
                transaction.payment_mode || "-"
              )}
            </p>

            <p>
              <strong>Reference:</strong>
              ${escapeVillageHtml(
                transaction.reference_number || "-"
              )}
            </p>

            <p>
              <strong>Notes:</strong>
              ${escapeVillageHtml(
                transaction.notes || "-"
              )}
            </p>

            <p>
              <strong>Recorded:</strong>
              ${escapeVillageHtml(recorded)}
            </p>
          </div>
        `;
      }
    );
  }
  async function deleteTempleAccount(accountId) {
    const client = getClient();
    const village = state.currentVillage;
    const account = findTempleAccount(accountId);

    if (!client || !village || !account) {
      setTempleStatus(
        "Unable to identify the Temple Fund account.",
        true
      );
      return;
    }

    const personName =
      account.person_name ||
      "this Temple Fund account";

    const confirmed = window.confirm(
      `Delete Temple Fund account "${personName}"?

This action is intended only for an incorrect/test account.

The server will refuse deletion when protected financial history exists.`
    );

    if (!confirmed) {
      return;
    }

    setTempleStatus(
      `Deleting Temple Fund account "${personName}"...`
    );

    const { error } = await client.rpc(
      "delete_temple_fund_account",
      {
        p_account_id: account.id
      }
    );

    if (error) {
      console.error(
        "Unable to delete Temple Fund account:",
        error
      );

      setTempleStatus(
        error.message ||
          "Unable to delete Temple Fund account.",
        true
      );

      return;
    }

    setTempleStatus(
      `Temple Fund account "${personName}" deleted successfully.`
    );

    await loadTempleFund();
  }
  function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /*
   * PHASE 1E-3B.4 TEMPLE FUND INTEREST ENGINE
   *
   * Simple interest only.
   * Monthly rate is applied over:
   *   completed months
   *   + proportional remaining days in the current monthly period.
   *
   * Final Settled accounts use the saved cutoff date.
   * Active accounts use today.
   */
  function templeDateOnly(value) {
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

  function templeTodayDate() {
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

  function templeAddMonthsClamped(date, months) {
    const sourceDay = date.getDate();

    const target =
      new Date(
        date.getFullYear(),
        date.getMonth() + months,
        1,
        12,
        0,
        0,
        0
      );

    const lastDay =
      new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0,
        12,
        0,
        0,
        0
      ).getDate();

    target.setDate(
      Math.min(sourceDay, lastDay)
    );

    return target;
  }

  function templeDaysBetween(start, end) {
    const msPerDay =
      24 * 60 * 60 * 1000;

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
      (endUtc - startUtc) / msPerDay
    );
  }

  function templeElapsedMonths(startValue, endValue) {
    const start =
      templeDateOnly(startValue);

    const end =
      endValue instanceof Date
        ? endValue
        : templeDateOnly(endValue);

    if (
      !start ||
      !end ||
      end <= start
    ) {
      return 0;
    }

    let fullMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    let anchor =
      templeAddMonthsClamped(
        start,
        fullMonths
      );

    if (anchor > end) {
      fullMonths -= 1;

      anchor =
        templeAddMonthsClamped(
          start,
          fullMonths
        );
    }

    fullMonths =
      Math.max(fullMonths, 0);

    const nextAnchor =
      templeAddMonthsClamped(
        start,
        fullMonths + 1
      );

    const periodDays =
      templeDaysBetween(
        anchor,
        nextAnchor
      );

    const remainingDays =
      templeDaysBetween(
        anchor,
        end
      );

    const fraction =
      periodDays > 0
        ? Math.min(
            remainingDays / periodDays,
            1
          )
        : 0;

    return fullMonths + fraction;
  }

  function calculateTempleInterest(
    principal,
    monthlyRate,
    takenDate,
    calculationDate
  ) {
    const amount =
      numberValue(principal);

    const rate =
      numberValue(monthlyRate);

    if (
      amount <= 0 ||
      rate < 0 ||
      !takenDate ||
      !calculationDate
    ) {
      return 0;
    }

    const months =
      templeElapsedMonths(
        takenDate,
        calculationDate
      );

    return Math.max(
      0,
      amount *
        (rate / 100) *
        months
    );
  }

  function templeAccountStatusLabel(account) {
    if (
      account?.settled_at ||
      account?.status === "closed"
    ) {
      return "Final Settled";
    }

    const hasPayments =
      (account?.principalRepaid || 0) > 0 ||
      (account?.interestReceived || 0) > 0;

    return hasPayments
      ? "Partially Paid"
      : "Pending";
  }
  function getTemplePrincipalRepaid(accountId) {
    return state.templeTransactions
      .filter(
        (transaction) =>
          transaction.account_id === accountId &&
          transaction.transaction_type ===
            "principal_repayment"
      )
      .reduce(
        (sum, transaction) =>
          sum + numberValue(transaction.amount),
        0
      );
  }


  /*
   * Calculates interest in principal segments.
   *
   * Rule:
   * - simple interest only
   * - no compounding
   * - before a principal repayment, interest uses the old balance
   * - from the repayment date onward, interest uses the reduced balance
   * - interest_received does not reduce principal
   */
  function calculateTempleAccountInterest(
    account,
    transactions,
    calculationDate
  ) {
    if (
      !account ||
      !account.taken_date ||
      !calculationDate
    ) {
      return 0;
    }

    const rate =
      numberValue(
        account.monthly_interest_rate
      );

    if (rate < 0) {
      return 0;
    }

    let principal =
      Math.max(
        numberValue(
          account.principal_amount
        ),
        0
      );

    if (principal <= 0) {
      return 0;
    }

    const endDate =
      calculationDate instanceof Date
        ? [
            calculationDate.getFullYear(),
            String(
              calculationDate.getMonth() + 1
            ).padStart(2, "0"),
            String(
              calculationDate.getDate()
            ).padStart(2, "0")
          ].join("-")
        : String(calculationDate)
            .slice(0, 10);

    if (endDate < account.taken_date) {
      return 0;
    }

    const repayments =
      (transactions || [])
        .filter(
          (tx) =>
            tx.transaction_type ===
              "principal_repayment" &&
            tx.transaction_date &&
            tx.transaction_date >=
              account.taken_date &&
            tx.transaction_date <=
              endDate
        )
        .slice()
        .sort(
          (a, b) =>
            String(
              a.transaction_date
            ).localeCompare(
              String(
                b.transaction_date
              )
            )
        );

    let segmentStart =
      account.taken_date;

    let totalInterest = 0;

    repayments.forEach((tx) => {
      const repaymentDate =
        String(tx.transaction_date);

      if (
        principal > 0 &&
        repaymentDate > segmentStart
      ) {
        totalInterest +=
          calculateTempleInterest(
            principal,
            rate,
            segmentStart,
            repaymentDate
          );
      }

      principal =
        Math.max(
          principal -
            numberValue(tx.amount),
          0
        );

      segmentStart =
        repaymentDate;
    });

    if (
      principal > 0 &&
      endDate > segmentStart
    ) {
      totalInterest +=
        calculateTempleInterest(
          principal,
          rate,
          segmentStart,
          endDate
        );
    }

    return Math.max(
      totalInterest,
      0
    );
  }
  function refreshTemplePaymentSummary() {
    const paymentType =
      el("villageTemplePaymentType")?.value ||
      "partial";

    const isFinal =
      paymentType === "final";

    const cutoffField =
      el("villageTempleInterestCalculatedUptoField");

    const cutoffInput =
      el("villageTempleInterestCalculatedUpto");

    const partialFields =
      document.querySelectorAll(
        "[data-temple-partial-field]"
      );

    const finalFields =
      document.querySelectorAll(
        "[data-temple-final-field]"
      );

    partialFields.forEach((node) => {
      node.hidden = isFinal;
    });

    finalFields.forEach((node) => {
      node.hidden = !isFinal;
    });

    if (cutoffField) {
      cutoffField.hidden = !isFinal;
    }

    if (cutoffInput) {
      cutoffInput.required = isFinal;

      if (!isFinal) {
        cutoffInput.value = "";
      }
    }

    const accountId =
      el("villageTemplePaymentAccount")?.value || "";

    const account =
      findTempleAccount(accountId);

    const originalPrincipal =
      account
        ? numberValue(account.principal_amount)
        : 0;

    const alreadyRepaid =
      account
        ? getTemplePrincipalRepaid(account.id)
        : 0;

    const outstanding =
      Math.max(
        originalPrincipal - alreadyRepaid,
        0
      );

    if (el("villageTemplePaymentOriginalPrincipal")) {
      el("villageTemplePaymentOriginalPrincipal").value =
        money.format(originalPrincipal);
    }

    if (el("villageTemplePaymentAlreadyRepaid")) {
      el("villageTemplePaymentAlreadyRepaid").value =
        money.format(alreadyRepaid);
    }

    if (el("villageTemplePaymentOutstanding")) {
      el("villageTemplePaymentOutstanding").value =
        money.format(outstanding);
    }

    if (isFinal) {
      const cutoff =
        cutoffInput?.value || "";

      const interest =
        cutoff && account
          ? calculateTempleAccountInterest(
              account,
              state.templeTransactions.filter(
                (tx) =>
                  tx.account_id === account.id
              ),
              cutoff
            )
          : 0;

      const calculatedDue =
        outstanding + interest;

      if (el("villageTempleCalculatedInterest")) {
        el("villageTempleCalculatedInterest").value =
          money.format(interest);
      }

      if (el("villageTempleCalculatedDue")) {
        el("villageTempleCalculatedDue").value =
          money.format(calculatedDue);
      }

      const settlementAmount =
        numberValue(
          el("villageTempleFinalSettlementAmount")
            ?.value
        );

      if (el("villageTemplePaymentTotal")) {
        el("villageTemplePaymentTotal").value =
          money.format(settlementAmount);
      }

      const warning =
        el("villageTemplePaymentWarning");

      if (warning) {
        warning.hidden = false;
        warning.textContent =
          "Calculated Due is preserved as the historical cutoff snapshot. Final Settlement Amount is the genuine cash actually received. No waiver or adjustment transaction will be created.";
      }

      return;
    }

    const principalPaid =
      numberValue(
        el("villageTemplePrincipalPaid")?.value
      );

    const interestPaid =
      numberValue(
        el("villageTempleInterestPaid")?.value
      );

    if (el("villageTemplePaymentTotal")) {
      el("villageTemplePaymentTotal").value =
        money.format(
          principalPaid + interestPaid
        );
    }

    const warning =
      el("villageTemplePaymentWarning");

    if (warning) {
      warning.hidden = true;
      warning.textContent = "";
    }
  }
  function templePaymentModal() {
    return el("villageTemplePaymentModal");
  }
  function openTemplePaymentForm() {
    const modal =
      templePaymentModal();

    const form =
      el("villageTemplePaymentForm");

    if (!modal || !form) return;

    const accountSelect =
      el("villageTemplePaymentAccount");

    if (accountSelect) {
      const options =
        [...state.templeAccounts]
          .filter(
            (account) =>
              !account.isFinalSettled
          )
          .sort((a, b) =>
            String(a.person_name || "")
              .localeCompare(
                String(b.person_name || "")
              )
          )
          .map((account) => {
            const principal =
              numberValue(
                account.principal_amount
              );

            const repaid =
              getTemplePrincipalRepaid(
                account.id
              );

            const outstanding =
              Math.max(
                principal - repaid,
                0
              );

            return `
              <option
                value="${escapeVillageHtml(account.id)}"
              >
                ${escapeVillageHtml(
                  account.person_name || "Unnamed"
                )} - ${escapeVillageHtml(
                  money.format(outstanding)
                )} outstanding
              </option>
            `;
          })
          .join("");

      accountSelect.innerHTML =
        `<option value="">Select account</option>${options}`;
    }

    form.reset();

    if (el("villageTemplePrincipalPaid")) {
      el("villageTemplePrincipalPaid").value =
        "0";
    }

    if (el("villageTempleInterestPaid")) {
      el("villageTempleInterestPaid").value =
        "0";
    }

    if (el("villageTemplePaymentType")) {
      el("villageTemplePaymentType").value =
        "partial";
    }

    if (el("villageTemplePaymentWarning")) {
      el("villageTemplePaymentWarning").hidden =
        true;
    }

    refreshTemplePaymentSummary();

    form.hidden = false;
    modal.hidden = false;
  }

  function closeTemplePaymentForm() {
    const modal =
      templePaymentModal();

    const form =
      el("villageTemplePaymentForm");

    if (modal) {
      modal.hidden = true;
    }

    if (form) {
      form.reset();
      form.hidden = false;
      form.style.removeProperty("display");
    }

    const preview =
      el("villageTemplePaymentPreview");

    if (preview) {
      preview.hidden = true;
      preview.style.display = "none";
    }

    templePaymentPreviewConfirmed = false;

    const warning =
      el("villageTemplePaymentWarning");

    if (warning) {
      warning.hidden = true;
      warning.textContent = "";
    }
  }

  let templePaymentPreviewConfirmed = false;

  function hideTemplePaymentPreview() {
    const preview =
      el("villageTemplePaymentPreview");

    const form =
      el("villageTemplePaymentForm");

    if (preview) {
      preview.hidden = true;
      preview.style.display = "none";
    }

    if (form) {
      form.hidden = false;
      form.style.removeProperty("display");
    }

    templePaymentPreviewConfirmed = false;
  }

  function templePreviewRow(label, value, strong = false) {
    return `
      <div class="temple-payment-review-row">
        <span class="temple-payment-review-label">
          ${escapeVillageHtml(label)}
        </span>
        <strong class="${
          strong
            ? "temple-payment-review-value temple-payment-review-value-strong"
            : "temple-payment-review-value"
        }">
          ${escapeVillageHtml(value)}
        </strong>
      </div>
    `;
  }

  function showTemplePaymentPreview(details) {
    const preview =
      el("villageTemplePaymentPreview");

    const body =
      el("villageTemplePaymentPreviewBody");

    const title =
      el("villageTemplePaymentPreviewTitle");

    const confirmButton =
      el("villageTemplePaymentPreviewConfirm");

    const form =
      el("villageTemplePaymentForm");

    if (
      !preview ||
      !body ||
      !title ||
      !confirmButton ||
      !form
    ) {
      alert(
        "Payment preview is not available. Nothing was recorded."
      );
      return false;
    }

    if (form.contains(preview)) {
      form.insertAdjacentElement(
        "afterend",
        preview
      );
    }

    const rows = [];

    rows.push(
      templePreviewRow(
        "Person",
        details.person || "-"
      )
    );

    rows.push(
      templePreviewRow(
        "Payment Type",
        details.isFinal
          ? "Final Settlement"
          : "Partial Payment"
      )
    );

    rows.push(
      templePreviewRow(
        "Payment Date",
        formatVillageDate(details.paymentDate)
      )
    );

    if (details.isFinal) {
      rows.push(
        templePreviewRow(
          "Interest Calculated Up To",
          formatVillageDate(
            details.interestCalculatedUpto
          )
        )
      );

      rows.push(
        templePreviewRow(
          "Original Principal",
          money.format(details.originalPrincipal)
        )
      );

      rows.push(
        templePreviewRow(
          "Calculated Due at Cutoff",
          money.format(
            details.calculatedDueAtSettlement
          ),
          true
        )
      );

      rows.push(
        templePreviewRow(
          "Final Settlement Amount Received",
          money.format(
            details.finalSettlementAmount
          ),
          true
        )
      );

      const difference =
        details.calculatedDueAtSettlement -
        details.finalSettlementAmount;

      rows.push(
        templePreviewRow(
          "Difference - Informational Only",
          money.format(difference)
        )
      );

      rows.push(
        templePreviewRow(
          "Resulting Status",
          "Final Settled"
        )
      );

      rows.push(
        templePreviewRow(
          "Resulting Outstanding",
          money.format(0),
          true
        )
      );
    }
    else {
      rows.push(
        templePreviewRow(
          "Principal Paid",
          money.format(details.principalPaid)
        )
      );

      rows.push(
        templePreviewRow(
          "Interest Paid",
          money.format(details.interestPaid)
        )
      );

      rows.push(
        templePreviewRow(
          "Total Cash Received",
          money.format(details.totalReceived),
          true
        )
      );

      rows.push(
        templePreviewRow(
          "Resulting Status",
          "Partially Paid"
        )
      );
    }

    rows.push(
      templePreviewRow(
        "Payment Mode",
        details.paymentMode || "-"
      )
    );

    rows.push(
      templePreviewRow(
        "Reference",
        details.reference || "-"
      )
    );

    rows.push(
      templePreviewRow(
        details.isFinal
          ? "Settlement Notes"
          : "Notes",
        details.notes || "-"
      )
    );

    body.innerHTML = rows.join("");

    title.textContent =
      details.isFinal
        ? "Temple Fund Final Settlement - Final Review"
        : "Temple Fund Payment - Final Review";

    confirmButton.textContent =
      details.isFinal
        ? "Confirm & Record Final Settlement"
        : "Confirm & Record Payment";

    form.hidden = true;
    form.style.display = "none";

    preview.hidden = false;
    preview.removeAttribute("hidden");
    preview.style.display = "block";
    preview.classList.add(
      "temple-payment-review"
    );

    return true;
  }
  async function saveTemplePayment(event) {
    event.preventDefault();

    const client = getClient();
    const village = state.currentVillage;

    if (!client || !village) {
      setTempleStatus(
        "Temple Fund is not ready.",
        true
      );
      return;
    }

    const accountId =
      el("villageTemplePaymentAccount")
        ?.value || "";

    const account =
      findTempleAccount(accountId);

    if (!account) {
      alert("Select a Temple Fund account.");
      return;
    }

    if (account.isFinalSettled) {
      alert(
        "This Temple Fund account is already Final Settled."
      );
      return;
    }

    const paymentDate =
      el("villageTemplePaymentDate")
        ?.value || "";

    if (!paymentDate) {
      alert("Payment Date is required.");
      return;
    }

    if (
      account.taken_date &&
      paymentDate < account.taken_date
    ) {
      alert(
        "Payment Date cannot be earlier than Taken Date."
      );
      return;
    }

    const paymentType =
      el("villageTemplePaymentType")
        ?.value || "partial";

    const isFinal =
      paymentType === "final";

    const alreadyRepaid =
      getTemplePrincipalRepaid(
        account.id
      );

    const outstanding =
      Math.max(
        numberValue(
          account.principal_amount
        ) - alreadyRepaid,
        0
      );

    let principalPaid = 0;
    let interestPaid = 0;

    let interestCalculatedUpto = null;
    let calculatedDueAtSettlement = null;
    let finalSettlementAmount = null;

    if (!isFinal) {
      principalPaid =
        numberValue(
          el("villageTemplePrincipalPaid")
            ?.value
        );

      interestPaid =
        numberValue(
          el("villageTempleInterestPaid")
            ?.value
        );

      if (
        principalPaid < 0 ||
        interestPaid < 0
      ) {
        alert(
          "Principal Paid and Interest Paid cannot be negative."
        );
        return;
      }

      if (
        principalPaid <= 0 &&
        interestPaid <= 0
      ) {
        alert(
          "Enter Principal Paid, Interest Paid, or both."
        );
        return;
      }

      if (
        principalPaid >
        outstanding + 0.005
      ) {
        alert(
          `Principal Paid cannot exceed Principal Outstanding (${money.format(outstanding)}).`
        );
        return;
      }
    } else {
      interestCalculatedUpto =
        el("villageTempleInterestCalculatedUpto")
          ?.value || "";

      if (!interestCalculatedUpto) {
        alert(
          "Interest Calculated Up To Date is required for Final Settlement."
        );
        return;
      }

      if (
        account.taken_date &&
        interestCalculatedUpto <
          account.taken_date
      ) {
        alert(
          "Interest Calculated Up To Date cannot be earlier than Taken Date."
        );
        return;
      }

      if (
        interestCalculatedUpto >
        paymentDate
      ) {
        alert(
          "Interest Calculated Up To Date cannot be later than Payment Date."
        );
        return;
      }

      const calculatedInterest =
        calculateTempleAccountInterest(
          account,
          state.templeTransactions.filter(
            (tx) =>
              tx.account_id === account.id
          ),
          interestCalculatedUpto
        );

      calculatedDueAtSettlement =
        outstanding +
        calculatedInterest;

      finalSettlementAmount =
        numberValue(
          el("villageTempleFinalSettlementAmount")
            ?.value
        );

      if (finalSettlementAmount <= 0) {
        alert(
          "Final Settlement Amount must be greater than zero."
        );
        return;
      }
    }

    const totalReceived =
      isFinal
        ? finalSettlementAmount
        : principalPaid + interestPaid;

    const confirmation =
      isFinal
        ? `Record FINAL Temple Fund settlement?

Person: ${account.person_name || "-"}
Payment Date: ${formatVillageDate(paymentDate)}
Interest Calculated Up To: ${formatVillageDate(interestCalculatedUpto)}
Principal Outstanding: ${money.format(outstanding)}
Calculated Interest: ${money.format(calculatedDueAtSettlement - outstanding)}
Calculated Due at Cutoff: ${money.format(calculatedDueAtSettlement)}
Final Settlement Amount Received: ${money.format(finalSettlementAmount)}

The account will become Final Settled.
No waiver or adjustment transaction will be created.
The original principal will not be changed.`
        : `Record Temple Fund partial payment?

Person: ${account.person_name || "-"}
Payment Date: ${formatVillageDate(paymentDate)}
Principal Paid: ${money.format(principalPaid)}
Interest Paid: ${money.format(interestPaid)}
Total Cash Received: ${money.format(totalReceived)}

The original principal will not be changed.`;

    if (!templePaymentPreviewConfirmed) {
      const previewShown =
        showTemplePaymentPreview({
          person:
            account.person_name || "-",
          isFinal,
          paymentDate,
          originalPrincipal:
            numberValue(
              account.principal_amount
            ),
          principalPaid,
          interestPaid,
          totalReceived,
          interestCalculatedUpto,
          calculatedDueAtSettlement,
          finalSettlementAmount,
          paymentMode:
            el("villageTemplePaymentMode")
              ?.value || null,
          reference:
            el("villageTemplePaymentReference")
              ?.value.trim() || null,
          notes:
            el("villageTemplePaymentNotes")
              ?.value.trim() || null
        });

      if (!previewShown) {
        return;
      }

      return;
    }

    templePaymentPreviewConfirmed = false;

    const saveButton =
      el("villageTemplePaymentSave");

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent =
        "Saving...";
    }

    setTempleStatus(
      `Recording ${
        isFinal
          ? "final settlement"
          : "payment"
      } for ${
        account.person_name ||
        "Temple Fund account"
      }...`
    );

    const notes =
      el("villageTemplePaymentNotes")
        ?.value.trim() || null;

    const { data, error } =
      await client.rpc(
        "record_temple_fund_payment",
        {
          p_village_id:
            village.id,

          p_account_id:
            account.id,

          p_payment_date:
            paymentDate,

          p_principal_paid:
            isFinal
              ? 0
              : principalPaid,

          p_interest_paid:
            isFinal
              ? 0
              : interestPaid,

          p_payment_type:
            paymentType,

          p_interest_calculated_upto:
            isFinal
              ? interestCalculatedUpto
              : null,

          p_calculated_due_at_settlement:
            isFinal
              ? calculatedDueAtSettlement
              : null,

          p_final_settlement_amount:
            isFinal
              ? finalSettlementAmount
              : null,

          p_payment_mode:
            el("villageTemplePaymentMode")
              ?.value || null,

          p_reference_number:
            el("villageTemplePaymentReference")
              ?.value.trim() || null,

          p_notes:
            notes
        }
      );

    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent =
        "Save Payment";
    }

    if (error) {
      console.error(
        "Unable to record Temple Fund payment:",
        error
      );

      setTempleStatus(
        error.message ||
          "Unable to record Temple Fund payment.",
        true
      );

      return;
    }

    closeTemplePaymentForm();

    await loadTempleFund();

    setTempleStatus(
      `${
        isFinal
          ? "Final settlement"
          : "Payment"
      } recorded successfully. Total cash received: ${money.format(
        numberValue(
          data?.total_received ??
            totalReceived
        )
      )}.`
    );
  }
  function openTempleAccountForm(account = null) {
    const modal = templeAccountModal();

    if (!modal) return;

    const form = el("villageTempleAccountForm");

    if (form) {
      form.reset();
    }

    setText(
      "villageTempleAccountTitle",
      account
        ? "Edit Temple Fund Account"
        : "New Temple Fund Account"
    );

    const values = {
      villageTempleAccountId:
        account?.id || "",

      villageTemplePersonName:
        account?.person_name || "",

      villageTemplePrincipalAmount:
        account?.principal_amount ?? "",

      villageTempleTakenDate:
        account?.taken_date || "",

      villageTempleRelationDetails:
        account?.relation_details || "",

      villageTempleResidence:
        account?.residence || "",

      villageTempleInterestRate:
        account?.monthly_interest_rate ?? 1.5,

      villageTempleNotes:
        account?.notes || ""
    };

    Object.entries(values).forEach(
      ([id, value]) => {
        const node = el(id);

        if (node) {
          node.value = value;
        }
      }
    );

    setTempleAccountFormStatus("");

    modal.hidden = false;

    setTimeout(() => {
      el("villageTemplePersonName")?.focus();
    }, 0);
  }

  function findTempleAccount(accountId) {
    return (
      state.templeAccounts || []
    ).find(
      (row) => row.id === accountId
    ) || null;
  }

  async function saveTempleAccount() {
    const client = getClient();
    const village = state.currentVillage;

    if (!client || !village?.id) {
      setTempleAccountFormStatus(
        "Database connection or village is unavailable.",
        true
      );
      return;
    }

    const accountId =
      el("villageTempleAccountId")?.value?.trim() || "";

    const personName =
      el("villageTemplePersonName")?.value?.trim() || "";

    const principal =
      Number(
        el("villageTemplePrincipalAmount")?.value || 0
      );

    const takenDate =
      el("villageTempleTakenDate")?.value || null;

    const rateValue =
      el("villageTempleInterestRate")?.value;

    const rate =
      rateValue === "" ||
      rateValue === null ||
      rateValue === undefined
        ? 1.5
        : Number(rateValue);

    if (!personName) {
      setTempleAccountFormStatus(
        "Person Name is required.",
        true
      );
      return;
    }

    if (
      !Number.isFinite(principal) ||
      principal <= 0
    ) {
      setTempleAccountFormStatus(
        "Principal Amount must be greater than zero.",
        true
      );
      return;
    }

    if (
      !Number.isFinite(rate) ||
      rate < 0
    ) {
      setTempleAccountFormStatus(
        "Monthly Interest Rate is invalid.",
        true
      );
      return;
    }

    /*
     * Editing the original principal after repayments exist
     * requires financial reconciliation. Keep that protected.
     */
    if (accountId) {
      const existing =
        findTempleAccount(accountId);

      if (!existing) {
        setTempleAccountFormStatus(
          "Temple Fund account could not be found.",
          true
        );
        return;
      }

      if (
        existing.principalRepaid > 0 &&
        principal !== existing.principal
      ) {
        setTempleAccountFormStatus(
          "Principal cannot be changed after repayments exist. Use the financial settlement workflow instead.",
          true
        );
        return;
      }
    }

    const payload = {
      village_id: village.id,
      person_name: personName,
      relation_details:
        el("villageTempleRelationDetails")?.value?.trim() || null,
      residence:
        el("villageTempleResidence")?.value?.trim() || null,
      taken_date: takenDate,
      principal_amount: principal,
      monthly_interest_rate: rate,
      notes:
        el("villageTempleNotes")?.value?.trim() || null
    };

    setTempleAccountFormStatus(
      accountId
        ? "Updating account..."
        : "Saving account..."
    );

    let result;

    if (accountId) {
      result =
        await client
          .from("temple_fund_accounts")
          .update(payload)
          .eq("id", accountId)
          .eq("village_id", village.id)
          .select(
            "id,village_id,person_name,relation_details,residence,taken_date,principal_amount,monthly_interest_rate,status,interest_calculated_upto,settled_at,calculated_due_at_settlement,final_settlement_amount,settlement_notes,notes,created_at,updated_at"
          )
          .single();
    } else {
      result =
        await client.rpc(
          "create_temple_fund_account",
          {
            p_village_id: village.id,
            p_person_name: payload.person_name,
            p_principal_amount: payload.principal_amount,
            p_taken_date: payload.taken_date,
            p_relation_details: payload.relation_details,
            p_residence: payload.residence,
            p_monthly_interest_rate:
              payload.monthly_interest_rate,
            p_notes: payload.notes
          }
        );
    }

    if (result.error) {
      console.error(
        "Temple Fund account save failed:",
        result.error
      );

      setTempleAccountFormStatus(
        `Save failed: ${result.error.message}`,
        true
      );
      return;
    }

    /*
     * Phase 1E-2 intentionally does NOT create principal_given
     * transactions automatically.
     *
     * Reason:
     * Historical accounts may have no genuine taken_date.
     * We will reconcile account principal with ledger cash
     * movements in the next financial-entry phase without
     * inventing transaction dates.
     */

    closeTempleAccountForm();

    await loadTempleFund();

    setTempleStatus(
      accountId
        ? "Temple Fund account updated successfully."
        : (
            takenDate
              ? "Temple Fund account saved. Financial ledger entry will be reconciled in the Fund Entry phase."
              : "Temple Fund account saved with Date Pending."
          )
    );
  }

  function templeImportNormalizeHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function templeImportParseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    const source =
      String(text || "")
        .replace(/^\uFEFF/, "");

    for (
      let index = 0;
      index < source.length;
      index += 1
    ) {
      const char = source[index];
      const next = source[index + 1];

      if (quoted) {
        if (
          char === '"' &&
          next === '"'
        ) {
          field += '"';
          index += 1;
          continue;
        }

        if (char === '"') {
          quoted = false;
          continue;
        }

        field += char;
        continue;
      }

      if (char === '"') {
        quoted = true;
        continue;
      }

      if (char === ",") {
        row.push(field);
        field = "";
        continue;
      }

      if (
        char === "\r" ||
        char === "\n"
      ) {
        if (
          char === "\r" &&
          next === "\n"
        ) {
          index += 1;
        }

        row.push(field);
        field = "";

        if (
          row.some(
            (value) =>
              String(value || "").trim() !== ""
          )
        ) {
          rows.push(row);
        }

        row = [];
        continue;
      }

      field += char;
    }

    row.push(field);

    if (
      row.some(
        (value) =>
          String(value || "").trim() !== ""
      )
    ) {
      rows.push(row);
    }

    return rows;
  }

  function templeImportParseDate(value) {
    const text =
      String(value || "").trim();

    if (!text) return null;

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(text)
    ) {
      return text;
    }

    const match =
      text.match(
        /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/
      );

    if (!match) {
      return "__INVALID__";
    }

    const day =
      Number(match[1]);

    const month =
      Number(match[2]);

    const year =
      Number(match[3]);

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return "__INVALID__";
    }

    return [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");
  }

  function templeImportParseAmount(value) {
    const cleaned =
      String(value ?? "")
        .replace(/[â‚¹,\s]/g, "")
        .trim();

    if (!cleaned) {
      return null;
    }

    const number =
      Number(cleaned);

    return Number.isFinite(number)
      ? number
      : null;
  }

  function templeImportDuplicateKey(
    name,
    principal,
    takenDate
  ) {
    return [
      String(name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " "),
      Number(principal || 0).toFixed(2),
      takenDate || ""
    ].join("|");
  }

  async function importTempleFundCsv(file) {
    const client = getClient();
    const village = state.currentVillage;

    if (!client || !village?.id) {
      alert(
        "Database connection or village is unavailable."
      );
      return;
    }

    if (!file) return;

    if (
      !String(file.name || "")
        .toLowerCase()
        .endsWith(".csv")
    ) {
      alert("Please select a CSV file.");
      return;
    }

    let text;

    try {
      text = await file.text();
    } catch (error) {
      console.error(
        "Temple Fund CSV read failed:",
        error
      );

      alert(
        "Unable to read the selected CSV file."
      );
      return;
    }

    const csvRows =
      templeImportParseCsv(text);

    if (csvRows.length < 2) {
      alert(
        "CSV must contain a header row and at least one account."
      );
      return;
    }

    const headers =
      csvRows[0].map(
        templeImportNormalizeHeader
      );

    const required = [
      "person_name",
      "principal_amount"
    ];

    const missing =
      required.filter(
        (name) =>
          !headers.includes(name)
      );

    if (missing.length) {
      alert(
        `Missing required CSV columns: ${missing.join(", ")}`
      );
      return;
    }

    const column = (name) =>
      headers.indexOf(name);

    const allowedStatuses =
      new Set([
        "active",
        "part_paid",
        "closed",
        "transferred",
        "cancelled"
      ]);

    const rows = [];
    const errors = [];
    const seen = new Set();

    csvRows
      .slice(1)
      .forEach(
        (columns, offset) => {
          const rowNumber =
            offset + 2;

          const value = (name) => {
            const index = column(name);

            if (index < 0) return "";

            return String(
              columns[index] ?? ""
            ).trim();
          };

          const personName =
            value("person_name");

          const principal =
            templeImportParseAmount(
              value("principal_amount")
            );

          const takenDate =
            templeImportParseDate(
              value("taken_date")
            );

          const rateRaw =
            value("monthly_interest_rate");

          const rate =
            rateRaw
              ? templeImportParseAmount(rateRaw)
              : 1.5;

          const statusRaw =
            value("status")
              .toLowerCase();

          const status =
            statusRaw || "active";

          if (!personName) {
            errors.push(
              `Row ${rowNumber}: person_name is required.`
            );
            return;
          }

          if (
            principal === null ||
            principal <= 0
          ) {
            errors.push(
              `Row ${rowNumber}: principal_amount must be greater than zero.`
            );
            return;
          }

          if (
            takenDate === "__INVALID__"
          ) {
            errors.push(
              `Row ${rowNumber}: invalid taken_date. Use DD/MM/YYYY or YYYY-MM-DD, or leave it blank.`
            );
            return;
          }

          if (
            rate === null ||
            rate < 0
          ) {
            errors.push(
              `Row ${rowNumber}: invalid monthly_interest_rate.`
            );
            return;
          }

          if (
            !allowedStatuses.has(status)
          ) {
            errors.push(
              `Row ${rowNumber}: invalid status "${status}".`
            );
            return;
          }

          const key =
            templeImportDuplicateKey(
              personName,
              principal,
              takenDate
            );

          if (seen.has(key)) {
            errors.push(
              `Row ${rowNumber}: duplicate account inside CSV (${personName}).`
            );
            return;
          }

          seen.add(key);

          rows.push({
            village_id: village.id,
            person_name: personName,
            relation_details:
              value("relation_details") || null,
            residence:
              value("residence") || null,
            taken_date: takenDate,
            principal_amount: principal,
            monthly_interest_rate: rate,
            status,
            notes:
              value("notes") || null
          });
        }
      );

    if (errors.length) {
      alert(
        "Temple Fund CSV validation failed:\n\n" +
        errors.slice(0, 20).join("\n") +
        (
          errors.length > 20
            ? `\n\n...and ${errors.length - 20} more error(s).`
            : ""
        )
      );
      return;
    }

    if (!rows.length) {
      alert(
        "No valid Temple Fund accounts were found."
      );
      return;
    }

    const existingResult =
      await client
        .from("temple_fund_accounts")
        .select(
          "person_name,principal_amount,taken_date"
        )
        .eq(
          "village_id",
          village.id
        );

    if (existingResult.error) {
      alert(
        `Unable to check existing Temple Fund accounts: ${existingResult.error.message}`
      );
      return;
    }

    const existingKeys =
      new Set(
        (existingResult.data || [])
          .map(
            (row) =>
              templeImportDuplicateKey(
                row.person_name,
                row.principal_amount,
                row.taken_date
              )
          )
      );

    const duplicates =
      rows.filter(
        (row) =>
          existingKeys.has(
            templeImportDuplicateKey(
              row.person_name,
              row.principal_amount,
              row.taken_date
            )
          )
      );

    if (duplicates.length) {
      alert(
        "Import stopped because matching Temple Fund account(s) already exist:\n\n" +
        duplicates
          .slice(0, 15)
          .map(
            (row) =>
              `${row.person_name} - ${money.format(row.principal_amount)}`
          )
          .join("\n")
      );

      return;
    }

    const total =
      rows.reduce(
        (sum, row) =>
          sum +
          Number(row.principal_amount || 0),
        0
      );

    const missingDates =
      rows.filter(
        (row) => !row.taken_date
      ).length;

    const preview =
      [
        "TEMPLE FUND CSV PREVIEW",
        "",
        `Village: ${village.name_telugu || village.name || village.slug || ""}`,
        `Accounts: ${rows.length}`,
        `Principal total: ${money.format(total)}`,
        `Date Pending: ${missingDates}`,
        "",
        "IMPORTANT:",
        "Rows with a Taken Date create one principal-given ledger transaction.",
        "Rows with Date Pending create the account only; no fake transaction date is created.",
        "It does NOT create repayments.",
        "It does NOT create interest-received transactions.",
        "It does NOT calculate accrued interest.",
        "",
        "Continue with import?"
      ].join("\n");

    if (!window.confirm(preview)) {
      setTempleStatus(
        "Temple Fund import cancelled. No records were added."
      );
      return;
    }

    const importedAccountIds = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      const rpcResult =
        await client.rpc(
          "create_temple_fund_account",
          {
            p_village_id: village.id,
            p_person_name: row.person_name,
            p_principal_amount:
              row.principal_amount,
            p_taken_date:
              row.taken_date || null,
            p_relation_details:
              row.relation_details || null,
            p_residence:
              row.residence || null,
            p_monthly_interest_rate:
              row.monthly_interest_rate,
            p_notes:
              row.notes || null
          }
        );

      if (rpcResult.error) {
        console.error(
          "Temple Fund CSV import failed:",
          rpcResult.error
        );

        alert(
          `Temple Fund import stopped at row ${index + 2}: ${rpcResult.error.message}

${importedAccountIds.length} account(s) were already imported before the error.

Do not run the CSV again without checking the Temple Fund register first.`
        );

        await loadTempleFund();
        return;
      }

      importedAccountIds.push(
        rpcResult.data
      );
    }

    const insertResult = {
      error: null,
      data: importedAccountIds
    };

    if (insertResult.error) {
      console.error(
        "Temple Fund CSV import failed:",
        insertResult.error
      );

      alert(
        `Temple Fund import failed: ${insertResult.error.message}`
      );
      return;
    }

    await loadTempleFund();

    setTempleStatus(
      `${rows.length} Temple Fund account(s) imported successfully. ${missingDates} account(s) have Date Pending.`
    );

    alert(
      `${rows.length} Temple Fund account(s) imported successfully.

Principal total: ${money.format(total)}
Date Pending: ${missingDates}
Principal-given transactions created: ${rows.length - missingDates}
Repayment transactions created: 0
Interest-received transactions created: 0`
    );
  }

  function openTempleFundCsvPicker() {
    const input =
      document.createElement("input");

    input.type = "file";
    input.accept = ".csv,text/csv";
    input.style.display = "none";

    input.addEventListener(
      "change",
      async () => {
        const file =
          input.files?.[0] || null;

        try {
          await importTempleFundCsv(file);
        } finally {
          input.remove();
        }
      },
      { once: true }
    );

    document.body.appendChild(input);
    input.click();
  }

  function initializeVillageAdmin() {
    const templeExportButton =
      el("villageTempleExportButton");

    if (templeExportButton) {
      templeExportButton.addEventListener(
        "click",
        () => {
          exportTempleFundCsv();
        }
      );
    }

    const templeNewAccountButton =
      el("villageTempleNewAccountButton");

    if (templeNewAccountButton) {
      templeNewAccountButton.addEventListener(
        "click",
        () => {
          openTempleAccountForm();
        }
      );
    }

    const templeImportButton =
      el("villageTempleImportButton");

    if (templeImportButton) {
      templeImportButton.addEventListener(
        "click",
        () => {
          openTempleFundCsvPicker();
        }
      );
    }

    const templeAccountForm =
      el("villageTempleAccountForm");

    if (templeAccountForm) {
      templeAccountForm.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();
          await saveTempleAccount();
        }
      );
    }

    document
      .querySelectorAll(
        "[data-temple-account-close]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            closeTempleAccountForm();
          }
        );
      });

    const templeTableBody =
      el("villageTempleTableBody");

    if (templeTableBody) {
      templeTableBody.addEventListener(
        "click",
        async (event) => {
          const deleteButton =
            event.target.closest(
              "[data-temple-delete]"
            );

          if (deleteButton) {
            await deleteTempleAccount(
              deleteButton.dataset.templeDelete
            );
            return;
          }

          const historyButton =
            event.target.closest(
              "[data-temple-history]"
            );

          if (historyButton) {
            openTemplePaymentHistory(
              historyButton.dataset.templeHistory
            );
            return;
          }

          const editButton =
            event.target.closest(
              "[data-temple-edit]"
            );

          if (!editButton) return;

          const account =
            findTempleAccount(
              editButton.dataset.templeEdit
            );

          if (account) {
            openTempleAccountForm(account);
          }
        }
      );
    }
    const templePaymentButton =
      el("villageTempleRecordPaymentButton");

    if (templePaymentButton) {
      templePaymentButton.addEventListener(
        "click",
        () => {
          openTemplePaymentForm();
        }
      );
    }

    document
      .querySelectorAll("[data-temple-payment-close]")
      .forEach((node) => {
        node.addEventListener(
          "click",
          closeTemplePaymentForm
        );
      });
      const templeFinalSettlementAmountInput =
    el("villageTempleFinalSettlementAmount");

  if (templeFinalSettlementAmountInput) {
    templeFinalSettlementAmountInput.addEventListener(
      "input",
      refreshTemplePaymentSummary
    );

    templeFinalSettlementAmountInput.addEventListener(
      "change",
      refreshTemplePaymentSummary
    );
  }
el("villageTemplePaymentForm")?.addEventListener(
      "submit",
      saveTemplePayment
    );

    el("villageTemplePaymentPreviewEdit")?.addEventListener(
      "click",
      () => {
        hideTemplePaymentPreview();
        refreshTemplePaymentSummary();
      }
    );

    el("villageTemplePaymentPreviewConfirm")?.addEventListener(
      "click",
      () => {
        const form =
          el("villageTemplePaymentForm");

        if (!form) {
          return;
        }

        templePaymentPreviewConfirmed = true;

        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        }
        else {
          form.dispatchEvent(
            new Event(
              "submit",
              {
                bubbles: true,
                cancelable: true
              }
            )
          );
        }
      }
    );

    el("villageTemplePaymentCancel")?.addEventListener(
      "click",
      () => {
        closeTemplePaymentForm();
      }
    );

    el("villageTemplePaymentAccount")?.addEventListener(
      "change",
      refreshTemplePaymentSummary
    );

    el("villageTemplePrincipalPaid")?.addEventListener(
      "input",
      refreshTemplePaymentSummary
    );

    el("villageTempleInterestPaid")?.addEventListener(
      "input",
      refreshTemplePaymentSummary
    );

    el("villageTemplePaymentType")?.addEventListener(
      "change",
      refreshTemplePaymentSummary
    );
    const templeFundEntryButton =
      el("villageTempleFundEntryButton");

    if (templeFundEntryButton) {
      templeFundEntryButton.addEventListener(
        "click",
        () => {
          setTempleStatus(
            "Fund Entry will be enabled after the Temple Fund account foundation is verified."
          );
        }
      );
    }
    bindVillageAdminEvents();

    const donorImportButton =
      el("villageDonorImportButton");

    if (donorImportButton) {
      donorImportButton.addEventListener(
        "click",
        () => {
          openVillageCommitmentCsvPicker();
        }
      );
    }

    const donationForm =
      el("villageDonationForm");

    if (donationForm) {
      donationForm.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();
          await saveDonationCommitment();
        }
      );
    }

    const paymentButton =
      el("villageRecordPaymentButton");

    if (paymentButton) {
      paymentButton.addEventListener(
        "click",
        () => {
          openPaymentForm();
        }
      );
    }

    const paymentForm =
      el("villagePaymentForm");

    if (paymentForm) {
      paymentForm.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();
          await saveVillagePayment();
        }
      );
    }

    const paymentCommitment =
      el("villagePaymentCommitment");

    if (paymentCommitment) {
      paymentCommitment.addEventListener(
        "change",
        () => {
          updatePaymentSummary();
        }
      );
    }

    [
      "villagePaymentFormClose",
      "villagePaymentCancelButton"
    ].forEach((id) => {
      const button = el(id);

      if (button) {
        button.addEventListener(
          "click",
          () => {
            closePaymentForm();
          }
        );
      }
    });
    const donorTableBody =
      el("villageDonorTableBody");

    if (donorTableBody) {
      donorTableBody.addEventListener(
        "click",
        async (event) => {
          const historyButton =
            event.target.closest(
              "[data-donor-history]"
            );

          if (historyButton) {
            await openDonorHistory(
              historyButton.dataset.donorHistory
            );
            return;
          }

          const editButton =
            event.target.closest(
              "[data-donor-edit]"
            );

          if (editButton) {
            openDonationEdit(
              editButton.dataset.donorEdit
            );
          }
        }
      );
    }

    const historyClose =
      el("villageDonorHistoryClose");

    if (historyClose) {
      historyClose.addEventListener(
        "click",
        () => {
          closeDonorHistory();
        }
      );
    }
    const donorSearch = el("villageDonorSearch");

    if (donorSearch) {
      donorSearch.addEventListener("input", () => {
        renderDonors(state.donorRows || []);
      });
    }
    const villageCard = el("villageManagementCard");

    if (villageCard) {
      villageCard.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        await openVillageView();
      });
    }

    document
      .querySelectorAll("[data-open-village-tab]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          openTab(button.dataset.openVillageTab);
        });
      });

    window.SRMDCVillageAdmin = {
      open: openVillageView,
      refresh: async () => {
        state.villages = [];
        state.currentVillage = null;
        await loadVillages();
      },
      getCurrentVillage: () => state.currentVillage
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeVillageAdmin,
      { once: true }
    );
  } else {
    initializeVillageAdmin();
  }

  function installTempleTopScrollbars() {
    document
      .querySelectorAll(".temple-table-scroll")
      .forEach((bottom) => {
        if (bottom.dataset.topScrollInstalled === "1") {
          return;
        }

        bottom.dataset.topScrollInstalled = "1";

        const top = document.createElement("div");
        top.className = "temple-table-top-scroll";

        const spacer = document.createElement("div");
        spacer.className = "temple-table-top-scroll-spacer";

        top.appendChild(spacer);
        bottom.parentNode.insertBefore(top, bottom);

        const syncWidth = () => {
          const table = bottom.querySelector("table");

          spacer.style.width =
            `${Math.max(
              table?.scrollWidth || 0,
              bottom.scrollWidth || 0
            )}px`;
        };

        let syncing = false;

        top.addEventListener("scroll", () => {
          if (syncing) return;

          syncing = true;
          bottom.scrollLeft = top.scrollLeft;
          syncing = false;
        });

        bottom.addEventListener("scroll", () => {
          if (syncing) return;

          syncing = true;
          top.scrollLeft = bottom.scrollLeft;
          syncing = false;
        });

        syncWidth();

        window.addEventListener(
          "resize",
          syncWidth
        );

        requestAnimationFrame(syncWidth);
      });
  }

  installTempleTopScrollbars();

  function setupTempleHorizontalScrollSync(
    topSelector,
    bottomSelector,
    spacerSelector
  ) {
    const top =
      document.querySelector(topSelector);

    const bottom =
      document.querySelector(bottomSelector);

    const spacer =
      document.querySelector(spacerSelector);

    if (!top || !bottom || !spacer) {
      return;
    }

    const updateWidth = () => {
      spacer.style.width =
        `${bottom.scrollWidth}px`;
    };

    let syncing = false;

    top.addEventListener("scroll", () => {
      if (syncing) return;

      syncing = true;
      bottom.scrollLeft = top.scrollLeft;
      syncing = false;
    });

    bottom.addEventListener("scroll", () => {
      if (syncing) return;

      syncing = true;
      top.scrollLeft = bottom.scrollLeft;
      syncing = false;
    });

    updateWidth();
    requestAnimationFrame(updateWidth);

    window.addEventListener(
      "resize",
      updateWidth
    );
  }

  setupTempleHorizontalScrollSync(
    ".village-temple-top-scroll",
    ".village-temple-table-scroll",
    ".village-temple-top-scroll-spacer"
  );
})();
