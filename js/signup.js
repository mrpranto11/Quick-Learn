 const API_BASE = "http://localhost:3000";

    document.getElementById("signupForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const resEl = document.getElementById("response");

      resEl.innerText = "Sending OTP...";

      try {
        const response = await fetch(`${API_BASE}/sendOTP`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await response.json();

        if (data.success) {
          sessionStorage.setItem("email", email);
          resEl.innerText = "OTP sent successfully!";
          setTimeout(() => (window.location.href = "otpverify.html"), 1500);
        } else {
          resEl.innerText = data.message || "Failed to send OTP.";
        }
      } catch (err) {
        resEl.innerText = "Server error.";
      }
    });