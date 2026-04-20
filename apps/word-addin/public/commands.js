(function () {
  Office.onReady(function () {
    if (!Office.actions) {
      return;
    }

    Office.actions.associate("openSkuaPane", async function () {
      if (Office.addin && Office.addin.showAsTaskpane) {
        await Office.addin.showAsTaskpane();
      }
    });
  });
})();
