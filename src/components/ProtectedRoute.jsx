import { useState, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import { getToken, isTokenValid, removeToken } from "../utils/auth";

const ProtectedRoute = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState(null);
	const [sessionUser, setSessionUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const { user: urlUser } = useParams();

	useEffect(() => {
		const checkSession = async () => {
			try {
				// First check if token exists and is valid format
				if (!getToken() || !isTokenValid()) {
					console.log("No valid token found");
					setIsAuthenticated(false);
					setIsLoading(false);
					return;
				}

				// Verify token with server
				const response = await fetchWithAuth(getApiUrl("/api/verify-token"), {
					method: "GET",
				});

				console.log("Token verification response status:", response.status);

				if (response.ok) {
					const data = await response.json();
					console.log("Token verification data:", data);
					setSessionUser(data.user.id);
					setIsAuthenticated(true);
				} else {
					console.log("Token verification failed");
					removeToken(); // Remove invalid token
					setIsAuthenticated(false);
				}
			} catch (error) {
				console.error("Token verification failed:", error);
				removeToken(); // Remove token on error
				setIsAuthenticated(false);
			} finally {
				setIsLoading(false);
			}
		};

		checkSession();
	}, []);

	// Show loading spinner while checking session
	if (isLoading) {
		return (
			<div style={styles.loadingContainer}>
				<div style={styles.spinner}></div>
				<p>Verifying session...</p>
			</div>
		);
	}

	// Redirect to login if not authenticated
	if (!isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	// Redirect to login if trying to access another user's page
	if (urlUser && sessionUser && urlUser !== sessionUser.toString()) {
		console.log("Unauthorized access attempt - URL user:", urlUser, "Session user:", sessionUser);
		return <Navigate to="/" replace />;
	}

	// Render the protected component if authenticated and authorized
	return children;
};

const styles = {
	loadingContainer: {
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		alignItems: "center",
		minHeight: "100vh",
		fontSize: "1.2rem",
		color: "#666",
	},
	spinner: {
		width: "40px",
		height: "40px",
		border: "4px solid #f3f3f3",
		borderTop: "4px solid #3498db",
		borderRadius: "50%",
		animation: "spin 1s linear infinite",
		marginBottom: "16px",
	},
};

// Add CSS animation for spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default ProtectedRoute;
