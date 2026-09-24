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
      `${profile.display_name} - ${user.email || ""}`;

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

  // Application startup is deferred until all admin modules are constructed.

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
        return "\u2014";
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
                        DEVELOPMENT / TEST RECORD<br>DO NOT PROCESS
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
                      item.mobile || "\u2014"
                    )
                  }
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>
                  ${
                    escapeHtml(
                      item.email || "\u2014"
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
                      "\u2014"
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

                  ${
                    item.receipt_number &&
                    item.verification_token
                      ? `
                        <div
                          class="srmdc-issued-receipt-number"
                          style="margin-top:18px;"
                        >
                          ${
                            escapeHtml(
                              item.receipt_number
                            )
                          }
                        </div>

                        <div
                          class="srmdc-success-actions"
                          style="margin:18px 0 22px;"
                        >
                          <button
                            type="button"
                            id="existingOfficialReceiptButton"
                            class="srmdc-issue-button"
                          >
                            View / Print Official Receipt
                          </button>

                          <a
                            id="existingVerifyReceiptLink"
                            class="secondary-button srmdc-link-button"
                            href="${
                              escapeHtml(
                                `${window.location.origin}/` +
                                `?receipt=${
                                  encodeURIComponent(
                                    item.receipt_number
                                  )
                                }` +
                                `&id=${
                                  encodeURIComponent(
                                    item.verification_token
                                  )
                                }#verify`
                              )
                            }"
                            target="_blank"
                            rel="noopener"
                          >
                            Verify Receipt
                          </a>
                        </div>
                      `
                      : `
                        <p class="srmdc-bank-warning">
                          Receipt metadata is not available
                          in this refreshed record.
                        </p>
                      `
                  }

                  <div class="srmdc-detail-grid">

                    <div>
                      <span>Bank Reference</span>
                      <strong>
                        ${
                          escapeHtml(
                            item
                              .bank_transaction_reference ||
                            "\u2014"
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


      const existingReceiptButton =
        document.getElementById(
          "existingOfficialReceiptButton"
        );


      if (existingReceiptButton) {

        existingReceiptButton
          .addEventListener(
            "click",
            () => {

              if (
                !item.receipt_number ||
                !item.verification_token
              ) {

                window.alert(
                  "Official receipt details are not available."
                );

                return;
              }


              const verificationUrl =
                `${window.location.origin}/` +
                `?receipt=${
                  encodeURIComponent(
                    item.receipt_number
                  )
                }` +
                `&id=${
                  encodeURIComponent(
                    item.verification_token
                  )
                }#verify`;


              openOfficialReceipt(
                {
                  receipt_number:
                    item.receipt_number,

                  verification_token:
                    item.verification_token,

                  receipt_date:
                    item.receipt_date,

                  receipt_status:
                    item.receipt_status
                },
                verificationUrl,
                item
              );
            }
          );
      }


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

            <button
              type="button"
              id="viewOfficialReceiptButton"
              class="srmdc-issue-button"
            >
              View / Print Official Receipt
            </button>

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


      const viewReceiptButton =
        document.getElementById(
          "viewOfficialReceiptButton"
        );

      if (viewReceiptButton) {
        viewReceiptButton.addEventListener(
          "click",
          () => {
            openOfficialReceipt(
              result,
              verificationUrl,
              currentSubmission
            );
          }
        );
      }

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



    // ==========================================================
    // SRMDC_OFFICIAL_RECEIPT_RENDERER
    // ==========================================================
    //
    // This renderer never creates a receipt.
    // It can only display receipt information already returned
    // by the successful atomic approval RPC.
    // ==========================================================

    function numberToIndianWords(value) {

      const amount =
        Math.round(Number(value));

      if (
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        return "";
      }

      if (amount === 0) {
        return "Zero Rupees Only";
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

        const ten =
          Math.floor(number / 10);

        const unit =
          number % 10;

        return [
          tens[ten],
          ones[unit]
        ]
          .filter(Boolean)
          .join(" ");
      }


      function belowThousand(number) {

        const hundred =
          Math.floor(number / 100);

        const remainder =
          number % 100;

        const words = [];

        if (hundred) {
          words.push(
            `${ones[hundred]} Hundred`
          );
        }

        if (remainder) {
          words.push(
            belowHundred(remainder)
          );
        }

        return words.join(" ");
      }


      let remaining = amount;
      const words = [];

      const crore =
        Math.floor(
          remaining / 10000000
        );

      if (crore) {
        words.push(
          `${numberToIndianWordsCore(crore)} Crore`
        );

        remaining %= 10000000;
      }


      const lakh =
        Math.floor(
          remaining / 100000
        );

      if (lakh) {
        words.push(
          `${numberToIndianWordsCore(lakh)} Lakh`
        );

        remaining %= 100000;
      }


      const thousand =
        Math.floor(
          remaining / 1000
        );

      if (thousand) {
        words.push(
          `${numberToIndianWordsCore(thousand)} Thousand`
        );

        remaining %= 1000;
      }


      if (remaining) {
        words.push(
          belowThousand(remaining)
        );
      }


      return `${words.join(" ")} Rupees Only`;


      function numberToIndianWordsCore(number) {

        if (number < 100) {
          return belowHundred(number);
        }

        if (number < 1000) {
          return belowThousand(number);
        }

        const thousands =
          Math.floor(number / 1000);

        const rest =
          number % 1000;

        return [
          `${numberToIndianWordsCore(thousands)} Thousand`,
          rest
            ? belowThousand(rest)
            : ""
        ]
          .filter(Boolean)
          .join(" ");
      }
    }


    function openOfficialReceipt(
      result,
      verificationUrl,
      submission
    ) {

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
    Door No. 001, Bodabanda Village,
    Pullayapalli Post, Udayagiri Mandal,
    SPSR Nellore, Andhra Pradesh - 524226
    <br>
    Phone: 8123386813 / 6362486813
    &nbsp; | &nbsp;
    srmdchtrustbodabanda@gmail.com
    <br>
    srmdctrust.org
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

  // ============================================================
  // START APPLICATION
  // ============================================================
  // Donation Verification UI has already been constructed.
  // Authentication/session restoration starts only now.

  initialize();

})();










