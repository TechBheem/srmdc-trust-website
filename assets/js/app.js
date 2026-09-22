const menuButton =
  document.getElementById("menuButton");

const navigation =
  document.getElementById("navigation");

menuButton.addEventListener("click", () => {
  navigation.classList.toggle("open");
});

document
  .querySelectorAll("#navigation a")
  .forEach((link) => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
    });
  });

document.getElementById("year").textContent =
  new Date().getFullYear();

const verifyButton =
  document.getElementById("verifyButton");

const verificationMessage =
  document.getElementById(
    "verificationMessage"
  );

verifyButton.addEventListener("click", () => {

  const receipt =
    document
      .getElementById("receiptNumber")
      .value
      .trim();

  const verification =
    document
      .getElementById("verificationId")
      .value
      .trim();

  verificationMessage.style.display = "block";

  if (!receipt || !verification) {

    verificationMessage.textContent =
      "Enter both the receipt number and " +
      "verification ID.";

    return;
  }

  verificationMessage.textContent =
    "Online verification is not connected yet. " +
    "The verification service will be enabled " +
    "after the SRMDC backend and official domain " +
    "are configured.";
});
/* =========================================================
   SRMDC TRUST WEBSITE - PHASE 1B
   ========================================================= */

/*
  Support receipt QR URLs later, for example:

  verify.html?receipt=SRMDC%2F2026-27%2F000003&id=ABC123

  The current single-page site can already read:
  ?receipt=...&id=...#verify

  This only PREFILLS fields.
  It does NOT declare a receipt valid.
*/

const srmdcQuery =
  new URLSearchParams(window.location.search);

const receiptFromUrl =
  srmdcQuery.get("receipt");

const verificationFromUrl =
  srmdcQuery.get("id");

const receiptInput =
  document.getElementById("receiptNumber");

const verificationInput =
  document.getElementById("verificationId");

if (receiptFromUrl && receiptInput) {
  receiptInput.value = receiptFromUrl;
}

if (verificationFromUrl && verificationInput) {
  verificationInput.value = verificationFromUrl;
}

/*
  Close mobile navigation when Escape is pressed.
*/
document.addEventListener("keydown", (event) => {

  if (
    event.key === "Escape" &&
    navigation
  ) {
    navigation.classList.remove("open");
  }

});