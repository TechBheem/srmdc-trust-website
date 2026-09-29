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

  function renderPublicVillageDonations(rows) {
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

      loadPublicVillageDonations()
        .catch((error) => {
          console.error(
            "Public village donation loading failed:",
            error
          );
        });

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
