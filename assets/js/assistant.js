(function () {
  "use strict";

  const MARKER =
    "SRMDC_ASSISTANT_V1";

  if (
    window[MARKER]
  ) {
    return;
  }

  window[MARKER] = true;

  const WEBSITE =
    "https://srmdctrust.org/";

  const WHATSAPP =
    "https://wa.me/918123386813";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function answerQuestion(question) {
    const q =
      String(question || "")
        .trim()
        .toLowerCase();

    if (!q) {
      return (
        "Please type your question or choose one " +
        "of the options below."
      );
    }

    if (
      q.includes("donat") ||
      q.includes("payment") ||
      q.includes("pay") ||
      q.includes("upi")
    ) {
      return (
        "You can make a donation through the " +
        "Donate section of the official SRMDC Trust " +
        "website. After making the payment, submit " +
        "the requested payment details so the Trust " +
        "can verify the transaction before issuing " +
        "an official receipt."
      );
    }

    if (
      q.includes("receipt") ||
      q.includes("verify")
    ) {
      return (
        "Official SRMDC donation receipts can be " +
        "checked through Verify Receipt on this " +
        "website. Use the receipt number and " +
        "verification information printed on the " +
        "official receipt."
      );
    }

    if (
      q.includes("account") ||
      q.includes("login") ||
      q.includes("my srmdc") ||
      q.includes("profile")
    ) {
      return (
        "My SRMDC lets registered supporters access " +
        "their linked donation history and official " +
        "receipts in one place. Creating an account " +
        "is optional and is not required to make a donation."
      );
    }

    if (
      q.includes("activit") ||
      q.includes("charit") ||
      q.includes("temple") ||
      q.includes("religious")
    ) {
      return (
        "Sri Rama Mandira Devasthana Charitable Trust " +
        "supports religious, charitable, educational, " +
        "environmental and community welfare activities. " +
        "Please use the Activities and Temple sections " +
        "for information published by the Trust."
      );
    }

    if (
      q.includes("contact") ||
      q.includes("phone") ||
      q.includes("call") ||
      q.includes("whatsapp") ||
      q.includes("help")
    ) {
      return (
        "You can contact the Trust using the Call Trust " +
        "or WhatsApp Trust buttons in the Contact section. " +
        "For WhatsApp assistance, use the official Trust " +
        "WhatsApp profile."
      );
    }

    if (
      q.includes("address") ||
      q.includes("location")
    ) {
      return (
        "The Trust is based in Bodabanda Village, " +
        "Pullayapalli Post, Udayagiri Mandal, " +
        "SPSR Nellore, Andhra Pradesh – 524226. " +
        "Please see the Contact section for the " +
        "official published address."
      );
    }

    return (
      "I can help with donations, official receipts, " +
      "My SRMDC, Trust activities and contact information. " +
      "For anything requiring personal assistance, please " +
      "contact the Trust through WhatsApp."
    );
  }

  function createAssistant() {
    if (
      document.getElementById(
        "srmdcAssistantLauncher"
      )
    ) {
      return;
    }

    const root =
      document.createElement("div");

    root.className =
      "srmdc-assistant";

    root.innerHTML = `
      <button
        id="srmdcAssistantLauncher"
        class="srmdc-assistant-launcher"
        type="button"
        aria-label="Open SRMDC website assistant"
        aria-expanded="false"
      >
        <!-- SRMDC_DEVOTIONAL_ANGEL_V1 -->
        <span class="srmdc-assistant-icon srmdc-devotional-launcher">
          <img
            src="assets/images/srmdc_assistant_angel.png"
            alt=""
            aria-hidden="true"
          >
        </span>
        <span class="srmdc-assistant-launcher-text">
          Need Help?
        </span>
      </button>

      <section
        id="srmdcAssistantPanel"
        class="srmdc-assistant-panel"
        aria-label="SRMDC website assistant"
        hidden
      >
        <div class="srmdc-assistant-header">

          <div class="srmdc-assistant-brand">

            <div class="srmdc-assistant-header-angel">
              <img
                src="assets/images/srmdc_assistant_angel.png"
                alt=""
                aria-hidden="true"
              >
            </div>

            <div class="srmdc-assistant-brand-text">
              <strong>SRMDC Assistant</strong>
              <span>Website Help</span>
            </div>

          </div>

          <button
            id="srmdcAssistantClose"
            class="srmdc-assistant-close"
            type="button"
            aria-label="Close assistant"
          >
            ×
          </button>
        </div>

        <div
          id="srmdcAssistantMessages"
          class="srmdc-assistant-messages"
          aria-live="polite"
        >
          <div class="srmdc-assistant-message assistant">
            Namaste. I can help you with donations,
            receipts, My SRMDC, Trust activities and
            contact information.
          </div>
        </div>

        <div class="srmdc-assistant-quick">
          <button type="button" data-question="How can I donate?">
            Donate
          </button>

          <button type="button" data-question="How do I verify a receipt?">
            Verify Receipt
          </button>

          <button type="button" data-question="What are the Trust activities?">
            Activities
          </button>

          <button type="button" data-question="How can I contact the Trust?">
            Contact
          </button>
        </div>

        <form
          id="srmdcAssistantForm"
          class="srmdc-assistant-form"
        >
          <label
            for="srmdcAssistantInput"
            class="srmdc-assistant-sr-only"
          >
            Ask SRMDC Assistant
          </label>

          <input
            id="srmdcAssistantInput"
            type="text"
            maxlength="250"
            autocomplete="off"
            placeholder="Ask about SRMDC..."
          >

          <button type="submit">
            Send
          </button>
        </form>

        <div class="srmdc-assistant-footer">
          <a href="${WHATSAPP}" target="_blank" rel="noopener noreferrer">
            WhatsApp Trust
          </a>

          <span>•</span>

          <a href="${WEBSITE}#contact">
            Contact
          </a>
        </div>
      </section>
    `;

    document.body.appendChild(root);

    const launcher =
      document.getElementById(
        "srmdcAssistantLauncher"
      );

    const panel =
      document.getElementById(
        "srmdcAssistantPanel"
      );

    const close =
      document.getElementById(
        "srmdcAssistantClose"
      );

    const form =
      document.getElementById(
        "srmdcAssistantForm"
      );

    const input =
      document.getElementById(
        "srmdcAssistantInput"
      );

    const messages =
      document.getElementById(
        "srmdcAssistantMessages"
      );

    function openAssistant() {
      panel.hidden = false;

      launcher.setAttribute(
        "aria-expanded",
        "true"
      );

      window.setTimeout(
        function () {
          input.focus();
        },
        50
      );
    }

    function closeAssistant() {
      panel.hidden = true;

      launcher.setAttribute(
        "aria-expanded",
        "false"
      );
    }

    function appendMessage(
      value,
      type
    ) {
      const element =
        document.createElement("div");

      element.className =
        "srmdc-assistant-message " +
        type;

      element.innerHTML =
        escapeHtml(value);

      messages.appendChild(element);

      messages.scrollTop =
        messages.scrollHeight;
    }

    function ask(question) {
      const clean =
        String(question || "").trim();

      if (!clean) return;

      appendMessage(
        clean,
        "user"
      );

      appendMessage(
        answerQuestion(clean),
        "assistant"
      );
    }

    launcher.addEventListener(
      "click",
      function () {
        if (panel.hidden) {
          openAssistant();
        } else {
          closeAssistant();
        }
      }
    );

    close.addEventListener(
      "click",
      closeAssistant
    );

    form.addEventListener(
      "submit",
      function (event) {
        event.preventDefault();

        const question =
          input.value;

        input.value = "";

        ask(question);
      }
    );

    root
      .querySelectorAll(
        "[data-question]"
      )
      .forEach(function (button) {
        button.addEventListener(
          "click",
          function () {
            ask(
              button.getAttribute(
                "data-question"
              )
            );
          }
        );
      });

    document.addEventListener(
      "keydown",
      function (event) {
        if (
          event.key === "Escape" &&
          !panel.hidden
        ) {
          closeAssistant();
        }
      }
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      createAssistant
    );
  } else {
    createAssistant();
  }
})();