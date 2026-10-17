export const escapeHTML = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeLink = value => {try {const url=new URL(value,location.href);return ['http:','https:','blob:'].includes(url.protocol)?url.href:'#';}catch{return '#';}};
export const arrow = '<svg class="icon" viewBox="0 0 24 24"><path d="M5 19 19 5M5 5h14v14"/></svg>';
export function initShell(){document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());}
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
