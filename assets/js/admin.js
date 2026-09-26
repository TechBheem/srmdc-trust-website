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

  // ============================================================
  // SRMDC_PROFILE_LINK_ADMIN_V1
  // ============================================================

  const srmdcProfileLinkAdmin = (() => {

    let queue = [];

    const escapeHtml = (value) => {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };


    const displayValue = (value) => {
      const text = String(value ?? "").trim();
      return text || "\u2014";
    };


    const formatDate = (value) => {
      if (!value) {
        return "\u2014";
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return new Intl.DateTimeFormat(
        "en-IN",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      ).format(date);
    };


    const getView = () =>
      document.getElementById(
        "profileLinkRequestsView"
      );


    const setMessage = (
      text,
      type = ""
    ) => {
      const element =
        document.getElementById(
          "profileLinkRequestsMessage"
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


    const hideOtherAdminViews = () => {
      dashboardView.classList.add("hidden");

      document
        .querySelectorAll(
          "main > section.dashboard"
        )
        .forEach((section) => {
          if (
            section.id !==
            "profileLinkRequestsView"
          ) {
            section.classList.add(
              "hidden"
            );
          }
        });
    };


    const buildUi = () => {

      const moduleGrid =
        document.querySelector(
          ".module-grid"
        );

      if (
        moduleGrid &&
        !document.getElementById(
          "profileLinkRequestsCard"
        )
      ) {
        const card =
          document.createElement(
            "button"
          );

        card.type = "button";
        card.id =
          "profileLinkRequestsCard";

        card.className =
          "module-card";

        card.innerHTML = `
          <span class="module-icon">&#128279;</span>
          <strong>Profile Link Requests</strong>
          <span>
            Review My SRMDC historical donation linking requests
          </span>
        `;

        const donationCard =
          document.getElementById(
            "donationVerificationCard"
          );

        if (donationCard) {
          moduleGrid.insertBefore(
            card,
            donationCard
          );
        }
        else {
          moduleGrid.appendChild(
            card
          );
        }

        card.addEventListener(
          "click",
          open
        );
      }


      if (
        !document.getElementById(
          "profileLinkRequestsView"
        )
      ) {
        const view =
          document.createElement(
            "section"
          );

        view.id =
          "profileLinkRequestsView";

        view.className =
          "dashboard hidden srmdc-finance-view";

        view.innerHTML = `
          <header class="dashboard-header">
            <div>
              <p class="eyebrow">
                MY SRMDC ADMINISTRATION
              </p>

              <h1>
                Profile Link Requests
              </h1>

              <p class="muted">
                Review requests to connect verified historical
                donor records with My SRMDC member accounts.
              </p>
            </div>

            <div class="srmdc-finance-header-actions">
              <button
                type="button"
                id="refreshProfileLinkQueueButton"
                class="secondary-button"
              >
                Refresh
              </button>

              <button
                type="button"
                id="profileLinkBackButton"
                class="secondary-button"
              >
                Back to Dashboard
              </button>
            </div>
          </header>

          <div
            id="profileLinkRequestsMessage"
            class="srmdc-finance-message"
          ></div>

          <div class="srmdc-finance-summary">
            <div>
              <strong
                id="pendingProfileLinkCount"
              >0</strong>
              <span>Pending requests</span>
            </div>
          </div>

          <div
            id="profileLinkQueue"
            class="srmdc-donation-queue"
          ></div>
        `;

        const main =
          dashboardView.parentElement;

        main.appendChild(view);

        document
          .getElementById(
            "profileLinkBackButton"
          )
          .addEventListener(
            "click",
            close
          );

        document
          .getElementById(
            "refreshProfileLinkQueueButton"
          )
          .addEventListener(
            "click",
            loadQueue
          );
      }
    };


    function open() {

      buildUi();

      hideOtherAdminViews();

      getView().classList.remove(
        "hidden"
      );

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

      setMessage("");
    }


    const renderQueue = () => {

      const container =
        document.getElementById(
          "profileLinkQueue"
        );

      const count =
        document.getElementById(
          "pendingProfileLinkCount"
        );

      if (!container || !count) {
        return;
      }

      count.textContent =
        String(queue.length);


      if (!queue.length) {

        container.innerHTML = `
          <div class="srmdc-finance-empty">
            <strong>
              No pending profile link requests.
            </strong>

            <p>
              New My SRMDC historical-link requests
              will appear here for administrator review.
            </p>
          </div>
        `;

        return;
      }


      container.innerHTML =
        queue.map((item) => {

          const type =
            item.request_type ===
            "receipt_proof"
              ? "Receipt proof"
              : "Manual recovery";

          const member =
            displayValue(
              item.member_display_name
            );

          const memberId =
            displayValue(
              item.member_id
            );

          const username =
            displayValue(
              item.username
            );

          const receipt =
            displayValue(
              item.receipt_number
            );

          const candidateDonor =
            displayValue(
              item.candidate_donor_name
            );

          const claimedName =
            displayValue(
              item.claimed_name
            );

          const claimedMobile =
            displayValue(
              item.claimed_mobile
            );

          const claimedEmail =
            displayValue(
              item.claimed_email
            );

          const claimedPan =
            displayValue(
              item.claimed_pan_or_id
            );

          const claimedAddress =
            displayValue(
              item.claimed_address
            );

          const memberNote =
            displayValue(
              item.member_note
            );

          return `
            <article class="srmdc-donation-card">

              <div class="srmdc-donation-card-header">
                <div>
                  <p class="eyebrow">
                    ${escapeHtml(type)}
                  </p>

                  <h3>
                    ${escapeHtml(member)}
                  </h3>

                  <p class="muted">
                    ${escapeHtml(memberId)}
                    ${
                      username !== "\u2014"
                        ? ` \u00b7 @${escapeHtml(username)}`
                        : ""
                    }
                  </p>
                </div>

                <span class="srmdc-status-pill">
                  Pending
                </span>
              </div>

              <div class="srmdc-finance-details">

                <p>
                  <strong>Submitted:</strong>
                  ${escapeHtml(
                    formatDate(
                      item.created_at
                    )
                  )}
                </p>

                <p>
                  <strong>Receipt:</strong>
                  ${escapeHtml(receipt)}
                </p>

                <p>
                  <strong>Candidate donor:</strong>
                  ${escapeHtml(candidateDonor)}
                </p>

                <p>
                  <strong>Claimed name:</strong>
                  ${escapeHtml(claimedName)}
                </p>

                <p>
                  <strong>Claimed mobile:</strong>
                  ${escapeHtml(claimedMobile)}
                </p>

                <p>
                  <strong>Claimed email:</strong>
                  ${escapeHtml(claimedEmail)}
                </p>

                <p>
                  <strong>Claimed PAN / ID:</strong>
                  ${escapeHtml(claimedPan)}
                </p>

                <p>
                  <strong>Claimed address:</strong>
                  ${escapeHtml(claimedAddress)}
                </p>

                <p>
                  <strong>Member note:</strong>
                  ${escapeHtml(memberNote)}
                </p>

              </div>

              <p class="muted">
                Approval and rejection controls will be
                enabled only after a genuine request is
                available for controlled testing.
              </p>

            </article>
          `;
        }).join("");
    };


    async function loadQueue() {

      buildUi();

      const container =
        document.getElementById(
          "profileLinkQueue"
        );

      if (!container) {
        return;
      }

      container.innerHTML = `
        <div class="srmdc-finance-empty">
          Loading profile link requests...
        </div>
      `;

      setMessage("");

      const {
        data,
        error
      } = await client.rpc(
        "get_srmdc_donor_link_queue"
      );

      if (error) {

        queue = [];

        document
          .getElementById(
            "pendingProfileLinkCount"
          )
          .textContent = "0";

        container.innerHTML = `
          <div class="srmdc-finance-empty">
            Unable to load profile link requests.
          </div>
        `;

        setMessage(
          error.message ||
            "Unable to load profile link request queue.",
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


    const init = () => {
      buildUi();
    };


    return Object.freeze({
      init,
      open,
      refresh: loadQueue
    });

  })();

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

                          <button
                            type="button"
                            id="existingShareReceiptButton"
                            class="secondary-button"
                          >
                            Share Receipt
                          </button>

                          <a
                            id="existingVerifyReceiptLink"
                            class="secondary-button srmdc-link-button"
                            href="${
                              escapeHtml(
                                buildSrmdcPublicVerificationUrl(
                                  item.receipt_number,
                                  item.verification_token
                                )
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


      const existingShareReceiptButton =
        document.getElementById(
          "existingShareReceiptButton"
        );


      if (existingShareReceiptButton) {

        existingShareReceiptButton
          .addEventListener(
            "click",
            async () => {

              await shareSrmdcOfficialReceipt(
                item.receipt_number,
                item.verification_token
              );
            }
          );
      }

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
                buildSrmdcPublicVerificationUrl(
                  item.receipt_number,
                  item.verification_token
                );


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
        buildSrmdcPublicVerificationUrl(
          result.receipt_number,
          result.verification_token
        );


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

            <button
              type="button"
              id="shareIssuedReceiptButton"
              class="secondary-button"
            >
              Share Receipt
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


      const shareIssuedReceiptButton =
        document.getElementById(
          "shareIssuedReceiptButton"
        );


      if (shareIssuedReceiptButton) {

        shareIssuedReceiptButton.addEventListener(
          "click",
          async () => {

            await shareSrmdcOfficialReceipt(
              result.receipt_number,
              result.verification_token
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


    // ==========================================================
    // SRMDC_PRODUCTION_VERIFICATION_URL_V2
    // Public verification links must always use the official site.
    // ==========================================================

    function buildSrmdcPublicVerificationUrl(
      receiptNumber,
      verificationToken
    ) {

      const params = new URLSearchParams({
        receipt: String(receiptNumber || "").trim(),
        id: String(verificationToken || "").trim()
      });

      return (
        "https://srmdctrust.org/?" +
        params.toString() +
        "#verify"
      );
    }


    // ==========================================================
    // SRMDC_SAFE_RECEIPT_SHARE_V2
    //
    // Shares only public receipt-verification information.
    // No mobile, email, PAN, address, UTR or bank data.
    // ==========================================================

    async function shareSrmdcOfficialReceipt(
      receiptNumber,
      verificationToken
    ) {

      if (!receiptNumber || !verificationToken) {

        window.alert(
          "Official receipt details are not available."
        );

        return;
      }


      const verificationUrl =
        buildSrmdcPublicVerificationUrl(
          receiptNumber,
          verificationToken
        );


      const shareText =
        "Sri Rama Mandira Devasthana Charitable Trust\n" +
        "Official Donation Receipt\n" +
        `Receipt: ${receiptNumber}\n` +
        `Verify: ${verificationUrl}`;


      try {

        if (navigator.share) {

          await navigator.share({
            title: `SRMDC Receipt ${receiptNumber}`,
            text: shareText
          });

          return;
        }


        if (
          navigator.clipboard &&
          navigator.clipboard.writeText
        ) {

          await navigator.clipboard.writeText(
            shareText
          );

          window.alert(
            "Receipt verification details copied. " +
            "You can paste them into WhatsApp or email."
          );

          return;
        }


        window.prompt(
          "Copy these receipt verification details:",
          shareText
        );
      }
      catch (error) {

        if (
          error &&
          error.name === "AbortError"
        ) {
          return;
        }


        try {

          if (
            navigator.clipboard &&
            navigator.clipboard.writeText
          ) {

            await navigator.clipboard.writeText(
              shareText
            );

            window.alert(
              "Receipt verification details copied. " +
              "You can paste them into WhatsApp or email."
            );

            return;
          }
        }
        catch (_) {
          // Use manual copy fallback below.
        }


        window.prompt(
          "Copy these receipt verification details:",
          shareText
        );
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

    // ----------------------------------------------------------
    // Initialize UI
    // ----------------------------------------------------------

    // ========================================================
    // SRMDC_RECEIPT_BRIDGE_V2
    //
    // Reuses the frozen Donation Verification receipt renderer
    // and safe share helper from other authenticated modules.
    // No receipt is created or modified here.
    // ========================================================

    window.SRMDC_RECEIPTS = Object.freeze({

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
      },


      async shareExisting(
        receiptNumber,
        verificationToken
      ) {

        return await shareSrmdcOfficialReceipt(
          receiptNumber,
          verificationToken
        );
      }

    });

    buildUi();


    return {
      open,
      close,
      refresh: loadQueue
    };

  })();


  // ============================================================
  // SRMDC_DONOR_PROFILE_V2
  // ============================================================

  const srmdcDonorProfiles = (() => {

    let donorRows = [];
    let donors = [];
    let currentDonor = null;

    let donorCard;
    let donorView;
    let donorList;
    let donorSearch;


    const donorSafe = value => {
      const text = String(value ?? "").trim();
      return text || "\u2014";
    };

    // ========================================================
    // SRMDC_DONOR_LOCAL_HELPERS_V2
    // Donor module is isolated, so it owns its display helpers.
    // ========================================================

    const escapeHtml = value => {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };


    const money = value => {

      const number =
        Number(value || 0);

      return new Intl.NumberFormat(
        "en-IN",
        {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 2
        }
      ).format(number);
    };


    const statusLabel = value => {

      return String(value || "")
        .replaceAll("_", " ")
        .replace(
          /\b\w/g,
          character =>
            character.toUpperCase()
        );
    };


    const formatDate = value => {

      if (!value) {
        return "\u2014";
      }

      const text =
        String(value).trim();

      const dateOnly =
        /^\d{4}-\d{2}-\d{2}$/
          .test(text);

      let date;

      if (dateOnly) {

        const [
          year,
          month,
          day
        ] = text
          .split("-")
          .map(Number);

        date =
          new Date(
            year,
            month - 1,
            day
          );
      }
      else {

        date =
          new Date(text);
      }

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return text;
      }

      return new Intl.DateTimeFormat(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      ).format(date);
    };


    // ========================================================
    // SRMDC_DONOR_VERIFICATION_URL_V2
    //
    // Donor module owns this helper because the original
    // Donation Verification helper is intentionally private.
    // Always points to the production public verification site.
    // ========================================================

    const donorVerificationUrl = (
      receiptNumber,
      verificationToken
    ) => {

      const params =
        new URLSearchParams({
          receipt:
            String(
              receiptNumber || ""
            ).trim(),

          id:
            String(
              verificationToken || ""
            ).trim()
        });

      return (
        "https://srmdctrust.org/?" +
        params.toString() +
        "#verify"
      );
    };

    const donorGroupRows = rows => {

      const map = new Map();

      for (const row of rows || []) {

        if (!row?.donor_id) {
          continue;
        }

        if (!map.has(row.donor_id)) {

          map.set(row.donor_id, {
            donor_id: row.donor_id,
            donor_name: row.donor_name,
            mobile: row.mobile,
            email: row.email,
            address: row.address,
            pan_or_id: row.pan_or_id,
            donations: new Map()
          });
        }

        const donor = map.get(row.donor_id);

        donor.email ||= row.email;
        donor.mobile ||= row.mobile;
        donor.address ||= row.address;
        donor.pan_or_id ||= row.pan_or_id;

        if (!row.donation_id) {
          continue;
        }

        if (!donor.donations.has(row.donation_id)) {

          donor.donations.set(row.donation_id, {
            donation_id: row.donation_id,
            donation_date: row.donation_date,
            donation_type: row.donation_type,
            donation_amount:
              Number(row.donation_amount || 0),
            donation_status: row.donation_status,
            tax_review_status: row.tax_review_status,
            fund_name: row.fund_name,
            donation_purpose: row.donation_purpose,
            submission_number: row.submission_number,
            receipt_number: row.receipt_number,
            financial_year: row.financial_year,
            verification_token: row.verification_token,
            receipt_status: row.receipt_status,
            receipt_issued_at: row.receipt_issued_at,
            payments: []
          });
        }

        const donation =
          donor.donations.get(row.donation_id);

        if (
          row.payment_method ||
          row.payment_amount ||
          row.payment_reference
        ) {

          const key = [
            row.payment_method || "",
            row.payment_amount || "",
            row.payment_reference || ""
          ].join("|");

          if (
            !donation.payments.some(
              payment => payment.key === key
            )
          ) {
            donation.payments.push({
              key,
              payment_method: row.payment_method,
              payment_amount:
                Number(row.payment_amount || 0),
              payment_reference:
                row.payment_reference
            });
          }
        }
      }

      return Array
        .from(map.values())
        .map(donor => ({
          ...donor,
          donations:
            Array.from(donor.donations.values())
              .sort(
                (a, b) =>
                  String(b.donation_date || "")
                    .localeCompare(
                      String(a.donation_date || "")
                    )
              )
        }))
        .sort(
          (a, b) =>
            String(a.donor_name || "")
              .localeCompare(
                String(b.donor_name || "")
              )
        );
    };


    const totalForDonor = donor =>
      donor.donations.reduce(
        (sum, donation) =>
          sum +
          Number(donation.donation_amount || 0),
        0
      );


    const receiptCountForDonor = donor =>
      donor.donations.filter(
        donation => donation.receipt_number
      ).length;


    const loadDonors = async () => {

      const { data, error } =
        await client.rpc(
          "get_srmdc_donor_profiles"
        );

      if (error) {
        console.error(
          "SRMDC donor profiles failed:",
          error
        );
        throw error;
      }

      donorRows =
        Array.isArray(data) ? data : [];

      donors =
        donorGroupRows(donorRows);

      return donors;
    };


    const buildUi = () => {

      const grid =
        document.querySelector(".module-grid");

      if (!grid) {
        console.warn(
          "SRMDC Donors: dashboard grid unavailable."
        );
        return;
      }

      // Exactly one dashboard card.
      donorCard =
        document.createElement("button");

      donorCard.type = "button";
      donorCard.id = "donorProfileCard";
      donorCard.className = "module-card";

      donorCard.innerHTML = `
        <span class="module-icon">\u2665</span>
        <strong>Donors</strong>
        <span>Profiles and donation history</span>
      `;

      const receiptCard =
        document.getElementById(
          "receiptVerificationCard"
        );

      if (
        receiptCard &&
        receiptCard.parentElement === grid
      ) {
        grid.insertBefore(
          donorCard,
          receiptCard
        );
      } else {
        grid.appendChild(donorCard);
      }


      donorView =
        document.createElement("section");

      donorView.id = "donorProfileView";
      donorView.className =
        "view hidden srmdc-finance-view";

      donorView.innerHTML = `
        <div class="srmdc-finance-header">

          <div>
            <button
              id="donorBackDashboard"
              type="button"
              class="secondary-button"
            >
              \u2190 Back to Dashboard
            </button>

            <div
              class="brand-mark"
              style="margin-top:18px;"
            >
              SRMDC TRUST
            </div>

            <h1>Donors</h1>

            <p class="muted">
              Official donor profiles and donation history
            </p>
          </div>

        </div>

        <div
          class="srmdc-verification-panel"
          style="margin-bottom:18px;"
        >
          <label
            for="donorSearch"
            style="
              display:block;
              font-weight:700;
              margin-bottom:7px;
            "
          >
            Search Donors
          </label>

          <input
            id="donorSearch"
            type="search"
            placeholder="Name, mobile, PAN / ID or receipt"
            autocomplete="off"
            style="
              width:100%;
              max-width:620px;
              padding:11px 12px;
              border:1px solid #ccb98e;
              border-radius:8px;
            "
          >
        </div>

        <div id="donorMessage"></div>

        <div
          id="donorList"
          class="srmdc-donation-queue"
        ></div>
      `;

      dashboardView.parentElement
        .appendChild(donorView);

      donorList =
        document.getElementById("donorList");

      donorSearch =
        document.getElementById("donorSearch");

      donorCard.addEventListener(
        "click",
        open
      );

      document
        .getElementById("donorBackDashboard")
        .addEventListener(
          "click",
          () => show(dashboardView)
        );

      donorSearch.addEventListener(
        "input",
        () =>
          renderDonorList(
            donorSearch.value
          )
      );
    };


    const open = async () => {

      show(donorView);

      const message =
        document.getElementById(
          "donorMessage"
        );

      message.innerHTML =
        `<p class="muted">Loading donor profiles...</p>`;

      donorList.innerHTML = "";

      try {

        await loadDonors();

        message.innerHTML = "";

        renderDonorList(
          donorSearch.value
        );

      } catch (error) {

        message.innerHTML = `
          <div class="srmdc-bank-warning">
            Unable to load donor profiles.
            Please check the administrator session.
          </div>
        `;
      }
    };


    const renderDonorList = query => {

      currentDonor = null;

      const search =
        String(query || "")
          .trim()
          .toLowerCase();

      const filtered =
        donors.filter(donor => {

          if (!search) {
            return true;
          }

          const receipts =
            donor.donations
              .map(
                donation =>
                  donation.receipt_number || ""
              )
              .join(" ");

          return [
            donor.donor_name,
            donor.mobile,
            donor.pan_or_id,
            receipts
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(search);
        });


      if (!filtered.length) {

        donorList.innerHTML = `
          <div class="srmdc-verification-panel">
            <p class="muted">
              No donors found.
            </p>
          </div>
        `;

        return;
      }


      donorList.innerHTML =
        filtered.map(donor => `

          <article class="srmdc-submission-card">

            <div class="srmdc-submission-head">

              <div>
                <span class="srmdc-reference">
                  DONOR PROFILE
                </span>

                <h3>
                  ${
                    escapeHtml(
                      donorSafe(
                        donor.donor_name
                      )
                    )
                  }
                </h3>
              </div>

              <span class="srmdc-status-badge">
                ${donor.donations.length}
                Donation${
                  donor.donations.length === 1
                    ? ""
                    : "s"
                }
              </span>

            </div>

            <div class="srmdc-detail-grid">

              <div>
                <span>Total Donated</span>
                <strong>
                  ${
                    escapeHtml(
                      money(
                        totalForDonor(donor)
                      )
                    )
                  }
                </strong>
              </div>

              <div>
                <span>Receipts Issued</span>
                <strong>
                  ${
                    receiptCountForDonor(
                      donor
                    )
                  }
                </strong>
              </div>

              <div>
                <span>Mobile</span>
                <strong>
                  ${
                    escapeHtml(
                      donorSafe(
                        donor.mobile
                      )
                    )
                  }
                </strong>
              </div>

            </div>

            <button
              type="button"
              class="secondary-button donor-open-profile"
              data-donor="${
                escapeHtml(
                  donor.donor_id
                )
              }"
            >
              View Profile
            </button>

          </article>

        `).join("");


      donorList
        .querySelectorAll(
          ".donor-open-profile"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            () =>
              renderProfile(
                button.dataset.donor
              )
          );
        });
    };


    const renderProfile = donorId => {

      const donor =
        donors.find(
          item =>
            item.donor_id === donorId
        );

      if (!donor) {
        return;
      }

      currentDonor = donor;

      donorList.innerHTML = `

        <div style="margin-bottom:16px;">
          <button
            id="donorBackList"
            type="button"
            class="secondary-button"
          >
            \u2190 Back to Donors
          </button>
        </div>

        <article class="srmdc-verification-panel">

          <span class="srmdc-reference">
            DONOR PROFILE
          </span>

          <h2>
            ${
              escapeHtml(
                donorSafe(
                  donor.donor_name
                )
              )
            }
          </h2>

          <div class="srmdc-detail-grid">

            <div>
              <span>Mobile</span>
              <strong>
                ${
                  escapeHtml(
                    donorSafe(donor.mobile)
                  )
                }
              </strong>
            </div>

            <div>
              <span>Email</span>
              <strong>
                ${
                  escapeHtml(
                    donorSafe(donor.email)
                  )
                }
              </strong>
            </div>

            <div>
              <span>PAN / ID</span>
              <strong>
                ${
                  escapeHtml(
                    donorSafe(
                      donor.pan_or_id
                    )
                  )
                }
              </strong>
            </div>

            <div>
              <span>Address</span>
              <strong>
                ${
                  escapeHtml(
                    donorSafe(
                      donor.address
                    )
                  )
                }
              </strong>
            </div>

          </div>
        </article>

        <div class="srmdc-finance-summary">

          <div>
            <strong>
              ${donor.donations.length}
            </strong>
            <span>Official Donations</span>
          </div>

          <div>
            <strong>
              ${
                escapeHtml(
                  money(
                    totalForDonor(donor)
                  )
                )
              }
            </strong>
            <span>Total Donated</span>
          </div>

          <div>
            <strong>
              ${
                receiptCountForDonor(
                  donor
                )
              }
            </strong>
            <span>Receipts Issued</span>
          </div>

        </div>

        <h2 style="margin-top:26px;">
          Donation History
        </h2>

        <div id="donorHistory">
          ${
            donor.donations.length
              ? donor.donations
                  .map(donationCard)
                  .join("")
              : `
                  <div class="srmdc-verification-panel">
                    <p class="muted">
                      No official donations recorded.
                    </p>
                  </div>
                `
          }
        </div>
      `;

      document
        .getElementById("donorBackList")
        .addEventListener(
          "click",
          () =>
            renderDonorList(
              donorSearch.value
            )
        );

      wireReceiptButtons();
    };


    const donationCard = donation => {

      const hasReceipt =
        Boolean(
          donation.receipt_number &&
          donation.verification_token
        );

      const paymentHtml =
        donation.payments.length
          ? donation.payments.map(
              payment => `
                <div style="margin-top:5px;">
                  ${
                    escapeHtml(
                      statusLabel(
                        payment.payment_method
                      )
                    )
                  }
                  &middot;
                  ${
                    escapeHtml(
                      money(
                        payment.payment_amount
                      )
                    )
                  }
                  ${
                    payment.payment_reference
                      ? `
                        &middot; Ref:
                        ${
                          escapeHtml(
                            payment.payment_reference
                          )
                        }
                      `
                      : ""
                  }
                </div>
              `
            ).join("")
          : `<span class="muted">\u2014</span>`;


      return `

        <article class="srmdc-submission-card">

          <div class="srmdc-submission-head">

            <div>
              <span class="srmdc-reference">
                ${
                  escapeHtml(
                    donorSafe(
                      donation.receipt_number ||
                      donation.submission_number
                    )
                  )
                }
              </span>

              <h3>
                ${
                  escapeHtml(
                    donorSafe(
                      donation.fund_name
                    )
                  )
                }
              </h3>
            </div>

            <span class="srmdc-status-badge">
              ${
                escapeHtml(
                  statusLabel(
                    donation.donation_status
                  )
                )
              }
            </span>

          </div>

          <div class="srmdc-detail-grid">

            <div>
              <span>Date</span>
              <strong>
                ${
                  escapeHtml(
                    formatDate(
                      donation.donation_date
                    )
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
                      donation.donation_amount
                    )
                  )
                }
              </strong>
            </div>

            <div>
              <span>Purpose</span>
              <strong>
                ${
                  escapeHtml(
                    donorSafe(
                      donation.donation_purpose
                    )
                  )
                }
              </strong>
            </div>

            <div>
              <span>Receipt Status</span>
              <strong>
                ${
                  escapeHtml(
                    statusLabel(
                      donation.receipt_status ||
                      "not issued"
                    )
                  )
                }
              </strong>
            </div>

          </div>

          <div
            style="
              margin-top:14px;
              padding-top:12px;
              border-top:1px solid #eadfc7;
            "
          >
            <strong>Payment</strong>
            ${paymentHtml}
          </div>

          ${
            hasReceipt
              ? `
                <div
                  class="srmdc-success-actions"
                  style="margin-top:16px;"
                >

                  <button
                    type="button"
                    class="srmdc-issue-button donor-view-receipt"
                    data-id="${
                      escapeHtml(
                        donation.donation_id
                      )
                    }"
                  >
                    View / Print Receipt
                  </button>

                  <button
                    type="button"
                    class="secondary-button donor-share-receipt"
                    data-id="${
                      escapeHtml(
                        donation.donation_id
                      )
                    }"
                  >
                    Share Receipt
                  </button>

                  <a
                    class="secondary-button srmdc-link-button"
                    href="${
                      escapeHtml(
                        donorVerificationUrl(
                          donation.receipt_number,
                          donation.verification_token
                        )
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
                <p class="muted">
                  No official receipt attached.
                </p>
              `
          }

        </article>
      `;
    };


    const findDonation = id =>
      currentDonor?.donations.find(
        donation =>
          donation.donation_id === id
      );


    const wireReceiptButtons = () => {

      donorList
        .querySelectorAll(
          ".donor-view-receipt"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              const donation =
                findDonation(
                  button.dataset.id
                );

              if (!donation) {
                return;
              }

              const verificationUrl =
                donorVerificationUrl(
                  donation.receipt_number,
                  donation.verification_token
                );

              window.SRMDC_RECEIPTS.openExisting(
                {
                  receipt_number:
                    donation.receipt_number,

                  verification_token:
                    donation.verification_token,

                  receipt_date:
                    donation.donation_date,

                  receipt_status:
                    donation.receipt_status
                },
                verificationUrl,
                {
                  donor_name:
                    currentDonor.donor_name,

                  mobile:
                    currentDonor.mobile,

                  email:
                    currentDonor.email,

                  address:
                    currentDonor.address,

                  pan_or_id:
                    currentDonor.pan_or_id,

                  fund_name:
                    donation.fund_name,

                  donation_purpose:
                    donation.donation_purpose,

                  declared_amount:
                    donation.donation_amount,

                  paid_amount:
                    donation.donation_amount,

                  payment_mode:
                    donation.payments
                      .map(
                        payment =>
                          payment.payment_method
                      )
                      .filter(Boolean)
                      .join(" + ")
                }
              );
            }
          );
        });


      donorList
        .querySelectorAll(
          ".donor-share-receipt"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            async () => {

              const donation =
                findDonation(
                  button.dataset.id
                );

              if (!donation) {
                return;
              }

              await window.SRMDC_RECEIPTS.shareExisting(
                donation.receipt_number,
                donation.verification_token
              );
            }
          );
        });
    };


    buildUi();


    return {
      open,
      refresh: loadDonors
    };

  })();

  // ============================================================

  // ============================================================
  // SRMDC_TRUST_SETTINGS_ADMIN_V1
  // ============================================================

  const srmdcTrustSettingsAdmin = (() => {

    const viewId =
      "trustPublicSettingsView";

    const cardId =
      "trustPublicSettingsCard";


    const getView = () =>
      document.getElementById(viewId);


    const setMessage = (
      text,
      type = ""
    ) => {

      const element =
        document.getElementById(
          "trustSettingsMessage"
        );

      if (!element) {
        return;
      }

      element.textContent =
        text || "";

      element.className =
        "srmdc-finance-message";

      if (type) {
        element.classList.add(type);
      }
    };


    const inputValue = (id) => {

      const element =
        document.getElementById(id);

      return String(
        element?.value ?? ""
      ).trim();
    };


    const setInputValue = (
      id,
      value
    ) => {

      const element =
        document.getElementById(id);

      if (element) {
        element.value =
          String(value ?? "");
      }
    };


    const normalizePhone = (value) =>
      String(value || "")
        .replace(/[^\d]/g, "");


    const hideOtherViews = () => {

      dashboardView.classList.add(
        "hidden"
      );

      document
        .querySelectorAll(
          "main > section.dashboard"
        )
        .forEach((section) => {

          if (section.id !== viewId) {
            section.classList.add(
              "hidden"
            );
          }
        });
    };


    const showDashboard = () => {

      getView()?.classList.add(
        "hidden"
      );

      dashboardView.classList.remove(
        "hidden"
      );
    };


    const populate = (settings) => {

      setInputValue(
        "trustSettingsTrustName",
        settings?.trust_name
      );

      setInputValue(
        "trustSettingsAddress1",
        settings?.address_line_1
      );

      setInputValue(
        "trustSettingsAddress2",
        settings?.address_line_2
      );

      setInputValue(
        "trustSettingsAddress3",
        settings?.address_line_3
      );

      setInputValue(
        "trustSettingsPrimaryPhone",
        settings?.primary_phone
      );

      setInputValue(
        "trustSettingsSecondaryPhone",
        settings?.secondary_phone
      );

      setInputValue(
        "trustSettingsEmail",
        settings?.email
      );

      setInputValue(
        "trustSettingsWebsite",
        settings?.website
      );

      setInputValue(
        "trustSettingsWebsiteUrl",
        settings?.website_url
      );


      const updated =
        document.getElementById(
          "trustSettingsUpdated"
        );

      if (updated) {

        if (settings?.updated_at) {

          const date =
            new Date(
              settings.updated_at
            );

          updated.textContent =
            `Last updated: ${
              date.toLocaleString(
                "en-IN"
              )
            }`;
        }
        else {
          updated.textContent =
            "Initial Trust settings";
        }
      }
    };


    const loadSettings = async () => {

      setMessage(
        "Loading Trust settings..."
      );


      const {
        data,
        error
      } =
        await client.rpc(
          "get_srmdc_public_trust_settings"
        );


      if (error) {

        setMessage(
          error.message ||
          "Unable to load Trust settings.",
          "error"
        );

        return false;
      }


      const settings =
        Array.isArray(data)
          ? data[0]
          : data;


      if (!settings) {

        setMessage(
          "Trust settings were not found.",
          "error"
        );

        return false;
      }


      populate(settings);

      setMessage("");

      return true;
    };


    const validate = () => {

      const primaryPhone =
        normalizePhone(
          inputValue(
            "trustSettingsPrimaryPhone"
          )
        );

      const secondaryPhone =
        normalizePhone(
          inputValue(
            "trustSettingsSecondaryPhone"
          )
        );

      const email =
        inputValue(
          "trustSettingsEmail"
        );

      const websiteUrl =
        inputValue(
          "trustSettingsWebsiteUrl"
        );


      if (
        !inputValue(
          "trustSettingsTrustName"
        )
      ) {
        throw new Error(
          "Trust name is required."
        );
      }


      for (const id of [
        "trustSettingsAddress1",
        "trustSettingsAddress2",
        "trustSettingsAddress3"
      ]) {

        if (!inputValue(id)) {

          throw new Error(
            "Complete Trust address is required."
          );
        }
      }


      if (
        !/^[0-9]{10,15}$/.test(
          primaryPhone
        )
      ) {
        throw new Error(
          "Enter a valid primary mobile number."
        );
      }


      if (
        secondaryPhone &&
        !/^[0-9]{10,15}$/.test(
          secondaryPhone
        )
      ) {
        throw new Error(
          "Enter a valid secondary mobile number."
        );
      }


      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        throw new Error(
          "Enter a valid Trust email address."
        );
      }


      if (
        !inputValue(
          "trustSettingsWebsite"
        )
      ) {
        throw new Error(
          "Website display name is required."
        );
      }


      if (
        !/^https:\/\//i.test(
          websiteUrl
        )
      ) {
        throw new Error(
          "Website URL must begin with https://"
        );
      }


      return {
        p_trust_name:
          inputValue(
            "trustSettingsTrustName"
          ),

        p_address_line_1:
          inputValue(
            "trustSettingsAddress1"
          ),

        p_address_line_2:
          inputValue(
            "trustSettingsAddress2"
          ),

        p_address_line_3:
          inputValue(
            "trustSettingsAddress3"
          ),

        p_primary_phone:
          primaryPhone,

        p_secondary_phone:
          secondaryPhone || null,

        p_email:
          email,

        p_website:
          inputValue(
            "trustSettingsWebsite"
          ),

        p_website_url:
          websiteUrl
      };
    };


    const saveSettings = async () => {

      let payload;

      try {
        payload = validate();
      }
      catch (error) {

        setMessage(
          error.message,
          "error"
        );

        return;
      }


      const button =
        document.getElementById(
          "trustSettingsSaveButton"
        );


      if (button) {
        button.disabled = true;
        button.textContent =
          "Saving...";
      }


      setMessage(
        "Saving Trust settings..."
      );


      try {

        const {
          data,
          error
        } =
          await client.rpc(
            "update_srmdc_public_trust_settings",
            payload
          );


        if (error) {
          throw error;
        }


        const settings =
          Array.isArray(data)
            ? data[0]
            : data;


        if (!settings) {
          throw new Error(
            "The server did not return the saved settings."
          );
        }


        populate(settings);

        setMessage(
          "Trust details saved successfully.",
          "success"
        );
      }
      catch (error) {

        setMessage(
          error?.message ||
          "Unable to save Trust settings.",
          "error"
        );
      }
      finally {

        if (button) {
          button.disabled = false;
          button.textContent =
            "Save Changes";
        }
      }
    };


    const open = async () => {

      hideOtherViews();

      const view = getView();

      if (!view) {
        return;
      }

      view.classList.remove(
        "hidden"
      );

      await loadSettings();
    };


    const buildUi = () => {

      const moduleGrid =
        document.querySelector(
          ".module-grid"
        );


      if (!moduleGrid) {
        throw new Error(
          "Admin module grid not found."
        );
      }


      if (
        !document.getElementById(cardId)
      ) {

        const card =
          document.createElement(
            "button"
          );

        card.type = "button";
        card.id = cardId;
        card.className =
          "module-card";


        card.innerHTML = `
          <span class="module-icon">
            &#9881;
          </span>

          <strong>
            Trust Details &amp;
            Website Settings
          </strong>

          <span>
            Address, phones, email
            and public website details
          </span>
        `;


        const profileLinkCard =
          document.getElementById(
            "profileLinkRequestsCard"
          );


        if (profileLinkCard) {

          moduleGrid.insertBefore(
            card,
            profileLinkCard
          );
        }
        else {

          moduleGrid.appendChild(
            card
          );
        }


        card.addEventListener(
          "click",
          open
        );
      }


      if (!getView()) {

        const main =
          document.querySelector(
            "main"
          );


        if (!main) {
          throw new Error(
            "Admin main container not found."
          );
        }


        const section =
          document.createElement(
            "section"
          );

        section.id = viewId;
        section.className =
          "dashboard hidden";


        section.innerHTML = `
          <header class="dashboard-header">

            <div>
              <p class="eyebrow">
                SRMDC TRUST
              </p>

              <h1>
                Trust Details &amp;
                Website Settings
              </h1>

              <p class="muted">
                Manage the Trust's public
                identity and contact details.
              </p>
            </div>


            <div class="header-actions">

              <button
                type="button"
                id="trustSettingsBackButton"
                class="secondary-button"
              >
                Back to Dashboard
              </button>

            </div>

          </header>


          <div
            class="srmdc-finance-panel"
            style="
              max-width: 920px;
              margin: 0 auto;
            "
          >

            <div
              style="
                padding: 1rem 1.1rem;
                margin-bottom: 1rem;
                border-radius: 10px;
                background: #fff8e8;
                border: 1px solid #ead6a6;
              "
            >
              <strong>
                Public Trust Information
              </strong>

              <p
                class="muted"
                style="
                  margin: 0.35rem 0 0;
                "
              >
                Changes here affect current
                public Trust contact details.
                Donation and receipt history
                remain unchanged.
              </p>
            </div>


            <form
              id="trustSettingsForm"
              autocomplete="off"
            >

              <div class="form-grid">

                <label
                  style="grid-column: 1 / -1;"
                >
                  Trust Name

                  <input
                    id="trustSettingsTrustName"
                    type="text"
                    maxlength="200"
                    required
                  >
                </label>


                <label
                  style="grid-column: 1 / -1;"
                >
                  Address Line 1

                  <input
                    id="trustSettingsAddress1"
                    type="text"
                    maxlength="250"
                    required
                  >
                </label>


                <label
                  style="grid-column: 1 / -1;"
                >
                  Address Line 2

                  <input
                    id="trustSettingsAddress2"
                    type="text"
                    maxlength="250"
                    required
                  >
                </label>


                <label
                  style="grid-column: 1 / -1;"
                >
                  Address Line 3

                  <input
                    id="trustSettingsAddress3"
                    type="text"
                    maxlength="250"
                    required
                  >
                </label>


                <label>
                  Primary Mobile

                  <input
                    id="trustSettingsPrimaryPhone"
                    type="tel"
                    inputmode="numeric"
                    maxlength="15"
                    required
                  >
                </label>


                <label>
                  Secondary Mobile

                  <input
                    id="trustSettingsSecondaryPhone"
                    type="tel"
                    inputmode="numeric"
                    maxlength="15"
                  >
                </label>


                <label
                  style="grid-column: 1 / -1;"
                >
                  Trust Email

                  <input
                    id="trustSettingsEmail"
                    type="email"
                    maxlength="254"
                    required
                  >
                </label>


                <label>
                  Website Display

                  <input
                    id="trustSettingsWebsite"
                    type="text"
                    maxlength="200"
                    required
                  >
                </label>


                <label>
                  Website URL

                  <input
                    id="trustSettingsWebsiteUrl"
                    type="url"
                    maxlength="300"
                    required
                  >
                </label>

              </div>


              <p
                id="trustSettingsUpdated"
                class="muted"
                style="
                  margin-top: 1rem;
                "
              ></p>


              <div
                id="trustSettingsMessage"
                class="srmdc-finance-message"
                aria-live="polite"
              ></div>


              <div
                style="
                  display: flex;
                  flex-wrap: wrap;
                  gap: 0.75rem;
                  margin-top: 1rem;
                "
              >

                <button
                  type="button"
                  id="trustSettingsReloadButton"
                  class="secondary-button"
                >
                  Reload
                </button>


                <button
                  type="submit"
                  id="trustSettingsSaveButton"
                  class="primary-button"
                >
                  Save Changes
                </button>

              </div>

            </form>

          </div>
        `;


        main.appendChild(
          section
        );


        document
          .getElementById(
            "trustSettingsBackButton"
          )
          ?.addEventListener(
            "click",
            showDashboard
          );


        document
          .getElementById(
            "trustSettingsReloadButton"
          )
          ?.addEventListener(
            "click",
            loadSettings
          );


        document
          .getElementById(
            "trustSettingsForm"
          )
          ?.addEventListener(
            "submit",
            async (event) => {

              event.preventDefault();

              await saveSettings();
            }
          );
      }
    };


    const init = () => {
      buildUi();
    };


    return Object.freeze({
      init,
      open,
      reload: loadSettings
    });

  })();


  // START APPLICATION
  // ============================================================
  // Donation Verification UI has already been constructed.
  // Authentication/session restoration starts only now.

  // SRMDC_PROFILE_LINK_ADMIN_INIT_V1_1
  srmdcProfileLinkAdmin.init();

  // SRMDC_TRUST_SETTINGS_ADMIN_INIT_V1_1
  srmdcTrustSettingsAdmin.init();
  initialize();

})();










