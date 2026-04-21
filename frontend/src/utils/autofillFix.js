// Фикс автозаполнения - принудительно меняет цвет текста
export const fixAutofillColors = () => {
  const style = document.createElement('style');
  style.id = 'autofill-fix';
  style.textContent = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active,
    input:-webkit-autofill:focus-visible,
    textarea:-webkit-autofill,
    textarea:-webkit-autofill:hover,
    textarea:-webkit-autofill:focus,
    textarea:-webkit-autofill:active,
    select:-webkit-autofill {
      -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
      box-shadow: 0 0 0 1000px transparent inset !important;
      background-color: transparent !important;
      background-image: none !important;
      transition: background-color 999999s ease-in-out 0s !important;
    }
    
    .dark input:-webkit-autofill,
    .dark input:-webkit-autofill:hover,
    .dark input:-webkit-autofill:focus,
    .dark input:-webkit-autofill:active,
    .dark input:-webkit-autofill:first-line,
    .dark textarea:-webkit-autofill,
    .dark textarea:-webkit-autofill:first-line {
      -webkit-text-fill-color: #ffffff !important;
      color: #ffffff !important;
      caret-color: #ffffff !important;
    }
    
    input:-webkit-autofill,
    input:-webkit-autofill:first-line,
    textarea:-webkit-autofill,
    textarea:-webkit-autofill:first-line {
      -webkit-text-fill-color: #111827 !important;
      color: #111827 !important;
      caret-color: #111827 !important;
    }
    
    input::-webkit-credentials-auto-fill-button,
    input::-webkit-contacts-auto-fill-button,
    input::-webkit-strong-password-auto-fill-button {
      display: none !important;
    }
  `;
  
  const oldStyle = document.getElementById('autofill-fix');
  if (oldStyle) oldStyle.remove();
  
  document.head.appendChild(style);
};

export const forceAutofillTextColor = () => {
  const inputs = document.querySelectorAll('input, textarea');
  const isDark = document.documentElement.classList.contains('dark');
  
  inputs.forEach(input => {
    if (input.matches(':-webkit-autofill')) {
      input.style.webkitTextFillColor = isDark ? '#ffffff' : '#111827';
      input.style.color = isDark ? '#ffffff' : '#111827';
      input.style.caretColor = isDark ? '#ffffff' : '#111827';
    }
  });
};