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
})();