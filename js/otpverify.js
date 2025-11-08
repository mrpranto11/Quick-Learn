const API_BASE = "http://localhost:3000";

    document.getElementById("otpForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const otp = document.getElementById("otp").value.trim();
      const email = sessionStorage.getItem("email");
      const resEl = document.getElementById("result");

      if (!email) {
        resEl.innerText = "Session expired. Please sign up again.";
        return;
      }

      resEl.innerText = "Verifying OTP...";

      try {
        const response = await fetch(`${API_BASE}/verifyOTP`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
        const data = await response.json();

        if (data.success) {
          resEl.innerText = "Signup successful! Redirecting...";
          sessionStorage.removeItem("email");
          setTimeout(() => (window.location.href = "login.html"), 1500);
        } else {
          resEl.innerText = data.message || "Invalid OTP.";
        }
      } catch (err) {
        resEl.innerText = "Server error.";
      }
    });