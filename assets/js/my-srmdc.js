"use strict";

/* =========================================================
   SRMDC MY ACCOUNT V1
   ========================================================= */

(() => {

  const config =
    window.SRMDC_SUPABASE_CONFIG;

  const loading =
    document.getElementById("srmdcAuthLoading");

  const guest =
    document.getElementById("srmdcGuestAccount");

  const dashboard =
    document.getElementById("srmdcMemberDashboard");

  const accountNav =
    document.getElementById("srmdcAccountNav");


  if (
    !config ||
    !config.url ||
    !config.publishableKey ||
    !window.supabase
  ) {

    if (loading) {
      loading.innerHTML =
        "<p>My SRMDC is temporarily unavailable. " +
        "The public website and donation services remain available.</p>";
    }

    return;
  }


  const client =
    window.supabase.createClient(
      config.url,
      config.publishableKey,
      {
        auth: {
          storageKey: "srmdc-public-donor-auth",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );


  function show(element) {
    if (element) {
      element.hidden = false;
    }
  }


  function hide(element) {
    if (element) {
      element.hidden = true;
    }
  }


  function setText(id, value) {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        value == null
          ? ""
          : String(value);
    }
  }


  function escapeHtml(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function money(value) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
      }
    ).format(
      Number(value || 0)
    );
  }


  function setMessage(
    element,
    message,
    type
  ) {

    if (!element) return;

    element.textContent =
      message || "";

    element.classList.remove(
      "error",
      "success"
    );

    if (type) {
      element.classList.add(type);
    }
  }


  function buildVerificationUrl(item) {

    if (
      !item.receipt_number ||
      !item.verification_token
    ) {
      return "";
    }

    const params =
      new URLSearchParams({
        receipt:
          item.receipt_number,

        id:
          item.verification_token
      });

    return (
      "https://srmdctrust.org/?" +
      params.toString() +
      "#verify"
    );
  }


  function showGuest() {

    hide(loading);
    hide(dashboard);
    show(guest);

    if (accountNav) {
      accountNav.textContent =
        "Login / Sign Up";
    }
  }


  function showMember() {

    hide(loading);
    hide(guest);
    show(dashboard);

    if (accountNav) {
      accountNav.textContent =
        "My SRMDC";
    }
  }


  async function ensureProfile(user) {

    const {
      data,
      error
    } =
      await client
        .from("donor_accounts")
        .select(
          "display_name, mobile, address, pan_or_id, member_id, username"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();


    if (error) {
      throw error;
    }


    if (data) {
      return data;
    }


    const metadataName =
      String(
        user.user_metadata?.display_name ||
        ""
      ).trim();


    if (!metadataName) {
      return null;
    }


    const metadataMobile =
      String(
        user.user_metadata?.mobile ||
        ""
      ).trim();


    const profile = {
      user_id:
        user.id,

      display_name:
        metadataName,

      mobile:
        metadataMobile || null
    };


    const {
      data: created,
      error: createError
    } =
      await client
        .from("donor_accounts")
        .insert(profile)
        .select(
          "display_name, mobile, address, pan_or_id, member_id, username"
        )
        .single();


    if (createError) {
      throw createError;
    }


    return created;
  }


  // SRMDC_EDIT_PROFILE_V1
  async function loadProfile(user) {

    const profile =
      await ensureProfile(user);


    const name =
      profile?.display_name ||
      user.user_metadata?.display_name ||
      "SRMDC Donor";


    setText(
      "srmdcMemberName",
      name
    );

    setText(
      "srmdcMemberEmail",
      user.email || ""
    );


    const container =
      document.getElementById(
        "srmdcProfileDetails"
      );


    if (!container) return;


    container.innerHTML = `
      <div id="srmdcProfileView">
        <p>
          <strong>Name:</strong>
          ${escapeHtml(name)}
        </p>

        <p>
          <strong>Email:</strong>
          ${escapeHtml(user.email || "—")}
        </p>

        <!-- SRMDC_MEMBER_IDENTITY_UI_V1_1 -->
        <p>
          <strong>Member ID:</strong>
          ${escapeHtml(profile?.member_id || "Pending")}
        </p>

        <p>
          <strong>Username:</strong>
          ${
            profile?.username
              ? escapeHtml(profile.username)
              : "Not set"
          }
        </p>

        <p>
          <strong>Mobile:</strong>
          ${escapeHtml(profile?.mobile || "—")}
        </p>

        <p>
          <strong>Address:</strong>
          ${escapeHtml(profile?.address || "—")}
        </p>

        <p>
          <strong>PAN / ID:</strong>
          ${
            profile?.pan_or_id
              ? "Saved securely"
              : "Not provided"
          }
        </p>

        <button
          type="button"
          class="btn btn-outline"
          id="srmdcEditProfileButton"
        >
          Edit Profile
        </button>
      </div>

      <form
        id="srmdcEditProfileForm"
        hidden
      >
        <div class="form-group">
          <label for="srmdcEditDisplayName">
            Full Name
          </label>

          <input
            id="srmdcEditDisplayName"
            type="text"
            maxlength="120"
            autocomplete="name"
            required
          >
        </div>

        <div class="form-group">
          <label for="srmdcEditEmail">
            Email
          </label>

          <input
            id="srmdcEditEmail"
            type="email"
            readonly
          >

          <small>
            Email is managed through your login account.
          </small>
        </div>

        <div class="form-group">
          <label for="srmdcEditUsername">
            Username
          </label>

          <input
            id="srmdcEditUsername"
            type="text"
            minlength="4"
            maxlength="40"
            pattern="[A-Za-z][A-Za-z0-9._]{3,39}"
            autocomplete="username"
            placeholder="Example: abhimanyu.k"
          >

          <small>
            Optional. 4–40 characters. Start with a letter.
            Use letters, numbers, dot or underscore.
          </small>
        </div>

        <div class="form-group">
          <label for="srmdcEditMobile">
            Mobile Number
          </label>

          <input
            id="srmdcEditMobile"
            type="tel"
            maxlength="15"
            inputmode="numeric"
            autocomplete="tel"
          >
        </div>

        <div class="form-group">
          <label for="srmdcEditAddress">
            Address
          </label>

          <textarea
            id="srmdcEditAddress"
            rows="4"
            maxlength="500"
            autocomplete="street-address"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="srmdcEditPan">
            PAN / ID
            <span>(Optional)</span>
          </label>

          <input
            id="srmdcEditPan"
            type="text"
            maxlength="50"
            autocomplete="off"
          >

          <small>
            Leave blank if you do not wish to provide it.
          </small>
        </div>

        <div
          id="srmdcProfileMessage"
          role="status"
          aria-live="polite"
        ></div>

        <div class="srmdc-profile-actions">
          <button
            type="submit"
            class="btn btn-primary"
            id="srmdcSaveProfileButton"
          >
            Save Changes
          </button>

          <button
            type="button"
            class="btn btn-outline"
            id="srmdcCancelProfileButton"
          >
            Cancel
          </button>
        </div>
      </form>

      <!-- SRMDC_PROFILE_LINKING_UI_V1 -->
      <section
        id="srmdcProfileLinking"
        style="margin-top:24px;"
      >
        <hr>

        <h4>
          Link Previous Donation
        </h4>

        <p>
          Have you donated to SRMDC Trust before?
          You can request secure access to your previous
          donation history after ownership verification.
        </p>

        <div
          id="srmdcLinkRequestStatus"
          role="status"
          aria-live="polite"
        ></div>

        <div
          id="srmdcLinkChoiceActions"
          class="srmdc-profile-actions"
        >
          <button
            type="button"
            class="btn btn-primary"
            id="srmdcShowReceiptLinkButton"
          >
            I Have Receipt Details
          </button>

          <button
            type="button"
            class="btn btn-outline"
            id="srmdcShowManualLinkButton"
          >
            I Can't Find My Receipt
          </button>
        </div>

        <form
          id="srmdcReceiptLinkForm"
          hidden
          style="margin-top:18px;"
        >
          <div class="form-group">
            <label for="srmdcLinkReceiptNumber">
              Receipt Number
            </label>

            <input
              id="srmdcLinkReceiptNumber"
              type="text"
              maxlength="40"
              autocomplete="off"
              placeholder="SRMDC/2026-27/000004"
              required
            >
          </div>

          <div class="form-group">
            <label for="srmdcLinkVerificationId">
              Verification ID
            </label>

            <input
              id="srmdcLinkVerificationId"
              type="text"
              maxlength="40"
              autocomplete="off"
              spellcheck="false"
              placeholder="Verification ID from your receipt"
              required
            >

            <small>
              Both details must match an active official SRMDC receipt.
            </small>
          </div>

          <div
            id="srmdcReceiptLinkMessage"
            role="status"
            aria-live="polite"
          ></div>

          <div class="srmdc-profile-actions">
            <button
              type="submit"
              class="btn btn-primary"
              id="srmdcSubmitReceiptLinkButton"
            >
              Submit for Verification
            </button>

            <button
              type="button"
              class="btn btn-outline"
              data-srmdc-link-cancel
            >
              Cancel
            </button>
          </div>
        </form>

        <form
          id="srmdcManualLinkForm"
          hidden
          style="margin-top:18px;"
        >
          <p>
            If you do not have your old receipt details,
            provide supporting information below.
            SRMDC administration will review it manually.
          </p>

          <div class="form-group">
            <label for="srmdcLinkClaimedName">
              Name Used for Previous Donation
            </label>

            <input
              id="srmdcLinkClaimedName"
              type="text"
              maxlength="150"
              autocomplete="name"
              required
            >
          </div>

          <div class="form-group">
            <label for="srmdcLinkClaimedMobile">
              Previous Mobile
              <span>(Optional)</span>
            </label>

            <input
              id="srmdcLinkClaimedMobile"
              type="tel"
              maxlength="30"
              autocomplete="off"
            >
          </div>

          <div class="form-group">
            <label for="srmdcLinkClaimedEmail">
              Previous Email
              <span>(Optional)</span>
            </label>

            <input
              id="srmdcLinkClaimedEmail"
              type="email"
              maxlength="254"
              autocomplete="off"
            >
          </div>

          <div class="form-group">
            <label for="srmdcLinkClaimedPan">
              PAN / ID
              <span>(Optional)</span>
            </label>

            <input
              id="srmdcLinkClaimedPan"
              type="text"
              maxlength="100"
              autocomplete="off"
            >
          </div>

          <div class="form-group">
            <label for="srmdcLinkClaimedAddress">
              Previous Address
              <span>(Optional)</span>
            </label>

            <textarea
              id="srmdcLinkClaimedAddress"
              rows="3"
              maxlength="1000"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="srmdcLinkMemberNote">
              Additional Information
              <span>(Optional)</span>
            </label>

            <textarea
              id="srmdcLinkMemberNote"
              rows="3"
              maxlength="1000"
              placeholder="Any information that may help us identify your previous donation."
            ></textarea>
          </div>

          <div
            id="srmdcManualLinkMessage"
            role="status"
            aria-live="polite"
          ></div>

          <div class="srmdc-profile-actions">
            <button
              type="submit"
              class="btn btn-primary"
              id="srmdcSubmitManualLinkButton"
            >
              Request Manual Verification
            </button>

            <button
              type="button"
              class="btn btn-outline"
              data-srmdc-link-cancel
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    `;


    const view =
      document.getElementById(
        "srmdcProfileView"
      );

    const form =
      document.getElementById(
        "srmdcEditProfileForm"
      );

    const editButton =
      document.getElementById(
        "srmdcEditProfileButton"
      );

    const cancelButton =
      document.getElementById(
        "srmdcCancelProfileButton"
      );

    const saveButton =
      document.getElementById(
        "srmdcSaveProfileButton"
      );

    const message =
      document.getElementById(
        "srmdcProfileMessage"
      );

    const nameInput =
      document.getElementById(
        "srmdcEditDisplayName"
      );

    const emailInput =
      document.getElementById(
        "srmdcEditEmail"
      );

    const usernameInput =
      document.getElementById(
        "srmdcEditUsername"
      );

    const mobileInput =
      document.getElementById(
        "srmdcEditMobile"
      );

    const addressInput =
      document.getElementById(
        "srmdcEditAddress"
      );

    const panInput =
      document.getElementById(
        "srmdcEditPan"
      );


    if (
      !view ||
      !form ||
      !editButton ||
      !cancelButton ||
      !saveButton ||
      !message ||
      !nameInput ||
      !emailInput ||
      !usernameInput ||
      !mobileInput ||
      !addressInput ||
      !panInput
    ) {
      return;
    }


    function populateProfileForm() {

      nameInput.value =
        profile?.display_name ||
        name ||
        "";

      emailInput.value =
        user.email || "";

      usernameInput.value =
        profile?.username || "";

      mobileInput.value =
        profile?.mobile || "";

      addressInput.value =
        profile?.address || "";

      panInput.value =
        profile?.pan_or_id || "";

      message.textContent = "";
    }


    editButton.addEventListener(
      "click",
      function () {

        populateProfileForm();

        view.hidden = true;
        form.hidden = false;

        nameInput.focus();
      }
    );


    cancelButton.addEventListener(
      "click",
      function () {

        form.hidden = true;
        view.hidden = false;

        message.textContent = "";
      }
    );


    form.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        const displayName =
          String(nameInput.value || "")
            .trim();

        const username =
          String(usernameInput.value || "")
            .trim()
            .toLowerCase();

        const mobile =
          String(mobileInput.value || "")
            .replace(/\s+/g, "")
            .trim();

        const address =
          String(addressInput.value || "")
            .trim();

        const panOrId =
          String(panInput.value || "")
            .trim();


        if (!displayName) {

          message.textContent =
            "Please enter your full name.";

          nameInput.focus();
          return;
        }


        if (
          username &&
          !/^[a-z][a-z0-9._]{3,39}$/.test(username)
        ) {

          message.textContent =
            "Username must be 4–40 characters, start with a letter, and use only letters, numbers, dot or underscore.";

          usernameInput.focus();
          return;
        }


        if (
          mobile &&
          !/^[0-9]{10,15}$/.test(mobile)
        ) {

          message.textContent =
            "Please enter a valid mobile number using 10 to 15 digits.";

          mobileInput.focus();
          return;
        }


        saveButton.disabled = true;

        message.textContent =
          "Saving profile...";


        try {

          const {
            error: updateError
          } =
            await client
              .from("donor_accounts")
              .update({
                display_name:
                  displayName,

                username:
                  username || null,

                mobile:
                  mobile || null,

                address:
                  address || null,

                pan_or_id:
                  panOrId || null
              })
              .eq(
                "user_id",
                user.id
              );


          if (updateError) {
            throw updateError;
          }


          message.textContent =
            "Profile updated successfully.";


          await loadProfile(user);

        }
        catch (error) {

          console.error(
            "My SRMDC profile update failed:",
            error
          );

          message.textContent =
            "Unable to update your profile right now.";

          saveButton.disabled = false;
        }
      }
    );
  }

  // =========================================================
  // SRMDC_PROFILE_LINKING_UI_V1
  // PREVIOUS DONATION OWNERSHIP VERIFICATION
  // =========================================================

  function setSrmdcLinkMessage(
    element,
    message,
    type
  ) {

    if (!element) return;

    element.textContent =
      message || "";

    element.dataset.state =
      type || "";
  }


  function closeSrmdcLinkForms() {

    const receiptForm =
      document.getElementById(
        "srmdcReceiptLinkForm"
      );

    const manualForm =
      document.getElementById(
        "srmdcManualLinkForm"
      );


    if (receiptForm) {
      receiptForm.hidden = true;
    }

    if (manualForm) {
      manualForm.hidden = true;
    }
  }


  function renderSrmdcLinkRequests(items) {

    const status =
      document.getElementById(
        "srmdcLinkRequestStatus"
      );


    if (!status) return;


    const requests =
      Array.isArray(items)
        ? items
        : [];


    const pending =
      requests.filter(
        (item) =>
          item.request_status === "pending"
      );


    if (pending.length) {

      const latest =
        pending[0];

      const description =
        latest.request_type === "receipt_proof"
          ? (
              "Receipt verification request" +
              (
                latest.receipt_number
                  ? " for " + latest.receipt_number
                  : ""
              )
            )
          : "Manual verification request";


      status.innerHTML = `
        <div class="srmdc-empty-state">
          <strong>
            Verification Pending
          </strong>

          <p>
            ${escapeHtml(description)}
            has been submitted to SRMDC administration.
          </p>

          <p>
            Your existing account and donation history
            will not be changed until the request is approved.
          </p>
        </div>
      `;

      return;
    }


    const latestReviewed =
      requests.find(
        (item) =>
          item.request_status === "approved" ||
          item.request_status === "rejected"
      );


    if (
      latestReviewed &&
      latestReviewed.request_status === "approved"
    ) {

      status.innerHTML = `
        <div class="srmdc-empty-state">
          <strong>
            Previous Donation Link Approved
          </strong>

          <p>
            Your verified donation history is now
            connected to this My SRMDC account.
          </p>
        </div>
      `;

      return;
    }


    if (
      latestReviewed &&
      latestReviewed.request_status === "rejected"
    ) {

      const note =
        latestReviewed.admin_note
          ? `
              <p>
                Admin note:
                ${escapeHtml(
                  latestReviewed.admin_note
                )}
              </p>
            `
          : "";


      status.innerHTML = `
        <div class="srmdc-empty-state">
          <strong>
            Previous Request Was Not Approved
          </strong>

          ${note}

          <p>
            You may submit a new request with
            corrected ownership information.
          </p>
        </div>
      `;

      return;
    }


    status.innerHTML = "";
  }


  async function loadLinkRequests() {

    const {
      data,
      error
    } =
      await client.rpc(
        "get_my_srmdc_link_requests"
      );


    if (error) {
      throw error;
    }


    renderSrmdcLinkRequests(
      Array.isArray(data)
        ? data
        : []
    );
  }


  document.addEventListener(
    "click",
    function (event) {

      const receiptButton =
        event.target.closest(
          "#srmdcShowReceiptLinkButton"
        );

      const manualButton =
        event.target.closest(
          "#srmdcShowManualLinkButton"
        );

      const cancelButton =
        event.target.closest(
          "[data-srmdc-link-cancel]"
        );


      if (receiptButton) {

        closeSrmdcLinkForms();

        const form =
          document.getElementById(
            "srmdcReceiptLinkForm"
          );

        if (form) {
          form.hidden = false;

          document
            .getElementById(
              "srmdcLinkReceiptNumber"
            )
            ?.focus();
        }

        return;
      }


      if (manualButton) {

        closeSrmdcLinkForms();

        const form =
          document.getElementById(
            "srmdcManualLinkForm"
          );

        if (form) {

          form.hidden = false;

          const claimedName =
            document.getElementById(
              "srmdcLinkClaimedName"
            );

          const currentName =
            document.getElementById(
              "srmdcEditDisplayName"
            );


          if (
            claimedName &&
            !claimedName.value &&
            currentName
          ) {
            claimedName.value =
              currentName.value || "";
          }


          claimedName?.focus();
        }

        return;
      }


      if (cancelButton) {
        closeSrmdcLinkForms();
      }
    }
  );


  document.addEventListener(
    "submit",
    async function (event) {

      if (
        event.target?.id ===
        "srmdcReceiptLinkForm"
      ) {

        event.preventDefault();


        const form =
          event.target;

        const receiptInput =
          document.getElementById(
            "srmdcLinkReceiptNumber"
          );

        const verificationInput =
          document.getElementById(
            "srmdcLinkVerificationId"
          );

        const message =
          document.getElementById(
            "srmdcReceiptLinkMessage"
          );

        const button =
          document.getElementById(
            "srmdcSubmitReceiptLinkButton"
          );


        const receiptNumber =
          String(
            receiptInput?.value || ""
          ).trim();

        const verificationToken =
          String(
            verificationInput?.value || ""
          )
            .trim()
            .toUpperCase();


        if (
          !receiptNumber ||
          !verificationToken
        ) {

          setSrmdcLinkMessage(
            message,
            "Please enter both Receipt Number and Verification ID.",
            "error"
          );

          return;
        }


        if (button) {
          button.disabled = true;
        }


        setSrmdcLinkMessage(
          message,
          "Submitting verification request...",
          "pending"
        );


        try {

          const {
            error
          } =
            await client.rpc(
              "request_srmdc_receipt_link",
              {
                p_receipt_number:
                  receiptNumber,

                p_verification_token:
                  verificationToken
              }
            );


          if (error) {
            throw error;
          }


          form.reset();
          form.hidden = true;


          setSrmdcLinkMessage(
            message,
            "",
            ""
          );


          await loadLinkRequests();


          const status =
            document.getElementById(
              "srmdcLinkRequestStatus"
            );


          status?.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        }
        catch (error) {

          console.error(
            "My SRMDC receipt link request failed:",
            error
          );


          setSrmdcLinkMessage(
            message,
            error?.message ||
              "Unable to submit the verification request right now.",
            "error"
          );
        }
        finally {

          if (button) {
            button.disabled = false;
          }
        }


        return;
      }


      if (
        event.target?.id ===
        "srmdcManualLinkForm"
      ) {

        event.preventDefault();


        const form =
          event.target;

        const message =
          document.getElementById(
            "srmdcManualLinkMessage"
          );

        const button =
          document.getElementById(
            "srmdcSubmitManualLinkButton"
          );


        const valueOf =
          (id) =>
            String(
              document.getElementById(id)
                ?.value || ""
            ).trim();


        const claimedName =
          valueOf(
            "srmdcLinkClaimedName"
          );

        const claimedMobile =
          valueOf(
            "srmdcLinkClaimedMobile"
          );

        const claimedEmail =
          valueOf(
            "srmdcLinkClaimedEmail"
          );

        const claimedPan =
          valueOf(
            "srmdcLinkClaimedPan"
          );

        const claimedAddress =
          valueOf(
            "srmdcLinkClaimedAddress"
          );

        const memberNote =
          valueOf(
            "srmdcLinkMemberNote"
          );


        if (!claimedName) {

          setSrmdcLinkMessage(
            message,
            "Please enter the name used for the previous donation.",
            "error"
          );

          return;
        }


        if (
          !claimedMobile &&
          !claimedEmail &&
          !claimedPan &&
          !claimedAddress &&
          !memberNote
        ) {

          setSrmdcLinkMessage(
            message,
            "Please provide at least one additional detail for verification.",
            "error"
          );

          return;
        }


        if (button) {
          button.disabled = true;
        }


        setSrmdcLinkMessage(
          message,
          "Submitting manual verification request...",
          "pending"
        );


        try {

          const {
            error
          } =
            await client.rpc(
              "request_srmdc_manual_donor_link",
              {
                p_claimed_name:
                  claimedName,

                p_claimed_mobile:
                  claimedMobile || null,

                p_claimed_email:
                  claimedEmail || null,

                p_claimed_pan_or_id:
                  claimedPan || null,

                p_claimed_address:
                  claimedAddress || null,

                p_member_note:
                  memberNote || null
              }
            );


          if (error) {
            throw error;
          }


          form.reset();
          form.hidden = true;


          setSrmdcLinkMessage(
            message,
            "",
            ""
          );


          await loadLinkRequests();


          const status =
            document.getElementById(
              "srmdcLinkRequestStatus"
            );


          status?.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        }
        catch (error) {

          console.error(
            "My SRMDC manual link request failed:",
            error
          );


          setSrmdcLinkMessage(
            message,
            error?.message ||
              "Unable to submit the manual verification request right now.",
            "error"
          );
        }
        finally {

          if (button) {
            button.disabled = false;
          }
        }
      }
    }
  );

  // SRMDC_MY_RECEIPT_UI_V1_2
  async function openMyOfficialReceipt(receiptId) {
    if (!receiptId) {
      window.alert(
        "Official receipt details are not available."
      );
      return;
    }

    if (
      !window.SRMDC_MY_RECEIPTS ||
      typeof window.SRMDC_MY_RECEIPTS.openExisting !==
        "function"
    ) {
      window.alert(
        "Receipt viewer is not available. Please refresh and try again."
      );
      return;
    }

    const {
      data,
      error
    } =
      await client.rpc(
        "get_my_srmdc_receipt",
        {
          p_receipt_id: receiptId
        }
      );

    if (error) {
      console.error(
        "Unable to load official receipt.",
        error
      );

      window.alert(
        "Unable to load the official receipt. Please try again."
      );
      return;
    }

    const receipt =
      Array.isArray(data)
        ? data[0]
        : data;

    if (
      !receipt ||
      !receipt.receipt_number ||
      !receipt.verification_token
    ) {
      window.alert(
        "This receipt is not available for your My SRMDC account."
      );
      return;
    }

    const verificationUrl =
      buildVerificationUrl({
        receipt_number:
          receipt.receipt_number,

        verification_token:
          receipt.verification_token
      });

    const result = {
      receipt_number:
        receipt.receipt_number,

      verification_token:
        receipt.verification_token,

      receipt_date:
        receipt.receipt_issued_at ||
        receipt.payment_date ||
        receipt.donation_date,

      amount:
        receipt.paid_amount ??
        receipt.declared_amount ??
        receipt.donation_amount
    };

    const submission = {
      donor_name:
        receipt.donor_name || "",

      mobile:
        receipt.donor_mobile || "",

      email:
        receipt.donor_email || "",

      address:
        receipt.donor_address || "",

      pan_or_id:
        receipt.donor_pan_or_id || "",

      fund_name:
        receipt.fund_name || "",

      donation_purpose:
        receipt.donation_purpose ||
        receipt.donation_type ||
        "",

      declared_amount:
        receipt.declared_amount ??
        receipt.donation_amount,

      paid_amount:
        receipt.paid_amount ??
        receipt.donation_amount,

      payment_mode:
        receipt.payment_mode || "",

      donor_transaction_reference:
        receipt.payment_reference || "",

      donor_payment_date:
        receipt.payment_date ||
        receipt.donation_date,

      bank_credit_date:
        receipt.payment_date ||
        receipt.donation_date
    };

    window.SRMDC_MY_RECEIPTS.openExisting(
      result,
      verificationUrl,
      submission
    );
  }


  document.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          ".srmdc-my-receipt-view"
        );

      if (!button) {
        return;
      }

      event.preventDefault();

      openMyOfficialReceipt(
        button.dataset.receiptId
      );
    }
  );

  async function loadDonations() {

    const {
      data,
      error
    } =
      await client.rpc(
        "get_my_srmdc_donations"
      );


    if (error) {
      throw error;
    }


    const items =
      Array.isArray(data)
        ? data
        : [];


    const total =
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.amount || 0),
        0
      );


    const receipts =
      items.filter(
        (item) =>
          Boolean(
            item.receipt_number
          )
      );


    setText(
      "srmdcTotalContributions",
      money(total)
    );

    setText(
      "srmdcDonationCount",
      items.length
    );

    setText(
      "srmdcReceiptCount",
      receipts.length
    );


    const container =
      document.getElementById(
        "srmdcMyDonations"
      );


    if (!container) return;


    if (!items.length) {

      container.innerHTML = `
        <div class="srmdc-empty-state">

          <strong>
            No donations are linked to this account yet.
          </strong>

          <p>
            You can still make a donation as usual.
            Previous donations can be securely linked
            after ownership verification.
          </p>

        </div>
      `;

      return;
    }


    container.innerHTML =
      items.map((item) => {

        const verifyUrl =
          buildVerificationUrl(item);


        const receiptBlock =
          item.receipt_number
            ? `
              <div>
                Receipt:
                <strong>
                  ${escapeHtml(
                    item.receipt_number
                  )}
                </strong>
              </div>

              ${
                verifyUrl
                  ? `
                    <div class="srmdc-receipt-actions">
                      <button
                        type="button"
                        class="srmdc-receipt-action srmdc-receipt-action-primary srmdc-my-receipt-view"
                        data-receipt-id="${escapeHtml(
                          item.receipt_id || ""
                        )}"
                      >
                        View / Print Receipt
                      </button>

                      <a
                        class="srmdc-receipt-action srmdc-receipt-action-secondary"
                        href="${escapeHtml(
                          verifyUrl
                        )}"
                      >
                        Verify Receipt
                      </a>
                    </div>
                  `
                  : ""
              }
            `
            : `
              <div>
                Receipt:
                Not issued
              </div>
            `;


        return `
          <div class="srmdc-donation-history-item">

            <strong>
              ${escapeHtml(
                item.fund_name ||
                "Donation"
              )}
            </strong>

            <div>
              ${money(item.amount)}
            </div>

            <div>
              Date:
              ${escapeHtml(
                item.donation_date ||
                "—"
              )}
            </div>

            <div>
              Status:
              ${escapeHtml(
                item.donation_status ||
                "—"
              )}
            </div>

            ${receiptBlock}

          </div>
        `;

      }).join("");
  }


  async function loadDashboard(user) {

    showMember();

    try {

      const results =
        await Promise.allSettled([
          loadProfile(user),
          loadDonations(),
          loadLinkRequests()
        ]);

      if (
        results[0].status === "rejected"
      ) {
        console.error(
          "My SRMDC profile load failed:",
          results[0].reason
        );

        const profileContainer =
          document.getElementById(
            "srmdcProfileDetails"
          );

        if (profileContainer) {
          profileContainer.innerHTML =
            "<p>Unable to load your profile right now.</p>";
        }
      }

      if (
        results[1].status === "rejected"
      ) {
        console.error(
          "My SRMDC donation load failed:",
          results[1].reason
        );

        const donationContainer =
          document.getElementById(
            "srmdcDonationHistory"
          );

        if (donationContainer) {
          donationContainer.innerHTML =
            "<p>Unable to load donation details right now.</p>";
        }
      }

      if (
        results[2].status === "rejected"
      ) {

        console.error(
          "My SRMDC link request load failed:",
          results[2].reason
        );

        const linkStatus =
          document.getElementById(
            "srmdcLinkRequestStatus"
          );

        if (linkStatus) {
          linkStatus.innerHTML =
            "<p>Previous donation linking is temporarily unavailable.</p>";
        }
      }

    }
    catch (error) {

      console.error(
        "My SRMDC dashboard error:",
        error
      );

      const donations =
        document.getElementById(
          "srmdcMyDonations"
        );

      if (donations) {

        donations.innerHTML =
          '<div class="srmdc-empty-state">' +
          "Unable to load account details right now." +
          "</div>";
      }
    }
  }


  // =========================================================
  // LOGIN / SIGN-UP TABS
  // =========================================================

  const loginTab =
    document.getElementById(
      "srmdcLoginTab"
    );

  const signupTab =
    document.getElementById(
      "srmdcSignupTab"
    );

  const loginPanel =
    document.getElementById(
      "srmdcLoginPanel"
    );

  const signupPanel =
    document.getElementById(
      "srmdcSignupPanel"
    );


  function selectTab(name) {

    const login =
      name === "login";

    loginPanel.hidden =
      !login;

    signupPanel.hidden =
      login;

    loginTab.classList.toggle(
      "active",
      login
    );

    signupTab.classList.toggle(
      "active",
      !login
    );
  }


  loginTab?.addEventListener(
    "click",
    () =>
      selectTab("login")
  );


  signupTab?.addEventListener(
    "click",
    () =>
      selectTab("signup")
  );


  // =========================================================
  // LOGIN
  // =========================================================

  const loginForm =
    document.getElementById(
      "srmdcLoginForm"
    );

  const loginMessage =
    document.getElementById(
      "srmdcLoginMessage"
    );


  loginForm?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      setMessage(
        loginMessage,
        ""
      );


      const email =
        document
          .getElementById(
            "srmdcLoginEmail"
          )
          .value
          .trim();

      const password =
        document
          .getElementById(
            "srmdcLoginPassword"
          )
          .value;


      const {
        data,
        error
      } =
        await client.auth
          .signInWithPassword({
            email,
            password
          });


      if (
        error ||
        !data.user
      ) {

        setMessage(
          loginMessage,
          error?.message ||
          "Unable to login.",
          "error"
        );

        return;
      }


      await loadDashboard(
        data.user
      );
    }
  );


  // =========================================================
  // SIGN UP
  // =========================================================

  const signupForm =
    document.getElementById(
      "srmdcSignupForm"
    );

  const signupMessage =
    document.getElementById(
      "srmdcSignupMessage"
    );


  signupForm?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      setMessage(
        signupMessage,
        ""
      );


      const displayName =
        document
          .getElementById(
            "srmdcSignupName"
          )
          .value
          .trim();

      const mobile =
        document
          .getElementById(
            "srmdcSignupMobile"
          )
          .value
          .trim();

      const email =
        document
          .getElementById(
            "srmdcSignupEmail"
          )
          .value
          .trim();

      const password =
        document
          .getElementById(
            "srmdcSignupPassword"
          )
          .value;

      const confirmPassword =
        document
          .getElementById(
            "srmdcSignupConfirmPassword"
          )
          .value;


      if (
        password !==
        confirmPassword
      ) {

        setMessage(
          signupMessage,
          "Passwords do not match.",
          "error"
        );

        return;
      }


      const {
        data,
        error
      } =
        await client.auth.signUp({

          email,
          password,

          options: {

            data: {
              display_name:
                displayName,

              mobile:
                mobile
            }
          }
        });


      if (error) {

        setMessage(
          signupMessage,
          error.message,
          "error"
        );

        return;
      }


      if (!data.user) {

        setMessage(
          signupMessage,
          "Unable to create account.",
          "error"
        );

        return;
      }


      /*
       * When email confirmation is enabled,
       * the user exists but there may be no
       * authenticated session yet.
       *
       * The profile will be created after
       * confirmed login by ensureProfile().
       */

      if (!data.session) {

        setMessage(
          signupMessage,
          "Account created. Please check your email " +
          "and confirm your account, then login.",
          "success"
        );

        return;
      }


      await loadDashboard(
        data.user
      );
    }
  );


  // =========================================================
  // PASSWORD RESET REQUEST
  // =========================================================

  document
    .getElementById(
      "srmdcForgotPassword"
    )
    ?.addEventListener(
      "click",
      async () => {

        const email =
          document
            .getElementById(
              "srmdcLoginEmail"
            )
            .value
            .trim();


        if (!email) {

          setMessage(
            loginMessage,
            "Enter your email first.",
            "error"
          );

          return;
        }


        const {
          error
        } =
          await client.auth
            .resetPasswordForEmail(
              email,
              {
                redirectTo:
                  "https://srmdctrust.org/#my-srmdc"
              }
            );


        if (error) {

          setMessage(
            loginMessage,
            error.message,
            "error"
          );

          return;
        }


        setMessage(
          loginMessage,
          "Password reset instructions have been sent.",
          "success"
        );
      }
    );


  // =========================================================
  // LOGOUT
  // =========================================================

  document
    .getElementById(
      "srmdcLogoutButton"
    )
    ?.addEventListener(
      "click",
      async () => {

        await client.auth.signOut();

        showGuest();
      }
    );


  // =========================================================
  // SESSION
  // =========================================================

  async function initialize() {

    const {
      data,
      error
    } =
      await client.auth.getSession();


    if (
      error ||
      !data.session?.user
    ) {

      showGuest();
      return;
    }


    await loadDashboard(
      data.session.user
    );
  }


  client.auth.onAuthStateChange(
    async (event, session) => {

      if (
        event === "SIGNED_OUT"
      ) {

        showGuest();
        return;
      }


      if (
        event === "SIGNED_IN" &&
        session?.user
      ) {

        await loadDashboard(
          session.user
        );
      }
    }
  );


  initialize();

})();