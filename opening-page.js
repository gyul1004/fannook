const openingPageForm = document.querySelector('#opening-page-form');
const applicationPage = document.querySelector('.application-page');
const doneHeading = document.querySelector('.application-done h2');
const email = openingPageForm.elements.email;
const consent = openingPageForm.elements.consent;
const fields = [
  {
    input: email,
    error: document.querySelector('#email-error'),
    message: () => email.validity.valueMissing ? '이메일 주소를 입력해 주세요.' : '이메일 주소 형식을 확인해 주세요.',
  },
  {
    input: consent,
    error: document.querySelector('#consent-error'),
    message: () => '개인정보 수집 및 이용에 동의해 주세요.',
  },
];

function updateFieldError({ input, error, message }) {
  const valid = input.validity.valid;
  error.textContent = valid ? '' : message();
  error.hidden = valid;
  if (valid) input.removeAttribute('aria-invalid');
  else input.setAttribute('aria-invalid', 'true');
  return valid;
}

fields.forEach(field => {
  field.input.addEventListener('input', () => {
    if (!field.error.hidden) updateFieldError(field);
  });
});

function showApplicationState(state) {
  applicationPage.classList.toggle('is-complete', state?.openingComplete === true);
}

showApplicationState(history.state);
window.addEventListener('popstate', event => showApplicationState(event.state));

openingPageForm?.addEventListener('submit', event => {
  event.preventDefault();
  const invalidFields = fields.filter(field => !updateFieldError(field));
  if (invalidFields.length) {
    invalidFields[0].input.focus();
    return;
  }
  history.pushState({ openingComplete: true }, '');
  showApplicationState(history.state);
  doneHeading.focus();
});
