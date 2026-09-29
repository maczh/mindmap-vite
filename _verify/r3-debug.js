(async () => {
  const inp = document.querySelector(".mm-file-input");
  const t = document.querySelector(".mm-toast");
  return JSON.stringify(
    {
      inputExists: !!inp,
      accept: inp ? inp.getAttribute("accept") : null,
      files: inp && inp.files ? inp.files.length : -1,
      fileName: inp && inp.files && inp.files[0] ? inp.files[0].name : null,
      fileSize: inp && inp.files && inp.files[0] ? inp.files[0].size : null,
      inputValue: inp ? inp.value : null,
      toast: t ? t.textContent : null,
      nodeCount: document.querySelectorAll("g.mm-node").length,
    },
    null,
    1
  );
})()
