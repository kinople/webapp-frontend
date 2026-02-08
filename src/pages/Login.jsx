import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getApiUrl } from "../utils/api";
import { setToken } from "../utils/auth";
import logoIcon from "../assets/logo-icon.svg";
import eyeIcon from "../assets/Eye.svg";
import eyeOffIcon from "../assets/Vector.svg";
import "../css/Login.css";

const Login = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [isLogin, setIsLogin] = useState(true); // toggle
	const navigate = useNavigate();

	const handleToggle = () => {
		setIsLogin(!isLogin);
		setEmail("");
		setPassword("");
		setError("");
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		const endpoint = isLogin ? "/api/login" : "/api/signup";

		try {
			const response = await fetch(getApiUrl(endpoint), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ email, password }),
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
				navigate("/login");
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

								<div className="login-field">
									<label className="login-label">Email</label>
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
									<label className="login-label">Password</label>
									<div className="login-input-wrapper">
										<input
											className="login-input login-input-password"
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="Enter your password"
											required
											disabled={loading}
										/>
										<button
											type="button"
											className="login-password-toggle"
											onClick={() => {
												setShowPassword(!showPassword);
											}}
											tabIndex={-1}
										>
											<img src={showPassword ? eyeOffIcon : eyeIcon} alt={showPassword ? "Hide password" : "Show password"} />
										</button>
									</div>
								</div>

								<button type="submit" className="login-button" disabled={loading}>
									{loading ? (isLogin ? "Signing in..." : "Creating account...") : isLogin ? "Sign In" : "Sign Up"}
								</button>
							</form>

							<div className="login-footer">
								<Link to="/" className="login-forgot">
									Forgot Password
								</Link>
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
