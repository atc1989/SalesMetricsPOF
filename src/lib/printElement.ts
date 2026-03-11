"use client";

const syncFormValues = (source: HTMLElement, clone: HTMLElement) => {
  const sourceInputs = source.querySelectorAll<HTMLInputElement>("input");
  const cloneInputs = clone.querySelectorAll<HTMLInputElement>("input");

  sourceInputs.forEach((input, index) => {
    const cloneInput = cloneInputs[index];
    if (!cloneInput) {
      return;
    }

    cloneInput.value = input.value;
    if (input.checked) {
      cloneInput.setAttribute("checked", "checked");
    } else {
      cloneInput.removeAttribute("checked");
    }
  });

  const sourceTextareas = source.querySelectorAll<HTMLTextAreaElement>("textarea");
  const cloneTextareas = clone.querySelectorAll<HTMLTextAreaElement>("textarea");

  sourceTextareas.forEach((textarea, index) => {
    const cloneTextarea = cloneTextareas[index];
    if (!cloneTextarea) {
      return;
    }

    cloneTextarea.value = textarea.value;
    cloneTextarea.textContent = textarea.value;
  });

  const sourceSelects = source.querySelectorAll<HTMLSelectElement>("select");
  const cloneSelects = clone.querySelectorAll<HTMLSelectElement>("select");

  sourceSelects.forEach((select, index) => {
    const cloneSelect = cloneSelects[index];
    if (!cloneSelect) {
      return;
    }

    cloneSelect.value = select.value;
  });
};

const getHeadMarkup = () =>
  Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n");

export const printElementById = (elementId: string, title: string) => {
  if (typeof window === "undefined") {
    return false;
  }

  const source = document.getElementById(elementId);
  if (!source) {
    return false;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!printWindow) {
    return false;
  }

  const clone = source.cloneNode(true) as HTMLElement;
  syncFormValues(source, clone);

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${getHeadMarkup()}
    <style>
      body {
        margin: 24px;
        color: #0f172a;
        background: #ffffff;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        border: 1px solid #cbd5e1;
      }

      input, select, textarea {
        border: 0;
        outline: none;
        background: transparent;
      }

      @page {
        size: auto;
        margin: 12mm;
      }
    </style>
  </head>
  <body>
    ${clone.outerHTML}
  </body>
</html>`);
  printWindow.document.close();

  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };

  return true;
};
