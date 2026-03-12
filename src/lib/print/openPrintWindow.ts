"use client";

const PRINT_STYLES = `
  body { font-family: Arial, sans-serif; padding: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 4px; border: 1px solid #000; text-align: center; }
  .form-row { display: flex; justify-content: space-around; margin-bottom: 1px; line-height: 1; }
  .tbl-di-container { max-height: 700px; }
  .tbl-daily-inventory { font-size: 12px; width: 80%; margin: 0 auto; }
  .tbl-daily-inventory td, .tbl-daily-inventory th { text-align: center; padding: 6px; }
  .tbl-daily-inventory tfoot tr, .tbl-daily-inventory tfoot td { font-weight: bold; text-align: center; padding: 6px; }
  .print-header { text-align: center; margin-bottom: 12px; }
  .print-header h1, .print-header h2, .print-header p { margin: 0 0 4px; }
  .print-signoff { margin-top: 24px; }
  .print-signoff > div { width: 100%; max-width: 720px; margin: 0 auto; }
`;

export function openPrintWindow(title: string, bodyHtml: string) {
  const popupWindow = window.open("", "_blank", "width=1200,height=900");
  if (!popupWindow) {
    return;
  }

  popupWindow.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`);
  popupWindow.document.close();
  popupWindow.focus();

  popupWindow.onafterprint = () => {
    popupWindow.close();
  };

  setTimeout(() => {
    popupWindow.print();
    popupWindow.close();
  }, 150);
}
