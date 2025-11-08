const WEB_APP_URL = "https://quick-learn-nja0.onrender.com/";

document.getElementById('signupForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const loader = document.getElementById('loader');
  const responseMsg = document.getElementById('response');
  loader.style.display = 'block';
  responseMsg.textContent = '';
  responseMsg.style.color = 'red';

  const username = e.target.Username.value.trim();
  const email = e.target.Gmail.value.trim();
  const password = e.target.Password.value;

  if (!username || !email || !password) {
    loader.style.display = 'none';
    responseMsg.textContent = 'Please fill all fields.';
    return;
  }

  // Send POST JSON to Google Apps Script
  fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sendOtp',
      Username: username,
      Gmail: email,
      Password: password
    })
  })
  .then(res => res.json())
  .then(data => {
    loader.style.display = 'none';
    if (data.status === 'success') {
      // Temporarily save for OTP page
      sessionStorage.setItem('signupUsername', username);
      sessionStorage.setItem('signupEmail', email);
      sessionStorage.setItem('signupPassword', password); // caution: production use hashed only

      // Redirect to OTP verification page
      window.location.href = 'otpverify.html';
    } else {
      responseMsg.textContent = data.message || 'Failed to send OTP.';
    }
  })
  .catch(err => {
    loader.style.display = 'none';
    responseMsg.textContent = 'Network error: ' + err;
  });
});
