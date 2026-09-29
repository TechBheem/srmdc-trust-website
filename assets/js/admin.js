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

  // Shared authenticated Admin client.
  // Village Management must reuse this instance.
  window.srmdcSupabase = client;

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

          if (name === "Village Management") {
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
     PRINT ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â EXPLICIT SINGLE A4 PAGE
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
            // SRMDC_DONOR_RELATIONSHIP_MAPPING_D4M_D3
            relationship_type:
              row.relationship_type,

            related_person_name:
              row.related_person_name,
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
                    [
                      // SRMDC_RECEIPT_RELATIONSHIP_DISPLAY_D4M_D2
                      currentDonor.donor_name,
                      currentDonor.relationship_type,
                      currentDonor.related_person_name
                    ]
                      .map(
                        value =>
                          String(value || "").trim()
                      )
                      .filter(Boolean)
                      .join(" "),

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

    // ============================================================
  // SRMDC_REPORTS_ANALYTICS_ADMIN_V1
  // ============================================================

  const srmdcReportsAnalyticsAdmin = (() => {

    const cardId = "reportsAnalyticsCard";
    const viewId = "reportsAnalyticsView";

    // SRMDC_REPORTS_INTERACTIVE_STATEMENT_V1_1_STAGE_A
    let statementRows = [];

    const statementFilters = {
      search: "",
      type: "",
      mode: "",
      status: ""
    };
    // SRMDC_REPORTS_STAGE_B1_STATE
    const statementViewState = {
      sortKey: "date",
      sortDirection: "asc",
      page: 1,
      pageSize: 25
    };

    const getView = () =>
      document.getElementById(viewId);

    const escapeHtml = (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const money = (value) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Number(value || 0));

    const displayDate = (value) => {
      if (!value) {
        return "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â";
      }

      const parts = String(value).split("-");

      if (parts.length !== 3) {
        return escapeHtml(value);
      }

      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const currentFinancialYearDates = () => {
      const today = new Date();

      const year = today.getFullYear();
      const month = today.getMonth() + 1;

      const startYear =
        month >= 4
          ? year
          : year - 1;

      const toDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
      ].join("-");

      return {
        from: `${startYear}-04-01`,
        to: toDate
      };
    };

    const setMessage = (message = "", type = "") => {
      const element =
        document.getElementById(
          "reportsAnalyticsMessage"
        );

      if (!element) {
        return;
      }

      element.textContent = message;
      element.className =
        "srmdc-reports-message";

      if (type) {
        element.classList.add(
          `is-${type}`
        );
      }
    };

    const renderSummary = (summary = {}) => {
      const values = {
        reportsOpeningBalance:
          money(summary.opening_balance),

        reportsTotalReceipts:
          money(summary.total_receipts),

        reportsTotalExpenses:
          money(summary.total_expenses),

        reportsClosingBalance:
          money(summary.closing_balance),

        reportsReceiptCount:
          String(
            Number(summary.receipt_count || 0)
          ),

        reportsExpenseCount:
          String(
            Number(
              summary.expense_payment_count || 0
            )
          )
      };

      Object.entries(values)
        .forEach(([id, value]) => {
          const element =
            document.getElementById(id);

          if (element) {
            element.textContent = value;
          }
        });
    };

    const renderFunds = (funds = []) => {
      const container =
        document.getElementById(
          "reportsFundBalances"
        );

      if (!container) {
        return;
      }

      if (!funds.length) {
        container.innerHTML = `
          <div class="srmdc-reports-empty">
            No fund data for this selection.
          </div>
        `;

        return;
      }

      container.innerHTML =
        funds.map((fund) => `
          <article class="srmdc-report-fund-card">

            <div class="srmdc-report-fund-head">

              <div>
                <span>
                  ${escapeHtml(
                    fund.fund_code || ""
                  )}
                </span>

                <strong>
                  ${escapeHtml(
                    fund.fund_name || "Fund"
                  )}
                </strong>
              </div>

              <b>
                ${escapeHtml(
                  money(fund.balance)
                )}
              </b>

            </div>

            <div class="srmdc-report-fund-numbers">

              <span>
                Receipts

                <strong>
                  ${escapeHtml(
                    money(
                      fund.total_receipts
                    )
                  )}
                </strong>
              </span>

              <span>
                Expenses

                <strong>
                  ${escapeHtml(
                    money(
                      fund.total_expenses
                    )
                  )}
                </strong>
              </span>

            </div>

          </article>
        `).join("");
    };
    const normalizeStatementValue = (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase();

    const uniqueStatementValues = (rows, key) =>
      [
        ...new Set(
          rows
            .map((row) =>
              String(row?.[key] ?? "").trim()
            )
            .filter(Boolean)
        )
      ].sort((a, b) =>
        a.localeCompare(
          b,
          "en",
          {
            sensitivity: "base"
          }
        )
      );

    const populateStatementFilters = (rows = []) => {
      const modeSelect =
        document.getElementById(
          "reportsStatementModeFilter"
        );

      const statusSelect =
        document.getElementById(
          "reportsStatementStatusFilter"
        );

      if (modeSelect) {
        const previous =
          modeSelect.value;

        const modes =
          uniqueStatementValues(
            rows,
            "payment_method"
          );

        modeSelect.innerHTML = `
          <option value="">All Modes</option>
          ${modes.map((mode) => `
            <option value="${escapeHtml(mode)}">
              ${escapeHtml(mode)}
            </option>
          `).join("")}
        `;

        if (modes.includes(previous)) {
          modeSelect.value = previous;
        }
      }

      if (statusSelect) {
        const previous =
          statusSelect.value;

        const statuses =
          uniqueStatementValues(
            rows,
            "status"
          );

        statusSelect.innerHTML = `
          <option value="">All Statuses</option>
          ${statuses.map((status) => `
            <option value="${escapeHtml(status)}">
              ${escapeHtml(status)}
            </option>
          `).join("")}
        `;

        if (statuses.includes(previous)) {
          statusSelect.value = previous;
        }
      }
    };

    const getFilteredStatementRows = () => {
      const search =
        normalizeStatementValue(
          statementFilters.search
        );

      const type =
        normalizeStatementValue(
          statementFilters.type
        );

      const mode =
        normalizeStatementValue(
          statementFilters.mode
        );

      const status =
        normalizeStatementValue(
          statementFilters.status
        );

      return statementRows.filter((row) => {
        if (
          type &&
          normalizeStatementValue(row.type) !== type
        ) {
          return false;
        }

        if (
          mode &&
          normalizeStatementValue(
            row.payment_method
          ) !== mode
        ) {
          return false;
        }

        if (
          status &&
          normalizeStatementValue(
            row.status
          ) !== status
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        const searchable = [
          row.date,
          row.type,
          row.reference,
          row.fund,
          row.party,
          row.particulars,
          row.payment_method,
          row.payment_reference,
          row.status,
          row.receipt,
          row.expense
        ]
          .map(normalizeStatementValue)
          .join(" ");

        return searchable.includes(search);
      });
    };

    // SRMDC_REPORTS_STAGE_C1_COLUMN_MODEL
    const statementColumnDefinitions = Object.freeze({
      date: Object.freeze({
        key: "date",
        label: "Date",
        sortKey: "date",
        defaultVisible: true
      }),

      particulars: Object.freeze({
        key: "particulars",
        label: "Particulars",
        sortKey: "particulars",
        defaultVisible: true
      }),

      party: Object.freeze({
        key: "party",
        label: "Party",
        sortKey: "party",
        defaultVisible: false
      }),

      reference: Object.freeze({
        key: "reference",
        label: "Reference",
        sortKey: "reference",
        defaultVisible: true
      }),

      fund: Object.freeze({
        key: "fund",
        label: "Fund",
        sortKey: "fund",
        defaultVisible: true
      }),

      receipt: Object.freeze({
        key: "receipt",
        label: "Receipt (+)",
        sortKey: "receipt",
        defaultVisible: true
      }),

      expense: Object.freeze({
        key: "expense",
        label: "Expense (-)",
        sortKey: "expense",
        defaultVisible: true
      }),

      running_balance: Object.freeze({
        key: "running_balance",
        label: "Running Balance",
        sortKey: "running_balance",
        defaultVisible: true
      }),

      payment_method: Object.freeze({
        key: "payment_method",
        label: "Mode",
        sortKey: "payment_method",
        defaultVisible: true
      }),

      payment_reference: Object.freeze({
        key: "payment_reference",
        label: "Payment Reference",
        sortKey: "payment_reference",
        defaultVisible: false
      }),

      type: Object.freeze({
        key: "type",
        label: "Type",
        sortKey: "type",
        defaultVisible: true
      }),

      status: Object.freeze({
        key: "status",
        label: "Status",
        sortKey: "status",
        defaultVisible: true
      })
    });

    const statementColumnOrder = Object.freeze([
      "date",
      "particulars",
      "party",
      "reference",
      "fund",
      "receipt",
      "expense",
      "running_balance",
      "payment_method",
      "payment_reference",
      "type",
      "status"
    ]);

    const statementViewPresets = Object.freeze({
      standard: Object.freeze({
        label: "Standard Statement",
        columns: Object.freeze([
          "date",
          "particulars",
          "reference",
          "fund",
          "receipt",
          "expense",
          "running_balance",
          "payment_method",
          "type",
          "status"
        ])
      }),

      bank_reconciliation: Object.freeze({
        label: "Bank Reconciliation",
        columns: Object.freeze([
          "date",
          "party",
          "reference",
          "fund",
          "receipt",
          "expense",
          "payment_method",
          "payment_reference",
          "status"
        ])
      }),

      donation_register: Object.freeze({
        label: "Donation Register",
        columns: Object.freeze([
          "date",
          "party",
          "particulars",
          "reference",
          "fund",
          "receipt",
          "payment_method",
          "payment_reference",
          "status"
        ])
      }),

      expense_register: Object.freeze({
        label: "Expense Register",
        columns: Object.freeze([
          "date",
          "party",
          "particulars",
          "reference",
          "fund",
          "expense",
          "payment_method",
          "payment_reference",
          "status"
        ])
      }),

      fund_ledger: Object.freeze({
        label: "Fund Ledger",
        columns: Object.freeze([
          "date",
          "particulars",
          "reference",
          "fund",
          "receipt",
          "expense",
          "running_balance",
          "type",
          "status"
        ])
      })
    });

    const statementColumnState = {
      activePreset: "standard",
      visibleColumns: new Set(
        statementViewPresets.standard.columns
      )
    };

    const getStatementVisibleColumns = () =>
      statementColumnOrder.filter(
        (key) =>
          statementColumnState.visibleColumns.has(key)
      );

    const isStatementColumnVisible = (key) =>
      statementColumnState.visibleColumns.has(key);

    const setStatementVisibleColumns = (
      columns,
      preset = "custom"
    ) => {
      const allowed =
        new Set(statementColumnOrder);

      const normalized =
        Array.from(
          new Set(
            Array.isArray(columns)
              ? columns.filter(
                  (key) => allowed.has(key)
                )
              : []
          )
        );

      if (!normalized.length) {
        return false;
      }

      statementColumnState.visibleColumns =
        new Set(normalized);

      statementColumnState.activePreset =
        preset;

      return true;
    };

    const applyStatementViewPreset = (
      presetKey
    ) => {
      const preset =
        statementViewPresets[presetKey];

      if (!preset) {
        return false;
      }

      return setStatementVisibleColumns(
        preset.columns,
        presetKey
      );
    };
    // SRMDC_REPORTS_STAGE_B1_SORT_ENGINE
    const statementSortDefinitions = Object.freeze({
      date: {
        type: "date",
        value: (row) => row.date
      },

      particulars: {
        type: "text",
        value: (row) =>
          row.particulars || row.party
      },

      party: {
        type: "text",
        value: (row) => row.party
      },
      reference: {
        type: "text",
        value: (row) => row.reference
      },

      fund: {
        type: "text",
        value: (row) => row.fund
      },

      receipt: {
        type: "number",
        value: (row) => row.receipt
      },

      expense: {
        type: "number",
        value: (row) => row.expense
      },

      running_balance: {
        type: "number",
        value: (row) => row.running_balance
      },

      payment_method: {
        type: "text",
        value: (row) => row.payment_method
      },

      payment_reference: {
        type: "text",
        value: (row) => row.payment_reference
      },
      type: {
        type: "text",
        value: (row) => row.type
      },

      status: {
        type: "text",
        value: (row) => row.status
      }
    });

    const compareStatementValues = (
      left,
      right,
      type
    ) => {
      if (type === "number") {
        return Number(left || 0) -
          Number(right || 0);
      }

      if (type === "date") {
        const leftTime =
          Date.parse(String(left || ""));

        const rightTime =
          Date.parse(String(right || ""));

        return (
          (Number.isNaN(leftTime) ? 0 : leftTime) -
          (Number.isNaN(rightTime) ? 0 : rightTime)
        );
      }

      return String(left ?? "").localeCompare(
        String(right ?? ""),
        "en",
        {
          numeric: true,
          sensitivity: "base"
        }
      );
    };

    const getSortedStatementRows = (
      rows = []
    ) => {
      const definition =
        statementSortDefinitions[
          statementViewState.sortKey
        ];

      if (!definition) {
        return [...rows];
      }

      const direction =
        statementViewState.sortDirection === "desc"
          ? -1
          : 1;

      return rows
        .map((row, index) => ({
          row,
          index
        }))
        .sort((leftItem, rightItem) => {
          const result =
            compareStatementValues(
              definition.value(leftItem.row),
              definition.value(rightItem.row),
              definition.type
            );

          if (result !== 0) {
            return result * direction;
          }

          return leftItem.index -
            rightItem.index;
        })
        .map((item) => item.row);
    };

    // SRMDC_REPORTS_STAGE_B1_PAGINATION_ENGINE
    const getStatementPageData = (
      rows = []
    ) => {
      if (statementViewState.pageSize === "all") {
        statementViewState.page = 1;

        return {
          rows: [...rows],
          page: 1,
          totalPages: 1,
          start: rows.length ? 1 : 0,
          end: rows.length
        };
      }

      const pageSize =
        Number(statementViewState.pageSize) || 25;

      const totalPages =
        Math.max(
          1,
          Math.ceil(rows.length / pageSize)
        );

      const page =
        Math.min(
          Math.max(
            1,
            Number(statementViewState.page) || 1
          ),
          totalPages
        );

      statementViewState.page = page;

      const startIndex =
        (page - 1) * pageSize;

      const endIndex =
        Math.min(
          startIndex + pageSize,
          rows.length
        );

      return {
        rows: rows.slice(
          startIndex,
          endIndex
        ),
        page,
        totalPages,
        start: rows.length
          ? startIndex + 1
          : 0,
        end: endIndex
      };
    };

    const renderInteractiveStatement = (
      rows = []
    ) => {
      const sortedRows =
        getSortedStatementRows(rows);

      const pageData =
        getStatementPageData(sortedRows);

      /*
       * Running Balance comes from the backend.
       * Sorting and pagination move the complete
       * transaction row only.
       *
       * Never recalculate running_balance here.
       */
      renderStatement(pageData.rows);

      if (
        typeof updateStatementSortIndicators ===
        "function"
      ) {
        updateStatementSortIndicators();
      }

      if (
        typeof renderStatementPagination ===
        "function"
      ) {
        renderStatementPagination(
          sortedRows.length,
          pageData
        );
      }
    };
    // SRMDC_REPORTS_STAGE_B2_BEHAVIOR
    const updateStatementSortIndicators = () => {
      document
        .querySelectorAll(
          "[data-statement-sort]"
        )
        .forEach((button) => {
          const key =
            button.dataset.statementSort;

          const indicator =
            button.querySelector(
              ".srmdc-statement-sort-indicator"
            );

          if (!indicator) {
            return;
          }

          const isActive =
            key === statementViewState.sortKey;

          button.classList.toggle(
            "is-active",
            isActive
          );

          button.setAttribute(
            "aria-sort",
            isActive
              ? (
                  statementViewState.sortDirection ===
                  "desc"
                    ? "descending"
                    : "ascending"
                )
              : "none"
          );

          if (!isActive) {
            indicator.textContent = "\u2195";
            return;
          }

          indicator.textContent =
            statementViewState.sortDirection ===
            "desc"
              ? "\u2193"
              : "\u2191";
        });
    };

    const renderStatementPagination = (
      totalRows,
      pageData
    ) => {
      const info =
        document.getElementById(
          "reportsStatementPageInfo"
        );

      const nav =
        document.getElementById(
          "reportsStatementPageNav"
        );

      const pageSize =
        document.getElementById(
          "reportsStatementPageSize"
        );

      if (pageSize) {
        pageSize.value =
          String(statementViewState.pageSize);
      }

      if (info) {
        if (!totalRows) {
          info.textContent =
            "Showing 0 of 0 transactions";
        }
        else {
          info.textContent =
            `Showing ${pageData.start}-${pageData.end} ` +
            `of ${totalRows} transactions`;
        }
      }

      if (!nav) {
        return;
      }

      if (
        !totalRows ||
        statementViewState.pageSize === "all" ||
        pageData.totalPages <= 1
      ) {
        nav.innerHTML = "";
        return;
      }

      const page = pageData.page;
      const totalPages = pageData.totalPages;

      const pageNumbers = [];

      const startPage =
        Math.max(
          1,
          Math.min(
            page - 2,
            Math.max(1, totalPages - 4)
          )
        );

      const endPage =
        Math.min(
          totalPages,
          startPage + 4
        );

      for (
        let number = startPage;
        number <= endPage;
        number += 1
      ) {
        pageNumbers.push(number);
      }

      nav.innerHTML = `
        <button
          type="button"
          class="srmdc-statement-page-button"
          data-statement-page="${page - 1}"
          ${page <= 1 ? "disabled" : ""}
        >
          Previous
        </button>

        ${pageNumbers
          .map(
            (number) => `
              <button
                type="button"
                class="srmdc-statement-page-button ${
                  number === page
                    ? "is-active"
                    : ""
                }"
                data-statement-page="${number}"
                ${
                  number === page
                    ? 'aria-current="page"'
                    : ""
                }
              >
                ${number}
              </button>
            `
          )
          .join("")}

        <button
          type="button"
          class="srmdc-statement-page-button"
          data-statement-page="${page + 1}"
          ${page >= totalPages ? "disabled" : ""}
        >
          Next
        </button>
      `;
    };

    // SRMDC_REPORTS_STAGE_B2_FILTER_PAGE_RESET
    const wireStatementFilterPageReset = () => {
      const controls = [
        "reportsStatementSearch",
        "reportsStatementType",
        "reportsStatementMode",
        "reportsStatementStatus"
      ];

      controls.forEach((id) => {
        const element =
          document.getElementById(id);

        if (!element) {
          return;
        }

        const eventName =
          id === "reportsStatementSearch"
            ? "input"
            : "change";

        element.addEventListener(
          eventName,
          () => {
            statementViewState.page = 1;
          }
        );
      });

      document
        .getElementById(
          "reportsStatementClearFilters"
        )
        ?.addEventListener(
          "click",
          () => {
            statementViewState.page = 1;
          }
        );
    };
    // SRMDC_REPORTS_STAGE_C3_3_CUSTOM_COLUMNS
    const syncStatementColumnChecklist = () => {
      const list =
        document.getElementById(
          "reportsStatementColumnsList"
        );

      if (!list) {
        return;
      }

      list.innerHTML =
        statementColumnOrder
          .map((key) => {
            const definition =
              statementColumnDefinitions[key];

            if (!definition) {
              return "";
            }

            const checked =
              isStatementColumnVisible(key)
                ? "checked"
                : "";

            return `
              <label
                class="srmdc-statement-column-option"
              >
                <input
                  type="checkbox"
                  value="${escapeHtml(key)}"
                  data-statement-column-toggle="${escapeHtml(key)}"
                  ${checked}
                />

                <span>
                  ${escapeHtml(definition.label)}
                </span>
              </label>
            `;
          })
          .join("");
    };

    const setStatementColumnsPanelOpen = (
      open
    ) => {
      const panel =
        document.getElementById(
          "reportsStatementColumnsPanel"
        );

      const button =
        document.getElementById(
          "reportsStatementColumnsButton"
        );

      if (!panel || !button) {
        return;
      }

      panel.hidden = !open;

      button.setAttribute(
        "aria-expanded",
        open ? "true" : "false"
      );

      if (open) {
        syncStatementColumnChecklist();
      }
    };

    const toggleStatementColumnsPanel = () => {
      const panel =
        document.getElementById(
          "reportsStatementColumnsPanel"
        );

      if (!panel) {
        return;
      }

      setStatementColumnsPanelOpen(
        panel.hidden
      );
    };

    const applyStatementCustomColumns = () => {
      const list =
        document.getElementById(
          "reportsStatementColumnsList"
        );

      if (!list) {
        return;
      }

      const checked =
        Array.from(
          list.querySelectorAll(
            "[data-statement-column-toggle]:checked"
          )
        ).map(
          (input) => input.value
        );

      if (!checked.length) {
        syncStatementColumnChecklist();
        return;
      }

      const changed =
        setStatementVisibleColumns(
          checked,
          "custom"
        );

      if (!changed) {
        syncStatementColumnChecklist();
        return;
      }

      statementViewState.page = 1;

      applyStatementFilters();
      syncStatementViewPresetControl();
      syncStatementColumnChecklist();
    };

    const wireStatementCustomColumnEvents = () => {
      const button =
        document.getElementById(
          "reportsStatementColumnsButton"
        );

      const close =
        document.getElementById(
          "reportsStatementColumnsClose"
        );

      const list =
        document.getElementById(
          "reportsStatementColumnsList"
        );

      const panel =
        document.getElementById(
          "reportsStatementColumnsPanel"
        );

      if (!button || !list || !panel) {
        return;
      }

      button.disabled = false;

      button.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();
          toggleStatementColumnsPanel();
        }
      );

      close?.addEventListener(
        "click",
        () => {
          setStatementColumnsPanelOpen(false);
        }
      );

      list.addEventListener(
        "change",
        (event) => {
          const input =
            event.target.closest(
              "[data-statement-column-toggle]"
            );

          if (!input) {
            return;
          }

          const checkedCount =
            list.querySelectorAll(
              "[data-statement-column-toggle]:checked"
            ).length;

          if (!checkedCount) {
            input.checked = true;
            return;
          }

          applyStatementCustomColumns();
        }
      );

      document.addEventListener(
        "click",
        (event) => {
          if (
            panel.hidden ||
            panel.contains(event.target) ||
            button.contains(event.target)
          ) {
            return;
          }

          setStatementColumnsPanelOpen(false);
        }
      );

      document.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key === "Escape" &&
            !panel.hidden
          ) {
            setStatementColumnsPanelOpen(false);
            button.focus();
          }
        }
      );

      syncStatementColumnChecklist();
    };
    // SRMDC_REPORTS_STAGE_C3_2_VIEW_PRESETS
    const syncStatementViewPresetControl = () => {
      const select =
        document.getElementById(
          "reportsStatementViewPreset"
        );

      if (!select) {
        return;
      }

      select.value =
        statementColumnState.activePreset;
    };

    const applyStatementPresetFromUi = (
      presetKey
    ) => {
      if (
        presetKey === "custom" ||
        !statementViewPresets[presetKey]
      ) {
        syncStatementViewPresetControl();
        return;
      }

      const applied =
        applyStatementViewPreset(presetKey);

      if (!applied) {
        syncStatementViewPresetControl();
        return;
      }

      /*
       * Changing visible columns is a presentation
       * operation only. It does not alter report data,
       * accounting totals or backend Running Balance.
       */
      statementViewState.page = 1;

      applyStatementFilters();
      syncStatementViewPresetControl();

      if (
        typeof syncStatementColumnChecklist ===
        "function"
      ) {
        syncStatementColumnChecklist();
      }
    };

    const wireStatementViewPresetEvents = () => {
      const select =
        document.getElementById(
          "reportsStatementViewPreset"
        );

      if (!select) {
        return;
      }

      select.disabled = false;

      select.addEventListener(
        "change",
        () => {
          applyStatementPresetFromUi(
            select.value
          );
        }
      );

      syncStatementViewPresetControl();
    };
    const wireStatementInteractiveEvents = () => {
      const view =
        document.getElementById(
          "reportsAnalyticsView"
        );

      if (!view) {
        return;
      }

      view.addEventListener(
        "click",
        (event) => {
          const sortButton =
            event.target.closest(
              "[data-statement-sort]"
            );

          if (sortButton) {
            setStatementSort(
              sortButton.dataset.statementSort
            );

            return;
          }

          const pageButton =
            event.target.closest(
              "[data-statement-page]"
            );

          if (
            pageButton &&
            !pageButton.disabled
          ) {
            const requestedPage =
              Number(
                pageButton.dataset.statementPage
              );

            if (
              Number.isInteger(requestedPage) &&
              requestedPage >= 1
            ) {
              statementViewState.page =
                requestedPage;

              applyStatementFilters();
            }
          }
        }
      );

      const pageSize =
        document.getElementById(
          "reportsStatementPageSize"
        );

      pageSize?.addEventListener(
        "change",
        (event) => {
          const value =
            event.target.value;

          statementViewState.pageSize =
            value === "all"
              ? "all"
              : Number(value) || 25;

          statementViewState.page = 1;

          applyStatementFilters();
        }
      );
    };
    const setStatementSort = (key) => {
      if (!statementSortDefinitions[key]) {
        return;
      }

      if (statementViewState.sortKey === key) {
        statementViewState.sortDirection =
          statementViewState.sortDirection === "asc"
            ? "desc"
            : "asc";
      }
      else {
        statementViewState.sortKey = key;
        statementViewState.sortDirection = "asc";
      }

      statementViewState.page = 1;

      applyStatementFilters();
    };
    const renderStatementFilteredSummary = (
      rows = []
    ) => {
      const element =
        document.getElementById(
          "reportsStatementFilteredSummary"
        );

      if (!element) {
        return;
      }

      const receipts =
        rows.reduce(
          (total, row) =>
            total +
            Number(row.receipt || 0),
          0
        );

      const expenses =
        rows.reduce(
          (total, row) =>
            total +
            Number(row.expense || 0),
          0
        );

      const net =
        receipts - expenses;

      element.innerHTML = `
        <strong>${rows.length}</strong>
        matching transaction${
          rows.length === 1 ? "" : "s"
        }

        <span>
          Receipts
          <b>${escapeHtml(money(receipts))}</b>
        </span>

        <span>
          Expenses
          <b>${escapeHtml(money(expenses))}</b>
        </span>

        <span>
          Net
          <b>${escapeHtml(money(net))}</b>
        </span>
      `;
    };

    // SRMDC_REPORTS_STAGE_B1_PIPELINE
    const applyStatementFilters = () => {
      const rows =
        getFilteredStatementRows();

      /*
       * Filter summary represents every matching
       * transaction, independent of pagination.
       */
      renderStatementFilteredSummary(rows);

      renderInteractiveStatement(rows);
    };

    const clearStatementFilters = () => {
      statementFilters.search = "";
      statementFilters.type = "";
      statementFilters.mode = "";
      statementFilters.status = "";

      const ids = [
        "reportsStatementSearch",
        "reportsStatementTypeFilter",
        "reportsStatementModeFilter",
        "reportsStatementStatusFilter"
      ];

      ids.forEach((id) => {
        const element =
          document.getElementById(id);

        if (element) {
          element.value = "";
        }
      });

      applyStatementFilters();
    };

    // SRMDC_REPORTS_STAGE_C3_1_DYNAMIC_RENDERER
    const renderStatementHeader = () => {
      const headerRow =
        document.getElementById(
          "reportsStatementHeaderRow"
        );

      if (!headerRow) {
        return;
      }

      const visibleColumns =
        getStatementVisibleColumns();

      headerRow.innerHTML =
        visibleColumns
          .map((key) => {
            const definition =
              statementColumnDefinitions[key];

            if (!definition) {
              return "";
            }

            return `
              <th
                data-statement-column="${escapeHtml(key)}"
              >
                <button
                  type="button"
                  class="srmdc-statement-sort"
                  data-statement-sort="${escapeHtml(
                    definition.sortKey
                  )}"
                >
                  <span>
                    ${escapeHtml(definition.label)}
                  </span>

                  <span
                    class="srmdc-statement-sort-indicator"
                    aria-hidden="true"
                  >&#8597;</span>
                </button>
              </th>
            `;
          })
          .join("");

      updateStatementSortIndicators();
    };

    const renderStatementCell = (
      row,
      key
    ) => {
      const dash = "&mdash;";

      switch (key) {
        case "date":
          return `
            <td data-statement-column="date">
              ${displayDate(row.date)}
            </td>
          `;

        case "particulars":
          return `
            <td data-statement-column="particulars">
              <div class="srmdc-statement-particular">
                <strong>
                  ${escapeHtml(
                    row.particulars ||
                    row.party ||
                    "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
                  )}
                </strong>

                ${
                  row.party
                    ? `
                      <span>
                        ${escapeHtml(row.party)}
                      </span>
                    `
                    : ""
                }
              </div>
            </td>
          `;

        case "party":
          return `
            <td data-statement-column="party">
              ${escapeHtml(row.party || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â")}
            </td>
          `;

        case "reference":
          return `
            <td data-statement-column="reference">
              ${escapeHtml(row.reference || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â")}
            </td>
          `;

        case "fund":
          return `
            <td data-statement-column="fund">
              ${escapeHtml(row.fund || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â")}
            </td>
          `;

        case "receipt": {
          const amount =
            Number(row.receipt || 0);

          return `
            <td
              class="srmdc-money-in"
              data-statement-column="receipt"
            >
              ${
                amount > 0
                  ? escapeHtml(money(amount))
                  : dash
              }
            </td>
          `;
        }

        case "expense": {
          const amount =
            Number(row.expense || 0);

          return `
            <td
              class="srmdc-money-out"
              data-statement-column="expense"
            >
              ${
                amount > 0
                  ? escapeHtml(money(amount))
                  : dash
              }
            </td>
          `;
        }

        case "running_balance":
          return `
            <td
              class="srmdc-running-balance"
              data-statement-column="running_balance"
            >
              ${escapeHtml(
                money(row.running_balance)
              )}
            </td>
          `;

        case "payment_method":
          return `
            <td data-statement-column="payment_method">
              ${escapeHtml(
                row.payment_method || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
              )}
            </td>
          `;

        case "payment_reference":
          return `
            <td data-statement-column="payment_reference">
              ${escapeHtml(
                row.payment_reference || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
              )}
            </td>
          `;

        case "type": {
          const type =
            row.type === "expense"
              ? "expense"
              : "receipt";

          return `
            <td data-statement-column="type">
              <span
                class="srmdc-report-type is-${type}"
              >
                ${
                  type === "expense"
                    ? "Expense"
                    : "Receipt"
                }
              </span>
            </td>
          `;
        }

        case "status":
          return `
            <td data-statement-column="status">
              ${escapeHtml(row.status || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â")}
            </td>
          `;

        default:
          return `
            <td>${dash}</td>
          `;
      }
    };

    const renderStatement = (rows = []) => {
      const body =
        document.getElementById(
          "reportsStatementBody"
        );

      if (!body) {
        return;
      }

      const visibleColumns =
        getStatementVisibleColumns();

      renderStatementHeader();

      if (!rows.length) {
        body.innerHTML = `
          <tr>
            <td
              colspan="${visibleColumns.length}"
              class="srmdc-reports-empty-cell"
            >
              No financial transactions
              for this period.
            </td>
          </tr>
        `;

        return;
      }

      body.innerHTML =
        rows
          .map(
            (row) => `
              <tr>
                ${visibleColumns
                  .map(
                    (key) =>
                      renderStatementCell(
                        row,
                        key
                      )
                  )
                  .join("")}
              </tr>
            `
          )
          .join("");
    };
    const populateFundFilter = (funds = []) => {
      const select =
        document.getElementById(
          "reportsFundFilter"
        );

      if (!select) {
        return;
      }

      const selected = select.value;

      const options =
        funds.map((fund) => `
          <option
            value="${escapeHtml(fund.fund_id)}"
          >
            ${escapeHtml(fund.fund_name)}
          </option>
        `).join("");

      select.innerHTML =
        `<option value="">All Funds</option>${options}`;

      if (
        selected &&
        funds.some(
          (fund) =>
            fund.fund_id === selected
        )
      ) {
        select.value = selected;
      }
    };

    const loadReport = async () => {
      const fromDate =
        document.getElementById(
          "reportsFromDate"
        )?.value;

      const toDate =
        document.getElementById(
          "reportsToDate"
        )?.value;

      const fundId =
        document.getElementById(
          "reportsFundFilter"
        )?.value || null;

      if (!fromDate || !toDate) {
        setMessage(
          "Select both From and To dates.",
          "error"
        );

        return;
      }

      if (fromDate > toDate) {
        setMessage(
          "From date cannot be after To date.",
          "error"
        );

        return;
      }

      const refreshButton =
        document.getElementById(
          "reportsAnalyticsRefreshButton"
        );

      if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent =
          "Loading...";
      }

      setMessage(
        "Loading live financial statement..."
      );

      try {
        const { data, error } =
          await client.rpc(
            "get_srmdc_financial_report",
            {
              p_from_date: fromDate,
              p_to_date: toDate,
              p_fund_id: fundId
            }
          );

        if (error) {
          throw error;
        }

        const report =
          Array.isArray(data)
            ? data[0]
            : data;

        if (!report) {
          throw new Error(
            "Financial report returned no data."
          );
        }

        renderSummary(
          report.summary || {}
        );

        renderFunds(
          report.funds || []
        );

        statementRows =
          Array.isArray(report.statement)
            ? report.statement
            : [];

        populateStatementFilters(
          statementRows
        );

        applyStatementFilters();

        if (!fundId) {
          populateFundFilter(
            report.funds || []
          );
        }

        const generated =
          document.getElementById(
            "reportsGeneratedAt"
          );

        if (generated) {
          const generatedAt =
            report.generated_at
              ? new Date(report.generated_at)
              : new Date();

          generated.textContent =
            `Live statement refreshed: ${
              generatedAt.toLocaleString(
                "en-IN"
              )
            }`;
        }

        setMessage(
          "Financial statement loaded successfully.",
          "success"
        );
      }
      catch (error) {
        console.error(
          "SRMDC Reports:",
          error
        );

        setMessage(
          error?.message ||
          "Unable to load financial report.",
          "error"
        );
      }
      finally {
        if (refreshButton) {
          refreshButton.disabled = false;
          refreshButton.textContent =
            "Refresh";
        }
      }
    };

    const showDashboardView = () => {
      getView()?.classList.add(
        "hidden"
      );

      if (
        typeof showDashboard === "function"
      ) {
        showDashboard();
      }
    };

    const open = async () => {
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

      const view = getView();

      if (!view) {
        return;
      }

      view.classList.remove(
        "hidden"
      );

      await loadReport();
    };

    const resetFilters = async () => {
      const dates =
        currentFinancialYearDates();

      const from =
        document.getElementById(
          "reportsFromDate"
        );

      const to =
        document.getElementById(
          "reportsToDate"
        );

      const fund =
        document.getElementById(
          "reportsFundFilter"
        );

      if (from) {
        from.value = dates.from;
      }

      if (to) {
        to.value = dates.to;
      }

      if (fund) {
        fund.value = "";
      }

      await loadReport();
    };


    // SRMDC_FINANCIAL_CANCELLATION_ADMIN_D2C
    let financialCancellationState = {
      entityType: "",
      entityId: "",
      reference: ""
    };

    const getFinancialCancelModal = () =>
      document.getElementById(
        "reportsFinancialCancelModal"
      );

    const setFinancialRecordsMessage = (
      message,
      tone = ""
    ) => {
      const element =
        document.getElementById(
          "reportsFinancialRecordsMessage"
        );

      if (!element) {
        return;
      }

      element.textContent = message || "";
      element.dataset.tone = tone;
    };

    const renderFinancialExpenseRecords = (
      rows = []
    ) => {
      const body =
        document.getElementById(
          "reportsExpenseRecordsBody"
        );

      if (!body) {
        return;
      }

      if (!rows.length) {
        body.innerHTML = `
          <tr>
            <td colspan="8">
              No expense records found.
            </td>
          </tr>
        `;
        return;
      }

      body.innerHTML =
        rows
          .map((row) => {
            const canCancel =
              row.can_cancel === true;

            const paidAmount =
              Number(row.paid_amount || 0);

            return `
              <tr>
                <td>
                  ${displayDate(row.expense_date)}
                </td>

                <td>
                  <strong>
                    ${escapeHtml(
                      row.expense_number || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
                    )}
                  </strong>
                </td>

                <td>
                  ${escapeHtml(
                    row.description ||
                    row.expense_category ||
                    "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    row.fund_name || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    money(row.amount)
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    money(paidAmount)
                  )}
                </td>

                <td>
                  <span
                    class="srmdc-financial-record-status"
                    data-status="${escapeHtml(
                      row.status || ""
                    )}"
                  >
                    ${escapeHtml(
                      row.status || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
                    )}
                  </span>

                  ${
                    row.cancel_reason
                      ? `
                        <small
                          class="srmdc-cancel-reason"
                        >
                          ${escapeHtml(
                            row.cancel_reason
                          )}
                        </small>
                      `
                      : ""
                  }
                </td>

                <td>
                  ${
                    row.status === "cancelled"
                      ? `
                        <button
                                  type="button"
                                  class="secondary-button srmdc-record-view-button"
                                  data-financial-view-type="expense"
                                  data-financial-view-id="${escapeHtml(row.id)}"
                                >
                                  View
                                </button>

                                <button
                          type="button"
                          class="secondary-button srmdc-record-restore-button"
                          data-financial-restore-type="expense"
                          data-financial-restore-id="${escapeHtml(row.id)}"
                          data-financial-restore-reference="${escapeHtml(
                            row.expense_number || ""
                          )}"
                        >
                          Restore
                        </button>
                      `
                      : canCancel
                        ? `
                                                    ${
                            row.status === "draft"
                              ? `
                                <button
                                  type="button"
                                  class="secondary-button srmdc-record-view-button"
                                  data-financial-view-type="expense"
                                  data-financial-view-id="${escapeHtml(row.id)}"
                                >
                                  View
                                </button>

                                <button
                                  type="button"
                                  class="secondary-button srmdc-record-edit-button"
                                  data-financial-edit-type="expense"
                                  data-financial-edit-id="${escapeHtml(row.id)}"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  class="primary-button srmdc-expense-approve-button"
                                  data-expense-approve-id="${escapeHtml(
                                    row.id
                                  )}"
                                  data-expense-approve-reference="${escapeHtml(
                                    row.expense_number || ""
                                  )}"
                                >
                                  Approve
                                </button>
                              `
                              : ""
                          }

                          ${
                            row.status !== "draft"
                              ? `
                                <button
                                  type="button"
                                  class="secondary-button srmdc-record-view-button"
                                  data-financial-view-type="expense"
                                  data-financial-view-id="${escapeHtml(row.id)}"
                                >
                                  View
                                </button>
                              `
                              : ""
                          }

                          <button
                            type="button"
                            class="secondary-button srmdc-record-cancel-button"
                            data-financial-cancel-type="expense"
                            data-financial-cancel-id="${escapeHtml(
                              row.id
                            )}"
                            data-financial-cancel-reference="${escapeHtml(
                              row.expense_number || ""
                            )}"
                          >
                            Cancel
                          </button>
                        `
                        : `
                          <button
                            type="button"
                            class="secondary-button srmdc-record-view-button"
                            data-financial-view-type="expense"
                            data-financial-view-id="${escapeHtml(row.id)}"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            class="secondary-button"
                            disabled
                            title="Payment history exists. Payment reversal/correction is required before cancellation."
                          >
                            Protected
                          </button>
                        `
                  }
                </td>
              </tr>
            `;
          })
          .join("");
    };

    const renderFinancialDonationRecords = (
      rows = []
    ) => {
      const body =
        document.getElementById(
          "reportsDonationRecordsBody"
        );

      if (!body) {
        return;
      }

      if (!rows.length) {
        body.innerHTML = `
          <tr>
            <td colspan="7">
              No donation records found.
            </td>
          </tr>
        `;
        return;
      }

      body.innerHTML =
        rows
          .map((row) => {
            const reference =
              row.receipt_number ||
              row.id ||
              "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â";

            return `
              <tr>
                <td>
                  ${displayDate(row.donation_date)}
                </td>

                <td>
                  <strong>
                    ${escapeHtml(reference)}
                  </strong>

                  ${
                    row.receipt_status
                      ? `
                        <small
                          class="srmdc-record-secondary"
                        >
                          Receipt:
                          ${escapeHtml(
                            row.receipt_status
                          )}
                        </small>
                      `
                      : ""
                  }
                </td>

                <td>
                  ${escapeHtml(
                    row.donation_type || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    row.fund_name || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    money(row.amount)
                  )}
                </td>

                <td>
                  <span
                    class="srmdc-financial-record-status"
                    data-status="${escapeHtml(
                      row.status || ""
                    )}"
                  >
                    ${escapeHtml(
                      row.status || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"
                    )}
                  </span>

                  ${
                    row.cancel_reason
                      ? `
                        <small
                          class="srmdc-cancel-reason"
                        >
                          ${escapeHtml(
                            row.cancel_reason
                          )}
                        </small>
                      `
                      : ""
                  }
                </td>

                <td>
                  ${
                    row.status === "cancelled"
                      ? `
                        <button
                          type="button"
                          class="secondary-button srmdc-record-view-button"
                          data-financial-view-type="donation"
                          data-financial-view-id="${escapeHtml(row.id)}"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          class="secondary-button srmdc-record-restore-button"
                          data-financial-restore-type="donation"
                          data-financial-restore-id="${escapeHtml(row.id)}"
                          data-financial-restore-reference="${escapeHtml(reference)}"
                        >
                          Restore
                        </button>
                      `
                      : row.can_cancel === true
                        ? `
                          <button
                            type="button"
                            class="secondary-button srmdc-record-view-button"
                            data-financial-view-type="donation"
                            data-financial-view-id="${escapeHtml(row.id)}"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            class="secondary-button srmdc-record-edit-button"
                            data-financial-edit-type="donation"
                            data-financial-edit-id="${escapeHtml(row.id)}"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            class="secondary-button srmdc-record-cancel-button"
                            data-financial-cancel-type="donation"
                            data-financial-cancel-id="${escapeHtml(
                              row.id
                            )}"
                            data-financial-cancel-reference="${escapeHtml(
                              reference
                            )}"
                          >
                            Cancel
                          </button>
                        `
                        : `
                          <span class="muted">
                            Protected
                          </span>
                        `
                  }
                </td>
              </tr>
            `;
          })
          .join("");
    };

        // SRMDC_FINANCIAL_VIEW_EDIT_D4M_C
    let srmdcFinancialDetailState = null;

    const ensureFinancialDetailModal = () => {
      let modal =
        document.getElementById(
          "reportsFinancialDetailModal"
        );

      if (modal) {
        return modal;
      }

      const holder =
        document.createElement("div");

      holder.innerHTML = `
        <div
          id="reportsFinancialDetailModal"
          class="srmdc-financial-detail-modal"
          hidden
        >
          <div
            class="srmdc-financial-detail-backdrop"
            data-financial-detail-close
          ></div>

          <section
            class="srmdc-financial-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reportsFinancialDetailTitle"
          >
            <header class="srmdc-financial-detail-header">
              <div>
                <p class="eyebrow">SRMDC TRUST</p>
                <h2 id="reportsFinancialDetailTitle">
                  Financial Record
                </h2>
                <p
                  id="reportsFinancialDetailReference"
                  class="muted"
                ></p>
              </div>

              <button
                type="button"
                class="srmdc-expense-close-button"
                data-financial-detail-close
                aria-label="Close"
              >
                &times;
              </button>
            </header>

            <div
              id="reportsFinancialDetailMessage"
              class="srmdc-financial-detail-message"
            ></div>

            <form
              id="reportsFinancialDetailForm"
              novalidate
            >
              <div
                id="reportsFinancialDetailFields"
                class="srmdc-financial-detail-grid"
              ></div>

              <div
                id="reportsFinancialEditReasonWrap"
                class="srmdc-financial-edit-reason"
                hidden
              >
                <label>
                  <span>
                    Reason for Change
                    <strong>*</strong>
                  </span>

                  <textarea
                    id="reportsFinancialEditReason"
                    rows="3"
                    maxlength="500"
                    placeholder="Explain why this correction is required."
                  ></textarea>
                </label>
              </div>

              <footer class="srmdc-financial-detail-footer">
                <button
                  type="button"
                  class="secondary-button"
                  data-financial-detail-close
                >
                  Close
                </button>

                <button
                  type="submit"
                  id="reportsFinancialDetailSave"
                  class="primary-button"
                  hidden
                >
                  Save Changes
                </button>
              </footer>
            </form>
          </section>
        </div>
      `;

      modal = holder.firstElementChild;
      document.body.appendChild(modal);

      modal
        .querySelectorAll(
          "[data-financial-detail-close]"
        )
        .forEach((element) => {
          element.addEventListener(
            "click",
            closeFinancialDetailModal
          );
        });

      modal
        .querySelector(
          "#reportsFinancialDetailForm"
        )
        ?.addEventListener(
          "submit",
          submitFinancialDetailEdit
        );

      return modal;
    };

    function closeFinancialDetailModal() {
      const modal =
        document.getElementById(
          "reportsFinancialDetailModal"
        );

      if (modal) {
        modal.hidden = true;
      }

      document.body.classList.remove(
        "srmdc-financial-detail-modal-open"
      );

      srmdcFinancialDetailState = null;
    }

    const detailValue = (
      label,
      value
    ) => `
      <div class="srmdc-financial-detail-field">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(
          value === null ||
          value === undefined ||
          value === ""
            ? "-"
            : String(value)
        )}</strong>
      </div>
    `;

    const editInput = (
      label,
      id,
      value,
      type = "text",
      required = false
    ) => `
      <label class="srmdc-financial-edit-field">
        <span>
          ${escapeHtml(label)}
          ${required ? "<strong>*</strong>" : ""}
        </span>

        <input
          id="${escapeHtml(id)}"
          type="${escapeHtml(type)}"
          value="${escapeHtml(
            value === null ||
            value === undefined
              ? ""
              : String(value)
          )}"
          ${required ? "required" : ""}
        >
      </label>
    `;

    const renderFinancialDetail = (
      detail,
      mode
    ) => {
      const fields =
        document.getElementById(
          "reportsFinancialDetailFields"
        );

      const title =
        document.getElementById(
          "reportsFinancialDetailTitle"
        );

      const reference =
        document.getElementById(
          "reportsFinancialDetailReference"
        );

      const save =
        document.getElementById(
          "reportsFinancialDetailSave"
        );

      const reasonWrap =
        document.getElementById(
          "reportsFinancialEditReasonWrap"
        );

      if (
        !fields ||
        !title ||
        !reference ||
        !save ||
        !reasonWrap
      ) {
        return;
      }

      const isExpense =
        detail.record_type === "expense";

      const editing =
        mode === "edit";

      title.textContent =
        editing
          ? isExpense
            ? "Edit Draft Expense"
            : "Edit Donor Profile"
          : isExpense
            ? "Expense Details"
            : "Donation & Receipt Details";

      reference.textContent =
        isExpense
          ? detail.expense_number || ""
          : detail.receipt_number ||
            detail.id ||
            "";

      save.hidden = !editing;
      reasonWrap.hidden = !editing;

      const reason =
        document.getElementById(
          "reportsFinancialEditReason"
        );

      if (reason) {
        reason.value = "";
      }

      if (!editing) {
        if (isExpense) {
          fields.innerHTML = [
            detailValue(
              "Expense Date",
              displayDate(detail.expense_date)
            ),
            detailValue(
              "Expense Number",
              detail.expense_number
            ),
            detailValue("Status", detail.status),
            detailValue("Fund", detail.fund_name),
            detailValue(
              "Category",
              detail.expense_category
            ),
            detailValue(
              "Vendor / Payee",
              detail.vendor_name
            ),
            detailValue(
              "Purpose / Description",
              detail.description
            ),
            detailValue(
              "Amount",
              money(detail.amount)
            ),
            detailValue(
              "Amount Paid",
              money(detail.paid_amount || 0)
            ),
            detailValue(
              "Bill / Invoice No.",
              detail.bill_number
            ),
            detailValue(
              "Bill Date",
              detail.bill_date
                ? displayDate(detail.bill_date)
                : "-"
            ),
            detailValue("Notes", detail.notes),
            detailValue(
              "Cancellation Reason",
              detail.cancel_reason
            )
          ].join("");
        } else {
          const relation =
            detail.relationship_type &&
            detail.related_person_name
              ? `${detail.relationship_type} ${detail.related_person_name}`
              : "-";

          fields.innerHTML = [
            detailValue(
              "Donation Date",
              displayDate(detail.donation_date)
            ),
            detailValue(
              "Receipt Number",
              detail.receipt_number
            ),
            detailValue(
              "Donation Status",
              detail.status
            ),
            detailValue(
              "Receipt Status",
              detail.receipt_status
            ),
            detailValue(
              "Donation Type",
              detail.donation_type
            ),
            detailValue("Fund", detail.fund_name),
            detailValue(
              "Amount",
              money(detail.amount)
            ),
            detailValue(
              "Donor Name",
              detail.donor_name
            ),
            detailValue(
              "Relationship",
              relation
            ),
            detailValue("Mobile", detail.mobile),
            detailValue("Address", detail.address),
            detailValue(
              "PAN / ID",
              detail.pan_or_id
            ),
            detailValue(
              "Cancellation Reason",
              detail.cancel_reason
            )
          ].join("");
        }

        return;
      }

      if (isExpense) {
        if (detail.can_edit !== true) {
          throw new Error(
            "Only Draft expenses with no payment history can be edited."
          );
        }

        fields.innerHTML = `
          ${editInput(
            "Expense Date",
            "reportsFinancialEditExpenseDate",
            detail.expense_date,
            "date",
            true
          )}

          <label class="srmdc-financial-edit-field">
            <span>Fund <strong>*</strong></span>

            <select
              id="reportsFinancialEditExpenseFund"
              required
            >
              <option
                value="${escapeHtml(
                  detail.fund_id || ""
                )}"
              >
                ${escapeHtml(
                  detail.fund_name || "Current Fund"
                )}
              </option>
            </select>
          </label>

          ${editInput(
            "Category",
            "reportsFinancialEditExpenseCategory",
            detail.expense_category,
            "text",
            true
          )}

          <div class="srmdc-financial-detail-field">
            <span>Vendor / Payee</span>
            <strong>
              ${escapeHtml(
                detail.vendor_name || "-"
              )}
            </strong>
          </div>

          <label class="srmdc-financial-edit-field srmdc-financial-edit-wide">
            <span>
              Purpose / Description
              <strong>*</strong>
            </span>

            <textarea
              id="reportsFinancialEditExpenseDescription"
              rows="3"
              maxlength="500"
              required
            >${escapeHtml(
              detail.description || ""
            )}</textarea>
          </label>

          ${editInput(
            "Amount",
            "reportsFinancialEditExpenseAmount",
            detail.amount,
            "number",
            true
          )}

          ${editInput(
            "Bill / Invoice No.",
            "reportsFinancialEditExpenseBillNumber",
            detail.bill_number
          )}

          ${editInput(
            "Bill Date",
            "reportsFinancialEditExpenseBillDate",
            detail.bill_date,
            "date"
          )}

          <label class="srmdc-financial-edit-field srmdc-financial-edit-wide">
            <span>Notes</span>

            <textarea
              id="reportsFinancialEditExpenseNotes"
              rows="3"
              maxlength="1000"
            >${escapeHtml(
              detail.notes || ""
            )}</textarea>
          </label>
        `;
      } else {
        if (detail.can_edit !== true) {
          throw new Error(
            "This donation is not available for donor profile editing."
          );
        }

        fields.innerHTML = `
          ${detailValue(
            "Receipt Number",
            detail.receipt_number
          )}

          ${detailValue(
            "Amount",
            money(detail.amount)
          )}

          ${detailValue(
            "Fund",
            detail.fund_name
          )}

          ${editInput(
            "Donor Name",
            "reportsFinancialEditDonorName",
            detail.donor_name,
            "text",
            true
          )}

          <label class="srmdc-financial-edit-field">
            <span>Relationship</span>

            <select id="reportsFinancialEditRelationship">
              <option value="">None</option>
              <option value="S/o">S/o</option>
              <option value="D/o">D/o</option>
              <option value="W/o">W/o</option>
              <option value="H/o">H/o</option>
            </select>
          </label>

          ${editInput(
            "Related Person Name",
            "reportsFinancialEditRelatedPerson",
            detail.related_person_name
          )}

          ${editInput(
            "Mobile",
            "reportsFinancialEditDonorMobile",
            detail.mobile
          )}

          <label class="srmdc-financial-edit-field srmdc-financial-edit-wide">
            <span>Address</span>

            <textarea
              id="reportsFinancialEditDonorAddress"
              rows="3"
              maxlength="500"
            >${escapeHtml(
              detail.address || ""
            )}</textarea>
          </label>

          ${editInput(
            "PAN / ID",
            "reportsFinancialEditDonorPan",
            detail.pan_or_id
          )}
        `;

        const relationSelect =
          document.getElementById(
            "reportsFinancialEditRelationship"
          );

        if (relationSelect) {
          relationSelect.value =
            detail.relationship_type || "";
        }
      }
    };

    const openFinancialDetail = async (
      type,
      id,
      mode = "view"
    ) => {
      const modal =
        ensureFinancialDetailModal();

      const message =
        document.getElementById(
          "reportsFinancialDetailMessage"
        );

      const fields =
        document.getElementById(
          "reportsFinancialDetailFields"
        );

      if (message) {
        message.textContent =
          "Loading record details...";
      }

      if (fields) {
        fields.innerHTML = "";
      }

      modal.hidden = false;

      document.body.classList.add(
        "srmdc-financial-detail-modal-open"
      );

      try {
        const { data, error } =
          await client.rpc(
            "get_srmdc_financial_record_detail",
            {
              p_record_type: type,
              p_record_id: id
            }
          );

        if (error) {
          throw error;
        }

        const detail = data || {};

        srmdcFinancialDetailState = {
          type,
          id,
          mode,
          detail
        };

        renderFinancialDetail(detail, mode);

        if (message) {
          message.textContent =
            mode === "edit"
              ? "Only permitted fields can be changed. Reason for Change is mandatory and audited."
              : "Read-only financial record details.";
        }
      } catch (error) {
        console.error(
          "SRMDC financial detail load failed:",
          error
        );

        if (message) {
          message.textContent =
            error?.message ||
            "Unable to load record details.";
        }
      }
    };

    async function submitFinancialDetailEdit(
      event
    ) {
      event.preventDefault();

      const state =
        srmdcFinancialDetailState;

      if (!state || state.mode !== "edit") {
        return;
      }

      const reason =
        document.getElementById(
          "reportsFinancialEditReason"
        )?.value?.trim() || "";

      if (!reason) {
        alert(
          "Please enter a Reason for Change."
        );
        return;
      }

      const save =
        document.getElementById(
          "reportsFinancialDetailSave"
        );

      const message =
        document.getElementById(
          "reportsFinancialDetailMessage"
        );

      if (save) {
        save.disabled = true;
        save.textContent = "Saving...";
      }

      try {
        if (state.type === "donation") {
          const donorName =
            document.getElementById(
              "reportsFinancialEditDonorName"
            )?.value?.trim() || "";

          const relationship =
            document.getElementById(
              "reportsFinancialEditRelationship"
            )?.value?.trim() || "";

          const relatedPerson =
            document.getElementById(
              "reportsFinancialEditRelatedPerson"
            )?.value?.trim() || "";

          const mobile =
            document.getElementById(
              "reportsFinancialEditDonorMobile"
            )?.value?.trim() || "";

          const address =
            document.getElementById(
              "reportsFinancialEditDonorAddress"
            )?.value?.trim() || "";

          const pan =
            document.getElementById(
              "reportsFinancialEditDonorPan"
            )?.value?.trim() || "";

          if (!donorName) {
            throw new Error(
              "Donor Name is required."
            );
          }

          if (
            Boolean(relationship) !==
            Boolean(relatedPerson)
          ) {
            throw new Error(
              "Relationship and Related Person Name must be entered together."
            );
          }

          const { error } =
            await client.rpc(
              "update_srmdc_donor_profile",
              {
                p_donation_id: state.id,
                p_donor_name: donorName,
                p_relationship_type:
                  relationship || null,
                p_related_person_name:
                  relatedPerson || null,
                p_mobile: mobile || null,
                p_address: address || null,
                p_pan_or_id: pan || null,
                p_reason: reason
              }
            );

          if (error) {
            throw error;
          }
        } else {
          const detail =
            state.detail || {};

          const expenseDate =
            document.getElementById(
              "reportsFinancialEditExpenseDate"
            )?.value || "";

          const fundId =
            document.getElementById(
              "reportsFinancialEditExpenseFund"
            )?.value || "";

          const category =
            document.getElementById(
              "reportsFinancialEditExpenseCategory"
            )?.value?.trim() || "";

          const description =
            document.getElementById(
              "reportsFinancialEditExpenseDescription"
            )?.value?.trim() || "";

          const amount =
            Number(
              document.getElementById(
                "reportsFinancialEditExpenseAmount"
              )?.value || ""
            );

          const billNumber =
            document.getElementById(
              "reportsFinancialEditExpenseBillNumber"
            )?.value?.trim() || "";

          const billDate =
            document.getElementById(
              "reportsFinancialEditExpenseBillDate"
            )?.value || "";

          const notes =
            document.getElementById(
              "reportsFinancialEditExpenseNotes"
            )?.value?.trim() || "";

          if (
            !expenseDate ||
            !fundId ||
            !category ||
            !description ||
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            throw new Error(
              "Expense Date, Fund, Category, Purpose and valid Amount are required."
            );
          }

          const { error } =
            await client.rpc(
              "update_srmdc_draft_expense",
              {
                p_expense_id: state.id,
                p_expense_date: expenseDate,
                p_fund_id: fundId,
                p_vendor_id:
                  detail.vendor_id || null,
                p_expense_category: category,
                p_description: description,
                p_amount: amount,
                p_bill_number:
                  billNumber || null,
                p_bill_date:
                  billDate || null,
                p_notes: notes || null,
                p_reason: reason
              }
            );

          if (error) {
            throw error;
          }
        }

        closeFinancialDetailModal();

        await loadFinancialRecords();

        if (
          typeof loadFinancialReport ===
          "function"
        ) {
          await loadFinancialReport();
        }

        alert(
          "Financial record updated successfully."
        );
      } catch (error) {
        console.error(
          "SRMDC financial record update failed:",
          error
        );

        if (message) {
          message.textContent =
            error?.message ||
            "Unable to save changes.";
        }

        alert(
          error?.message ||
          "Unable to save changes."
        );
      } finally {
        if (save) {
          save.disabled = false;
          save.textContent = "Save Changes";
        }
      }
    }

    const wireFinancialViewEditUi = () => {
      document
        .getElementById(
          "reportsFinancialRecordsPanel"
        )
        ?.addEventListener(
          "click",
          async (event) => {
            const view =
              event.target.closest(
                "[data-financial-view-type]"
              );

            if (view) {
              event.preventDefault();

              await openFinancialDetail(
                view.dataset.financialViewType,
                view.dataset.financialViewId,
                "view"
              );

              return;
            }

            const edit =
              event.target.closest(
                "[data-financial-edit-type]"
              );

            if (edit) {
              event.preventDefault();

              await openFinancialDetail(
                edit.dataset.financialEditType,
                edit.dataset.financialEditId,
                "edit"
              );
            }
          }
        );

      document.addEventListener(
        "keydown",
        (event) => {
          const modal =
            document.getElementById(
              "reportsFinancialDetailModal"
            );

          if (
            event.key === "Escape" &&
            modal &&
            !modal.hidden
          ) {
            closeFinancialDetailModal();
          }
        }
      );
    };
const loadFinancialRecords = async () => {
      setFinancialRecordsMessage(
        "Loading financial records..."
      );

      try {
        const { data, error } =
          await client.rpc(
            "get_srmdc_financial_records"
          );

        if (error) {
          throw error;
        }

        const result = data || {};

        const expenses =
          Array.isArray(result.expenses)
            ? result.expenses
            : [];

        const donations =
          Array.isArray(result.donations)
            ? result.donations
            : [];

        renderFinancialExpenseRecords(
          expenses
        );

        renderFinancialDonationRecords(
          donations
        );

        setFinancialRecordsMessage(
          `${expenses.length} expense record(s) | ${donations.length} donation record(s)`
        );

      } catch (error) {
        console.error(
          "SRMDC financial records load failed:",
          error
        );

        setFinancialRecordsMessage(
          error?.message ||
            "Unable to load financial records.",
          "error"
        );
      }
    };

    const openFinancialRecords = async () => {
      const panel =
        document.getElementById(
          "reportsFinancialRecordsPanel"
        );

      if (!panel) {
        return;
      }

      panel.hidden = false;

      await loadFinancialRecords();

      panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    };

    const closeFinancialRecords = () => {
      const panel =
        document.getElementById(
          "reportsFinancialRecordsPanel"
        );

      if (panel) {
        panel.hidden = true;
      }
    };

    const openFinancialCancelModal = (
      button
    ) => {
      const modal =
        getFinancialCancelModal();

      if (!modal || !button) {
        return;
      }

      financialCancellationState = {
        entityType:
          button.dataset.financialCancelType ||
          "",
        entityId:
          button.dataset.financialCancelId ||
          "",
        reference:
          button.dataset
            .financialCancelReference ||
          ""
      };

      const form =
        document.getElementById(
          "reportsFinancialCancelForm"
        );

      form?.reset();

      const reference =
        document.getElementById(
          "reportsFinancialCancelReference"
        );

      const warning =
        document.getElementById(
          "reportsFinancialCancelWarning"
        );

      if (reference) {
        reference.textContent =
          financialCancellationState
            .reference ||
          "Selected record";
      }

      if (warning) {
        warning.textContent =
          financialCancellationState
            .entityType === "donation"
            ? "The donation and its active official receipt will be cancelled. The receipt number remains permanently reserved and will never be reused."
            : "Only an unpaid Draft or Approved expense can be cancelled. Payment history prevents direct cancellation.";
      }

      modal.hidden = false;

      document.body.classList.add(
        "srmdc-financial-cancel-modal-open"
      );

      window.setTimeout(
        () =>
          document
            .getElementById(
              "reportsFinancialCancelReason"
            )
            ?.focus(),
        0
      );
    };

    const closeFinancialCancelModal = () => {
      const modal =
        getFinancialCancelModal();

      if (modal) {
        modal.hidden = true;
      }

      document.body.classList.remove(
        "srmdc-financial-cancel-modal-open"
      );

      financialCancellationState = {
        entityType: "",
        entityId: "",
        reference: ""
      };
    };

    const submitFinancialCancellation =
      async (event) => {
        event.preventDefault();

        const state = {
          ...financialCancellationState
        };

        if (
          !state.entityId ||
          !["expense", "donation"].includes(
            state.entityType
          )
        ) {
          window.alert(
            "No valid financial record selected."
          );
          return;
        }

        const reasonElement =
          document.getElementById(
            "reportsFinancialCancelReason"
          );

        const detailsElement =
          document.getElementById(
            "reportsFinancialCancelDetails"
          );

        const submitButton =
          document.getElementById(
            "reportsFinancialCancelSubmit"
          );

        const category =
          reasonElement?.value?.trim() ||
          "";

        const details =
          detailsElement?.value?.trim() ||
          "";

        if (!category) {
          window.alert(
            "Please select a cancellation reason."
          );

          reasonElement?.focus();
          return;
        }

        if (
          category === "Other" &&
          !details
        ) {
          window.alert(
            "Please enter cancellation details for Other."
          );

          detailsElement?.focus();
          return;
        }

        const reason =
          details
            ? `${category}: ${details}`
            : category;

        const confirmation =
          state.entityType === "donation"
            ? `Cancel ${state.reference}? This will also cancel its active official receipt. The receipt number will never be reused.`
            : `Cancel ${state.reference}? The record will remain permanently in the Trust audit history.`;

        if (
          !window.confirm(confirmation)
        ) {
          return;
        }

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent =
            "Cancelling...";
        }

        try {
          const rpcName =
            state.entityType === "expense"
              ? "cancel_srmdc_expense"
              : "cancel_srmdc_donation";

          const args =
            state.entityType === "expense"
              ? {
                  p_expense_id:
                    state.entityId,
                  p_reason:
                    reason
                }
              : {
                  p_donation_id:
                    state.entityId,
                  p_reason:
                    reason
                };

          const { error } =
            await client.rpc(
              rpcName,
              args
            );

          if (error) {
            throw error;
          }

          closeFinancialCancelModal();

          await loadFinancialRecords();
          await loadReport();

          window.alert(
            `${state.reference} cancelled successfully.`
          );

        } catch (error) {
          console.error(
            "SRMDC cancellation failed:",
            error
          );

          window.alert(
            error?.message ||
              "Cancellation failed."
          );

        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
              "Confirm Cancellation";
          }
        }
      };

        // SRMDC_EXPENSE_APPROVAL_D4J
    const approveExpenseFromFinancialRecords =
      async (button) => {

        const expenseId =
          button?.dataset?.expenseApproveId || "";

        const reference =
          button?.dataset?.expenseApproveReference ||
          "Expense";

        if (!expenseId) {
          window.alert(
            "Expense ID is missing. Approval was not performed."
          );
          return;
        }

        const confirmed =
          window.confirm(
            [
              `Approve ${reference}?`,
              "",
              "This changes the expense from Draft to Approved.",
              "",
              "No payment will be recorded.",
              "Available Balance will NOT change.",
              "",
              "Only an actual recorded payment will reduce the Trust balance."
            ].join("\n")
          );

        if (!confirmed) {
          return;
        }

        const originalText =
          button.textContent || "Approve";

        button.disabled = true;
        button.textContent = "Approving...";

        try {
          const { error } =
            await client.rpc(
              "approve_srmdc_expense",
              {
                p_expense_id: expenseId
              }
            );

          if (error) {
            throw error;
          }

          await loadFinancialRecords();
          await loadReport();

          window.alert(
            [
              `${reference} approved successfully.`,
              "",
              "Status: Approved",
              "Payment recorded: No",
              "Available Balance has not changed."
            ].join("\n")
          );

        } catch (error) {
          console.error(
            "SRMDC expense approval failed:",
            error
          );

          window.alert(
            error?.message ||
              "Unable to approve the expense."
          );

        } finally {
          if (button?.isConnected) {
            button.disabled = false;
            button.textContent = originalText;
          }
        }
      };


    // SRMDC_FINANCIAL_RESTORE_D4L_C1
    const restoreFinancialRecord = async (
      button
    ) => {
      if (!button) {
        return;
      }

      const entityType =
        button.dataset.financialRestoreType || "";

      const entityId =
        button.dataset.financialRestoreId || "";

      const reference =
        button.dataset.financialRestoreReference ||
        "Selected record";

      if (
        !entityId ||
        !["expense", "donation"].includes(
          entityType
        )
      ) {
        window.alert(
          "Unable to identify the record to restore."
        );
        return;
      }

      const reason = window.prompt(
        [
          `Restore ${reference}?`,
          "",
          "Enter the reason for restoring this record.",
          "Example: Cancelled by mistake - verified original record."
        ].join("\n")
      );

      if (reason === null) {
        return;
      }

      const cleanReason = reason.trim();

      if (!cleanReason) {
        window.alert(
          "Restore reason is required."
        );
        return;
      }

      const confirmed = window.confirm(
        [
          `Restore ${reference}?`,
          "",
          entityType === "donation"
            ? "The original donation, original receipt number and receipt verification will be restored."
            : "The expense will return to its status immediately before cancellation.",
          "",
          "No new financial record or receipt number will be created.",
          "",
          `Reason: ${cleanReason}`
        ].join("\n")
      );

      if (!confirmed) {
        return;
      }

      const rpcName =
        entityType === "donation"
          ? "restore_srmdc_donation"
          : "restore_srmdc_expense";

      const rpcArgs =
        entityType === "donation"
          ? {
              p_donation_id: entityId,
              p_reason: cleanReason
            }
          : {
              p_expense_id: entityId,
              p_reason: cleanReason
            };

      const originalText =
        button.textContent || "Restore";

      button.disabled = true;
      button.textContent = "Restoring...";

      try {
        const { error } =
          await client.rpc(
            rpcName,
            rpcArgs
          );

        if (error) {
          throw error;
        }

        await loadFinancialRecords();
        await loadReport();

        window.alert(
          [
            `${reference} restored successfully.`,
            "",
            entityType === "donation"
              ? "The original donation and receipt have been reactivated."
              : "The expense has been returned to its previous valid status.",
            "",
            "The restoration has been recorded in the audit trail."
          ].join("\n")
        );
      } catch (error) {
        console.error(
          "SRMDC financial restore failed:",
          error
        );

        window.alert(
          error?.message ||
            "Unable to restore the financial record."
        );
      } finally {
        if (button?.isConnected) {
          button.disabled = false;
          button.textContent =
            originalText;
        }
      }
    };

    const wireFinancialRestoreUi = () => {
      document
        .getElementById(
          "reportsFinancialRecordsPanel"
        )
        ?.addEventListener(
          "click",
          async (event) => {
            const button =
              event.target.closest(
                "[data-financial-restore-type]"
              );

            if (!button) {
              return;
            }

            event.preventDefault();

            await restoreFinancialRecord(
              button
            );
          }
        );
    };
const wireFinancialCancellationUi =
      () => {
        document
          .getElementById(
            "reportsManageFinancialRecordsButton"
          )
          ?.addEventListener(
            "click",
            openFinancialRecords
          );

        document
          .getElementById(
            "reportsFinancialRecordsClose"
          )
          ?.addEventListener(
            "click",
            closeFinancialRecords
          );

        document
          .getElementById(
            "reportsFinancialRecordsRefresh"
          )
          ?.addEventListener(
            "click",
            loadFinancialRecords
          );

        document
          .getElementById(
            "reportsFinancialRecordsPanel"
          )
          ?.addEventListener(
            "click",
            (event) => {
              const button =
                event.target.closest(
                  "[data-financial-cancel-type]"
                );

              if (button) {
                openFinancialCancelModal(
                  button
                );
              }
            }
          );

        document
          .getElementById(
            "reportsFinancialCancelForm"
          )
          ?.addEventListener(
            "submit",
            submitFinancialCancellation
          );

        document
          .querySelectorAll(
            "[data-financial-cancel-close]"
          )
          .forEach((element) => {
            element.addEventListener(
              "click",
              closeFinancialCancelModal
            );
          });

        document.addEventListener(
          "keydown",
          (event) => {
            const modal =
              getFinancialCancelModal();

            if (
              event.key === "Escape" &&
              modal &&
              !modal.hidden
            ) {
              closeFinancialCancelModal();
            }
          }
        );
      };
// SRMDC_EXPENSE_ENTRY_ADMIN_D1_BEHAVIOR
    const getExpenseModal = () =>
      document.getElementById(
        "reportsExpenseModal"
      );

    const populateExpenseFundOptions = () => {
      const expenseFund =
        document.getElementById(
          "reportsExpenseFund"
        );

      const reportFund =
        document.getElementById(
          "reportsFundFilter"
        );

      if (!expenseFund || !reportFund) {
        return;
      }

      const options =
        Array.from(reportFund.options)
          .filter((option) => option.value)
          .map((option) => ({
            value: option.value,
            label: option.textContent.trim()
          }));

      expenseFund.innerHTML = `
        <option value="">
          Select Fund
        </option>
        ${options
          .map(
            (option) => `
              <option
                value="${escapeHtml(option.value)}"
              >
                ${escapeHtml(option.label)}
              </option>
            `
          )
          .join("")}
      `;
    };

    const openExpenseModal = () => {
      const modal =
        getExpenseModal();

      const form =
        document.getElementById(
          "reportsExpenseForm"
        );

      const dateInput =
        document.getElementById(
          "reportsExpenseDate"
        );

      if (!modal || !form) {
        return;
      }

      form.reset();

      populateExpenseFundOptions();

      if (dateInput) {
        const now = new Date();

        dateInput.value =
          new Date(
            now.getTime() -
            now.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 10);
      }

      modal.hidden = false;

      document.body.classList.add(
        "srmdc-expense-modal-open"
      );

      window.setTimeout(
        () => dateInput?.focus(),
        0
      );
    };

    const closeExpenseModal = () => {
      const modal =
        getExpenseModal();

      if (!modal) {
        return;
      }

      modal.hidden = true;

      document.body.classList.remove(
        "srmdc-expense-modal-open"
      );

      document
        .getElementById(
          "reportsAddExpenseButton"
        )
        ?.focus();
    };


    // SRMDC_EXPENSE_SAVE_DRAFT_D3
    const saveExpenseDraft = async (form) => {
      if (!form) {
        return;
      }

      const saveButton =
        document.getElementById(
          "reportsExpenseSaveButton"
        );

      const expenseDate =
        document.getElementById(
          "reportsExpenseDate"
        )?.value?.trim() || "";

      const fundId =
        document.getElementById(
          "reportsExpenseFund"
        )?.value?.trim() || "";

      const category =
        document.getElementById(
          "reportsExpenseCategory"
        )?.value?.trim() || "";

      const vendorPayee =
        document.getElementById(
          "reportsExpenseVendor"
        )?.value?.trim() || "";

      const description =
        document.getElementById(
          "reportsExpensePurpose"
        )?.value?.trim() || "";

      const amountRaw =
        document.getElementById(
          "reportsExpenseAmount"
        )?.value?.trim() || "";

      const billNumber =
        document.getElementById(
          "reportsExpenseBillNumber"
        )?.value?.trim() || "";

      const billDate =
        document.getElementById(
          "reportsExpenseBillDate"
        )?.value?.trim() || "";

      const notesInput =
        document.getElementById(
          "reportsExpenseNotes"
        )?.value?.trim() || "";

      const amount =
        Number(amountRaw);

      if (!expenseDate) {
        window.alert(
          "Please select the Expense Date."
        );
        return;
      }

      if (!fundId) {
        window.alert(
          "Please select the Fund."
        );
        return;
      }

      if (!category) {
        window.alert(
          "Please select the Category."
        );
        return;
      }

      if (!description) {
        window.alert(
          "Please enter the Purpose / Description."
        );
        return;
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        window.alert(
          "Please enter a valid Amount greater than zero."
        );
        return;
      }

      const noteParts = [];

      if (vendorPayee) {
        noteParts.push(
          `Vendor / Payee: ${vendorPayee}`
        );
      }

      if (notesInput) {
        noteParts.push(notesInput);
      }

      const notes =
        noteParts.length > 0
          ? noteParts.join("\n")
          : null;

      const summaryLines = [
        "Create this expense as a Draft?",
        "",
        `Date: ${expenseDate}`,
        `Category: ${category}`,
        `Amount: ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];

      if (vendorPayee) {
        summaryLines.push(
          `Vendor / Payee: ${vendorPayee}`
        );
      }

      summaryLines.push(
        "",
        "An official expense number will be created.",
        "The Trust balance will NOT change.",
        "Only an actual recorded payment reduces the balance."
      );

      if (
        !window.confirm(
          summaryLines.join("\n")
        )
      ) {
        return;
      }

      const originalText =
        saveButton?.textContent ||
        "Save Draft";

      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent =
          "Saving Draft...";
      }

      try {
        const { data, error } =
          await client.rpc(
            "create_srmdc_expense",
            {
              p_expense_date:
                expenseDate,

              p_fund_id:
                fundId,

              p_vendor_id:
                null,

              p_expense_category:
                category,

              p_description:
                description,

              p_amount:
                amount,

              p_bill_number:
                billNumber || null,

              p_bill_date:
                billDate || null,

              p_notes:
                notes
            }
          );

        if (error) {
          throw error;
        }

        const result =
          Array.isArray(data)
            ? data[0]
            : data;

        const expenseNumber =
          result?.expense_number ||
          "Expense draft";

        closeExpenseModal();

        await loadFinancialRecords();

        window.alert(
          `${expenseNumber} created successfully as Draft.\n\n` +
          "No payment has been recorded.\n" +
          "Available Balance has not changed."
        );
      }
      catch (error) {
        console.error(
          "SRMDC expense draft creation failed:",
          error
        );

        window.alert(
          "Unable to save the expense draft.\n\n" +
          (
            error?.message ||
            "Please try again."
          )
        );
      }
      finally {
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent =
            originalText;
        }
      }
    };
    const wireExpenseEntryUi = () => {
      const addButton =
        document.getElementById(
          "reportsAddExpenseButton"
        );

      const closeButton =
        document.getElementById(
          "reportsExpenseCloseButton"
        );

      const cancelButton =
        document.getElementById(
          "reportsExpenseCancelButton"
        );

      const form =
        document.getElementById(
          "reportsExpenseForm"
        );

      const modal =
        getExpenseModal();

      if (
        !addButton ||
        !form ||
        !modal
      ) {
        return;
      }

      addButton.addEventListener(
        "click",
        openExpenseModal
      );

      closeButton?.addEventListener(
        "click",
        closeExpenseModal
      );

      cancelButton?.addEventListener(
        "click",
        closeExpenseModal
      );

      modal
        .querySelectorAll(
          "[data-expense-modal-close]"
        )
        .forEach((element) => {
          element.addEventListener(
            "click",
            closeExpenseModal
          );
        });

      form.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();

          await saveExpenseDraft(form);
        }
      );

      document.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key === "Escape" &&
            !modal.hidden
          ) {
            closeExpenseModal();
          }
        }
      );
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
            &#128202;
          </span>

          <strong>
            Reports &amp; Analytics
          </strong>

          <span>
            Receipts, expenses, balances
            and live Trust statement
          </span>
        `;

        const trustSettingsCard =
          document.getElementById(
            "trustSettingsCard"
          );

        if (trustSettingsCard) {
          moduleGrid.insertBefore(
            card,
            trustSettingsCard
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

      if (getView()) {
        return;
      }

      const main =
        document.querySelector(
          "main"
        );

      if (!main) {
        throw new Error(
          "Admin main container not found."
        );
      }

      const dates =
        currentFinancialYearDates();

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
              Reports &amp; Analytics
            </h1>

            <p class="muted">
              Live financial position from
              official receipts and actual
              expense payments.
            </p>
          </div>

          <div class="header-actions">

                        <!-- SRMDC_EXPENSE_ENTRY_ADMIN_D1 -->
            <button
              type="button"
              id="reportsAddExpenseButton"
              class="primary-button srmdc-expense-add-button"
            >
              + Add Expense
            </button>
            <!-- SRMDC_FINANCIAL_CANCELLATION_ADMIN_D2C_BUTTON -->
            <button
              type="button"
              id="reportsManageFinancialRecordsButton"
              class="secondary-button"
            >
              Manage Records
            </button>
<button
              type="button"
              id="reportsAnalyticsRefreshButton"
              class="primary-button"
            >
              Refresh
            </button>

            <button
              type="button"
              id="reportsAnalyticsBackButton"
              class="secondary-button"
            >
              Back to Dashboard
            </button>

          </div>

        </header>

        <div class="srmdc-reports-toolbar">

          <label>
            From

            <input
              id="reportsFromDate"
              type="date"
              value="${dates.from}"
            >
          </label>

          <label>
            To

            <input
              id="reportsToDate"
              type="date"
              value="${dates.to}"
            >
          </label>

          <label>
            Fund

            <select id="reportsFundFilter">
              <option value="">
                All Funds
              </option>
            </select>
          </label>

          <div
            class="srmdc-reports-toolbar-actions"
          >

            <button
              type="button"
              id="reportsApplyButton"
              class="primary-button"
            >
              Apply
            </button>

            <button
              type="button"
              id="reportsResetButton"
              class="secondary-button"
            >
              Current FY
            </button>

          </div>

        </div>

        <div
          id="reportsAnalyticsMessage"
          class="srmdc-reports-message"
          aria-live="polite"
        ></div>

        <div class="srmdc-reports-summary">

          <article
            class="srmdc-report-summary-card"
          >
            <span>
              Opening Balance
            </span>

            <strong
              id="reportsOpeningBalance"
            >
              ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹0.00
            </strong>
          </article>

          <article
            class="
              srmdc-report-summary-card
              is-income
            "
          >
            <span>
              Total Receipts
            </span>

            <strong
              id="reportsTotalReceipts"
            >
              ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹0.00
            </strong>

            <small>
              <b id="reportsReceiptCount">
                0
              </b>
              official receipts
            </small>
          </article>

          <article
            class="
              srmdc-report-summary-card
              is-expense
            "
          >
            <span>
              Total Expenses
            </span>

            <strong
              id="reportsTotalExpenses"
            >
              ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹0.00
            </strong>

            <small>
              <b id="reportsExpenseCount">
                0
              </b>
              payments
            </small>
          </article>

          <article
            class="
              srmdc-report-summary-card
              is-balance
            "
          >
            <span>
              Available Balance
            </span>

            <strong
              id="reportsClosingBalance"
            >
              ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹0.00
            </strong>
          </article>

        </div>

        <section
          class="srmdc-reports-block"
        >

          <div
            class="srmdc-reports-block-head"
          >

            <div>
              <p class="eyebrow">
                FUND POSITION
              </p>

              <h2>
                Fund-wise Balance
              </h2>
            </div>

            <span class="muted">
              Lifetime through selected
              To date
            </span>

          </div>

          <div
            id="reportsFundBalances"
            class="srmdc-report-funds"
          ></div>

        </section>

        <section
          class="srmdc-reports-block"
        >

          <div
            class="srmdc-reports-block-head"
          >

            <div>
              <p class="eyebrow">
                LIVE STATEMENT
              </p>

              <h2>
                Receipts &amp; Expenses
              </h2>
            </div>

            <span
              id="reportsGeneratedAt"
              class="muted"
            ></span>

          </div>
          <div
            class="srmdc-statement-controls"
          >

            <div
              class="srmdc-statement-search-wrap"
            >
              <label
                for="reportsStatementSearch"
              >
                Search statement
              </label>

              <input
                id="reportsStatementSearch"
                type="search"
                placeholder="Search donor, vendor, receipt, reference, fund, purpose..."
                autocomplete="off"
              >
            </div>

            <label>
              Type

              <select
                id="reportsStatementTypeFilter"
              >
                <option value="">
                  All Types
                </option>

                <option value="receipt">
                  Receipts
                </option>

                <option value="expense">
                  Expenses
                </option>
              </select>
            </label>

            <label>
              Mode

              <select
                id="reportsStatementModeFilter"
              >
                <option value="">
                  All Modes
                </option>
              </select>
            </label>

            <label>
              Status

              <select
                id="reportsStatementStatusFilter"
              >
                <option value="">
                  All Statuses
                </option>
              </select>
            </label>

            <button
              type="button"
              id="reportsStatementClearFilters"
              class="secondary-button"
            >
              Clear Filters
            </button>

          </div>

          <!-- SRMDC_REPORTS_STAGE_C2_VIEW_CONTROLS -->
          <div
            class="srmdc-statement-view-controls"
            id="reportsStatementViewControls"
          >
            <div
              class="srmdc-statement-view-control"
            >
              <label
                for="reportsStatementViewPreset"
              >
                View
              </label>

              <select
                id="reportsStatementViewPreset"
                aria-label="Statement view preset"
              >
                <option
                  value="standard"
                  selected
                >
                  Standard Statement
                </option>

                <option value="bank_reconciliation">
                  Bank Reconciliation
                </option>

                <option value="donation_register">
                  Donation Register
                </option>

                <option value="expense_register">
                  Expense Register
                </option>

                <option value="fund_ledger">
                  Fund Ledger
                </option>

                <option value="custom">
                  Custom
                </option>
              </select>
            </div>

            <div
              class="srmdc-statement-columns-wrap"
            >
              <span
                class="srmdc-statement-view-label"
              >
                Columns
              </span>

              <button
                type="button"
                id="reportsStatementColumnsButton"
                class="secondary-button srmdc-statement-columns-button"
                aria-haspopup="true"
                aria-expanded="false"
              >
                Customize Columns
              </button>

              <!-- SRMDC_REPORTS_STAGE_C3_3_CUSTOM_COLUMNS_PANEL -->
              <div
                id="reportsStatementColumnsPanel"
                class="srmdc-statement-columns-panel"
                hidden
              >
                <div class="srmdc-statement-columns-panel-head">
                  <strong>Choose columns</strong>

                  <button
                    type="button"
                    id="reportsStatementColumnsClose"
                    class="srmdc-statement-columns-close"
                    aria-label="Close column selector"
                  >
                    &times;
                  </button>
                </div>

                <div
                  id="reportsStatementColumnsList"
                  class="srmdc-statement-columns-list"
                ></div>

                <div class="srmdc-statement-columns-help">
                  Select at least one column.
                </div>
              </div></div>


          </div>
          <div
            id="reportsStatementFilteredSummary"
            class="srmdc-statement-filter-summary"
          >
            <strong>0</strong>
            matching transactions
          </div>

          <div
            class="srmdc-statement-scroll"
          >

            <table
              class="srmdc-statement-table"
            >

              <thead>
                <tr id="reportsStatementHeaderRow">
                  <!-- SRMDC_REPORTS_STAGE_B2_SORTABLE_HEADERS -->
                  <!-- SRMDC_REPORTS_STAGE_C3_1_DYNAMIC_HEADER -->
                </tr>
              </thead>

              <tbody
                id="reportsStatementBody"
              >
                <tr>
                  <td
                    colspan="10"
                    class="srmdc-reports-empty-cell"
                  >
                    Open Reports to load
                    the live statement.
                  </td>
                </tr>
              </tbody>

            </table>
            <!-- SRMDC_REPORTS_STAGE_B2_PAGINATION_UI -->
            <div
              class="srmdc-statement-pagination"
              id="reportsStatementPagination"
            >
              <div
                class="srmdc-statement-page-size"
              >
                <label
                  for="reportsStatementPageSize"
                >
                  Rows per page
                </label>

                <select
                  id="reportsStatementPageSize"
                  aria-label="Rows per page"
                >
                  <option value="25" selected>
                    25
                  </option>
                  <option value="50">
                    50
                  </option>
                  <option value="100">
                    100
                  </option>
                  <option value="all">
                    All
                  </option>
                </select>
              </div>

              <div
                class="srmdc-statement-page-info"
                id="reportsStatementPageInfo"
                aria-live="polite"
              >
                Showing 0 of 0 transactions
              </div>

              <div
                class="srmdc-statement-page-nav"
                id="reportsStatementPageNav"
                aria-label="Statement pagination"
              ></div>
            </div>

          </div>

        </section>

                    <!-- SRMDC_FINANCIAL_CANCELLATION_ADMIN_D2C_UI -->
          <section
            id="reportsFinancialRecordsPanel"
            class="srmdc-financial-records-panel"
            hidden
          >
            <div class="srmdc-financial-records-heading">
              <div>
                <p class="eyebrow">
                  FINANCIAL CONTROL
                </p>

                <h3>Financial Records</h3>

                <p class="muted">
                  Cancel duplicate, test or incorrect records without deleting Trust history.
                </p>
              </div>

              <div class="srmdc-financial-records-actions">
                <button
                  type="button"
                  id="reportsFinancialRecordsRefresh"
                  class="secondary-button"
                >
                  Refresh
                </button>

                <button
                  type="button"
                  id="reportsFinancialRecordsClose"
                  class="secondary-button"
                >
                  Close
                </button>
              </div>
            </div>

            <p
              id="reportsFinancialRecordsMessage"
              class="srmdc-financial-records-message"
            ></p>

            <div class="srmdc-financial-record-group">
              <h4>Expenses</h4>

              <p class="muted">
                Draft and Approved unpaid expenses may be cancelled. Paid or partially paid expenses are protected.
              </p>

              <div class="srmdc-report-table-wrap">
                <table class="srmdc-report-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Expense No.</th>
                      <th>Particulars</th>
                      <th>Fund</th>
                      <th>Amount</th>
                      <th>Amount Paid</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody id="reportsExpenseRecordsBody">
                    <tr>
                      <td colspan="8">
                        Loading is available through Manage Records.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="srmdc-financial-record-group">
              <h4>Donations &amp; Receipts</h4>

              <p class="muted">
                Cancelling a donation also voids its active official receipt. Receipt numbers are never reused.
              </p>

              <div class="srmdc-report-table-wrap">
                <table class="srmdc-report-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Receipt / Reference</th>
                      <th>Type</th>
                      <th>Fund</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody id="reportsDonationRecordsBody">
                    <tr>
                      <td colspan="7">
                        Loading is available through Manage Records.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- SRMDC_FINANCIAL_CANCELLATION_ADMIN_D2C_MODAL -->
          <div
            id="reportsFinancialCancelModal"
            class="srmdc-financial-cancel-modal"
            hidden
          >
            <div
              class="srmdc-financial-cancel-backdrop"
              data-financial-cancel-close
            ></div>

            <div
              class="srmdc-financial-cancel-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reportsFinancialCancelTitle"
            >
              <header class="srmdc-financial-cancel-header">
                <div>
                  <p class="eyebrow">
                    SRMDC TRUST
                  </p>

                  <h2 id="reportsFinancialCancelTitle">
                    Cancel Financial Record
                  </h2>

                  <p>
                    <strong id="reportsFinancialCancelReference">
                      Selected record
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  class="srmdc-expense-close-button"
                  data-financial-cancel-close
                  aria-label="Close"
                >
                  &times;
                </button>
              </header>

              <form
                id="reportsFinancialCancelForm"
                novalidate
              >
                <div class="srmdc-financial-cancel-warning">
                  <strong>Important</strong>

                  <p id="reportsFinancialCancelWarning"></p>
                </div>

                <label>
                  Cancellation Reason

                  <select
                    id="reportsFinancialCancelReason"
                    required
                  >
                    <option value="">
                      Select reason
                    </option>

                    <option value="Duplicate">
                      Duplicate
                    </option>

                    <option value="Test Entry">
                      Test Entry
                    </option>

                    <option value="Incorrect Entry">
                      Incorrect Entry
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </label>

                <label>
                  Details

                  <textarea
                    id="reportsFinancialCancelDetails"
                    rows="3"
                    placeholder="Optional for standard reasons; required for Other."
                  ></textarea>
                </label>

                <footer class="srmdc-financial-cancel-footer">
                  <button
                    type="button"
                    class="secondary-button"
                    data-financial-cancel-close
                  >
                    Keep Record
                  </button>

                  <button
                    type="submit"
                    id="reportsFinancialCancelSubmit"
                    class="srmdc-danger-button"
                  >
                    Confirm Cancellation
                  </button>
                </footer>
              </form>
            </div>
          </div>
<!-- SRMDC_EXPENSE_ENTRY_ADMIN_D1_MODAL -->
          <div
            id="reportsExpenseModal"
            class="srmdc-expense-modal"
            hidden
          >
            <div
              class="srmdc-expense-modal-backdrop"
              data-expense-modal-close
            ></div>

            <section
              class="srmdc-expense-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reportsExpenseModalTitle"
            >
              <header class="srmdc-expense-dialog-header">

                <div>
                  <p class="eyebrow">
                    SRMDC TRUST
                  </p>

                  <h2 id="reportsExpenseModalTitle">
                    Add Expense
                  </h2>

                  <p class="muted">
                    Prepare a Trust expense draft.
                  </p>
                </div>

                <button
                  type="button"
                  id="reportsExpenseCloseButton"
                  class="srmdc-expense-close-button"
                  aria-label="Close Add Expense"
                >
                  &times;
                </button>

              </header>

              <div class="srmdc-expense-stage-banner">
                <strong>
                  Draft preparation only
                </strong>

                <span>
                  No expense number or accounting entry
                  is created from this screen yet.
                </span>
              </div>

              <form
                id="reportsExpenseForm"
                class="srmdc-expense-form"
                novalidate
              >

                <div class="srmdc-expense-section">

                  <div class="srmdc-expense-section-heading">
                    <div>
                      <h3>Expense Details</h3>

                      <p>
                        Enter the bill or expenditure
                        information.
                      </p>
                    </div>
                  </div>

                  <div class="srmdc-expense-form-grid">

                    <label>
                      <span>
                        Expense Date
                        <strong>*</strong>
                      </span>

                      <input
                        id="reportsExpenseDate"
                        name="expense_date"
                        type="date"
                        required
                      >
                    </label>

                    <label>
                      <span>
                        Fund
                        <strong>*</strong>
                      </span>

                      <select
                        id="reportsExpenseFund"
                        name="fund_id"
                        required
                      >
                        <option value="">
                          Select Fund
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>Category</span>

                      <select
                        id="reportsExpenseCategory"
                        name="category"
                      >
                        <option value="">
                          Select Category
                        </option>

                        <option value="temple_materials">
                          Temple Materials
                        </option>

                        <option value="construction">
                          Construction
                        </option>

                        <option value="religious_activity">
                          Religious Activity
                        </option>

                        <option value="charitable_activity">
                          Charitable Activity
                        </option>

                        <option value="utilities">
                          Utilities
                        </option>

                        <option value="maintenance">
                          Maintenance
                        </option>

                        <option value="professional_fees">
                          Professional Fees
                        </option>

                        <option value="administration">
                          Administration
                        </option>

                        <option value="travel">
                          Travel
                        </option>

                        <option value="other">
                          Other
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>Vendor / Payee</span>

                      <input
                        id="reportsExpensePayee"
                        name="payee"
                        type="text"
                        maxlength="150"
                        placeholder="Name of vendor or payee"
                      >
                    </label>

                    <label class="srmdc-expense-field-wide">
                      <span>
                        Purpose / Description
                        <strong>*</strong>
                      </span>

                      <textarea
                        id="reportsExpensePurpose"
                        name="purpose"
                        rows="3"
                        maxlength="500"
                        required
                        placeholder="What was this expense for?"
                      ></textarea>
                    </label>

                    <label>
                      <span>
                        Amount
                        <strong>*</strong>
                      </span>

                      <div class="srmdc-expense-amount-field">
                        <span>&#8377;</span>

                        <input
                          id="reportsExpenseAmount"
                          name="amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          inputmode="decimal"
                          placeholder="0.00"
                          required
                        >
                      </div>
                    </label>

                    <label>
                      <span>Bill / Invoice Number</span>

                      <input
                        id="reportsExpenseBillNumber"
                        name="bill_number"
                        type="text"
                        maxlength="100"
                        placeholder="Optional"
                      >
                    </label>

                    <label>
                      <span>Bill Date</span>

                      <input
                        id="reportsExpenseBillDate"
                        name="bill_date"
                        type="date"
                      >
                    </label>

                    <label class="srmdc-expense-field-wide">
                      <span>Notes</span>

                      <textarea
                        id="reportsExpenseNotes"
                        name="notes"
                        rows="2"
                        maxlength="500"
                        placeholder="Optional internal notes"
                      ></textarea>
                    </label>

                  </div>
                </div>

                <div class="srmdc-expense-section">

                  <div class="srmdc-expense-section-heading">

                    <div>
                      <h3>Payment</h3>

                      <p>
                        Payment is recorded separately
                        after approval.
                      </p>
                    </div>

                    <span class="srmdc-expense-status-chip">
                      Not Paid
                    </span>

                  </div>

                  <div class="srmdc-expense-payment-note">

                    <strong>
                      Available Balance will not change now.
                    </strong>

                    <span>
                      Only an actual recorded payment will
                      reduce the Trust balance and appear as
                      Expense (-) in the Live Statement.
                    </span>

                  </div>
                </div>

                <div
                  id="reportsExpenseUiMessage"
                  class="srmdc-expense-ui-message"
                  aria-live="polite"
                ></div>

                <footer class="srmdc-expense-dialog-actions">

                  <button
                    type="button"
                    id="reportsExpenseCancelButton"
                    class="secondary-button"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    id="reportsExpenseSaveButton"
                    class="primary-button"

                    title="Create this expense as a Draft"
                  >
                    Save Draft
                  </button>

                </footer>

              </form>
            </section>
          </div>
      `;

      main.appendChild(
        section
      );

      document
        .getElementById(
          "reportsAnalyticsBackButton"
        )
        ?.addEventListener(
          "click",
          showDashboardView
        );

      document
        .getElementById(
          "reportsAnalyticsRefreshButton"
        )
        ?.addEventListener(
          "click",
          loadReport
        );

      document
        .getElementById(
          "reportsApplyButton"
        )
        ?.addEventListener(
          "click",
          loadReport
        );

      document
        .getElementById(
          "reportsResetButton"
        )
        ?.addEventListener(
          "click",
          resetFilters
        );
      document
        .getElementById(
          "reportsStatementSearch"
        )
        ?.addEventListener(
          "input",
          (event) => {
            statementFilters.search =
              event.target.value;

            applyStatementFilters();
          }
        );

      document
        .getElementById(
          "reportsStatementTypeFilter"
        )
        ?.addEventListener(
          "change",
          (event) => {
            statementFilters.type =
              event.target.value;

            applyStatementFilters();
          }
        );

      document
        .getElementById(
          "reportsStatementModeFilter"
        )
        ?.addEventListener(
          "change",
          (event) => {
            statementFilters.mode =
              event.target.value;

            applyStatementFilters();
          }
        );

      document
        .getElementById(
          "reportsStatementStatusFilter"
        )
        ?.addEventListener(
          "change",
          (event) => {
            statementFilters.status =
              event.target.value;

            applyStatementFilters();
          }
        );

      document
        .getElementById(
          "reportsStatementClearFilters"
        )
        ?.addEventListener(
          "click",
          clearStatementFilters
        );
      wireStatementFilterPageReset();
      wireStatementViewPresetEvents();
      wireStatementCustomColumnEvents();
      wireExpenseEntryUi();
            document.addEventListener(
        "click",
        async (event) => {
          const approveButton =
            event.target.closest(
              "[data-expense-approve-id]"
            );

          if (!approveButton) {
            return;
          }

          event.preventDefault();

          await approveExpenseFromFinancialRecords(
            approveButton
          );
        }
      );

      wireFinancialViewEditUi();
    wireFinancialRestoreUi();
      wireFinancialCancellationUi();
      wireStatementInteractiveEvents();
    };

    const init = () => {
      buildUi();
    };

    return Object.freeze({
      init,
      open,
      reload: loadReport
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

  // SRMDC_REPORTS_ANALYTICS_ADMIN_INIT_V1
  srmdcReportsAnalyticsAdmin.init();

  initialize();

})();










