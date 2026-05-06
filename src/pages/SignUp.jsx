import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiUrl } from "../utils/api";
import "../css/SignUp.css";

function SignUp() {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (password !== confirmPassword) {
			setError("Passwords do not match. Please try again.");
			return;
		}

		setLoading(true);

		try {
			const username = `${firstName.trim()},${lastName.trim()}`;

			const response = await fetch(getApiUrl("/api/signup"), {
				method: "POST",
				mode: "cors",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username,
					email,
					password,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				// Signup successful
				console.log("Signup successful:", data);
				// Redirect to login page
				navigate("/");
			} else {
				// Handle error response
				setError(data.message || "Signup failed. Please try again.");
			}
		} catch (err) {
			console.error("Signup error:", err);
			setError("Network error. Please check your connection and try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="signup-container">
			<form className="signup-form" onSubmit={handleSubmit}>
				{error && <div className="signup-error">{error}</div>}
				<div className="signup-name-row">
					<input
						className="signup-input"
						type="text"
						name="firstName"
						placeholder="First Name"
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
						disabled={loading}
						required
					/>
					<input
						className="signup-input"
						type="text"
						name="lastName"
						placeholder="Last Name"
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
						disabled={loading}
						required
					/>
				</div>
				<input
					className="signup-input"
					type="email"
					name="email"
					placeholder="Email ID"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					disabled={loading}
					required
				/>
				<input
					className="signup-input"
					type="password"
					name="password"
					placeholder="Create Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					disabled={loading}
					required
				/>
				<input
					className="signup-input"
					type="password"
					name="confirmPassword"
					placeholder="Confirm Password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					disabled={loading}
					required
				/>
				<button type="submit" className="signup-button" disabled={loading}>
					{loading ? "Creating Account..." : "Sign Up"}
				</button>
			</form>
			<div className="signup-login-container">
				Already have an account?{" "}
				<Link to="/" className="signup-login-link">
					<b>Sign In</b>
				</Link>
			</div>
		</div>
	);
}

export default SignUp;
