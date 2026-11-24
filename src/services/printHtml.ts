/** Prints a standalone HTML document in a hidden frame (only that document, not the app around it). */
export function printHtmlDocument(title: string, bodyHtml: string, pageCss = '@page{size:A4 landscape;margin:10mm}') {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>` +
      `${pageCss}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
      `body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0F172A;font-size:11px}` +
      `</style></head><body>${bodyHtml}</body></html>`
  );
  doc.close();
  setTimeout(() => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 100);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
