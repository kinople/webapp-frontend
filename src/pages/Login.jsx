import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getApiUrl } from "../utils/api";
import { setToken } from "../utils/auth";
import logoIcon from "../assets/logo-icon.svg";
import eyeIcon from "../assets/Eye.svg";
import eyeOffIcon from "../assets/Vector.svg";
import "../css/Login.css";

const Login = () => {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [isLogin, setIsLogin] = useState(true);
	const navigate = useNavigate();

	const handleToggle = () => {
		setIsLogin(!isLogin);
		setFirstName("");
		setLastName("");
		setEmail("");
		setPassword("");
		setConfirmPassword("");
		setError("");
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!isLogin && password !== confirmPassword) {
			setError("Passwords do not match. Please try again.");
			return;
		}

		setLoading(true);

		const endpoint = isLogin ? "/api/login" : "/api/signup";

		try {
			const body = isLogin
				? { email, password }
				: { username: `${firstName.trim()},${lastName.trim()}`, email, password };

			const response = await fetch(getApiUrl(endpoint), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(body),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Something went wrong.");
			}

			if (isLogin) {
				if (data.token) {
					setToken(data.token);
					navigate(`/${data.user.id}`);
				} else {
					throw new Error("No token received from server");
				}
			} else {
				// Signup successful — switch to login view
				setIsLogin(true);
				setEmail("");
				setPassword("");
				setError("");
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="login-page">
			<div className="login-card">
				<div className="login-card-content">
					<div className="login-header">
						<img src={logoIcon} alt="Kinople" className="login-logo" />
						<h1 className="login-title">{isLogin ? "Sign In" : "Sign Up"}</h1>
					</div>

					<div className="login-form-wrapper">
						<div className="login-form-content">
							<form className="login-form" onSubmit={handleSubmit}>
								{error && <div className="login-error">{error}</div>}

								{/* ── Sign-up-only fields ── */}
								{!isLogin && (
									<div className="login-name-row">
										<div className="login-field">
											<label className="login-label">First Name</label>
											<div className="login-input-wrapper">
												<input
													className="login-input"
													type="text"
													value={firstName}
													onChange={(e) => setFirstName(e.target.value)}
													placeholder="First name"
													required
													disabled={loading}
												/>
											</div>
										</div>
										<div className="login-field">
											<label className="login-label">Last Name</label>
											<div className="login-input-wrapper">
												<input
													className="login-input"
													type="text"
													value={lastName}
													onChange={(e) => setLastName(e.target.value)}
													placeholder="Last name"
													required
													disabled={loading}
												/>
											</div>
										</div>
									</div>
								)}

								<div className="login-field">
									<label className="login-label">Email ID</label>
									<div className="login-input-wrapper">
										<input
											className="login-input"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="Enter your email"
											required
											disabled={loading}
										/>
									</div>
								</div>

								<div className="login-field">
									<label className="login-label">{isLogin ? "Password" : "Create Password"}</label>
									<div className="login-input-wrapper">
										<input
											className="login-input login-input-password"
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder={isLogin ? "Enter your password" : "Create a password"}
											required
											disabled={loading}
										/>
										<button
											type="button"
											className="login-password-toggle"
											onClick={() => setShowPassword(!showPassword)}
											tabIndex={-1}
										>
											<img src={showPassword ? eyeOffIcon : eyeIcon} alt={showPassword ? "Hide password" : "Show password"} />
										</button>
									</div>
								</div>

								{/* ── Confirm Password (sign-up only) ── */}
								{!isLogin && (
									<div className="login-field">
										<label className="login-label">Confirm Password</label>
										<div className="login-input-wrapper">
											<input
												className="login-input login-input-password"
												type={showConfirmPassword ? "text" : "password"}
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												placeholder="Re-enter your password"
												required
												disabled={loading}
											/>
											<button
												type="button"
												className="login-password-toggle"
												onClick={() => setShowConfirmPassword(!showConfirmPassword)}
												tabIndex={-1}
											>
												<img src={showConfirmPassword ? eyeOffIcon : eyeIcon} alt={showConfirmPassword ? "Hide password" : "Show password"} />
											</button>
										</div>
									</div>
								)}

								<button type="submit" className="login-button" disabled={loading}>
									{loading ? (isLogin ? "Signing in..." : "Creating account...") : isLogin ? "Sign In" : "Sign Up"}
								</button>
							</form>

							<div className="login-footer">
								{isLogin && (
									<Link to="/forgot-password" className="login-forgot">
										Forgot Password
									</Link>
								)}
								<div className="login-signup-container">
									<span className="login-signup-text">{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
									<div className="login-signup-link" onClick={handleToggle}>
										{isLogin ? "Sign Up" : "Sign In"}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Login;
