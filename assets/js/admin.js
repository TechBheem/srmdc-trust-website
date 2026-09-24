"use strict";

(() => {
  const config =
    window.SRMDC_SUPABASE_CONFIG;

  const loadingView =
    document.getElementById("loadingView");

  const loginView =
    document.getElementById("loginView");

  const dashboardView =
    document.getElementById("dashboardView");

  const loginForm =
    document.getElementById("loginForm");

  const loginButton =
    document.getElementById("loginButton");

  const loginMessage =
    document.getElementById("loginMessage");

  const logoutButton =
    document.getElementById("logoutButton");

  const adminIdentity =
    document.getElementById("adminIdentity");

  const adminRole =
    document.getElementById("adminRole");

  const moduleMessage =
    document.getElementById("moduleMessage");

  const trustProfileView =
    document.getElementById("trustProfileView");

  const profileBackButton =
    document.getElementById("profileBackButton");

  const trustProfileForm =
    document.getElementById("trustProfileForm");

  const profileStatus =
    document.getElementById("profileStatus");

  const profileMessage =
    document.getElementById("profileMessage");

  const saveDraftButton =
    document.getElementById("saveDraftButton");

  const previewProfileButton =
    document.getElementById("previewProfileButton");

  const publishProfileButton =
    document.getElementById("publishProfileButton");

  const profilePreview =
    document.getElementById("profilePreview");

  const closePreviewButton =
    document.getElementById("closePreviewButton");

  let currentAdminUser = null;
  let currentTrustProfile = null;

  function show(view) {
    loadingView.classList.add("hidden");
    loginView.classList.add("hidden");
    dashboardView.classList.add("hidden");
    trustProfileView.classList.add("hidden");

    view.classList.remove("hidden");
  }

  function readableRole(role) {
    return String(role || "")
      .split("_")
      .map(
        part =>
          part.charAt(0).toUpperCase() +
          part.slice(1)
      )
      .join(" ");
  }

  function configurationIsReady() {
    return (
      config &&
      config.url &&
      config.publishableKey &&
      !config.publishableKey.includes(
        "PASTE_SB_PUBLISHABLE_KEY_HERE"
      )
    );
  }

  if (!configurationIsReady()) {
    loadingView.innerHTML = `
      <div class="brand-mark">SRMDC</div>
      <h1>Admin setup required</h1>
      <p class="muted">
        Supabase publishable-key configuration
        has not yet been completed.
      </p>
    `;

    return;
  }

  if (!window.supabase) {
    loadingView.innerHTML = `
      <div class="brand-mark">SRMDC</div>
      <h1>Unable to load login service</h1>
      <p class="muted">
        Please check the internet connection and
        reload this page.
      </p>
    `;

    return;
  }

  const client =
    window.supabase.createClient(
      config.url,
      config.publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

  async function loadAuthorizedDashboard(user) {
    currentAdminUser = user;

    const {
      data: profile,
      error
    } = await client
      .from("admin_profiles")
      .select(
        "user_id, display_name, role, is_active"
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !profile) {
      await client.auth.signOut();

      loginMessage.textContent =
        "This account is not authorized for SRMDC administration.";

      show(loginView);
      return;
    }

    adminIdentity.textContent =
      `${profile.display_name} • ${user.email || ""}`;

    adminRole.textContent =
      readableRole(profile.role);

    show(dashboardView);
  }

  function valueOf(id) {
    return document
      .getElementById(id)
      .value
      .trim();
  }

  function setValue(id, value) {
    document
      .getElementById(id)
      .value = value || "";
  }

  function profilePayload() {
    return {
      official_name:
        valueOf("profileOfficialName"),

      display_name:
        valueOf("profileDisplayName"),

      public_description:
        valueOf("profileDescription") || null,

      door_number:
        valueOf("profileDoorNumber") || null,

      village:
        valueOf("profileVillage") || null,

      post_office:
        valueOf("profilePostOffice") || null,

      mandal:
        valueOf("profileMandal") || null,

      district:
        valueOf("profileDistrict") || null,

      state:
        valueOf("profileState") || null,

      pin_code:
        valueOf("profilePinCode") || null,

      primary_phone:
        valueOf("profilePrimaryPhone") || null,

      alternate_phone:
        valueOf("profileAlternatePhone") || null,

      official_email:
        valueOf("profileEmail") || null,

      website_url:
        valueOf("profileWebsite") || null,

      public_note:
        valueOf("profilePublicNote") || null
    };
  }

  function populateProfileForm(profile) {
    setValue(
      "profileOfficialName",
      profile.official_name
    );

    setValue(
      "profileDisplayName",
      profile.display_name
    );

    setValue(
      "profileDescription",
      profile.public_description
    );

    setValue(
      "profileDoorNumber",
      profile.door_number
    );

    setValue(
      "profileVillage",
      profile.village
    );

    setValue(
      "profilePostOffice",
      profile.post_office
    );

    setValue(
      "profileMandal",
      profile.mandal
    );

    setValue(
      "profileDistrict",
      profile.district
    );

    setValue(
      "profileState",
      profile.state
    );

    setValue(
      "profilePinCode",
      profile.pin_code
    );

    setValue(
      "profilePrimaryPhone",
      profile.primary_phone
    );

    setValue(
      "profileAlternatePhone",
      profile.alternate_phone
    );

    setValue(
      "profileEmail",
      profile.official_email
    );

    setValue(
      "profileWebsite",
      profile.website_url
    );

    setValue(
      "profilePublicNote",
      profile.public_note
    );
  }

  function updateProfileStatus(profile) {
    profileStatus.classList.remove(
      "is-published",
      "has-draft"
    );

    if (
      profile.published_version ===
      profile.draft_version
    ) {
      profileStatus.textContent =
        `Published version ${profile.published_version}. No unpublished draft changes.`;

      profileStatus.classList.add(
        "is-published"
      );

      return;
    }

    if (profile.published_version) {
      profileStatus.textContent =
        `Draft version ${profile.draft_version}. Published version ${profile.published_version}. Unpublished changes exist.`;
    }
    else {
      profileStatus.textContent =
        `Draft version ${profile.draft_version}. This profile has not been published yet.`;
    }

    profileStatus.classList.add(
      "has-draft"
    );
  }

  async function loadTrustProfile() {
    profileMessage.textContent = "";
    profileStatus.textContent =
      "Loading Trust profile...";

    const {
      data,
      error
    } = await client
      .from("website_trust_profile")
      .select("*")
      .eq("profile_key", "main")
      .maybeSingle();

    if (error || !data) {
      profileStatus.textContent =
        "Unable to load the Trust profile.";

      profileMessage.textContent =
        error?.message ||
        "Trust profile not found.";

      return false;
    }

    currentTrustProfile = data;

    populateProfileForm(data);
    updateProfileStatus(data);

    return true;
  }

  async function openTrustProfile() {
    if (!currentAdminUser) {
      show(loginView);
      return;
    }

    show(trustProfileView);

    profilePreview.classList.add(
      "hidden"
    );

    await loadTrustProfile();
  }

  function validateProfilePayload(payload) {
    if (
      !payload.official_name ||
      !payload.display_name
    ) {
      return "Official Trust Name and Display Name are required.";
    }

    if (
      payload.pin_code &&
      !/^[0-9]{6}$/.test(payload.pin_code)
    ) {
      return "PIN Code must contain exactly 6 digits.";
    }

    if (
      payload.official_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        payload.official_email
      )
    ) {
      return "Please enter a valid official email address.";
    }

    return null;
  }

  async function saveTrustProfileDraft() {
    if (
      !currentAdminUser ||
      !currentTrustProfile
    ) {
      profileMessage.textContent =
        "Administrator session or profile is unavailable.";

      return false;
    }

    const payload =
      profilePayload();

    const validationError =
      validateProfilePayload(payload);

    if (validationError) {
      profileMessage.textContent =
        validationError;

      return false;
    }

    profileMessage.classList.remove(
      "success"
    );

    profileMessage.textContent =
      "Saving draft...";

    saveDraftButton.disabled = true;
    publishProfileButton.disabled = true;

    const nextVersion =
      Number(
        currentTrustProfile.draft_version || 0
      ) + 1;

    const update = {
      ...payload,

      draft_version:
        nextVersion,

      updated_by:
        currentAdminUser.id
    };

    const {
      data,
      error
    } = await client
      .from("website_trust_profile")
      .update(update)
      .eq("profile_key", "main")
      .select("*")
      .single();

    saveDraftButton.disabled = false;
    publishProfileButton.disabled = false;

    if (error) {
      profileMessage.textContent =
        `Draft was not saved: ${error.message}`;

      return false;
    }

    currentTrustProfile = data;

    populateProfileForm(data);
    updateProfileStatus(data);

    profileMessage.classList.add(
      "success"
    );

    profileMessage.textContent =
      `Draft version ${data.draft_version} saved successfully.`;

    return true;
  }

  function buildProfilePreview() {
    const payload =
      profilePayload();

    const validationError =
      validateProfilePayload(payload);

    if (validationError) {
      profileMessage.classList.remove(
        "success"
      );

      profileMessage.textContent =
        validationError;

      return;
    }

    document.getElementById(
      "previewDisplayName"
    ).textContent =
      payload.display_name;

    document.getElementById(
      "previewOfficialName"
    ).textContent =
      payload.official_name;

    document.getElementById(
      "previewDescription"
    ).textContent =
      payload.public_description || "";

    const address = [
      payload.door_number
        ? `Door No. ${payload.door_number}`
        : null,

      payload.village,
      payload.post_office,
      payload.mandal,
      payload.district,
      payload.state,
      payload.pin_code
    ]
      .filter(Boolean)
      .join(", ");

    document.getElementById(
      "previewAddress"
    ).textContent =
      address || "-";

    document.getElementById(
      "previewPhone"
    ).textContent =
      [
        payload.primary_phone,
        payload.alternate_phone
      ]
        .filter(Boolean)
        .join(" / ") || "-";

    document.getElementById(
      "previewEmail"
    ).textContent =
      payload.official_email || "-";

    document.getElementById(
      "previewWebsite"
    ).textContent =
      payload.website_url || "-";

    document.getElementById(
      "previewPublicNote"
    ).textContent =
      payload.public_note || "";

    profilePreview.classList.remove(
      "hidden"
    );

    profilePreview.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function publishTrustProfile() {
    if (
      !currentAdminUser ||
      !currentTrustProfile
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Publish the current Trust Profile draft to the public website data?"
      );

    if (!confirmed) {
      return;
    }

    profileMessage.classList.remove(
      "success"
    );

    profileMessage.textContent =
      "Publishing Trust profile...";

    publishProfileButton.disabled = true;
    saveDraftButton.disabled = true;

    const {
      error
    } = await client.rpc(
      "publish_srmdc_trust_profile"
    );

    publishProfileButton.disabled = false;
    saveDraftButton.disabled = false;

    if (error) {
      profileMessage.textContent =
        `Publish failed: ${error.message}`;

      return;
    }

    await loadTrustProfile();

    profileMessage.classList.add(
      "success"
    );

    profileMessage.textContent =
      "Trust Profile published successfully.";
  }

  async function initialize() {
    const {
      data,
      error
    } = await client.auth.getSession();

    if (error) {
      loginMessage.textContent =
        "Unable to check the current session.";

      show(loginView);
      return;
    }

    const session = data.session;

    if (!session?.user) {
      show(loginView);
      return;
    }

    await loadAuthorizedDashboard(
      session.user
    );
  }

  loginForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      loginMessage.textContent = "";
      loginButton.disabled = true;
      loginButton.textContent = "Signing in...";

      const email =
        document
          .getElementById("email")
          .value
          .trim();

      const password =
        document
          .getElementById("password")
          .value;

      try {
        const {
          data,
          error
        } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (error || !data.user) {
          loginMessage.textContent =
            "Invalid email or password.";
          return;
        }

        await loadAuthorizedDashboard(
          data.user
        );
      }
      catch (_) {
        loginMessage.textContent =
          "Unable to sign in. Please try again.";
      }
      finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign in";
      }
    }
  );

  logoutButton.addEventListener(
    "click",
    async () => {
      await client.auth.signOut();

      loginForm.reset();
      loginMessage.textContent = "";

      show(loginView);
    }
  );

  document
    .querySelectorAll(".module-card")
    .forEach(card => {
      card.addEventListener(
        "click",
        async () => {
          const name =
            card.dataset.module || "Module";

          if (name === "Trust Profile") {
            await openTrustProfile();
            return;
          }

          moduleMessage.textContent =
            `${name} will be enabled in the next admin-content phase.`;
        }
      );
    });

  profileBackButton.addEventListener(
    "click",
    () => {
      profilePreview.classList.add(
        "hidden"
      );

      show(dashboardView);
    }
  );

  trustProfileForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      await saveTrustProfileDraft();
    }
  );

  previewProfileButton.addEventListener(
    "click",
    () => {
      buildProfilePreview();
    }
  );

  closePreviewButton.addEventListener(
    "click",
    () => {
      profilePreview.classList.add(
        "hidden"
      );
    }
  );

  publishProfileButton.addEventListener(
    "click",
    async () => {
      await publishTrustProfile();
    }
  );

  client.auth.onAuthStateChange(
    async (event, session) => {
      if (
        event === "SIGNED_OUT" &&
        !loginView.classList.contains("hidden")
      ) {
        return;
      }

      if (
        event === "SIGNED_OUT"
      ) {
        show(loginView);
      }

      if (
        event === "SIGNED_IN" &&
        session?.user
      ) {
        await loadAuthorizedDashboard(
          session.user
        );
      }
    }
  );

  initialize();

  // ============================================================
  // SRMDC_DONATION_VERIFICATION_MODULE
  // ============================================================

  const srmdcDonationVerification = (() => {

    let queue = [];
    let currentSubmission = null;


    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------

    const escapeHtml = (value) => {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };


    const money = (value) => {
      const number = Number(value || 0);

      return new Intl.NumberFormat(
        "en-IN",
        {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 2
        }
      ).format(number);
    };


    const formatDate = (value) => {
      if (!value) {
        return "—";
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return new Intl.DateTimeFormat(
        "en-IN",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }
      ).format(date);
    };


    const statusLabel = (value) => {
      return String(value || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) =>
          character.toUpperCase()
        );
    };


    const getView = () =>
      document.getElementById(
        "donationVerificationView"
      );


    const setMessage = (
      text,
      type = ""
    ) => {
      const element =
        document.getElementById(
          "donationVerificationMessage"
        );

      if (!element) {
        return;
      }

      element.textContent = text || "";
      element.className =
        "srmdc-finance-message";

      if (type) {
        element.classList.add(type);
      }
    };


    // ----------------------------------------------------------
    // Build module card + workspace dynamically.
    //
    // This avoids replacing existing Trust Profile HTML.
    // ----------------------------------------------------------

    const buildUi = () => {

      const moduleGrid =
        document.querySelector(".module-grid");

      if (
        moduleGrid &&
        !document.getElementById(
          "donationVerificationCard"
        )
      ) {
        const card =
          document.createElement("button");

        card.type = "button";
        card.id =
          "donationVerificationCard";

        card.className = "module-card";

        card.innerHTML = `
          <span class="module-icon">&#8377;</span>
          <strong>Donation Verification</strong>
          <span>
            Verify bank credits and issue official receipts
          </span>
        `;

        const receiptCard =
          Array.from(
            moduleGrid.querySelectorAll(
              ".module-card"
            )
          ).find(
            (element) =>
              element.dataset.module ===
              "Receipt Verification"
          );

        if (receiptCard) {
          moduleGrid.insertBefore(
            card,
            receiptCard
          );
        } else {
          moduleGrid.appendChild(card);
        }

        card.addEventListener(
          "click",
          open
        );
      }


      if (
        !document.getElementById(
          "donationVerificationView"
        )
      ) {
        const view =
          document.createElement("section");

        view.id =
          "donationVerificationView";

        view.className =
          "dashboard hidden srmdc-finance-view";

        view.innerHTML = `
          <header class="dashboard-header">
            <div>
              <p class="eyebrow">
                FINANCIAL ADMINISTRATION
              </p>

              <h1>
                Donation Verification
              </h1>

              <p class="muted">
                Verify actual bank credits before issuing
                an official SRMDC Trust receipt.
              </p>
            </div>

            <div class="srmdc-finance-header-actions">
              <button
                type="button"
                id="refreshDonationQueueButton"
                class="secondary-button"
              >
                Refresh
              </button>

              <button
                type="button"
                id="donationVerificationBackButton"
                class="secondary-button"
              >
                Back to Dashboard
              </button>
            </div>
          </header>

          <div
            id="donationVerificationMessage"
            class="srmdc-finance-message"
          ></div>

          <div class="srmdc-finance-summary">
            <div>
              <strong id="pendingDonationCount">0</strong>
              <span>Awaiting verification</span>
            </div>

            <div>
              <strong id="issuedDonationCount">0</strong>
              <span>Receipts issued</span>
            </div>
          </div>

          <div
            id="donationQueue"
            class="srmdc-donation-queue"
          ></div>

          <div
            id="donationVerificationPanel"
            class="srmdc-verification-panel hidden"
          ></div>
        `;

        const main =
          dashboardView.parentElement;

        main.appendChild(view);


        document
          .getElementById(
            "donationVerificationBackButton"
          )
          .addEventListener(
            "click",
            close
          );


        document
          .getElementById(
            "refreshDonationQueueButton"
          )
          .addEventListener(
            "click",
            loadQueue
          );
      }
    };


    // ----------------------------------------------------------
    // Navigation
    // ----------------------------------------------------------

    function open() {

      buildUi();

      dashboardView.classList.add(
        "hidden"
      );

      const profileView =
        document.getElementById(
          "trustProfileView"
        );

      if (profileView) {
        profileView.classList.add(
          "hidden"
        );
      }

      getView().classList.remove(
        "hidden"
      );

      currentSubmission = null;

      loadQueue();
    }


    function close() {

      const view = getView();

      if (view) {
        view.classList.add(
          "hidden"
        );
      }

      dashboardView.classList.remove(
        "hidden"
      );

      currentSubmission = null;
    }


    // ----------------------------------------------------------
    // Load secure financial-admin queue
    // ----------------------------------------------------------

    async function loadQueue() {

      buildUi();

      const container =
        document.getElementById(
          "donationQueue"
        );

      const panel =
        document.getElementById(
          "donationVerificationPanel"
        );

      container.innerHTML = `
        <div class="srmdc-finance-empty">
          Loading donation submissions...
        </div>
      `;

      panel.classList.add("hidden");

      setMessage("");


      const {
        data,
        error
      } = await client.rpc(
        "get_srmdc_donation_verification_queue"
      );


      if (error) {
        console.error(error);

        container.innerHTML = `
          <div class="srmdc-finance-empty">
            Unable to load donation submissions.
          </div>
        `;

        setMessage(
          error.message ||
          "Unable to load donation verification queue.",
          "error"
        );

        return;
      }


      queue =
        Array.isArray(data)
          ? data
          : [];


      renderQueue();
    }


    // ----------------------------------------------------------
    // Queue cards
    // ----------------------------------------------------------

    function renderQueue() {

      const container =
        document.getElementById(
          "donationQueue"
        );


      const pending =
        queue.filter(
          (item) =>
            item.status !==
            "receipt_issued"
        );


      const issued =
        queue.filter(
          (item) =>
            item.status ===
            "receipt_issued"
        );


      document.getElementById(
        "pendingDonationCount"
      ).textContent =
        String(pending.length);


      document.getElementById(
        "issuedDonationCount"
      ).textContent =
        String(issued.length);


      if (!queue.length) {

        container.innerHTML = `
          <div class="srmdc-finance-empty">
            No donation submissions are currently
            waiting for verification.
          </div>
        `;

        return;
      }


      container.innerHTML =
        queue.map(
          (item) => {

            const development =
              item.is_development_record === true;


            return `
              <article
                class="
                  srmdc-donation-card
                  ${
                    development
                      ? "development"
                      : ""
                  }
                "
              >
                <div class="srmdc-donation-card-head">

                  <div>
                    <span class="srmdc-reference">
                      ${
                        escapeHtml(
                          item.submission_number
                        )
                      }
                    </span>

                    <h3>
                      ${
                        escapeHtml(
                          item.donor_name
                        )
                      }
                    </h3>
                  </div>

                  <span
                    class="
                      srmdc-status-badge
                      ${
                        item.status ===
                        "receipt_issued"
                          ? "issued"
                          : ""
                      }
                    "
                  >
                    ${
                      escapeHtml(
                        statusLabel(
                          item.status
                        )
                      )
                    }
                  </span>
                </div>


                ${
                  development
                    ? `
                      <div class="srmdc-test-warning">
                        DEVELOPMENT / TEST RECORD —
                        DO NOT PROCESS
                      </div>
                    `
                    : ""
                }


                <div class="srmdc-card-grid">

                  <div>
                    <span>Fund</span>
                    <strong>
                      ${
                        escapeHtml(
                          item.fund_name
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Amount</span>
                    <strong>
                      ${
                        escapeHtml(
                          money(
                            item.declared_amount
                          )
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Payment Mode</span>
                    <strong>
                      ${
                        escapeHtml(
                          statusLabel(
                            item.payment_mode
                          )
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Payment Date</span>
                    <strong>
                      ${
                        escapeHtml(
                          formatDate(
                            item.donor_payment_date
                          )
                        )
                      }
                    </strong>
                  </div>

                </div>


                <p class="srmdc-purpose">
                  ${
                    escapeHtml(
                      item.donation_purpose
                    )
                  }
                </p>


                <button
                  type="button"
                  class="secondary-button srmdc-review-button"
                  data-submission-id="${
                    escapeHtml(
                      item.submission_id
                    )
                  }"
                >
                  ${
                    item.status ===
                    "receipt_issued"
                      ? "View Record"
                      : "Review Payment"
                  }
                </button>

              </article>
            `;
          }
        ).join("");


      container
        .querySelectorAll(
          ".srmdc-review-button"
        )
        .forEach(
          (button) => {

            button.addEventListener(
              "click",
              () => {

                const id =
                  button.dataset
                    .submissionId;

                showSubmission(id);
              }
            );
          }
        );
    }


    // ----------------------------------------------------------
    // Review screen
    // ----------------------------------------------------------

    function showSubmission(id) {

      const item =
        queue.find(
          (entry) =>
            entry.submission_id === id
        );


      if (!item) {
        return;
      }


      currentSubmission = item;


      const panel =
        document.getElementById(
          "donationVerificationPanel"
        );


      const container =
        document.getElementById(
          "donationQueue"
        );


      container.classList.add(
        "hidden"
      );


      const locked =
        item.status ===
        "receipt_issued";


      const development =
        item.is_development_record ===
        true;


      const amount =
        item.paid_amount ??
        item.declared_amount ??
        "";


      panel.innerHTML = `
        <div class="srmdc-review-toolbar">
          <button
            type="button"
            id="backToDonationQueueButton"
            class="secondary-button"
          >
            &#8592; Back to Donation Queue
          </button>
        </div>


        <div class="srmdc-review-card">

          <div class="srmdc-review-title">

            <div>
              <p class="eyebrow">
                DONATION SUBMISSION
              </p>

              <h2>
                ${
                  escapeHtml(
                    item.submission_number
                  )
                }
              </h2>
            </div>

            <span class="srmdc-status-badge">
              ${
                escapeHtml(
                  statusLabel(
                    item.status
                  )
                )
              }
            </span>

          </div>


          ${
            development
              ? `
                <div class="srmdc-test-warning large">
                  This is a development/test record.
                  Official receipt issuance is blocked
                  by the database.
                </div>
              `
              : ""
          }


          <section class="srmdc-review-section">

            <h3>Donor Details</h3>

            <div class="srmdc-detail-grid">

              <div>
                <span>Name</span>
                <strong>
                  ${
                    escapeHtml(
                      item.donor_name
                    )
                  }
                </strong>
              </div>

              <div>
                <span>Mobile</span>
                <strong>
                  ${
                    escapeHtml(
                      item.mobile || "—"
                    )
                  }
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>
                  ${
                    escapeHtml(
                      item.email || "—"
                    )
                  }
                </strong>
              </div>

              <div>
                <span>PAN / ID</span>
                <strong>
                  ${
                    escapeHtml(
                      item.pan_or_id ||
                      "Not provided"
                    )
                  }
                </strong>
              </div>

            </div>

          </section>


          <section class="srmdc-review-section">

            <h3>Donation</h3>

            <div class="srmdc-detail-grid">

              <div>
                <span>Fund</span>
                <strong>
                  ${
                    escapeHtml(
                      item.fund_name
                    )
                  }
                </strong>
              </div>

              <div>
                <span>Purpose</span>
                <strong>
                  ${
                    escapeHtml(
                      item.donation_purpose
                    )
                  }
                </strong>
              </div>

              <div>
                <span>Declared Amount</span>
                <strong>
                  ${
                    escapeHtml(
                      money(
                        item.declared_amount
                      )
                    )
                  }
                </strong>
              </div>

              <div>
                <span>Reported Paid Amount</span>
                <strong>
                  ${
                    escapeHtml(
                      money(
                        item.paid_amount
                      )
                    )
                  }
                </strong>
              </div>

            </div>

          </section>


          <section class="srmdc-review-section">

            <h3>Donor-Reported Payment</h3>

            <div class="srmdc-detail-grid">

              <div>
                <span>Mode</span>
                <strong>
                  ${
                    escapeHtml(
                      statusLabel(
                        item.payment_mode
                      )
                    )
                  }
                </strong>
              </div>

              <div>
                <span>UTR / Transaction ID</span>
                <strong>
                  ${
                    escapeHtml(
                      item
                        .donor_transaction_reference ||
                      "—"
                    )
                  }
                </strong>
              </div>

              <div>
                <span>Payment Date</span>
                <strong>
                  ${
                    escapeHtml(
                      formatDate(
                        item.donor_payment_date
                      )
                    )
                  }
                </strong>
              </div>

            </div>

            <p class="srmdc-bank-warning">
              Donor-reported payment details are not
              proof of receipt. Confirm the actual
              credit in the Trust bank account before
              issuing a receipt.
            </p>

          </section>


          ${
            locked
              ? `
                <section class="srmdc-review-section">
                  <h3>Verification Complete</h3>

                  <div class="srmdc-success-box">
                    Official receipt has already been
                    issued for this submission.
                  </div>

                  <div class="srmdc-detail-grid">

                    <div>
                      <span>Bank Reference</span>
                      <strong>
                        ${
                          escapeHtml(
                            item
                              .bank_transaction_reference ||
                            "—"
                          )
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Bank Credit Date</span>
                      <strong>
                        ${
                          escapeHtml(
                            formatDate(
                              item.bank_credit_date
                            )
                          )
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Verified Amount</span>
                      <strong>
                        ${
                          escapeHtml(
                            money(
                              item.bank_credited_amount
                            )
                          )
                        }
                      </strong>
                    </div>

                  </div>
                </section>
              `
              : `
                <section class="srmdc-review-section">

                  <h3>
                    Actual Bank Verification
                  </h3>

                  <p class="muted">
                    Enter these values from the actual
                    Trust bank credit, not merely from
                    the donor's screenshot or message.
                  </p>


                  <div class="srmdc-bank-form">

                    <label>
                      <span>
                        Bank Transaction Reference *
                      </span>

                      <input
                        id="verifiedBankReference"
                        type="text"
                        maxlength="100"
                        autocomplete="off"
                        placeholder="Enter bank-confirmed reference"
                      >
                    </label>


                    <label>
                      <span>
                        Credited Amount *
                      </span>

                      <input
                        id="verifiedBankAmount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value="${
                          escapeHtml(amount)
                        }"
                      >
                    </label>


                    <label>
                      <span>
                        Bank Credit Date *
                      </span>

                      <input
                        id="verifiedBankDate"
                        type="date"
                        value="${
                          escapeHtml(
                            item.donor_payment_date ||
                            ""
                          )
                        }"
                      >
                    </label>


                    <label class="wide">
                      <span>
                        Verification Notes
                      </span>

                      <textarea
                        id="verifiedBankNotes"
                        rows="3"
                        maxlength="500"
                        placeholder="Optional internal verification note"
                      ></textarea>
                    </label>

                  </div>


                  <div
                    id="issueReceiptMessage"
                    class="srmdc-finance-message"
                  ></div>


                  <button
                    type="button"
                    id="verifyAndIssueReceiptButton"
                    class="srmdc-issue-button"
                    ${
                      development
                        ? "disabled"
                        : ""
                    }
                  >
                    Verify Bank Credit &amp;
                    Issue Official Receipt
                  </button>


                  ${
                    development
                      ? `
                        <p class="srmdc-disabled-note">
                          Receipt issuance is disabled
                          for development records.
                        </p>
                      `
                      : `
                        <p class="srmdc-final-warning">
                          This action creates the official
                          donation, payment and receipt.
                          Verify the bank credit carefully
                          before continuing.
                        </p>
                      `
                  }

                </section>
              `
          }

        </div>
      `;


      panel.classList.remove(
        "hidden"
      );


      document
        .getElementById(
          "backToDonationQueueButton"
        )
        .addEventListener(
          "click",
          () => {

            panel.classList.add(
              "hidden"
            );

            container.classList.remove(
              "hidden"
            );

            currentSubmission = null;
          }
        );


      const approveButton =
        document.getElementById(
          "verifyAndIssueReceiptButton"
        );


      if (
        approveButton &&
        !development
      ) {
        approveButton.addEventListener(
          "click",
          approve
        );
      }
    }


    // ----------------------------------------------------------
    // Atomic approval
    // ----------------------------------------------------------

    async function approve() {

      if (!currentSubmission) {
        return;
      }


      const reference =
        document
          .getElementById(
            "verifiedBankReference"
          )
          .value
          .trim();


      const amount =
        Number(
          document
            .getElementById(
              "verifiedBankAmount"
            )
            .value
        );


      const date =
        document
          .getElementById(
            "verifiedBankDate"
          )
          .value;


      const notes =
        document
          .getElementById(
            "verifiedBankNotes"
          )
          .value
          .trim();


      const message =
        document.getElementById(
          "issueReceiptMessage"
        );


      if (!reference) {
        message.textContent =
          "Enter the bank-confirmed transaction reference.";

        message.className =
          "srmdc-finance-message error";

        return;
      }


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        message.textContent =
          "Enter a valid credited amount.";

        message.className =
          "srmdc-finance-message error";

        return;
      }


      if (!date) {
        message.textContent =
          "Select the actual bank credit date.";

        message.className =
          "srmdc-finance-message error";

        return;
      }


      const expected =
        Number(
          currentSubmission.declared_amount
        );


      if (
        Math.round(amount * 100) !==
        Math.round(expected * 100)
      ) {
        message.textContent =
          "Credited amount does not match the declared donation amount.";

        message.className =
          "srmdc-finance-message error";

        return;
      }


      const confirmed =
        window.confirm(
          [
            "Issue an official SRMDC Trust receipt?",
            "",
            `Donation: ${currentSubmission.submission_number}`,
            `Donor: ${currentSubmission.donor_name}`,
            `Amount: ${money(amount)}`,
            `Bank reference: ${reference}`,
            "",
            "Confirm only after checking the actual Trust bank credit."
          ].join("\n")
        );


      if (!confirmed) {
        return;
      }


      const button =
        document.getElementById(
          "verifyAndIssueReceiptButton"
        );


      button.disabled = true;
      button.textContent =
        "Verifying & Issuing Receipt...";


      message.textContent =
        "Creating official donation and receipt...";

      message.className =
        "srmdc-finance-message";


      const {
        data,
        error
      } = await client.rpc(
        "approve_srmdc_donation_submission",
        {
          p_submission_id:
            currentSubmission.submission_id,

          p_bank_transaction_reference:
            reference,

          p_credited_amount:
            amount,

          p_bank_credit_date:
            date,

          p_verification_notes:
            notes || null
        }
      );


      if (error) {

        console.error(error);

        button.disabled = false;
        button.textContent =
          "Verify Bank Credit & Issue Official Receipt";

        message.textContent =
          error.message ||
          "Unable to issue the receipt.";

        message.className =
          "srmdc-finance-message error";

        return;
      }


      const result =
        Array.isArray(data)
          ? data[0]
          : data;


      if (!result) {

        button.disabled = false;

        message.textContent =
          "The server did not return receipt details.";

        message.className =
          "srmdc-finance-message error";

        return;
      }


      const verificationUrl =
        `${window.location.origin}/` +
        `?receipt=${
          encodeURIComponent(
            result.receipt_number
          )
        }` +
        `&id=${
          encodeURIComponent(
            result.verification_token
          )
        }#verify`;


      panelSuccess(
        result,
        verificationUrl
      );
    }


    // ----------------------------------------------------------
    // Successful issuance screen
    // ----------------------------------------------------------

    function panelSuccess(
      result,
      verificationUrl
    ) {

      const panel =
        document.getElementById(
          "donationVerificationPanel"
        );


      panel.innerHTML = `
        <div class="srmdc-receipt-success">

          <div class="srmdc-success-check">
            &#10003;
          </div>

          <p class="eyebrow">
            BANK CREDIT VERIFIED
          </p>

          <h2>
            Official Receipt Issued
          </h2>

          <p>
            The donation has been converted into
            official SRMDC Trust records.
          </p>


          <div class="srmdc-issued-receipt-number">
            ${
              escapeHtml(
                result.receipt_number
              )
            }
          </div>


          <div class="srmdc-success-actions">

            <a
              class="secondary-button srmdc-link-button"
              href="${
                escapeHtml(
                  verificationUrl
                )
              }"
              target="_blank"
              rel="noopener"
            >
              Verify Receipt
            </a>

            <button
              type="button"
              id="returnToDonationQueueButton"
              class="secondary-button"
            >
              Return to Donation Queue
            </button>

          </div>


          <p class="muted">
            Tax compliance remains Pending Review.
            Form 113 / Form 114 processing will be
            handled separately for eligible donations.
          </p>

        </div>
      `;


      document
        .getElementById(
          "returnToDonationQueueButton"
        )
        .addEventListener(
          "click",
          async () => {

            document
              .getElementById(
                "donationQueue"
              )
              .classList.remove(
                "hidden"
              );

            await loadQueue();
          }
        );
    }


    // ----------------------------------------------------------
    // Initialize UI
    // ----------------------------------------------------------

    buildUi();


    return {
      open,
      close,
      refresh: loadQueue
    };

  })();

})();