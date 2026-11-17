// Pricing page toggles: Yearly / Monthly and Global (USD) / Taiwan (NT$).
// Every figure is pre-rendered by scripts/build-pricing.mjs into
// data-v-<currency>-<billing> attributes; this only swaps between them.
// ?currency=usd|ntd and ?billing=yearly|monthly preselect a state.
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var state = {
    currency: params.get("currency") === "usd" || params.get("currency") === "ntd"
      ? params.get("currency") : document.body.getAttribute("data-default-currency"),
    billing: params.get("billing") === "monthly" ? "monthly" : "yearly",
  };

  function render() {
    var key = "data-v-" + state.currency + "-" + state.billing;
    document.querySelectorAll("[data-variant]").forEach(function (el) {
      var v = el.getAttribute(key);
      if (v !== null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-currency-only]").forEach(function (el) {
      el.hidden = el.getAttribute("data-currency-only") !== state.currency;
    });
    document.querySelectorAll("[data-toggle]").forEach(function (group) {
      var name = group.getAttribute("data-toggle");
      group.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === state[name]));
      });
    });
  }

  document.querySelectorAll("[data-toggle]").forEach(function (group) {
    group.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-value]");
      if (!b) return;
      state[group.getAttribute("data-toggle")] = b.getAttribute("data-value");
      render();
    });
  });

  render();
})();
