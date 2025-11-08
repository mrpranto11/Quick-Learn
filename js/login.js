document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorMsg = document.getElementById('errorMsg');
  const loginBtn = document.getElementById('loginBtn');

  if (email === '' || password === '') {
    errorMsg.textContent = 'Please enter both email and password.';
    return;
  }

  loginBtn.textContent = 'Logging in...';
  loginBtn.disabled = true;

  try {
    const res = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    loginBtn.textContent = 'Login';
    loginBtn.disabled = false;

    if (data.success) {
      sessionStorage.setItem('userEmail', email);
      window.location.href = 'dashboard.html';
    } else {
      errorMsg.textContent = data.message || 'Invalid email or password.';
    }

  } catch (err) {
    loginBtn.textContent = 'Login';
    loginBtn.disabled = false;
    errorMsg.textContent = 'Error: ' + err.message;
  }
});